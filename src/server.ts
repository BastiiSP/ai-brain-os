import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { graphFromIndex } from './graph.js';
import { Vault } from './vault.js';

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const headers = { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
export function localOrigin(host: string | null | undefined, port: number): string | undefined {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}` ? `http://${host}` : undefined;
}

export function createHandler(vault: Vault, base = process.cwd()) {
  const assets: Record<string, [string, string]> = {
    '/': ['public/index.html', 'text/html; charset=utf-8'],
    '/style.css': ['public/style.css', 'text/css; charset=utf-8'],
    '/room.js': ['dist/src/room.js', 'text/javascript; charset=utf-8'],
    '/room-data.js': ['dist/src/room-data.js', 'text/javascript; charset=utf-8'],
    '/room-layout.js': ['dist/src/room-layout.js', 'text/javascript; charset=utf-8'],
    '/three.module.js': ['node_modules/three/build/three.module.js', 'text/javascript; charset=utf-8'],
    '/three.core.js': ['node_modules/three/build/three.core.js', 'text/javascript; charset=utf-8'],
    '/app.js': ['dist/src/client.js', 'text/javascript; charset=utf-8'],
    '/purify.js': ['node_modules/dompurify/dist/purify.min.js', 'text/javascript; charset=utf-8'],
    '/fonts/nunito-latin-wght-normal.woff2': ['public/fonts/nunito-latin-wght-normal.woff2', 'font/woff2'],
    '/fonts/jetbrains-mono-latin-wght-normal.woff2': ['public/fonts/jetbrains-mono-latin-wght-normal.woff2', 'font/woff2']
  };
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const origin = localOrigin(url.host, vault.config.port);
    if (!origin || url.origin !== origin || (request.headers.has('host') && request.headers.get('host') !== url.host) || (request.headers.has('origin') && request.headers.get('origin') !== origin) || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Zugriff nur über die lokale Anwendung.' }, 403);
    if (request.method !== 'GET' && !(request.method === 'POST' && url.pathname === '/api/refresh')) return json({ error: 'Methode nicht erlaubt.' }, 405);
    try {
      if (url.pathname === '/api/refresh') {
        if (request.method !== 'POST' || request.headers.get('x-brain-request') !== '1') return json({ error: 'Aktualisierung benötigt die lokale Anwendung.' }, 403);
        await vault.refresh();
        return json({ updated: vault.snapshot.updated });
      }
      if (url.pathname === '/api/graph') return json(graphFromIndex(vault.snapshot));
      if (url.pathname === '/api/state') return json({ entries: vault.snapshot.entries, updated: vault.snapshot.updated, warnings: vault.snapshot.warnings, durationMs: vault.snapshot.durationMs });
      if (url.pathname === '/api/search') return json(vault.search(url.searchParams.get('q') ?? ''));
      if (url.pathname === '/api/issues') return json(vault.issues());
      if (url.pathname === '/api/resolve') {
        const source = vault.entryPath(url.searchParams.get('source') ?? '') ?? '';
        if (!vault.snapshot.notes.has(source)) return json({ error: 'Quellnotiz nicht verfügbar.' }, 404);
        return json(vault.resolve(url.searchParams.get('link') ?? '', source));
      }
      if (url.pathname === '/api/note' || url.pathname === '/api/file') {
        const p = vault.entryPath(url.searchParams.get('path') ?? '') ?? '';
        if (!vault.allowed(p) || !vault.snapshot.entries.some(e => e.path === p && e.kind !== 'folder')) return json({ error: 'Datei nicht verfügbar.' }, 404);
        // Recheck the live filesystem, even for cached notes, so replaced symlinks/deleted files fail closed.
        await vault.verify(p);
        if (url.pathname === '/api/note') {
          const note = vault.snapshot.notes.get(p);
          return note ? json({ ...note, body: undefined, backlinks: vault.backlinks(p) }) : json({ error: 'Keine Notiz.' }, 404);
        }
        const bytes = await vault.read(p);
        const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
        const type = mime[path.extname(p).toLowerCase()] ?? 'application/octet-stream';
        return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': type, 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': `${type.startsWith('image/') || type === 'application/pdf' ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(path.basename(p))}` } });
      }
      if (assets[url.pathname]) {
        const [file, type] = assets[url.pathname]!;
        return new Response(new Uint8Array(await readFile(path.join(base, file))), { headers: { ...headers, 'Content-Type': type } });
      }
      return json({ error: 'Nicht gefunden.' }, 404);
    } catch { return json({ error: 'Nicht verfügbar. Bitte aktualisieren; Gedächtnispfad, Berechtigungen und Größenlimit prüfen.' }, 422); }
  };
}
