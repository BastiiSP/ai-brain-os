import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rename, rm, symlink, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Vault } from '../src/vault.js';
import { createHandler, localOrigin } from '../src/server.js';
import { defaultExcludes, loadConfig } from '../src/config.js';

const origin = 'http://127.0.0.1:3210';
async function fixture() {
  await mkdir('.test-work', { recursive: true });
  const base = await mkdtemp(path.resolve('.test-work/run-'));
  const root = path.join(base, 'memory');
  const put = async (p: string, value: string | Buffer) => { await mkdir(path.dirname(path.join(root, p)), { recursive: true }); await writeFile(path.join(root, p), value); };
  const files: Record<string, string | Buffer> = {
    'Start.md': '---\ntags: [wissen, grün]\nstatus: aktiv\ndate: 2026-10-21\n---\n# Start\n[[A/Übergaben|Anleitung]]\n[[Doppelt]]\n[[Alt/Verschoben]]\n[[Fehlt]]\n[[A]]\n[[A/Übergaben#Überschrift]]\n[[A/Übergaben#^block]]\n![[A/Übergaben]]\n[relativ](A/%C3%9Cbergaben.md)\n[extern](https://example.org)\n![[Bilder/Test.svg]]\n![Bild](Bilder/Test.png)\n[[Bilder/Anhang.pdf]]\n\n| Link | Wert |\n| --- | --- |\n| [[A/Übergaben\\|Tabellenalias]] | ja |\n\n`[[InlineFake]]`\n\n```md\n[[CodeFake]]\n```\n\n- [ ] Aufgabe\n- [x] Erledigt\n\n> [!NOTE] Hinweis\n> Callout-Inhalt\n',
    'A/Übergaben.md': '# Überschrift\n\nBekannte Übergaben und Anwesenheitstool.\n\n## Noch **eine** Überschrift\n\n> Zitat\n\n1. Eins\n2. Zwei\n',
    'A/Daily.md': '[[../Start]]\n[[Übergaben]]\n[[Pool/Person]]\n[[#Heute]]\n# Heute\n',
    'B/Doppelt.md': 'Version B',
    'C/Doppelt.md': 'Version C',
    'Archiv/Verschoben.md': 'Archiviert',
    'Ressourcen/Pool/Person.md': 'Eine Person',
    'A/Start.md': 'Lokaler Start',
    'Bilder/Test.svg': '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>',
    'Bilder/Test.png': Buffer.from('89504e470d0a1a0a', 'hex'),
    'Bilder/Anhang.pdf': '%PDF-test',
    'Bilder/Seite.html': '<script>alert(1)</script>',
    'Leer.md': '',
    'Defekt.md': '---\ntags: [kaputt\n---\n# Trotzdem lesbar\n',
    'OhneAbschluss.md': '---\ntags: kaputt\n',
    'Zyklus.md': '---\ntags: &a [*a]\n---\nText',
    'Bytes.md': Buffer.from([0xff, 0xfe, 0x80]),
    'Gross.md': 'x'.repeat(2 * 1024 * 1024 + 1),
    'Angriff.md': '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n[bad](javascript:alert(1))\n[[javascript:alert(1)|Klick]]\n[[A/Übergaben|<img onerror=alert(1)>]]\n![remote](https://example.org/tracker.png)',
    '00 Kontext/Tokens & Zugänge.md': 'GEHEIMES_TOKEN',
    'Privat/Notiz.md': 'VERTRAULICH',
    '.obsidian/Test.md': 'VERSTECKT',
    'A/.unsichtbar.md': 'VERSTECKT',
    '.git/config': 'VERSTECKT'
  };
  for (const [p, value] of Object.entries(files)) await put(p, value);
  await writeFile(path.join(base, 'outside.md'), 'AUSSERHALB');
  await symlink(path.join(base, 'outside.md'), path.join(root, 'Flucht.md'));
  await symlink(path.join(root, 'A'), path.join(root, 'Alias'));
  const vault = new Vault({ root, port: 3210, exclude: [...defaultExcludes, 'Privat'], maxNoteBytes: 2 * 1024 * 1024 });
  await vault.refresh();
  return { base, root, put, files, vault, handler: createHandler(vault), cleanup: () => rm(base, { recursive: true, force: true }) };
}
async function use(fn: (f: Awaited<ReturnType<typeof fixture>>) => Promise<void>) {
  const f = await fixture();
  try { await fn(f); } finally { await f.cleanup(); }
}
const get = (route: string) => new Request(origin + route);

test('A3/G2: lokale Schriftdateien und restriktive CSP', () => use(async ({ handler }) => {
  for (const font of ['nunito-latin-wght-normal', 'jetbrains-mono-latin-wght-normal']) {
    const response = await handler(get('/fonts/' + font + '.woff2'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'font/woff2');
    assert.equal(Buffer.from(await response.arrayBuffer()).toString('ascii', 0, 4), 'wOF2');
    const csp = response.headers.get('content-security-policy') ?? '';
    assert(csp.includes("font-src 'self'"));
    assert(csp.includes("default-src 'none'"));
  }
  const page = await handler(get('/'));
  assert.equal(page.status, 200);
  assert(!(await page.text()).includes('https://'));
}));

test('F-1/F-3/F-4: lokales Chip-Hirn-Favicon mit unverändertem Hostschutz und CSP', () => use(async ({ handler }) => {
  const source = await readFile(path.resolve('assets/icon-chip-hirn.svg'), 'utf8');
  for (const host of ['127.0.0.1:3210', 'localhost:3210']) {
    const local = `http://${host}`;
    const request = (route: string, headers: Record<string, string> = {}) => handler(new Request(local + route, { headers: { Host: host, ...headers } }));
    const page = await request('/');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
    const favicon = await request('/favicon.svg', { Origin: local });
    assert.equal(favicon.status, 200);
    assert.equal(favicon.headers.get('content-type'), 'image/svg+xml');
    assert.equal(favicon.headers.get('content-security-policy'), page.headers.get('content-security-policy'));
    assert.equal(favicon.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await favicon.text(), source);
    assert.equal((await request('/favicon.svg', { Host: 'evil.test:3210' })).status, 403);
    assert.equal((await request('/favicon.svg', { Origin: 'https://evil.test' })).status, 403);
  }
}));

test('E2: Navigation entspricht unabhängig festgelegter sichtbarer Dateiliste', () => use(async ({ vault, files }) => {
  const expected = Object.keys(files).filter(p => !p.split('/').some(s => s.startsWith('.')) && !p.startsWith('Privat/') && !defaultExcludes.includes(p)).sort();
  assert.deepEqual(vault.snapshot.entries.filter(e => e.kind !== 'folder').map(e => e.path).sort(), expected);
  assert(vault.snapshot.entries.some(e => e.path === 'A' && e.kind === 'folder'));
  assert(!JSON.stringify(vault.snapshot.entries).includes('Tokens & Zugänge'));
}));

test('E3/E4: Markdown, Frontmatter, Tabelle, maskierter Alias, Aufgaben, Bilder und Code', () => use(async ({ vault }) => {
  const note = vault.snapshot.notes.get('Start.md')!;
  assert.deepEqual(note.metadata, { tags: ['wissen', 'grün'], status: 'aktiv', date: '2026-10-21' });
  for (const text of ['<table>', 'Tabellenalias</a>', '☐ Aufgabe', '☑ Erledigt', 'NOTE · Hinweis', '<blockquote>', '<pre><code', 'alt="Bild"']) assert(note.html.includes(text), text);
  assert(!note.body.includes('tags:'));
  assert(!note.links.some(l => /Fake/.test(l.raw)));
  assert(note.html.includes('InlineFake'));
  assert(note.links.some(l => l.raw === 'A/Übergaben' && l.kind === 'resolved'));
  assert(note.html.includes('src="/api/file?path=Bilder%2FTest.svg"'));
  assert(note.html.includes('target="_blank" rel="noopener noreferrer"'));
  assert(vault.snapshot.notes.get('A/Übergaben.md')!.html.includes('id="heading-noch-eine-überschrift"'));
}));

test('E4: Stufen a–e, NFC, Großschreibung, .md, Alias, Anker, Teilpfad und Vorschläge', () => use(async ({ vault }) => {
  for (const target of ['A/Übergaben', 'a/ÜBERGABEN.MD', 'A/U\u0308bergaben|Alias', 'A/Übergaben\\|Alias', 'Übergaben']) {
    assert.deepEqual(vault.resolve(target, 'Start.md').targets, ['A/Übergaben.md'], target);
  }
  assert.deepEqual(vault.resolve('Start', 'A/Daily.md').targets, ['Start.md']); // root beats relative
  assert.deepEqual(vault.resolve('../Start', 'A/Daily.md').targets, ['Start.md']);
  assert.deepEqual(vault.resolve('Übergaben', 'A/Daily.md').targets, ['A/Übergaben.md']);
  assert.deepEqual(vault.resolve('Pool/Person', 'A/Daily.md').targets, ['Ressourcen/Pool/Person.md']);
  assert.deepEqual(vault.resolve('Person', 'Start.md').targets, ['Ressourcen/Pool/Person.md']);
  assert.equal(vault.resolve('Doppelt', 'Start.md').kind, 'ambiguous');
  assert.deepEqual(vault.resolve('Doppelt', 'Start.md').targets, ['B/Doppelt.md', 'C/Doppelt.md']);
  assert.deepEqual(vault.resolve('A', 'Start.md').targets, ['A']);
  assert.equal(vault.resolve('Fehlt', 'Start.md').kind, 'missing');
  assert.deepEqual(vault.resolve('Alt/Verschoben', 'Start.md').suggestions, ['Archiv/Verschoben.md']);
  assert.equal(vault.resolve('Alt/Verschoben', 'Start.md').kind, 'missing');
  assert.deepEqual(vault.resolve('#Heute', 'A/Daily.md').targets, ['A/Daily.md']);
  assert.equal(vault.resolve('A/Übergaben#Überschrift', 'Start.md').anchor, 'Überschrift');
  assert.equal(vault.resolve('A/Übergaben#^block', 'Start.md').kind, 'resolved');
  assert(vault.snapshot.notes.get('Start.md')!.html.includes('#heading-%C3%BCberschrift'));
  assert(!vault.snapshot.notes.get('Start.md')!.html.includes('#heading-%5Eblock'));
  assert.deepEqual(vault.backlinks('A/Übergaben.md').sort(), ['A/Daily.md', 'Angriff.md', 'Start.md']);
  assert(vault.issues().some(l => l.source === 'Start.md' && l.raw === 'Alt/Verschoben'));
}));

test('E4: Mehrdeutige Teilpfade, lokale Dateinamen und ausgeschlossene Ziele', () => use(async ({ vault, put }) => {
  await put('Weitere/Pool/Person.md', 'Andere Person');
  await put('A/Doppelt.md', 'Lokal');
  await put('A/Tokens & Zugänge.md', 'Öffentlicher Namensvetter');
  await vault.refresh();
  assert.equal(vault.resolve('Pool/Person', 'Start.md').kind, 'ambiguous');
  assert.deepEqual(vault.resolve('Doppelt', 'A/Daily.md').targets, ['A/Doppelt.md']);
  for (const p of ['00 Kontext/Tokens & Zugänge', '00 Kontext/Tokens & Zugänge.md', '.obsidian/Test', 'Privat/Notiz', '../.git/config']) {
    const result = vault.resolve(p, 'Start.md');
    assert.equal(result.kind, 'missing', p);
    assert.deepEqual(result.suggestions, [], p);
  }
}));

test('E5: Suche nach Titel, Pfad, Volltext und NFC mit Titeltreffern zuerst', () => use(async ({ vault }) => {
  assert.equal(vault.search('u\u0308BERGABEN')[0]!.path, 'A/Übergaben.md');
  assert(vault.search('grün').some(n => n.path === 'Start.md'));
  assert(vault.search('anwesenheitstool').some(n => n.path === 'A/Übergaben.md'));
  assert(vault.search('Ressourcen/Pool').some(n => n.path === 'Ressourcen/Pool/Person.md'));
  for (const q of ['GEHEIMES_TOKEN', 'VERTRAULICH', 'VERSTECKT', 'AUSSERHALB']) assert.deepEqual(vault.search(q), []);
}));

test('E6: Erstellen, Ändern, Umbenennen, Löschen aktualisiert alle Ansichten', () => use(async ({ vault, put, root, handler }) => {
  await put('Neu.md', 'NeuerSuchbegriff [[A/Übergaben]]');
  await put('A/Daily.md', 'GeänderterSuchbegriff [[Neu]]');
  await rename(path.join(root, 'A/Übergaben.md'), path.join(root, 'A/Umbenannt.md'));
  await rm(path.join(root, 'B/Doppelt.md'));
  assert(!vault.snapshot.notes.has('Neu.md'));
  const refreshed = await handler(new Request(origin + '/api/refresh', { method: 'POST', headers: { 'X-Brain-Request': '1' } }));
  assert.equal(refreshed.status, 200);
  assert(vault.snapshot.notes.has('Neu.md'));
  assert(vault.snapshot.notes.has('A/Umbenannt.md'));
  assert(!vault.snapshot.entries.some(e => e.path === 'B/Doppelt.md' || e.path === 'A/Übergaben.md'));
  assert.equal(vault.search('GeänderterSuchbegriff')[0]!.path, 'A/Daily.md');
  assert.equal(vault.search('NeuerSuchbegriff')[0]!.path, 'Neu.md');
  assert.deepEqual(vault.backlinks('Neu.md'), ['A/Daily.md']);
  assert.equal(vault.resolve('A/Übergaben', 'Start.md').kind, 'missing');
  assert.equal(vault.resolve('Doppelt', 'Start.md').kind, 'resolved');
  assert(vault.issues().some(l => l.source === 'Start.md' && l.raw === 'A/Übergaben|Anleitung'));
}));

async function manifest(root: string, relative = ''): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const p = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) Object.assign(result, await manifest(root, p));
    else { const s = await stat(path.join(root, p)); result[p] = s.mtimeMs + ':' + createHash('sha256').update(await readFile(path.join(root, p))).digest('hex'); }
  }
  return result;
}
test('E7: Dateiinhalt, Dateiliste und Änderungszeiten bleiben unverändert', () => use(async ({ vault, root, handler }) => {
  const before = await manifest(root);
  await vault.refresh(); vault.search('Übergaben'); vault.backlinks('Start.md'); vault.issues();
  await handler(get('/api/note?path=Start.md'));
  await handler(get('/api/file?path=Bilder%2FTest.svg'));
  assert.deepEqual(await manifest(root), before);
}));

test('E8: Traversal, URL-Kodierung, absolute Pfade, Symlinks, versteckte und ausgeschlossene Dateien', () => use(async ({ vault, handler }) => {
  for (const p of ['../outside.md', '/etc/passwd', 'A/../../outside.md', 'C:\\Windows\\file', '.obsidian/Test.md', 'A/.unsichtbar.md', '00 Kontext/Tokens & Zugänge.md', 'Privat/Notiz.md', 'Flucht.md', 'Alias/Übergaben.md']) {
    await assert.rejects(vault.read(p), p);
    for (const endpoint of ['note', 'file']) assert.notEqual((await handler(get(`/api/${endpoint}?path=${encodeURIComponent(p)}`))).status, 200, p);
  }
  for (const p of ['%2e%2e%2foutside.md', '%252e%252e%252foutside.md', '%2Fetc%2Fpasswd']) assert.notEqual((await handler(get('/api/file?path=' + p))).status, 200);
}));

test('E8: Nachträglich ersetzte Datei und Verzeichnis werden nicht ausgeliefert', () => use(async ({ root, base, handler }) => {
  await rm(path.join(root, 'Start.md'));
  await symlink(path.join(base, 'outside.md'), path.join(root, 'Start.md'));
  assert.equal((await handler(get('/api/note?path=Start.md'))).status, 422);
  await rename(path.join(root, 'A'), path.join(root, 'AltA'));
  await symlink(path.join(root, 'AltA'), path.join(root, 'A'));
  assert.equal((await handler(get('/api/file?path=A%2FÜbergaben.md'))).status, 422);
}));

test('E8: HTML, Event-Handler und aktive URLs ergeben keine ausführbaren Elemente', () => use(async ({ vault, handler }) => {
  const html = vault.snapshot.notes.get('Angriff.md')!.html;
  assert(!/<script|<img\b[^>]*onerror|href="javascript:/i.test(html));
  assert(html.includes('&lt;script&gt;'));
  assert(!html.includes('src="https://example.org'));
  const svg = await handler(get('/api/file?path=Bilder%2FTest.svg'));
  assert.equal(svg.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox");
  const htmlFile = await handler(get('/api/file?path=Bilder%2FSeite.html'));
  assert(htmlFile.headers.get('Content-Disposition')!.startsWith('attachment'));
  assert.equal(htmlFile.headers.get('Content-Type'), 'application/octet-stream');
  const note = await handler(get('/api/note?path=Start.md'));
  assert(note.headers.get('Content-Security-Policy')!.includes("script-src 'self'"));
  assert.equal(note.headers.get('X-Content-Type-Options'), 'nosniff');
}));

test('E1/E8: Portlose Requests, Ursprungsschutz, Methoden und keine CORS-Freigabe', () => use(async ({ handler }) => {
  assert.equal((await handler(new Request('http://evil.test:3210/api/state'))).status, 403);
  assert.equal((await handler(new Request(origin + '/api/state', { headers: { Origin: 'https://evil.test' } }))).status, 403);
  assert.equal((await handler(new Request(origin + '/api/state', { headers: { 'Sec-Fetch-Site': 'cross-site' } }))).status, 403);
  assert.equal((await handler(new Request(origin + '/api/refresh', { method: 'POST' }))).status, 403);
  assert.equal((await handler(new Request(origin + '/api/state', { method: 'PUT' }))).status, 405);
  assert.equal((await handler(get('/api/state'))).headers.get('Access-Control-Allow-Origin'), null);
  for (const route of ['/', '/app.js', '/style.css', '/purify.js', '/api/state', '/api/issues', '/api/search?q=Übergaben', '/api/resolve?source=Start.md&link=Doppelt']) assert.equal((await handler(get(route))).status, 200, route);
  assert.equal((await handler(get('/package.json'))).status, 404);
}));

test('E9: Defektes Frontmatter, ungültiges UTF-8, leer, sehr groß, YAML-Zyklus', () => use(async ({ vault, handler }) => {
  for (const p of ['Leer.md', 'Defekt.md', 'Bytes.md', 'Gross.md', 'Zyklus.md', 'OhneAbschluss.md']) {
    const note = vault.snapshot.notes.get(p)!;
    assert(note.warnings.length > 0, p);
    const response = await handler(get('/api/note?path=' + p));
    assert.equal(response.status, 200, p);
    assert((await response.json() as { warnings: string[] }).warnings.length > 0, p);
  }
  assert(vault.snapshot.notes.get('Defekt.md')!.html.includes('Trotzdem lesbar'));
}));

test('E6/E9: Fehlgeschlagene und parallele Aktualisierung erhält konsistente Generation', () => use(async ({ vault, root }) => {
  const old = vault.snapshot;
  const moved = root + '-moved';
  await rename(root, moved);
  try { await assert.rejects(vault.refresh()); assert.equal(vault.snapshot, old); }
  finally { await rename(moved, root); }
  const [one, two] = await Promise.all([vault.refresh(), vault.refresh()]);
  assert.equal(one, two);
}));

test('E1/E10: Konfiguration und Standardausschluss sind überprüfbar', () => use(async ({ base }) => {
  const config = await loadConfig(base);
  assert(config.exclude.includes(defaultExcludes[0]!));
  assert.equal(config.port, 3210);
  await writeFile(path.join(base, 'config.local.json'), JSON.stringify({ root: 'memory', port: 3456, exclude: ['Privat/'] }));
  assert.equal((await loadConfig(base)).root, path.join(base, 'memory'));
  await writeFile(path.join(base, 'config.local.json'), '{"port": "unsafe"}');
  await assert.rejects(loadConfig(base));
}));

test('K1/E8: Exakte lokale Hosts und jeweils eigene Herkunft bleiben erforderlich', () => use(async ({ handler }) => {
  for (const host of ['127.0.0.1:3210', 'localhost:3210']) {
    const local = `http://${host}`;
    assert.equal(localOrigin(host, 3210), local);
    for (const route of ['/', '/api/state', '/api/note?path=Start.md']) {
      assert.equal((await handler(new Request(local + route, { headers: { Host: host, Origin: local } }))).status, 200);
    }
    assert.equal((await handler(new Request(local + '/api/refresh', { method: 'POST', headers: { Origin: local, 'X-Brain-Request': '1' } }))).status, 200);
    for (const foreign of ['null', 'https://evil.test', 'http://localhost:3211', host.startsWith('localhost') ? origin : 'http://localhost:3210']) {
      assert.equal((await handler(new Request(local + '/api/state', { headers: { Origin: foreign } }))).status, 403);
      assert.equal((await handler(new Request(local + '/api/refresh', { method: 'POST', headers: { Origin: foreign, 'X-Brain-Request': '1' } }))).status, 403);
    }
    assert.equal((await handler(new Request(local + '/api/state', { headers: { 'Sec-Fetch-Site': 'cross-site' } }))).status, 403);
    assert.equal((await handler(new Request(local + '/api/state', { headers: { Host: 'evil.test:3210' } }))).status, 403);
  }
  for (const host of [undefined, 'localhost', 'localhost:3211', 'localhost.evil.test:3210', 'localhost.:3210', '127.0.0.2:3210', '[::1]:3210', 'evil.test:3210']) assert.equal(localOrigin(host, 3210), undefined);
  for (const url of ['http://localhost.evil.test:3210', 'http://localhost:3211', 'https://localhost:3210']) assert.equal((await handler(new Request(url + '/api/state'))).status, 403);
}));

test('K2/E8: NFC/NFD-Adressen für Notizen, Anhänge und Quellen mit unveränderten Grenzen', () => use(async ({ vault, put, handler, root, base }) => {
  const note = 'Übersicht/Über mich.md'.normalize('NFD');
  const attachment = 'Übersicht/Bildü.png'.normalize('NFD');
  await put(note, '# Über mich\n[[#Über mich]]');
  await put(attachment, 'Bildinhalt');
  await put('Privät/Öffentlich.md'.normalize('NFD'), 'VERTRAULICH');
  vault.config.exclude.push('Privät');
  await vault.refresh();
  for (const form of ['NFC', 'NFD'] as const) {
    const address = note.normalize(form);
    const response = await handler(get('/api/note?path=' + encodeURIComponent(address)));
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { path: string }).path.normalize('NFC'), note.normalize('NFC'));
    assert.equal((await handler(get('/api/file?path=' + encodeURIComponent(attachment.normalize(form))))).status, 200);
    assert.equal((await handler(get('/api/resolve?source=' + encodeURIComponent(address) + '&link=%23Über%20mich'))).status, 200);
    for (const forbidden of ['00 Kontext/Tokens & Zugänge.md', 'Privät/Öffentlich.md', '.Übersicht/Über mich.md', '../Übersicht/Über mich.md', '/Übersicht/Über mich.md', 'Übersicht/../Über mich.md', 'Alias/Übergaben.md']) {
      for (const endpoint of ['note', 'file']) assert.equal((await handler(get(`/api/${endpoint}?path=${encodeURIComponent(forbidden.normalize(form))}`))).status, 404, forbidden);
    }
  }
  await rm(path.join(root, note));
  await symlink(path.join(base, 'outside.md'), path.join(root, note));
  for (const form of ['NFC', 'NFD'] as const) assert.equal((await handler(get('/api/note?path=' + encodeURIComponent(note.normalize(form))))).status, 422);
}));

test('K4/K5: Nur fremde Rückverweise, lesbare Selbstanker und Vorrang expliziter Aliasse', () => use(async ({ vault, put, handler }) => {
  await put('Selbst.md', '# Überschrift\n[[#Überschrift]] [[#Überschrift|Mein Alias]] [[#Überschrift|#Absicht]] [[Selbst#Überschrift]]');
  await put('Andere.md', '[[Selbst#Überschrift]] [[Selbst]]');
  await vault.refresh();
  assert.deepEqual(vault.backlinks('Selbst.md'), ['Andere.md']);
  assert.deepEqual(vault.backlinks('A/Daily.md'), []);
  const response = await handler(get('/api/note?path=Selbst.md'));
  const note = await response.json() as { html: string; backlinks: string[] };
  assert.deepEqual(note.backlinks, ['Andere.md']);
  assert(note.html.includes('>Überschrift</a>'));
  assert(!note.html.includes('>#Überschrift</a>'));
  assert(note.html.includes('>Mein Alias</a>'));
  assert(note.html.includes('>#Absicht</a>'));
  assert.equal(vault.resolve('#%C3%9Cberschrift', 'Selbst.md').label, 'Überschrift');
}));
