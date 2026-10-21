import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { Config } from './config.js';
import { Vault } from './vault.js';
import { createHandler, localOrigin } from './server.js';
import { SettingsStore } from './settings.js';

// Cancellation must not destroy IncomingMessage's socket before the 413 response.
// Backpressure keeps at most one incoming chunk queued while the handler reads.
export function incomingBody(req: IncomingMessage): ReadableStream<Uint8Array> {
  let cleanup = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const data = (chunk: Buffer) => { req.pause(); controller.enqueue(chunk); };
      const end = () => { cleanup(); controller.close(); };
      const error = (e: Error) => { cleanup(); controller.error(e); };
      cleanup = () => { req.off('data', data); req.off('end', end); req.off('error', error); };
      req.on('data', data); req.once('end', end); req.once('error', error); req.pause();
    },
    pull() { req.resume(); },
    cancel() { cleanup(); req.resume(); }
  });
}

export async function startServer(config: Config) {
  const vault = new Vault(config);
  await vault.refresh();
  const settings = new SettingsStore(config.root, process.cwd());
  settings.cleanup();
  const handler = createHandler(vault, process.cwd(), settings);
  const server = createServer(async (req, res) => {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      const origin = localOrigin(req.headers.host, config.port);
      if (!origin || !req.url?.startsWith('/') || req.url.startsWith('//')) { res.writeHead(403); res.end('Lokaler Zugriff erforderlich.'); return; }
      const init: RequestInit & { duplex?: string } = { method: req.method, headers };
      if (req.method !== 'GET' && req.method !== 'HEAD') { init.body = incomingBody(req); init.duplex = 'half'; }
      const request = new Request(`${origin}${req.url}`, init);
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      if (request.body && !request.body.locked) await request.body.cancel();
      req.resume();
    } catch { res.writeHead(500); res.end('Anfrage fehlgeschlagen.'); }
  });
  server.on('error', error => { console.error(`Start fehlgeschlagen: ${error.message}`); process.exitCode = 1; });
  server.requestTimeout = 15000;
  server.listen(config.port, '127.0.0.1', () => console.log(`AI Brain OS: http://127.0.0.1:${config.port} · ${vault.snapshot.notes.size} Notizen · lokale Ansicht mit Navigationseinstellungen`));
  return server;
}
