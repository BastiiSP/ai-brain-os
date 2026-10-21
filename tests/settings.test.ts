import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { SettingsStore, SettingsError, SETTINGS_RELATIVE, MAX_SETTINGS_BYTES, MAX_REQUEST_BYTES } from '../src/settings.js';
import { changePreferences, emptyPreferences, folderColor, hiddenBy, moveBeforePosition, noteCounts, ordered, validPreferences, visibleGraph } from '../src/preferences.js';
import type { PreferenceChange, Preferences, SettingsState } from '../src/preferences.js';
import { Vault } from '../src/vault.js';
import { createHandler } from '../src/server.js';
import { incomingBody } from '../src/http.js';
import { graphFromIndex } from '../src/graph.js';

const origin = 'http://127.0.0.1:3210';
const document = (current = emptyPreferences(), previous: Preferences | null = null) => JSON.stringify({ version: 1, current, previous });
async function fixture() {
  fs.mkdirSync('.test-work', { recursive: true });
  const base = fs.mkdtempSync(path.resolve('.test-work/settings-'));
  const root = path.join(base, 'memory'); fs.mkdirSync(root);
  const put = (p: string, text: string) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), text); };
  put('AGENTS.md', 'Erfundene Wurzelnotiz'); put('CLAUDE.md', 'Erfundene zweite Wurzelnotiz');
  put('A/Notiz.md', 'Suchbegriff [[Unter/Kind]] [[B/Notiz]]'); put('A/Unter/Kind.md', 'Kind'); put('B/Notiz.md', '[[A/Notiz]]'); put('A/Bild.txt', 'Anhang');
  put('Wurzel/Echt.md', 'Echter Ordner Wurzel'); put('Ordner.md/Test.md', 'Echter Ordnername mit Endung'); put('.git/config', 'Erfundene Git-Konfiguration');
  const vault = new Vault({ root, port: 3210, exclude: [], maxNoteBytes: 1024 }); await vault.refresh();
  const store = new SettingsStore(root, base); const handler = createHandler(vault, base, store);
  const target = path.join(root, SETTINGS_RELATIVE);
  return { base, root, put, vault, store, target, handler };
}
async function use(fn: (f: Awaited<ReturnType<typeof fixture>>) => void | Promise<void>) {
  const f = await fixture(); try { await fn(f); } finally { mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(f.base, { recursive: true, force: true }); }
}
function manifest(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (relative: string) => {
    for (const name of fs.readdirSync(path.join(root, relative))) {
      const p = path.join(relative, name); const s = fs.lstatSync(path.join(root, p));
      if (s.isSymbolicLink()) out[p] = 'link:' + fs.readlinkSync(path.join(root, p));
      else if (s.isDirectory()) walk(p);
      else out[p] = s.mtimeMs + ':' + createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
    }
  }; walk(''); return out;
}
const putRequest = (body: unknown, extra: Record<string, string> = {}, route = '/api/settings') => new Request(origin + route, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Brain-Request': '1', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('O8/O9: eine persistente Datei, eingebettete vorige Fassung, Manifest unverändert außerhalb der Ausnahme', () => use(({ root, base, store, target }) => {
  const before = manifest(root); const s0 = store.load(); assert.equal(s0.revision, 'missing'); assert(!fs.existsSync(path.dirname(target)));
  const p = emptyPreferences(); p.colors.A = 'pink'; p.hidden = ['CLAUDE.md']; p.pinned = ['A/Notiz.md'];
  const s1 = store.save(p, s0.revision); assert(s1.writable); assert.notEqual(s1.revision, 'missing');
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), { version: 1, current: p, previous: null });
  const p2 = structuredClone(p); p2.hidden.push('AGENTS.md'); const s2 = store.save(p2, s1.revision);
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), { version: 1, current: p2, previous: p });
  store.save(p, s2.revision); assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')).previous, p2);
  const after = manifest(root); delete after[SETTINGS_RELATIVE]; assert.deepEqual(after, before);
  assert.deepEqual(fs.readdirSync(path.dirname(target)), ['einstellungen.json']);
  assert.deepEqual(fs.readdirSync(path.join(base, '.settings-work')), []);
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
}));

test('O8: externer Wechsel, Löschen, Neuanlage und zwei Browserstände erzeugen Konflikte', () => use(({ store, target, put }) => {
  const first = store.save(emptyPreferences(), 'missing');
  const p = emptyPreferences(); p.hidden = ['AGENTS.md'];
  const second = store.save(p, first.revision);
  assert.throws(() => store.save(emptyPreferences(), first.revision), (e: unknown) => e instanceof SettingsError && e.status === 409);
  store.load(); // Loading from another browser must not authorize a stale writer.
  assert.throws(() => store.save(emptyPreferences(), first.revision), /geändert/);
  fs.unlinkSync(target); assert.throws(() => store.save(p, second.revision), /geändert/);
  put(SETTINGS_RELATIVE, document()); assert.throws(() => store.save(p, 'missing'), /geändert/);
  const loaded = store.load(); assert(loaded.writable); store.save(p, loaded.revision);
}));

test('O8: defekte, unbekannte, übergroße und ungültige Dateien bleiben bytegenau erhalten', () => use(({ store, put, target }) => {
  const samples: (string | Buffer)[] = ['{', '{"version":2}', document().replace('"previous":null', '"previous":{"version":1}'), document().replace('"colors":{}', '"colors":{"A":"red"}'), document() + 'x', ' '.repeat(MAX_SETTINGS_BYTES + 1), Buffer.from([0xff, 0xfe])];
  for (const sample of samples) {
    put(SETTINGS_RELATIVE, ''); fs.writeFileSync(target, sample); const before = fs.readFileSync(target);
    const loaded = store.load(); assert.equal(loaded.writable, false); assert(loaded.warning); assert.deepEqual(loaded.current, emptyPreferences());
    assert.throws(() => store.save(emptyPreferences(), 'missing')); assert.deepEqual(fs.readFileSync(target), before);
  }
  put(SETTINGS_RELATIVE, document()); assert(store.load().writable);
}));

test('O8: Symlinks an Datei, Einstellungsordner, Arbeitsordner und ersetzter Wurzel werden abgewiesen', () => use(({ base, root, target, store, put }) => {
  const outside = path.join(base, 'outside.json'); fs.writeFileSync(outside, document()); const original = fs.readFileSync(outside);
  fs.mkdirSync(path.dirname(target)); fs.symlinkSync(outside, target);
  assert(!store.load().writable); assert.throws(() => store.save(emptyPreferences(), 'missing')); assert.deepEqual(fs.readFileSync(outside), original);
  fs.unlinkSync(target); fs.rmdirSync(path.dirname(target)); fs.symlinkSync(base, path.dirname(target));
  assert(!store.load().writable); assert.throws(() => store.save(emptyPreferences(), 'missing'));
  fs.unlinkSync(path.dirname(target)); fs.symlinkSync(base, path.join(base, '.settings-work'));
  assert.throws(() => store.save(emptyPreferences(), 'missing')); assert.throws(() => store.cleanup());
  fs.unlinkSync(path.join(base, '.settings-work'));
  put(SETTINGS_RELATIVE, document()); const loaded = store.load();
  fs.renameSync(root, root + '-old'); fs.symlinkSync(root + '-old', root);
  assert(!store.load().writable); assert.throws(() => store.save(emptyPreferences(), loaded.revision));
  fs.unlinkSync(root); fs.renameSync(root + '-old', root);
}));

test('O8: Hardlinks und Verzeichnisse statt Einstellungsdatei werden nicht ersetzt', () => use(({ base, target, store }) => {
  fs.mkdirSync(path.dirname(target)); const outside = path.join(base, 'other.json'); fs.writeFileSync(outside, document()); fs.linkSync(outside, target);
  assert(!store.load().writable); assert.throws(() => store.save(emptyPreferences(), 'missing')); assert.equal(fs.readFileSync(outside, 'utf8'), document());
  fs.unlinkSync(target); fs.mkdirSync(target); assert(!store.load().writable); assert.throws(() => store.save(emptyPreferences(), 'missing')); assert(fs.statSync(target).isDirectory());
}));

test('O8: Änderung nach Temp-Synchronisierung verhindert Überschreiben, keine Temp-Reste', () => use(({ base, target, store }) => {
  const initial = store.save(emptyPreferences(), 'missing'); const external = emptyPreferences(); external.hidden = ['CLAUDE.md'];
  const sync = fs.fsyncSync; let changed = false;
  mock.method(fs, 'fsyncSync', (fd: number) => { sync(fd); if (!changed) { changed = true; fs.writeFileSync(target, document(external)); } }); syncBuiltinESMExports();
  assert.throws(() => store.save(emptyPreferences(), initial.revision), /geändert/);
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')).current, external);
  assert.deepEqual(fs.readdirSync(path.join(base, '.settings-work')), []);
}));

test('O8: nachträglich eingesetzter Symlink wird vor dem Austausch erkannt', () => use(({ base, target, store }) => {
  const initial = store.save(emptyPreferences(), 'missing'); const outside = path.join(base, 'outside.json'); fs.writeFileSync(outside, 'UNVERÄNDERT');
  const sync = fs.fsyncSync; let swapped = false;
  mock.method(fs, 'fsyncSync', (fd: number) => { sync(fd); if (!swapped) { swapped = true; fs.unlinkSync(target); fs.symlinkSync(outside, target); } }); syncBuiltinESMExports();
  assert.throws(() => store.save(emptyPreferences(), initial.revision)); assert.equal(fs.readFileSync(outside, 'utf8'), 'UNVERÄNDERT'); assert(fs.lstatSync(target).isSymbolicLink());
}));

test('O8: Synchronisierungsfehler und EXDEV erhalten die vorige Datei', () => use(({ base, root, store }) => {
  const initial = store.save(emptyPreferences(), 'missing'); const before = manifest(root);
  const original = fs.fsyncSync;
  mock.method(fs, 'fsyncSync', () => { throw Object.assign(new Error('Testfehler'), { code: 'EIO' }); }); syncBuiltinESMExports();
  assert.throws(() => store.save(emptyPreferences(), initial.revision)); assert.deepEqual(manifest(root), before);
  mock.restoreAll(); syncBuiltinESMExports(); assert.equal(fs.fsyncSync, original);
  mock.method(fs, 'renameSync', () => { throw Object.assign(new Error('Test EXDEV'), { code: 'EXDEV' }); }); syncBuiltinESMExports();
  assert.throws(() => store.save(emptyPreferences(), initial.revision), /verschiedenen Dateisystemen/); assert.deepEqual(manifest(root), before);
  assert.deepEqual(fs.readdirSync(path.join(base, '.settings-work')), []);
}));

test('O8: unterschiedliche Gerätekennung wird vor Temp-Schreiben abgewiesen', () => use(({ base, root, store }) => {
  const initial = store.save(emptyPreferences(), 'missing'); const before = manifest(root); const original = fs.lstatSync;
  mock.method(fs, 'lstatSync', ((p: fs.PathLike, ...args: unknown[]) => {
    const s = (original as Function)(p, ...args);
    if (p === path.join(base, '.settings-work')) s.dev += 1;
    return s;
  }) as typeof fs.lstatSync); syncBuiltinESMExports();
  assert.throws(() => store.save(emptyPreferences(), initial.revision), /verschiedenen Dateisystemen/); assert.deepEqual(manifest(root), before);
}));

test('O8: Startbereinigung entfernt nur eigene Temp-Namen, folgt keinen Symlinks', () => use(({ base, root, store }) => {
  const work = path.join(base, '.settings-work'); fs.mkdirSync(work, { mode: 0o700 });
  const a = '2147483647-11111111-1111-1111-1111-111111111111.tmp', b = '2147483647-22222222-2222-2222-2222-222222222222.tmp';
  fs.writeFileSync(path.join(work, a), 'Rest'); fs.writeFileSync(path.join(base, 'keep'), 'Erhalten'); fs.symlinkSync(path.join(base, 'keep'), path.join(work, b)); fs.writeFileSync(path.join(work, 'fremd'), 'Erhalten');
  const before = manifest(root); store.cleanup(); assert.deepEqual(fs.readdirSync(work), ['fremd']); assert.equal(fs.readFileSync(path.join(base, 'keep'), 'utf8'), 'Erhalten'); assert.deepEqual(manifest(root), before);
}));

test('O8/O9: protokollierte Schreibziele sind ausschließlich Temp-Datei, Arbeitsordner, Einstellungsordner und festes Ziel', () => use(({ base, root, target, store }) => {
  const paths: string[] = []; const mkdir = fs.mkdirSync, open = fs.openSync, rename = fs.renameSync;
  mock.method(fs, 'mkdirSync', ((p: fs.PathLike, options: fs.MakeDirectoryOptions) => { paths.push(String(p)); return mkdir(p, options); }) as typeof fs.mkdirSync);
  mock.method(fs, 'openSync', ((p: fs.PathLike, flags: number, mode?: number) => { if (flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT)) paths.push(String(p)); return open(p, flags, mode); }) as typeof fs.openSync);
  mock.method(fs, 'renameSync', (from: fs.PathLike, to: fs.PathLike) => { assert(String(from).startsWith(path.join(base, '.settings-work') + '/')); assert.equal(to, target); paths.push(String(to)); return rename(from, to); }); syncBuiltinESMExports();
  store.save(emptyPreferences(), 'missing');
  assert(paths.includes(target)); for (const p of paths) assert(p === path.dirname(target) || p === target || p === path.join(base, '.settings-work') || /^[1-9]\d*-[-a-f0-9]{36}\.tmp$/.test(path.basename(p)) && path.dirname(p) === path.join(base, '.settings-work'), p);
  assert.deepEqual(Object.keys(manifest(root)).filter(p => p.startsWith('.ai-brain-os/')), [SETTINGS_RELATIVE]);
}));

test('O8 API: feste Route, Schema, Host/Herkunft, nur JSON und Größenlimit', () => use(async ({ handler, root }) => {
  const before = manifest(root); const good = { current: emptyPreferences(), revision: 'missing' };
  for (const headers of [{ Origin: 'https://evil.test' }, { Origin: 'http://localhost:3210' }, { Host: 'evil.test:3210' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'X-Brain-Request': '' }] as Record<string, string>[]) assert.equal((await handler(putRequest(good, headers))).status, 403);
  for (const headers of [{ 'Content-Type': 'text/plain' }, { 'Content-Encoding': 'gzip' }] as Record<string, string>[]) assert.equal((await handler(putRequest(good, headers))).status, 415);
  for (const body of ['{', { ...good, path: 'AGENTS.md' }, { ...good, current: { ...good.current, path: '../outside' } }, { ...good, current: { ...good.current, hidden: ['../outside'] } }, { ...good, current: { ...good.current, order: { A: ['B/Notiz.md'] } } }, { ...good, current: { ...good.current, colors: { A: 'red' } } }]) assert.equal((await handler(putRequest(body))).status, 400);
  assert.equal((await handler(putRequest(good, {}, '/api/settings?path=AGENTS.md'))).status, 400);
  for (const route of ['/api/file?path=AGENTS.md', '/api/note?path=AGENTS.md', '/api/state', '/api/settings/AGENTS.md']) assert.equal((await handler(putRequest(good, {}, route))).status, 405);
  assert.equal((await handler(putRequest(' '.repeat(MAX_REQUEST_BYTES + 1)))).status, 413);
  assert.equal((await handler(putRequest(good, { 'Content-Length': String(MAX_REQUEST_BYTES + 1) }))).status, 413);
  assert.deepEqual(manifest(root), before);
  const ok = await handler(putRequest(good)); assert.equal(ok.status, 200); assert.equal(ok.headers.get('Access-Control-Allow-Origin'), null);
}));

test('O8 HTTP-Adapter: gestreamtes JSON, Abbruch übergroßer Daten ohne Socket-Zerstörung', () => use(async ({ handler }) => {
  const bytes = Buffer.from(JSON.stringify({ current: emptyPreferences(), revision: 'missing' }));
  const stream = Readable.from([bytes.subarray(0, 13), bytes.subarray(13)]);
  const init: RequestInit & { duplex: string } = { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Brain-Request': '1' }, body: incomingBody(stream as IncomingMessage), duplex: 'half' };
  assert.equal((await handler(new Request(origin + '/api/settings', init))).status, 200);
  const huge = new Readable({ read() { this.push(Buffer.alloc(32768, 32)); } });
  const init2 = { ...init, body: incomingBody(huge as IncomingMessage) };
  assert.equal((await handler(new Request(origin + '/api/settings', init2))).status, 413);
  assert.equal(huge.destroyed, false); huge.destroy();
}));

test('O8/O9: versteckte Einstellungen sind für Index, Suche, Links und Dateiabruf ausgeschlossen', () => use(async ({ handler, store, vault }) => {
  store.save(emptyPreferences(), 'missing'); await vault.refresh();
  const assetHandler = createHandler(vault);
  for (const asset of ['/navigation.js', '/preferences.js']) assert.equal((await assetHandler(new Request(origin + asset))).status, 200);
  assert(!vault.snapshot.entries.some(e => e.path.startsWith('.ai-brain-os'))); assert.equal(vault.search('"version"').length, 0);
  assert.equal(vault.resolve(SETTINGS_RELATIVE, 'AGENTS.md').kind, 'missing');
  for (const endpoint of ['file', 'note']) assert.equal((await handler(new Request(origin + '/api/' + endpoint + '?path=' + encodeURIComponent(SETTINGS_RELATIVE)))).status, 404);
  assert.equal((await handler(new Request(origin + '/.settings-work/test.tmp'))).status, 404);
}));

test('O3: ausgeblendete Ordner und Wurzelnotizen fehlen im Raum; Suche und Links unverändert', () => use(({ vault }) => {
  const p = emptyPreferences(); p.hidden = ['A', 'AGENTS.md', 'CLAUDE.md'];
  const beforeSearch = vault.search('Suchbegriff'); const beforeLink = vault.resolve('A/Notiz', 'B/Notiz.md');
  const graph = visibleGraph(graphFromIndex(vault.snapshot), p);
  assert(graph.nodes.every(n => !n.path.startsWith('A/') && !['AGENTS.md','CLAUDE.md'].includes(n.path)));
  assert(!graph.folders.includes('A')); assert(!graph.folders.includes('')); assert(graph.folders.includes('Wurzel'));
  assert(graph.edges.every(([a,b]) => graph.nodes[a] && graph.nodes[b]));
  assert.deepEqual(vault.search('Suchbegriff'), beforeSearch); assert.deepEqual(vault.resolve('A/Notiz', 'B/Notiz.md'), beforeLink);
  assert.equal(hiddenBy('AB/Notiz.md', p), false);
}));

test('O2/O4/O5/O6: Abstufung, vollständige Notizanzahl, neue Ordner am Ende und stabile Pin-Referenzen', () => use(async ({ vault, store, put, root }) => {
  const prefs = emptyPreferences(); prefs.colors.A = 'pink'; prefs.pinned = ['A/Notiz.md']; prefs.order[''] = ['B', 'A'];
  prefs.order[''] = moveBeforePosition(ordered(vault.snapshot.entries.filter(e => !e.path.includes('/'))).map(e => e.path), 'B', 'A');
  const saved = store.save(prefs, 'missing');
  put('00 Neu/Neu.md', 'Neu'); fs.renameSync(path.join(root, 'A/Notiz.md'), path.join(root, 'A/Umbenannt.md')); await vault.refresh();
  const reloaded = store.load(); assert.deepEqual(reloaded.current.pinned, ['A/Notiz.md']); assert(!vault.snapshot.notes.has(reloaded.current.pinned[0]!));
  const roots = ordered(vault.snapshot.entries.filter(e => !e.path.includes('/')), reloaded.current.order['']);
  assert.equal(roots.at(-1)!.path, '00 Neu'); assert(roots.findIndex(e => e.path === 'B') < roots.findIndex(e => e.path === 'A'));
  assert.equal(noteCounts(vault.snapshot.entries).get('A'), 2); assert.equal(noteCounts(vault.snapshot.entries).get('A/Unter'), 1);
  assert.equal(vault.snapshot.entries.find(e => e.path === 'Ordner.md')?.title, 'Ordner.md');
  for (const dark of [true, false]) {
    const main = folderColor(prefs, 'A', true, dark); assert.equal(folderColor(prefs, 'A/Umbenannt.md', false, dark), main);
    const sub = folderColor(prefs, 'A/Unter', true, dark); assert.equal(sub, folderColor(prefs, 'A/Unter/Kind.md', false, dark)); assert.notEqual(main, sub);
    const saturation = (hex: string) => { const rgb = hex.slice(1).match(/../g)!.map(x => parseInt(x, 16)); return Math.max(...rgb) - Math.min(...rgb); };
    assert(saturation(main) > saturation(sub)); assert(saturation(sub) > saturation(folderColor(prefs, 'A/Unter/Tief', true, dark)));
  }
  assert.equal(saved.writable, true);
}));

test('O8: Referenzen sind Daten, auch reservierte Objektnamen; keine Pfadauflösung', () => {
  const prefs = JSON.parse('{"colors":{"__proto__":"pink"},"hidden":[],"order":{"": ["__proto__"], "__proto__":["__proto__/N.md"]},"pinned":[]}');
  assert(validPreferences(prefs)); assert.equal(folderColor(prefs, '__proto__', true, false), '#a33d70');
  assert(!validPreferences({ ...prefs, hidden: ['.ai-brain-os/einstellungen.json'] }));
  assert(!validPreferences({ ...prefs, hidden: ['A/../B'] }));
  assert(!validPreferences({ ...prefs, hidden: ['C:\\test'] }));
});

test('O5: gemeinsamer Verschiebealgorithmus für Ziehen, Pfeiltasten und angeheftete Notizen', () => {
  const paths = ['A', 'B', 'C', 'D'];
  assert.deepEqual(moveBeforePosition(paths, 'C', 'B'), ['A', 'C', 'B', 'D']);
  assert.deepEqual(moveBeforePosition(paths, 'A', 'D'), ['B', 'C', 'D', 'A']);
  assert.deepEqual(moveBeforePosition(paths, 'D', 'A'), ['D', 'A', 'B', 'C']);
  assert.deepEqual(moveBeforePosition(paths, 'A', 'Fehlt'), paths);
  assert.deepEqual(moveBeforePosition(paths, 'B', 'B'), paths);
  assert.deepEqual(paths, ['A', 'B', 'C', 'D']);
  assert.deepEqual(moveBeforePosition(['A/N.md', 'Alt/Fehlt.md'], 'Alt/Fehlt.md', 'A/N.md'), ['Alt/Fehlt.md', 'A/N.md']);
});

test('O2: Farbmarken bleiben in beiden Modi und jeder Abstufung erkennbar', () => {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/../g)!.map(s => parseInt(s, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!;
  };
  for (const tone of ['teal', 'pink', 'mauve', 'slate'] as const) for (const dark of [false, true]) for (let depth = 0; depth < 20; depth++) {
    const p = emptyPreferences(); p.colors.A = tone;
    const color = folderColor(p, 'A' + '/Unter'.repeat(depth), true, dark);
    const a = luminance(color), b = luminance(dark ? '#2a2b2c' : '#ffffff');
    assert((Math.max(a,b) + .05) / (Math.min(a,b) + .05) >= 3, `${tone}, ${depth}, ${dark}`);
  }
});

test('O8: Bereinigung lässt temporäre Dateien eines laufenden Prozesses bestehen', () => use(({ base, store }) => {
  const work = path.join(base, '.settings-work'); fs.mkdirSync(work, { mode: 0o700 });
  const active = `${process.pid}-11111111-1111-1111-1111-111111111111.tmp`; fs.writeFileSync(path.join(work, active), 'In Arbeit');
  store.cleanup(); assert.equal(fs.readFileSync(path.join(work, active), 'utf8'), 'In Arbeit');
}));

test('O8/O9: abgebrochener Testprozess hinterlässt nur eine bereinigbare Temp-Datei außerhalb des Gedächtnisses', () => use(({ base, root, store }) => {
  const initial = store.save(emptyPreferences(), 'missing'); const before = manifest(root);
  const childCode = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const { SettingsStore } = await import(process.argv[1]);
    const store = new SettingsStore(process.argv[2], process.argv[3]);
    const sync = fs.fsyncSync;
    fs.fsyncSync = fd => { sync(fd); process.exit(17); };
    syncBuiltinESMExports();
    store.save({ colors: { A: 'pink' }, hidden: [], order: {}, pinned: [] }, process.argv[4]);
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', childCode, pathToFileURL(path.resolve('dist/src/settings.js')).href, root, base, initial.revision], { encoding: 'utf8' });
  assert.equal(child.status, 17, child.stderr); assert.deepEqual(manifest(root), before);
  assert.equal(fs.readdirSync(path.join(base, '.settings-work')).length, 1);
  new SettingsStore(root, base).cleanup(); assert.deepEqual(fs.readdirSync(path.join(base, '.settings-work')), []); assert.deepEqual(manifest(root), before);
}));


test('F1: Ausblenden, Farbe und Anheften speichern ohne Umsortierung keinerlei Reihenfolge', () => use(async ({ handler, target, vault }) => {
  // Large invented index: unrelated paths must never inflate a settings write.
  for (let i = 0; i < 6000; i++) vault.snapshot.entries.push({ path: `Unberuehrt/Unterordner-${i}/Erfundene-Notiz-${i}.md`, title: 'Erfundene Notiz', kind: 'note' });
  const actions: PreferenceChange[] = [{ type: 'hidden', path: 'AGENTS.md' }, { type: 'color', path: 'A', tone: 'pink' }, { type: 'pin', path: 'A/Notiz.md' }, { type: 'pins', paths: ['A/Notiz.md'] }];
  for (const action of actions) {
    const state = await (await handler(new Request(origin + '/api/state'))).json() as { settings: SettingsState };
    const current = changePreferences(state.settings.current, action);
    const response = await handler(putRequest({ current, revision: state.settings.revision })); assert.equal(response.status, 200);
    const bytes = fs.readFileSync(target, 'utf8'); const stored = JSON.parse(bytes);
    assert.deepEqual(stored.current.order, {}); assert.deepEqual(stored.previous?.order ?? {}, {});
    assert(!bytes.includes('Unberuehrt')); assert(Buffer.byteLength(bytes) < 1024);
  }
  const stored = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.deepEqual(stored.current, { colors: { A: 'pink' }, hidden: ['AGENTS.md'], order: {}, pinned: ['A/Notiz.md'] });
}));

test('F1: Umsortierung speichert nur direkte Geschwister im betroffenen Ordner; neue Einträge erscheinen ohne Schreiben', () => use(async ({ vault, store, handler, target, put }) => {
  const siblings = ordered(vault.snapshot.entries.filter(e => e.path.startsWith('A/') && !e.path.slice(2).includes('/'))).map(e => e.path);
  const sorted = changePreferences(emptyPreferences(), { type: 'order', parent: 'A', paths: moveBeforePosition(siblings, 'A/Unter', 'A/Bild.txt') });
  const saved = store.save(sorted, 'missing');
  assert.deepEqual(saved.current.order, { A: ['A/Unter', 'A/Bild.txt', 'A/Notiz.md'] });
  assert(!JSON.stringify(saved.current).includes('A/Unter/Kind.md'));
  const before = fs.readFileSync(target); const mtime = fs.statSync(target).mtimeMs;
  put('A/00 Neu.md', 'Neue erfundene Notiz'); put('A/01 Neu.md', 'Zweite neue Notiz');
  await handler(new Request(origin + '/api/refresh', { method: 'POST', headers: { 'X-Brain-Request': '1' } }));
  const loaded = await (await handler(new Request(origin + '/api/state'))).json() as { entries: { path: string }[]; settings: SettingsState };
  const shown = ordered(loaded.entries.filter(e => e.path.startsWith('A/') && !e.path.slice(2).includes('/')), loaded.settings.current.order.A);
  assert.deepEqual(shown.map(e => e.path), ['A/Unter', 'A/Bild.txt', 'A/Notiz.md', 'A/00 Neu.md', 'A/01 Neu.md']);
  assert.deepEqual(fs.readFileSync(target), before); assert.equal(fs.statSync(target).mtimeMs, mtime);
  const hidden = changePreferences(loaded.settings.current, { type: 'hidden', path: 'AGENTS.md' });
  store.save(hidden, loaded.settings.revision);
  assert.deepEqual(store.load().current.order, { A: ['A/Unter', 'A/Bild.txt', 'A/Notiz.md'] });
}));

test('F1: Unabhängige Änderungen erhalten ausdrücklich sortierte Ordner und erzeugen keine weiteren', () => {
  const original = emptyPreferences(); original.order.A = ['A/Z.md', 'A/A.md'];
  const next = changePreferences(original, { type: 'order', parent: 'B', paths: ['B/Z.md', 'B/A.md'] });
  const pinned = changePreferences(next, { type: 'pin', path: 'B/A.md' });
  const unhidden = changePreferences(pinned, { type: 'unhide', path: 'AGENTS.md' });
  assert.deepEqual(unhidden.order, { A: ['A/Z.md', 'A/A.md'], B: ['B/Z.md', 'B/A.md'] });
  assert.deepEqual(original, { ...emptyPreferences(), order: { A: ['A/Z.md', 'A/A.md'] } });
});
