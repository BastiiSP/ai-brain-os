import { roomFixture } from './room-fixture.mjs';
import { startServer } from '../dist/src/http.js';
import { defaultExcludes } from '../dist/src/config.js';
const root = await roomFixture();
console.log(`Erfundenes Test-Gedächtnis: ${root}`);
console.log('Browser: http://127.0.0.1:3211/?view=3d · Beenden mit Ctrl+C. Port 3210 bleibt unangetastet.');
await startServer({ root, port: 3211, exclude: defaultExcludes, maxNoteBytes: 2 * 1024 * 1024 });
