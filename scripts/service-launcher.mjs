import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
const child = spawn(process.execPath, ['dist/src/main.js'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', record);
child.stderr.on('data', record);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', error => { record(`Startfehler: ${error.message}\n`); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  record(`[${new Date().toISOString()}] Server beendet: ${signal ?? code}\n`);
  closeSync(fd);
  process.exit(code === 0 && !signal ? 0 : 1);
});
