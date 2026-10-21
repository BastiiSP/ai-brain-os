import { mkdirSync, openSync, closeSync, writeSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { format } from 'node:util';
import { LOG_LIMIT } from './access-lib.mjs';

const logDir = path.join(os.homedir(), 'Library', 'Logs', 'AI Brain OS');
const log = path.join(logDir, 'server.log');
const previous = `${log}.1`;
mkdirSync(logDir, { recursive: true, mode: 0o700 });
let size = 0;
let fd;
function rotate() {
  if (fd !== undefined) closeSync(fd);
  try { renameSync(log, previous); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  fd = openSync(log, 'w', 0o600);
  size = 0;
}
try { size = statSync(log).size; } catch (error) { if (error.code !== 'ENOENT') throw error; }
fd = openSync(log, 'a', 0o600);
if (size >= LOG_LIMIT) rotate();
function record(chunk) {
  let bytes = Buffer.from(chunk);
  if (bytes.length > LOG_LIMIT) bytes = bytes.subarray(bytes.length - LOG_LIMIT);
  if (size + bytes.length > LOG_LIMIT) rotate();
  writeSync(fd, bytes);
  size += bytes.length;
}
record(`\n[${new Date().toISOString()}] Dienststart\n`);
for (const level of ['log', 'error', 'warn']) console[level] = (...args) => record(`${format(...args)}\n`);
process.on('uncaughtExceptionMonitor', error => record(`Unbehandelter Fehler: ${error.stack ?? error}\n`));
process.on('warning', warning => record(`Warnung: ${warning.stack ?? warning}\n`));
process.on('exit', code => { record(`[${new Date().toISOString()}] Dienstende: ${code}\n`); closeSync(fd); });
try { await import('../dist/src/main.js'); }
catch (error) { console.error('Start fehlgeschlagen:', error); process.exitCode = 1; }
