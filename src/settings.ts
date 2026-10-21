import { constants, closeSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import type { Stats } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { emptyPreferences, validPreferences } from './preferences.js';
import type { Preferences, SettingsState } from './preferences.js';

export const MAX_PREFERENCES_BYTES = 128 * 1024;
export const MAX_SETTINGS_BYTES = 2 * MAX_PREFERENCES_BYTES + 1024;
export const MAX_REQUEST_BYTES = MAX_PREFERENCES_BYTES + 1024;
export const SETTINGS_RELATIVE = '.ai-brain-os/einstellungen.json';
export class SettingsError extends Error { constructor(message: string, readonly status = 422) { super(message); } }
interface Document { version: 1; current: Preferences; previous: Preferences | null }
const missing = (e: unknown) => (e as NodeJS.ErrnoException).code === 'ENOENT';
const identity = (s: Stats) => `${s.dev}:${s.ino}`;
const fingerprint = (s: Stats) => `${identity(s)}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`;
const validSize = (p: unknown) => Buffer.byteLength(JSON.stringify(p)) <= MAX_PREFERENCES_BYTES;
function decode(bytes: Buffer): Document {
  const v: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).sort().join(',') !== 'current,previous,version') throw new Error();
  const d = v as Document;
  if (d.version !== 1 || !validPreferences(d.current) || !validSize(d.current) || (d.previous !== null && (!validPreferences(d.previous) || !validSize(d.previous)))) throw new Error();
  return d;
}

/** The only memory writer. No public method accepts a filesystem destination.
 * Small bounded synchronous transactions deliberately avoid interleaved requests
 * between the final revision check and rename. This is not an OS sandbox against
 * hostile local processes swapping directories concurrently (see README).
 */
export class SettingsStore {
  private readonly root: string;
  private readonly base: string;
  private readonly rootIdentity: string;
  private readonly baseIdentity: string;
  private readonly directory: string;
  private readonly target: string;
  private readonly work: string;
  constructor(root: string, base: string) {
    if (lstatSync(root).isSymbolicLink()) throw new SettingsError('Die Gedächtniswurzel darf kein symbolischer Link sein.');
    this.root = realpathSync(root); this.base = realpathSync(base);
    this.rootIdentity = identity(lstatSync(this.root)); this.baseIdentity = identity(lstatSync(this.base));
    this.directory = path.join(this.root, '.ai-brain-os');
    this.target = path.join(this.root, SETTINGS_RELATIVE);
    this.work = path.join(this.base, '.settings-work');
    if (this.work === this.root || this.work.startsWith(this.root + path.sep)) throw new SettingsError('Der Arbeitsordner muss außerhalb des Gedächtnisses liegen.');
  }
  private checkAnchor(p: string, expected: string) {
    const s = lstatSync(p);
    if (!s.isDirectory() || s.isSymbolicLink() || realpathSync(p) !== p || identity(s) !== expected) throw new SettingsError('Verzeichnis wurde ersetzt. Bitte Anwendung neu starten.');
  }
  private checkDirectory(p: string): Stats | undefined {
    try {
      const s = lstatSync(p);
      if (!s.isDirectory() || s.isSymbolicLink() || realpathSync(p) !== p) throw new SettingsError('Symbolischer Link oder ungültiger Einstellungsordner. Bitte manuell bereinigen.');
      return s;
    } catch (e) { if (missing(e)) return undefined; throw e; }
  }
  private read(): { document: Document | null; revision: string } {
    this.checkAnchor(this.root, this.rootIdentity);
    if (!this.checkDirectory(this.directory)) return { document: null, revision: 'missing' };
    let before: Stats;
    try { before = lstatSync(this.target); } catch (e) { if (missing(e)) return { document: null, revision: 'missing' }; throw e; }
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > MAX_SETTINGS_BYTES) throw new SettingsError('Einstellungsdatei ist kein einzelnes reguläres Dokument oder überschreitet das Größenlimit.');
    const fd = openSync(this.target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const s = fstatSync(fd);
      if (fingerprint(s) !== fingerprint(before)) throw new SettingsError('Einstellungen wurden während des Lesens geändert. Bitte neu laden.', 409);
      const bytes = Buffer.alloc(s.size + 1); let total = 0;
      while (total < bytes.length) { const n = readSync(fd, bytes, total, bytes.length - total, total); if (!n) break; total += n; }
      this.checkAnchor(this.root, this.rootIdentity); this.checkDirectory(this.directory);
      if (total !== s.size || fingerprint(fstatSync(fd)) !== fingerprint(s) || fingerprint(lstatSync(this.target)) !== fingerprint(s)) throw new SettingsError('Einstellungen wurden während des Lesens geändert. Bitte neu laden.', 409);
      const data = bytes.subarray(0, total);
      let document: Document;
      try { document = decode(data); } catch { throw new SettingsError('Einstellungsdatei ist defekt oder hat ein unbekanntes Format. Sie wird ignoriert und nicht überschrieben. Bitte manuell bereinigen und neu laden.'); }
      return { document, revision: createHash('sha256').update(fingerprint(s)).update(data).digest('hex') };
    } finally { closeSync(fd); }
  }
  load(): SettingsState {
    try { const result = this.read(); return { current: result.document?.current ?? emptyPreferences(), revision: result.revision, writable: true }; }
    catch (e) { return { current: emptyPreferences(), revision: '', writable: false, warning: e instanceof SettingsError ? e.message : 'Einstellungen nicht lesbar. Sie werden ignoriert; Speichern ist gesperrt. Bitte Berechtigungen prüfen und neu laden.' }; }
  }
  // Called once before listening. Only our UUID temp names are removed; never recurse.
  cleanup(): void {
    this.checkAnchor(this.base, this.baseIdentity);
    if (!this.checkDirectory(this.work)) return;
    for (const name of readdirSync(this.work)) {
      const match = /^([1-9]\d*)-[0-9a-f-]{36}\.tmp$/.exec(name);
      if (!match) continue;
      try { process.kill(Number(match[1]), 0); continue; } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') continue; }
      const p = path.join(this.work, name);
      const s = lstatSync(p);
      if (s.isFile() || s.isSymbolicLink()) unlinkSync(p);
    }
  }
  save(current: unknown, revision: unknown): SettingsState {
    if (!validPreferences(current) || !validSize(current) || typeof revision !== 'string' || !/^(missing|[a-f0-9]{64})$/.test(revision)) throw new SettingsError('Ungültiges Einstellungsformat.', 400);
    const before = this.read(); // Invalid/unknown files never get overwritten, even with a matching revision.
    if (before.revision !== revision) throw new SettingsError('Die Einstellungen wurden außerhalb dieser Ansicht geändert. Bitte neu laden; deine Änderung wurde nicht gespeichert.', 409);
    this.checkAnchor(this.base, this.baseIdentity);
    if (!this.checkDirectory(this.work)) mkdirSync(this.work, { mode: 0o700 });
    const workStat = this.checkDirectory(this.work)!;
    if ((workStat.mode & 0o077) !== 0 || (process.getuid && workStat.uid !== process.getuid())) throw new SettingsError('Der Arbeitsordner muss privat sein (Modus 0700, eigener Benutzer).');
    if (workStat.dev !== lstatSync(this.root).dev) throw new SettingsError('Arbeitsordner und Gedächtnis liegen auf verschiedenen Dateisystemen. Atomisches Speichern ist hier nicht möglich.');
    const content = Buffer.from(JSON.stringify({ version: 1, current, previous: before.document?.current ?? null }) + '\n');
    if (content.length > MAX_SETTINGS_BYTES) throw new SettingsError('Einstellungen überschreiten das Größenlimit.');
    decode(content);
    const temp = path.join(this.work, process.pid + '-' + randomUUID() + '.tmp');
    let moved = false;
    try {
      const fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try { writeFileSync(fd, content); fsyncSync(fd); } finally { closeSync(fd); }
      this.checkAnchor(this.base, this.baseIdentity);
      if (identity(this.checkDirectory(this.work)!) !== identity(workStat)) throw new SettingsError('Arbeitsordner wurde ersetzt.');
      if (this.read().revision !== revision) throw new SettingsError('Die Einstellungen wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
      if (!this.checkDirectory(this.directory)) {
        mkdirSync(this.directory, { mode: 0o700 });
        const rootFd = openSync(this.root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
        try { fsyncSync(rootFd); } finally { closeSync(rootFd); }
      }
      this.checkAnchor(this.root, this.rootIdentity); this.checkDirectory(this.directory);
      // Recheck after creating the directory too. No await or user-supplied path in this transaction.
      if (this.read().revision !== revision) throw new SettingsError('Die Einstellungen wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
      renameSync(temp, this.target); moved = true;
      const dir = openSync(this.directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try { fsyncSync(dir); } finally { closeSync(dir); }
      return this.load();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EXDEV') throw new SettingsError('Arbeitsordner und Gedächtnis liegen auf verschiedenen Dateisystemen. Speichern wurde abgebrochen.');
      if (moved) throw new SettingsError('Einstellungen wurden ersetzt, die abschließende Synchronisierung ist fehlgeschlagen. Bitte neu laden und den Stand prüfen.');
      throw e;
    } finally {
      if (!moved) { this.checkAnchor(this.base, this.baseIdentity); if (identity(this.checkDirectory(this.work)!) === identity(workStat)) { try { unlinkSync(temp); } catch (e) { if (!missing(e)) throw e; } } }
    }
  }
}
