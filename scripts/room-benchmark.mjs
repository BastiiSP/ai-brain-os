import { rm } from 'node:fs/promises';
import { roomFixture } from './room-fixture.mjs';
import { startServer } from '../dist/src/http.js';
import { defaultExcludes } from '../dist/src/config.js';
const root = await roomFixture();
let stopping = false;
const cleanup = async () => { await rm(root, { recursive: true, force: true }); };
try {
  console.log(`Erfundenes Test-Gedächtnis: ${root}`);
  console.log('Browser: http://127.0.0.1:3211/?view=3d · Ctrl+C beendet nur diesen Testserver und entfernt seine Testdaten.');
  const server = await startServer({ root, port: 3211, exclude: defaultExcludes, maxNoteBytes: 2 * 1024 * 1024 });
  const stop = () => { if (stopping) return; stopping = true; server.close(() => { void cleanup(); }); server.closeAllConnections(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  server.once('error', () => { void cleanup(); });
} catch (error) { await cleanup(); throw error; }
