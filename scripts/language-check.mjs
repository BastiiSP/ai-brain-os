// Use TypeScript 7's bundled LSP over stdio; no socket or global installation.
import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const child = spawn(process.execPath, ['node_modules/typescript/bin/tsc', '--lsp', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = Buffer.alloc(0);
let sequence = 0;
const pending = new Map();
const send = message => { const body = JSON.stringify({ jsonrpc: '2.0', ...message }); child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`); };
const request = (method, params) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`LSP timeout: ${method}`)); }, 15000);
  pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: value => { clearTimeout(timeout); reject(value); } });
  send({ id, method, params });
});
child.stdout.on('data', data => {
  buffer = Buffer.concat([buffer, data]);
  while (true) {
    const end = buffer.indexOf('\r\n\r\n');
    if (end < 0) break;
    const length = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, end).toString())?.[1]);
    if (!Number.isFinite(length) || buffer.length < end + 4 + length) break;
    const message = JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString());
    buffer = buffer.subarray(end + 4 + length);
    if (message.method && message.id !== undefined) send({ id: message.id, result: message.method === 'workspace/configuration' ? message.params.items.map(() => ({})) : null });
    else if (pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id);
      if (message.error) item.reject(new Error(JSON.stringify(message.error))); else item.resolve(message.result);
    }
  }
});
child.stderr.on('data', data => process.stderr.write(data));
try {
  const rootUri = pathToFileURL(process.cwd()).href;
  const init = await request('initialize', { processId: process.pid, rootUri, workspaceFolders: [{ uri: rootUri, name: 'ai-brain-os' }], capabilities: { textDocument: { diagnostic: {} }, workspace: { configuration: true } } });
  if (!init.capabilities.diagnosticProvider) throw new Error('LSP does not provide pull diagnostics.');
  send({ method: 'initialized', params: {} });
  const files = (await Promise.all(['src', 'tests'].map(async dir => (await readdir(dir)).filter(f => f.endsWith('.ts')).map(f => path.join(dir, f))))).flat();
  let count = 0;
  for (const file of files) {
    const uri = pathToFileURL(path.resolve(file)).href;
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'typescript', version: 1, text: await readFile(file, 'utf8') } } });
    const result = await request('textDocument/diagnostic', { textDocument: { uri } });
    const items = result.items ?? [];
    count += items.length;
    for (const item of items) console.log(`${file}:${item.range.start.line + 1}: ${item.message}`);
  }
  console.log(`LSP: ${files.length} TypeScript-Dateien, ${count} Diagnosen.`);
  if (count) process.exitCode = 1;
  await request('shutdown', undefined);
  const stopped = new Promise(resolve => child.once('exit', resolve));
  send({ method: 'exit' });
  await stopped;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { child.kill(); }
