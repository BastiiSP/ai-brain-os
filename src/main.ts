import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { Vault } from './vault.js';
import { createHandler } from './server.js';

try {
  const config = await loadConfig();
  const vault = new Vault(config);
  await vault.refresh();
  const handler = createHandler(vault);
  const server = createServer(async (req, res) => {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      if (req.headers.host !== `127.0.0.1:${config.port}`) { res.writeHead(403); res.end('Lokaler Zugriff erforderlich.'); return; }
      const request = new Request(`http://127.0.0.1:${config.port}${req.url}`, { method: req.method, headers });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500); res.end('Anfrage fehlgeschlagen.'); }
  });
  server.on('error', error => { console.error(`Start fehlgeschlagen: ${error.message}`); process.exitCode = 1; });
  server.listen(config.port, '127.0.0.1', () => console.log(`AI Brain OS: http://127.0.0.1:${config.port} · ${vault.snapshot.notes.size} Notizen · nur lesend`));
} catch (error) { console.error('Start fehlgeschlagen:', (error as Error).message); process.exitCode = 1; }
