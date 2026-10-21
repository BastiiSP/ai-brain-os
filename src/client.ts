import { Navigation } from './navigation.js';
import { hiddenBy, ordered, visibleGraph } from './preferences.js';
import type { SettingsState } from './preferences.js';
import type { Graph } from './graph.js';
import type { createRoom } from './room.js';
import type { Entry, Link, Note } from './vault.js';
declare const DOMPurify: { sanitize: (html: string, options: { ADD_ATTR: string[] }) => string };
interface State { settings: SettingsState; entries: Entry[]; updated: string; warnings: string[]; durationMs: number }
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const main = el('main');
const status = el('status');
let state: State;
let generation = 0;
type Theme = 'light' | 'dark' | 'system';
const themeKey = 'ai-brain-os-theme';
function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(themeKey);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch { return 'system'; }
}
function setTheme(theme: Theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
  });
}
setTheme(savedTheme());
document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
  const theme = button.dataset.themeChoice as Theme;
  setTheme(theme);
  try { localStorage.setItem(themeKey, theme); } catch { /* Private browsing may block storage. */ }
}));
let factsUrl = '/';
let room: ReturnType<typeof createRoom> | undefined;
const roomCamera = { azimuth: -.8, polar: .65, distance: 0 };
function icon(entry: Entry): string {
  if (entry.kind === 'folder') return '<span class="entry-icon folder" aria-hidden="true"></span>';
  if (entry.kind === 'note') return '<span class="entry-icon note" aria-hidden="true"></span>';
  const extension = entry.path.split('.').at(-1)?.toLowerCase() ?? '';
  const types: Record<string, [string, string]> = {
    png: ['image', 'IMG'], jpg: ['image', 'IMG'], jpeg: ['image', 'IMG'], gif: ['image', 'IMG'], webp: ['image', 'IMG'], avif: ['image', 'IMG'], svg: ['image', 'SVG'],
    pdf: ['pdf', 'PDF'], mp3: ['audio', 'AUD'], wav: ['audio', 'AUD'], m4a: ['audio', 'AUD'], mp4: ['video', 'VID'], mov: ['video', 'VID'], webm: ['video', 'VID'],
    zip: ['archive', 'ZIP'], gz: ['archive', 'GZ'], txt: ['text', 'TXT'], csv: ['text', 'CSV'],
    doc: ['text', 'DOC'], docx: ['text', 'DOC'], xls: ['text', 'XLS'], xlsx: ['text', 'XLS'], ppt: ['text', 'PPT'], pptx: ['text', 'PPT']
  };
  const [kind, label] = types[extension] ?? ['other', /^[a-z0-9]{1,4}$/.test(extension) ? extension.slice(0, 3).toUpperCase() : 'FILE'];
  return `<span class="entry-icon ${kind}" aria-hidden="true">${label}</span>`;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const href = (p: string, anchor = '') => `/?path=${encodeURIComponent(p)}${anchor && !anchor.startsWith('^') ? '#' + encodeURIComponent('heading-' + anchor.normalize('NFC').toLowerCase().trim().replace(/\s+/g, '-')) : ''}`;
const a = (p: string, label = p, anchor = '') => `<a href="${escape(href(p, anchor))}">${escape(label)}</a>`;
const entryLink = (entry: Entry) => `<a href="${escape(href(entry.path))}">${icon(entry)}<span>${escape(entry.title)}</span></a>`;
function show(html: string) { main.innerHTML = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }); }
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Anfrage fehlgeschlagen.');
  return result as T;
}
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Unbekannter Fehler.'; }
const navigation = new Navigation(el('tree'), async (current, revision) => {
  const refresh = el<HTMLButtonElement>('refresh'); refresh.disabled = true;
  try {
    const settings = await api<SettingsState>('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Brain-Request': '1' }, body: JSON.stringify({ current, revision }) });
    state.settings = settings;
    room?.dispose(); room = undefined;
    await route();
    return settings;
  } finally { refresh.disabled = false; }
}, async () => {
  await api('/api/refresh', { method: 'POST', headers: { 'X-Brain-Request': '1' } });
  await load(); room?.dispose(); room = undefined; await route();
});
async function load() {
  state = await api<State>('/api/state');
  navigation.update(state.entries, state.settings);
  status.textContent = `${state.entries.filter(e => e.kind === 'note').length} Notizen · Zuletzt eingelesen: ${new Date(state.updated).toLocaleString('de-DE')} · ${Math.round(state.durationMs)} ms${state.warnings.length ? ` · ${state.warnings.length} Hinweise (Startseite)` : ''}`;
  if (state.settings.warning) status.textContent += ' · ' + state.settings.warning;
}
function linkDetails(link: Link) {
  if (link.kind === 'resolved') return `<p>${a(link.targets[0]!, 'Ziel öffnen: ' + link.targets[0], link.anchor)}</p>`;
  if (link.kind === 'external') return `<p><a href="${escape(link.targets[0]!)}" target="_blank" rel="noopener noreferrer">Extern öffnen ↗</a></p>`;
  return `<p class="notice">${link.kind === 'ambiguous' ? 'Mehrere passende Ziele. Bitte auswählen.' : 'Diese Verknüpfung ist nicht aufgelöst.'}</p><ul>${link.targets.map(p => `<li>${a(p, p, link.anchor)}</li>`).join('')}</ul>${link.suggestions.length ? '<h2>Möglicherweise gemeint</h2><p>Vorschläge anhand des Dateinamens; bitte selbst prüfen.</p><ul>' + link.suggestions.map(p => `<li>${a(p, p, link.anchor)}</li>`).join('') + '</ul>' : ''}`;
}
async function route() {
  const ticket = ++generation;
  const params = new URLSearchParams(location.search);
  const spatial = params.get('view') === '3d';
  document.body.classList.toggle('spatial-view', spatial);
  room?.activate(false);
  room?.root.remove();
  el<HTMLButtonElement>('view-facts').setAttribute('aria-pressed', String(!spatial));
  el<HTMLButtonElement>('view-3d').setAttribute('aria-pressed', String(spatial));
  if (!spatial) factsUrl = location.pathname + location.search + location.hash;
  const address = params.get('path');
  const matches = address === null ? [] : state.entries.filter(e => e.path.normalize('NFC') === address.normalize('NFC'));
  const p = matches.length === 1 ? matches[0]!.path : address;
  const query = params.get('q');
  el<HTMLInputElement>('search').value = query ?? '';
  const commit = (html: string) => { if (ticket === generation) show(html); };
  try {
    if (spatial) {
      if (!room) {
        const started = performance.now();
        commit('<p>Wissensraum wird aufgebaut …</p>');
        const [module, graph] = await Promise.all([import('./room.js'), api<Graph>('/api/graph')]);
        if (ticket !== generation) return;
        room = module.createRoom(visibleGraph(graph, state.settings.current), path => navigate(href(path)), roomCamera, started, state.settings.current);
      }
      if (ticket !== generation) return;
      main.replaceChildren(room.root); room.activate(true);
    } else if (query !== null) {
      const hits = await api<Array<{ path: string; title: string; snippet: string }>>('/api/search?q=' + encodeURIComponent(query));
      commit(`<h1>Suche: ${escape(query)}</h1><p>${hits.length} Treffer</p>${hits.map(hit => `<section class="result"><h2>${a(hit.path, hit.title)}</h2><small>${escape(hit.path)}</small><p>${escape(hit.snippet)}</p></section>`).join('') || '<p>Keine passenden Notizen gefunden.</p>'}`);
    } else if (params.get('view') === 'issues') {
      const issues = await api<Array<Link & { source: string }>>('/api/issues');
      commit(`<h1>Offene Verknüpfungen</h1><p>${issues.length} nicht aufgelöste oder mehrdeutige Verknüpfungen.</p>${issues.map(l => `<section class="result"><p>In ${a(l.source)}</p><h2>${escape(l.raw)}</h2>${linkDetails(l)}</section>`).join('')}`);
    } else if (params.has('link') && params.has('source')) {
      const link = await api<Link>('/api/resolve?' + params.toString());
      commit(`<p>Aus ${a(params.get('source')!)}</p><h1>${escape(link.label)}</h1>${linkDetails(link)}`);
    } else if (p) {
      const entry = state.entries.find(e => e.path === p);
      if (!entry) throw new Error('Diese Datei ist nicht mehr vorhanden oder ausgeschlossen. Bitte aktualisieren.');
      if (entry.kind === 'folder') {
        commit(`<h1>${icon(entry)} ${escape(entry.title)}</h1><p class="breadcrumb">${escape(p)}</p><ul class="folder-list">${ordered(state.entries.filter(e => e.path.startsWith(p + '/') && !e.path.slice(p.length + 1).includes('/') && !hiddenBy(e.path, state.settings.current)), state.settings.current.order[p]).map(e => `<li>${entryLink(e)} <small>${e.kind === 'folder' ? 'Ordner' : e.kind === 'note' ? 'Notiz' : 'Anhang'}</small></li>`).join('')}</ul>`);
      } else if (entry.kind === 'file') {
        const url = '/api/file?path=' + encodeURIComponent(p);
        commit(`<h1>${icon(entry)} ${escape(entry.title)}</h1><p class="breadcrumb">${escape(p)}</p><p><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">Anhang öffnen ↗</a></p>${/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(p) ? `<img src="${escape(url)}" alt="${escape(entry.title)}">` : ''}`);
      } else {
        const note = await api<Note & { backlinks: string[] }>('/api/note?path=' + encodeURIComponent(p));
        commit(`<p class="breadcrumb">${escape(note.path)}</p><h1 class="note-title">${icon(entry)} ${escape(note.title)}</h1>${Object.keys(note.metadata).length ? '<dl class="metadata">' + Object.entries(note.metadata).map(([key, value]) => `<dt>${escape(key)}</dt><dd>${escape(Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(', ') : typeof value === 'string' ? value : JSON.stringify(value))}</dd>`).join('') + '</dl>' : ''}${note.warnings.map(w => `<p class="notice">${escape(w)}</p>`).join('')}<article>${note.html}</article><section class="backlinks"><h2>Rückverweise (${note.backlinks.length})</h2>${note.backlinks.length ? '<ul>' + note.backlinks.map(p => `<li>${a(p)}</li>`).join('') + '</ul>' : '<p>Keine Rückverweise.</p>'}</section>`);
      }
    } else {
      commit(`<p class="eyebrow">Dein persönlicher Wissensraum</p><h1>Gedanken wiederfinden.<br>Verbindungen entdecken.</h1><p>Durchsuche dein Gedächtnis oder öffne links einen Ordner. Mit „Aktualisieren“ liest du Änderungen anderer Anwendungen ein.</p><p class="notice">Die Originale bleiben erhalten. Nur deine Navigationseinstellungen werden gespeichert.</p>${state.warnings.length ? '<h2>Hinweise beim Einlesen</h2><ul>' + state.warnings.map(w => `<li>${escape(w)}</li>`).join('') + '</ul>' : ''}`);
    }
    if (ticket === generation) {
      document.title = (spatial ? '3D-Ansicht' : p?.split('/').at(-1) ?? 'Gedächtnis') + ' · AI Brain OS';
      if (location.hash) {
        try {
          const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
          if (target) target.scrollIntoView();
          else { const hint = document.createElement('p'); hint.className = 'notice'; hint.textContent = 'Überschrift nicht gefunden; die Notiz ist geöffnet.'; main.prepend(hint); }
        } catch { /* Invalid fragment does not prevent reading. */ }
      } else window.scrollTo(0, 0);
    }
  } catch (error) { commit(`<h1>Ansicht nicht verfügbar</h1><p class="notice">${escape(errorMessage(error))}</p>`); }
}
function navigate(url: string) { history.pushState(null, '', url); void route(); }
el<HTMLButtonElement>('view-facts').addEventListener('click', () => { if (location.search === '?view=3d') navigate(factsUrl); });
el<HTMLButtonElement>('view-3d').addEventListener('click', () => { if (location.search !== '?view=3d') navigate('/?view=3d'); });
document.addEventListener('click', event => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('a');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
  const url = new URL(link.href);
  if (url.origin === location.origin && url.pathname === '/') { event.preventDefault(); navigate(url.href); }
});
window.addEventListener('popstate', () => { void route(); });
el('search-form').addEventListener('submit', event => { event.preventDefault(); navigate('/?q=' + encodeURIComponent(el<HTMLInputElement>('search').value.trim())); });
el<HTMLButtonElement>('refresh').addEventListener('click', async () => {
  const button = el<HTMLButtonElement>('refresh'); button.disabled = true; status.textContent = 'Gedächtnis wird neu eingelesen …';
  try { await api('/api/refresh', { method: 'POST', headers: { 'X-Brain-Request': '1' } }); await load(); room?.dispose(); room = undefined; await route(); }
  catch (error) { status.textContent = errorMessage(error); }
  finally { button.disabled = false; }
});
try { await load(); await route(); } catch (error) { status.textContent = errorMessage(error); }
