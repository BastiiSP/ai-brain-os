// CPU-only profile of the SAME graph/layout/buffer functions as the application.
import { performance } from 'node:perf_hooks';
import { rm } from 'node:fs/promises';
import { roomFixture } from './room-fixture.mjs';
import { Vault } from '../dist/src/vault.js';
import { graphFromIndex } from '../dist/src/graph.js';
import { layoutGraph } from '../dist/src/room-layout.js';
import { roomBuffers } from '../dist/src/room-data.js';
const root = await roomFixture();
try {
  const vault = new Vault({ root, port: 3211, exclude: [], maxNoteBytes: 10000 });
  await vault.refresh();
  const times = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now(); const graph = graphFromIndex(vault.snapshot); const projected = performance.now();
    const layout = layoutGraph(graph); const laidOut = performance.now(); const buffers = roomBuffers(graph, layout); const built = performance.now();
    times.push({ graphMs: +(projected-start).toFixed(2), layoutMs: +(laidOut-projected).toFixed(2), buffersMs: +(built-laidOut).toFixed(2), vertices: buffers.positions.length / 3 });
  }
  console.log(JSON.stringify({ notes: 2000, edges: 4000, indexMs: +vault.snapshot.durationMs.toFixed(2), runs: times, browserMeasured: false }, null, 2));
} finally { await rm(root, { recursive: true, force: true }); }
