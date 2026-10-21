import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Vault } from '../dist/src/vault.js';
import { graphFromIndex } from '../dist/src/graph.js';
import { layoutGraph } from '../dist/src/room-layout.js';
import { createHandler } from '../dist/src/server.js';
import { roomFixture } from '../scripts/room-fixture.mjs';
async function manifest(root) {
  const result = {};
  for (const file of (await readdir(root, { recursive: true })).sort()) {
    const p = path.join(root, file), s = await stat(p);
    result[file] = s.isFile() ? [s.mtimeMs, createHash('sha256').update(await readFile(p)).digest('hex')] : 'directory';
  }
  return result;
}
function independentCounts(vault, graph) {
  const notes = vault.snapshot.entries.filter(e => e.kind === 'note').map(e => e.path);
  assert.deepEqual(graph.nodes.map(n => n.path).sort(), [...notes].sort());
  const expected = new Set();
  for (const n of vault.snapshot.notes.values()) for (const l of n.links) {
    if (l.kind === 'resolved' && l.targets.length === 1 && notes.includes(l.targets[0]) && l.targets[0] !== n.path) expected.add(JSON.stringify([n.path, l.targets[0]].sort()));
  }
  const actual = graph.edges.map(([a,b]) => JSON.stringify([graph.nodes[a].path, graph.nodes[b].path].sort()));
  assert.equal(actual.length, expected.size); assert.deepEqual(new Set(actual), expected);
}
// Independent geometric oracle: group collinear segments, then sweep intervals.
// Use Float32, matching the geometry actually sent to WebGL, not just doubles.
function noSharedSections(routes) {
  const groups = new Map();
  routes.forEach((route, edge) => route.slice(1).forEach((end, i) => {
    const a = route[i].map(Math.fround), b = end.map(Math.fround);
    const axes = [0,1,2].filter(k => a[k] !== b[k]);
    if (!axes.length) return;
    assert.equal(axes.length, 1, 'rechtwinklig'); const axis = axes[0];
    const key = JSON.stringify([axis, ...a.filter((_, k) => k !== axis)]);
    const list = groups.get(key) ?? []; list.push({ edge, low: Math.min(a[axis], b[axis]), high: Math.max(a[axis], b[axis]) }); groups.set(key, list);
  }));
  for (const list of groups.values()) {
    list.sort((a,b) => a.low - b.low);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && list[j].low < list[i].high; j++) assert.equal(list[i].edge, list[j].edge, 'Bahnen teilen einen Abschnitt');
  }
}
test('R3: geometrischer Prüfer erkennt auch teilweise überlappende Abschnitte', () => {
  assert.throws(() => noSharedSections([[[0,0,0],[5,0,0]], [[2,0,0],[7,0,0]]]));
  noSharedSections([[[0,0,0],[5,0,0]], [[5,0,0],[7,0,0]]]);
});
test('R1/R2/R3/R5/R6/G1: Index, Paarbildung, Ressourcen, Ausschlüsse, Datum und Sockel', async () => {
  await mkdir('.test-work', { recursive: true }); const root = await mkdtemp(path.resolve('.test-work/graph-'));
  try {
    const files = { '01 Test/A.md': '---\ndate: 2020-01-02\n---\n[[B]] [[B]] [[01 Test/A]] [[01 Test]] [[Bild.txt]] [[Fehlt]] [[Doppelt]] [[Privat/Geheim]]', '01 Test/B.md': '[[A]]', 'Bild.txt': 'Erfunden', '05 Daily Notes/Tag.md': '[[A]]', '02 Andere/Doppelt.md': '', '03 Andere/Doppelt.md': '', 'Privat/Geheim.md': '', '.hidden.md': '', '01 Test/Fallback.md': '---\ndate: ungültig\n---\n' };
    for (const [p, content] of Object.entries(files)) { await mkdir(path.dirname(path.join(root,p)), { recursive: true }); await writeFile(path.join(root,p), content); }
    const before = await manifest(root); const vault = new Vault({ root, port: 3211, exclude: ['Privat'], maxNoteBytes: 10000 }); await vault.refresh();
    const graph = graphFromIndex(vault.snapshot); independentCounts(vault, graph); assert.equal(graph.edges.length, 2);
    const a = graph.nodes.find(n => n.path === '01 Test/A.md'); assert.equal(a.resources.length, 2); assert.equal(a.date, Date.parse('2020-01-02'));
    assert(graph.nodes.find(n => n.path.startsWith('05 Daily Notes/')).daily);
    const fallback = graph.nodes.find(n => n.path.endsWith('Fallback.md')); assert.equal(fallback.date, (await stat(path.join(root, fallback.path))).mtimeMs);
    const layout = layoutGraph(graph); noSharedSections(layout.routes); assert.equal(layout.boards.length, graph.folders.length);
    assert.equal(layout.order[0], graph.nodes.indexOf(a));
    const handler = createHandler(vault); const req = p => new Request('http://127.0.0.1:3211' + p);
    assert.deepEqual(await (await handler(req('/api/graph'))).json(), graph);
    assert.equal((await handler(new Request('http://evil.test:3211/api/graph'))).status, 403);
    for (const p of ['/room.js','/room-layout.js','/room-data.js','/three.module.js','/three.core.js']) { const r = await handler(req(p)); assert.equal(r.status, 200); assert.equal(r.headers.get('content-security-policy'), "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"); }
    await vault.refresh(); assert.deepEqual(await manifest(root), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('R1/R3/R8/G1: 2000 erfundene Notizen, 4000 Paare, keine gemeinsamen Abschnitte', async t => {
  const root = await roomFixture();
  try {
    const before = await manifest(root); const vault = new Vault({ root, port: 3211, exclude: [], maxNoteBytes: 10000 }); await vault.refresh();
    const graph = graphFromIndex(vault.snapshot); independentCounts(vault, graph); assert.equal(graph.nodes.length, 2000); assert.equal(graph.edges.length, 4000);
    const start = performance.now(); const layout = layoutGraph(graph); const ms = performance.now() - start;
    noSharedSections(layout.routes);
    for (let a = 0; a < layout.positions.length; a++) for (let b = a + 1; b < layout.positions.length; b++) assert(Math.hypot(layout.positions[a][0]-layout.positions[b][0], layout.positions[a][2]-layout.positions[b][2]) >= 10);
    assert.deepEqual(await manifest(root), before);
    t.diagnostic(`Layout ${ms.toFixed(1)} ms; Index ${vault.snapshot.durationMs.toFixed(1)} ms. Keine Browser-/FPS-Messung.`);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('R3: viele Anschlüsse an einem Hub und unveränderte, deterministische Geometrie', () => {
  const nodes = Array.from({ length: 2000 }, (_, i) => ({ path: `A/${i}.md`, title: String(i), folder: 'A', date: i, daily: false, resources: [] }));
  const graph = { nodes, folders: ['A'], edges: nodes.slice(1).map((_, i) => [0, i + 1]) };
  const layout = layoutGraph(graph); noSharedSections(layout.routes); assert.deepEqual(layout, layoutGraph(graph));
  assert(layout.sizes[0] > layout.sizes[1]);
});

test('F1/F2: Puffer entsprechen Routen; Einzelbahn bleibt auch am großen Hub isolierbar', async t => {
  const { roomBuffers, isolatedEdge } = await import('../dist/src/room-data.js');
  const graph = { nodes: Array.from({ length: 2000 }, (_, i) => ({ path: `A/${i}.md`, title: String(i), folder: 'A', date: i, daily: false, resources: [] })), folders: ['A'], edges: Array.from({ length: 1999 }, (_, i) => [0, i + 1]) };
  const start = performance.now(); const layout = layoutGraph(graph); const layoutEnd = performance.now(); const data = roomBuffers(graph, layout); const end = performance.now();
  assert.equal(data.positions.length, graph.edges.length * 24);
  layout.routes.forEach((route, i) => { for (let s = 0; s < 4; s++) assert.deepEqual([...data.positions.slice(i * 24 + s * 6, i * 24 + s * 6 + 6)], [...route[s], ...route[s + 1]].map(Math.fround)); });
  assert.equal(data.hubs[0], 0);
  const reached = new Set(); for (let i = 0; i < 1999; i++) reached.add(isolatedEdge(data.incident, 0, i));
  assert.deepEqual([...reached].sort((a,b) => a-b), Array.from({ length: 1999 }, (_, i) => i));
  assert.equal(isolatedEdge(data.incident, 0, -1), 1998);
  assert.equal(isolatedEdge(data.incident, 0, 1999), 0);
  assert.equal(isolatedEdge(data.incident, -1, 0), -1);
  assert.equal(isolatedEdge(data.incident, 0, 0, e => e === 500), 500);
  assert.equal(isolatedEdge(data.incident, 0, 0, () => false), -1);
  t.diagnostic(`Hub: Layout ${(layoutEnd-start).toFixed(2)} ms; Renderpuffer ${(end-layoutEnd).toFixed(2)} ms`);
});
