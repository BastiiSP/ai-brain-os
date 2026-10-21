import type { Snapshot } from './vault.js';
export interface GraphNode { path: string; title: string; folder: string; daily: boolean; date: number; resources: { path: string; label: string; kind: string }[] }
export interface Graph { nodes: GraphNode[]; edges: [number, number][]; folders: string[] }
export function graphFromIndex(snapshot: Snapshot): Graph {
  const notes = [...snapshot.notes.values()].sort((a, b) => a.path.localeCompare(b.path, 'de'));
  const ids = new Map(notes.map((n, i) => [n.path, i]));
  const entries = new Map(snapshot.entries.map(e => [e.path, e]));
  const pairs = new Set<string>();
  const nodes = notes.map((note, i) => {
    const resources: GraphNode['resources'] = [];
    for (const link of note.links) {
      if (link.kind !== 'resolved' || link.targets.length !== 1) continue;
      const target = link.targets[0]!;
      const j = ids.get(target);
      if (j !== undefined) { if (i !== j) pairs.add(`${Math.min(i, j)},${Math.max(i, j)}`); }
      else { const entry = entries.get(target); if (entry) resources.push({ path: target, label: link.label, kind: entry.kind }); }
    }
    const date = typeof note.metadata.date === 'string' ? Date.parse(note.metadata.date) : NaN;
    return { path: note.path, title: note.title, folder: note.path.includes('/') ? note.path.split('/')[0]! : '', daily: note.path.startsWith('05 Daily Notes/'), date: Number.isFinite(date) ? date : note.modifiedMs ?? 0, resources };
  });
  return { nodes, edges: [...pairs].map(p => p.split(',').map(Number) as [number, number]), folders: [...new Set([...snapshot.entries.filter(e => e.kind === 'folder' && !e.path.includes('/')).map(e => e.path), ...nodes.map(n => n.folder)])].sort() };
}
