import type { Graph } from './graph.js';
export type Point = [number, number, number];
export interface Board { name: string; x: number; z: number; size: number }
export interface Layout { positions: Point[]; sizes: number[]; boards: Board[]; routes: Point[][]; extent: number; order: number[] }
export function layoutGraph(graph: Graph): Layout {
  const degree = graph.nodes.map(() => 0);
  for (const [a, b] of graph.edges) { degree[a]!++; degree[b]!++; }
  const sizes = degree.map(d => 3.5 + 2.5 * d / (d + 4));
  const groups = graph.folders.map(f => graph.nodes.flatMap((n, i) => n.folder === f ? [i] : []));
  const maxSide = Math.max(1, ...groups.map(g => Math.ceil(Math.sqrt(g.length))));
  const cell = maxSide * 10 + 16;
  const columns = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
  const positions: Point[] = graph.nodes.map(() => [0, 3, 0]);
  const boards = groups.map((ids, f) => {
    const side = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
    const x = (f % columns - (columns - 1) / 2) * cell;
    const z = (Math.floor(f / columns) - (Math.ceil(groups.length / columns) - 1) / 2) * cell;
    ids.forEach((i, k) => { positions[i] = [x + (k % side - (side - 1) / 2) * 10, 3, z + (Math.floor(k / side) - (side - 1) / 2) * 10]; });
    return { name: graph.folders[f] || 'Wurzel', x, z, size: side * 10 + 6 };
  });
  // Each incidence has a different x port within its chip. Each edge has a
  // different y layer. Vertical sections therefore cannot coincide; horizontal
  // sections from different edges cannot be collinear. Crossings are allowed.
  const port = degree.map(() => 0);
  const endpoint = (i: number): Point => {
    const p = positions[i]!;
    const offset = ((++port[i]!) / (degree[i]! + 1) - 0.5) * sizes[i]! * 0.8;
    return [p[0] + offset, p[1] + 1.25, p[2]];
  };
  const routes = graph.edges.map(([a, b], k) => {
    const A = endpoint(a), B = endpoint(b);
    const y = 6 + k * 18 / Math.max(1, graph.edges.length);
    return [A, [A[0], y, A[2]], [B[0], y, A[2]], [B[0], y, B[2]], B] as Point[];
  });
  return { positions, sizes, boards, routes, extent: Math.max(40, cell * columns), order: graph.nodes.map((_, i) => i).sort((a, b) => graph.nodes[a]!.date - graph.nodes[b]!.date || a - b) };
}
