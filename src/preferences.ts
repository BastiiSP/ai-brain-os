import type { Entry } from './vault.js';
import type { Graph } from './graph.js';

export const palette = {
  teal: { label: 'Türkis', light: '#286f6d', dark: '#87cdcb' },
  pink: { label: 'Pink', light: '#a33d70', dark: '#db73a6' },
  mauve: { label: 'Malve', light: '#865177', dark: '#c68fb8' },
  slate: { label: 'Grautürkis', light: '#526b72', dark: '#9dbfc6' }
} as const;
export type Tone = keyof typeof palette;
export interface Preferences { colors: Record<string, Tone>; hidden: string[]; order: Record<string, string[]>; pinned: string[] }
export interface SettingsState { current: Preferences; revision: string; writable: boolean; warning?: string }
export const emptyPreferences = (): Preferences => ({ colors: {}, hidden: [], order: {}, pinned: [] });
export const parentOf = (p: string) => p.slice(0, Math.max(0, p.lastIndexOf('/')));
export const hiddenBy = (p: string, prefs: Preferences) => prefs.hidden.some(h => p === h || p.startsWith(h + '/'));

// Paths here are references only. They are never passed to a filesystem write.
export function validReference(p: unknown): p is string {
  return typeof p === 'string' && p.length > 0 && p.length <= 1024 && !/[\\\x00-\x1f\x7f]/.test(p) && !/^[a-z]:/i.test(p) && p.split('/').every(s => s && !s.startsWith('.'));
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validPreferences(v: unknown): v is Preferences {
  if (!object(v) || Object.keys(v).sort().join(',') !== 'colors,hidden,order,pinned') return false;
  const list = (x: unknown): x is string[] => Array.isArray(x) && x.length <= 5000 && x.every(validReference) && new Set(x).size === x.length;
  if (!list(v.hidden) || !list(v.pinned) || !v.pinned.every(p => /\.md$/i.test(p)) || !object(v.colors) || !object(v.order)) return false;
  return Object.entries(v.colors).every(([p, c]) => validReference(p) && !p.includes('/') && typeof c === 'string' && Object.hasOwn(palette, c)) &&
    Object.entries(v.order).every(([p, items]) => (p === '' || validReference(p)) && list(items) && items.every(item => parentOf(item) === p));
}
export function ordered<T extends { path: string }>(items: T[], saved: string[] = []): T[] {
  const ranks = new Map((Array.isArray(saved) ? saved : []).map((p, i) => [p, i]));
  return [...items].sort((a, b) => (ranks.get(a.path) ?? Infinity) - (ranks.get(b.path) ?? Infinity) || a.path.localeCompare(b.path, 'de'));
}
export function moveBeforePosition(items: string[], source: string, target: string): string[] {
  const next = [...items], from = next.indexOf(source), to = next.indexOf(target);
  if (from < 0 || to < 0 || from === to) return next;
  next.splice(from, 1); next.splice(to, 0, source); return next;
}
export type PreferenceChange =
  | { type: 'hidden' | 'pin'; path: string }
  | { type: 'unhide'; path: string }
  | { type: 'color'; path: string; tone: Tone }
  | { type: 'order'; parent: string; paths: string[] }
  | { type: 'pins'; paths: string[] };

// Persist only the explicit action. Index/discovery data never enters this step.
export function changePreferences(prefs: Preferences, change: PreferenceChange): Preferences {
  const next = structuredClone(prefs);
  const toggle = (items: string[], p: string) => items.includes(p) ? items.filter(item => item !== p) : [...items, p];
  switch (change.type) {
    case 'hidden': next.hidden = toggle(next.hidden, change.path); break;
    case 'unhide': next.hidden = next.hidden.filter(p => p !== change.path); break;
    case 'pin': next.pinned = toggle(next.pinned, change.path); break;
    case 'pins': next.pinned = [...change.paths]; break;
    case 'color': Object.defineProperty(next.colors, change.path, { value: change.tone, enumerable: true, writable: true, configurable: true }); break;
    case 'order': Object.defineProperty(next.order, change.parent, { value: [...change.paths], enumerable: true, writable: true, configurable: true }); break;
  }
  return next;
}
export function noteCounts(entries: Entry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of entries) if (e.kind === 'note') {
    let p = parentOf(e.path);
    while (p) { counts.set(p, (counts.get(p) ?? 0) + 1); p = parentOf(p); }
  }
  return counts;
}
export function folderColor(prefs: Preferences, p: string, folder: boolean, dark: boolean): string {
  const parts = p.split('/');
  const key = parts[0]!;
  const tone = Object.hasOwn(prefs.colors, key) ? prefs.colors[key]! : 'teal';
  const hex = palette[tone][dark ? 'dark' : 'light'];
  const depth = Math.max(0, parts.length - (folder ? 1 : 2));
  const strength = Math.pow(.72, depth); // Every level becomes less saturated; labels keep the normal text color.
  const neutral = dark ? 174 : 100;
  return '#' + hex.slice(1).match(/../g)!.map(c => Math.round(neutral + (parseInt(c, 16) - neutral) * strength).toString(16).padStart(2, '0')).join('');
}
export function visibleGraph(graph: Graph, prefs: Preferences): Graph {
  const ids = new Map<number, number>();
  const nodes = graph.nodes.filter((n, i) => { if (hiddenBy(n.path, prefs)) return false; ids.set(i, ids.size); return true; });
  const folders = graph.folders.filter(f => f === '' ? nodes.some(n => n.folder === f) : !hiddenBy(f, prefs));
  return { nodes, folders: ordered(folders.map(path => ({ path })), prefs.order['']).map(f => f.path),
    edges: graph.edges.flatMap(([a, b]) => ids.has(a) && ids.has(b) ? [[ids.get(a)!, ids.get(b)!] as [number, number]] : []) };
}
