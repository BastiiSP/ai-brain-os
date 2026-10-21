import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';
import type { Config } from './config.js';
import { renderNote } from './markdown.js';

export const norm = (s: string) => s.normalize('NFC').toLowerCase();
export const headingId = (s: string) => `heading-${norm(s).trim().replace(/\s+/g, '-')}`;
export const isImage = (p: string) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(p);
export interface Entry { path: string; kind: 'note' | 'file' | 'folder'; title: string }
export interface Note extends Entry { modifiedMs?: number; body: string; html: string; metadata: Record<string, unknown>; warnings: string[]; links: Link[] }
export interface Link { raw: string; label: string; anchor: string; kind: 'resolved' | 'ambiguous' | 'missing' | 'external'; targets: string[]; suggestions: string[] }
export interface Snapshot { entries: Entry[]; notes: Map<string, Note>; updated: string; warnings: string[]; durationMs: number }
export class AccessError extends Error {}

export class Vault {
  snapshot: Snapshot = { entries: [], notes: new Map(), updated: '', warnings: [], durationMs: 0 };
  private refreshing?: Promise<Snapshot>;
  private root = '';
  constructor(readonly config: Config) {}
  allowed(relative: string): boolean {
    if (!relative || relative.includes('\\') || relative.includes('\0') || path.posix.isAbsolute(relative) || /^[a-z]:/i.test(relative)) return false;
    const parts = relative.split('/');
    if (parts.some(p => !p || p === '..' || p.startsWith('.'))) return false;
    const n = norm(relative);
    return !this.config.exclude.some(e => n === norm(e.replace(/\/$/, '')) || n.startsWith(norm(e.replace(/\/$/, '')) + '/'));
  }
  // Match addresses to indexed spellings; never normalize a filesystem path for reading.
  entryPath(address: string): string | undefined {
    if (!this.allowed(address)) return undefined;
    const hits = this.snapshot.entries.filter(e => e.path.normalize('NFC') === address.normalize('NFC') && this.allowed(e.path));
    return hits.length === 1 ? hits[0]!.path : undefined;
  }
  // Every read (including attachments) passes this boundary. No writable fs handle exists in application code.
  private async checkedPath(relative: string): Promise<string> {
    if (!this.allowed(relative)) throw new AccessError('Datei nicht verfügbar.');
    let current = this.root;
    for (const segment of relative.split('/')) {
      current = path.join(current, segment);
      if ((await lstat(current)).isSymbolicLink()) throw new AccessError('Symbolische Links werden nicht geöffnet.');
    }
    const actual = await realpath(current);
    const inside = path.relative(this.root, actual);
    if (!inside || !this.allowed(inside) || inside.startsWith('../') || path.isAbsolute(inside)) throw new AccessError('Datei nicht verfügbar.');
    return actual;
  }
  async verify(relative: string): Promise<void> {
    const actual = await this.checkedPath(relative);
    if (!(await lstat(actual)).isFile()) throw new AccessError('Keine reguläre Datei.');
  }
  async read(relative: string, maxBytes = 64 * 1024 * 1024): Promise<Buffer> {
    const actual = await this.checkedPath(relative);
    const handle = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > maxBytes) throw new AccessError('Datei zu groß oder kein reguläres Dokument.');
      const verified = await this.checkedPath(relative);
      const latest = await lstat(verified);
      if (stat.dev !== latest.dev || stat.ino !== latest.ino) throw new AccessError('Datei während des Lesens verändert. Bitte aktualisieren.');
      // Bounded read also protects against files that grow after stat().
      const data = Buffer.alloc(Math.min(stat.size + 1, maxBytes + 1));
      let total = 0;
      while (total < data.length) {
        const { bytesRead } = await handle.read(data, total, data.length - total, total);
        if (!bytesRead) break;
        total += bytesRead;
      }
      if (total > maxBytes || total > stat.size) throw new AccessError('Datei während des Lesens verändert oder zu groß.');
      return data.subarray(0, total);
    } finally { await handle.close(); }
  }
  refresh(): Promise<Snapshot> {
    if (!this.refreshing) this.refreshing = this.rebuild().finally(() => { this.refreshing = undefined; });
    return this.refreshing;
  }
  private async rebuild(): Promise<Snapshot> {
    const start = performance.now();
    this.root = await realpath(this.config.root);
    const next: Snapshot = { entries: [], notes: new Map(), updated: '', warnings: [], durationMs: 0 };
    const walk = async (dir: string) => {
      for (const item of await readdir(path.join(this.root, dir), { withFileTypes: true })) {
        const p = dir ? `${dir}/${item.name}` : item.name;
        if (!this.allowed(p)) continue;
        if (item.isSymbolicLink()) { next.warnings.push(`${p}: Symbolischer Link ausgelassen.`); continue; }
        const entry: Entry = { path: p, kind: item.isDirectory() ? 'folder' : /\.md$/i.test(p) ? 'note' : 'file', title: item.name.replace(/\.md$/i, '') };
        if (!item.isDirectory() && !item.isFile()) continue;
        next.entries.push(entry);
        if (item.isDirectory()) {
          try { await this.checkedPath(p); await walk(p); } catch { next.warnings.push(`${p}: Ordner nicht lesbar. Bitte aktualisieren.`); }
        } else if (entry.kind === 'note') {
          const note: Note = { ...entry, body: '', html: '', metadata: {}, warnings: [], links: [] };
          try {
            note.modifiedMs = (await lstat(await this.checkedPath(p))).mtimeMs;
            const buffer = await this.read(p, this.config.maxNoteBytes);
            note.body = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
            if (!note.body.trim()) note.warnings.push('Leere Notiz.');
            if (/^---\r?\n/.test(note.body)) {
              const match = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/.exec(note.body);
              if (!match) note.warnings.push('Frontmatter ohne gültigen Abschluss; Originaltext wird angezeigt.');
              else {
                try {
                  const doc = parseDocument(match[1]!, { uniqueKeys: true });
                  if (doc.errors.length) throw new Error();
                  const meta: unknown = doc.toJS({ maxAliasCount: 30 });
                  if (meta !== null && (typeof meta !== 'object' || Array.isArray(meta))) throw new Error();
                  JSON.stringify(meta); // Reject cyclic YAML aliases before exposing metadata as JSON.
                  note.metadata = (meta ?? {}) as Record<string, unknown>;
                  note.body = note.body.slice(match[0].length);
                } catch { note.warnings.push('Defektes Frontmatter; Originaltext wird angezeigt.'); }
              }
            }
          } catch (e) {
            note.warnings.push(e instanceof TypeError ? 'Keine gültige UTF-8-Datei.' : 'Datei nicht lesbar, verändert oder zu groß. Größenlimit: ' + this.config.maxNoteBytes + ' Bytes.');
          }
          next.notes.set(p, note);
        }
      }
    };
    await walk('');
    next.entries.sort((a, b) => a.path.localeCompare(b.path, 'de'));
    for (const note of next.notes.values()) note.html = renderNote(note, (target) => this.resolve(target, note.path, next));
    next.updated = new Date().toISOString();
    next.durationMs = performance.now() - start;
    this.snapshot = next; // Readers see either the complete old or complete new generation.
    return next;
  }
  resolve(raw: string, source: string, snapshot = this.snapshot): Link {
    const clean = raw.replace(/\\\|/g, '|');
    const pipe = clean.indexOf('|');
    const target = (pipe >= 0 ? clean.slice(0, pipe) : clean).trim();
    const label = pipe >= 0 ? clean.slice(pipe + 1) : target;
    const hash = target.indexOf('#');
    let name = hash >= 0 ? target.slice(0, hash) : target;
    let anchor = hash >= 0 ? target.slice(hash + 1) : '';
    const result: Link = { raw, label, anchor, kind: 'missing', targets: [], suggestions: [] };
    if (/^https?:\/\//i.test(target) || /^mailto:/i.test(target)) return { ...result, kind: 'external', targets: [target] };
    try { name = decodeURIComponent(name); anchor = decodeURIComponent(anchor); } catch { return result; }
    result.anchor = anchor;
    if (pipe < 0 && hash === 0) result.label = anchor;
    if (!name && hash >= 0) name = source;
    if (!name || /^[a-z][a-z\d+.-]*:/i.test(name) || name.startsWith('/') || name.includes('\\') || name.split('/').some(x => x.startsWith('.') && x !== '.' && x !== '..')) return result;
    const rooted = path.posix.normalize(name);
    const relative = path.posix.normalize(path.posix.join(path.posix.dirname(source), name));
    // Explicit excluded targets cannot fall through to a public file of the same name.
    if (((!this.allowed(rooted) || !this.allowed(rooted + '.md')) && !rooted.startsWith('../')) || !this.allowed(relative) || !this.allowed(relative + '.md')) return result;
    const files = snapshot.entries.filter(e => e.kind !== 'folder');
    const matches = (list: Entry[], key: string) => list.filter(e => norm(e.path) === norm(key) || norm(e.path) === norm(key + '.md'));
    const stages = [matches(files, rooted), matches(files, relative), files.filter(e => norm(e.path).endsWith('/' + norm(rooted)) || norm(e.path).endsWith('/' + norm(rooted + '.md')))];
    if (!name.includes('/')) stages.push(files.filter(e => norm(path.posix.basename(e.path)) === norm(name) || norm(path.posix.basename(e.path)) === norm(name + '.md')));
    stages.push(snapshot.entries.filter(e => e.kind === 'folder' && (norm(e.path) === norm(rooted) || norm(e.path) === norm(relative))));
    for (const hits of stages) if (hits.length) return { ...result, kind: hits.length === 1 ? 'resolved' : 'ambiguous', targets: hits.map(e => e.path) };
    const base = norm(path.posix.basename(name).replace(/\.md$/i, ''));
    result.suggestions = files.filter(e => norm(path.posix.basename(e.path).replace(/\.md$/i, '')) === base).map(e => e.path);
    return result;
  }
  search(query: string) {
    const q = norm(query.trim());
    if (!q) return [];
    return [...this.snapshot.notes.values()].flatMap(note => {
      const text = (note.body + '\n' + JSON.stringify(note.metadata)).normalize('NFC');
      const index = norm(text).indexOf(q);
      const titleMatch = norm(note.title).includes(q);
      return titleMatch || norm(note.path).includes(q) || index >= 0 ? [{ path: note.path, title: note.title, titleMatch, snippet: text.slice(Math.max(0, index - 70), Math.max(0, index - 70) + 220) }] : [];
    }).sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch) || a.path.localeCompare(b.path, 'de'));
  }
  backlinks(target: string) { return [...this.snapshot.notes.values()].filter(n => n.path !== target && n.links.some(l => l.kind === 'resolved' && l.targets[0] === target)).map(n => n.path); }
  issues() { return [...this.snapshot.notes.values()].flatMap(n => n.links.filter(l => l.kind === 'missing' || l.kind === 'ambiguous').map(l => ({ source: n.path, ...l }))); }
}
