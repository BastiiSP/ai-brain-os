import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface Config { root: string; port: number; exclude: string[]; maxNoteBytes: number }
export const defaultExcludes = ['00 Kontext/Tokens & Zugänge.md'];
export async function loadConfig(base = process.cwd()): Promise<Config> {
  let value: Record<string, unknown> = {};
  try { value = JSON.parse(await readFile(path.join(base, 'config.local.json'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('config.local.json ist ungültig oder nicht lesbar.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Konfiguration muss ein Objekt sein.');
  const root = value.root ?? '../ai-brain-gedaechtnis';
  const port = value.port ?? 3210;
  const exclude = value.exclude ?? [];
  const maxNoteBytes = value.maxNoteBytes ?? 2 * 1024 * 1024;
  if (typeof root !== 'string' || !root || !Number.isInteger(port) || Number(port) < 1024 || Number(port) > 65535 ||
      !Array.isArray(exclude) || !exclude.every(x => typeof x === 'string' && x.length > 0 && !path.isAbsolute(x) && !x.split('/').includes('..')) ||
      !Number.isSafeInteger(maxNoteBytes) || Number(maxNoteBytes) < 1024 || Number(maxNoteBytes) > 16 * 1024 * 1024) {
    throw new Error('Ungültige Konfiguration: root, port, exclude oder maxNoteBytes prüfen.');
  }
  return { root: path.resolve(base, root), port: Number(port), exclude: [...defaultExcludes, ...exclude], maxNoteBytes: Number(maxNoteBytes) };
}
