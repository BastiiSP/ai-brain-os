import type { Graph } from './graph.js';
import type { Layout } from './room-layout.js';
// Build once. No live DOM collections or per-vertex Color allocations.
export function roomBuffers(graph: Graph, layout: Layout) {
  const positions = new Float32Array(graph.edges.length * 24);
  layout.routes.forEach((route, i) => {
    for (let s = 0; s < 4; s++) {
      positions.set(route[s]!, i * 24 + s * 6);
      positions.set(route[s + 1]!, i * 24 + s * 6 + 3);
    }
  });
  const incident: number[][] = graph.nodes.map(() => []);
  graph.edges.forEach(([a, b], i) => { incident[a]!.push(i); incident[b]!.push(i); });
  const hubs = graph.nodes.map((_, i) => i).sort((a, b) => incident[b]!.length - incident[a]!.length || a - b).slice(0, 5);
  return { positions, incident, hubs };
}
// Focus+context rule: at most ONE fully opaque trace. All other traces are
// context, including a hub's other incident edges. Cycling can reach every edge.
export function isolatedEdge(incident: number[][], focus: number, cursor: number, eligible: (edge: number) => boolean = () => true): number {
  const edges = incident[focus]?.filter(eligible);
  return edges?.length ? edges[((cursor % edges.length) + edges.length) % edges.length]! : -1;
}
