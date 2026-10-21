// Explicitly opt-in. Never imported by npm test. No file writes, no server socket.
import { readFile, readdir, lstat, readlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadConfig } from '../dist/src/config.js';
import { Vault } from '../dist/src/vault.js';
async function manifest(root, dir = '') {
  const result = {};
  for (const item of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const p = dir ? dir + '/' + item.name : item.name;
    const s = await lstat(path.join(root, p));
    if (item.isDirectory()) { result[p + '/'] = String(s.mtimeMs); Object.assign(result, await manifest(root, p)); }
    else { const bytes = item.isSymbolicLink() ? await readlink(path.join(root, p)) : await readFile(path.join(root, p)); result[p] = s.mtimeMs + ':' + createHash('sha256').update(bytes).digest('hex'); }
  }
  return result;
}
const config = await loadConfig();
const gitStatus = () => execFileSync('git', ['--no-optional-locks', '-C', config.root, 'status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
const before = await manifest(config.root);
const statusBefore = gitStatus();
const vault = new Vault(config);
await vault.refresh();
const independent = Object.keys(before).filter(p => !p.endsWith('/') && !p.split('/').some(s => s.startsWith('.')) && !config.exclude.some(e => p.normalize('NFC').toLowerCase() === e.normalize('NFC').toLowerCase() || p.normalize('NFC').toLowerCase().startsWith(e.replace(/\/$/, '').normalize('NFC').toLowerCase() + '/'))).sort();
assert.equal(JSON.stringify(vault.snapshot.entries.filter(e => e.kind !== 'folder').map(e => e.path).sort()), JSON.stringify(independent), 'Navigation weicht von unabhängiger Dateiliste ab.');
const required = [...vault.snapshot.notes.values()].filter(n => /Daily Notes|KI Entwicklung\.md|[äöüÄÖÜß]/.test(n.path) || n.body.includes('\\|'));
const sample = [...new Set([...required.map(n => n.path), ...vault.snapshot.notes.keys()])].slice(0, Math.max(10, required.length));
for (const p of sample) { const n = vault.snapshot.notes.get(p); assert(n.html.length > 0 || n.warnings.length > 0); }
const searches = ['Übergaben', 'Anwesenheitstool'].map(query => {
  const start = performance.now(); const hits = vault.search(query); const ms = performance.now() - start;
  assert(hits.length > 0); assert(ms < 300);
  return { query, hits: hits.length, ms: Number(ms.toFixed(2)) };
});
assert(vault.snapshot.durationMs < 2000);
assert.deepEqual(await manifest(config.root), before);
assert.equal(gitStatus(), statusBefore);
console.log(JSON.stringify({ notes: vault.snapshot.notes.size, files: independent.length, renderSample: sample.length, refreshMs: Number(vault.snapshot.durationMs.toFixed(2)), searches, unresolvedOrAmbiguous: vault.issues().length, warnings: [...vault.snapshot.notes.values()].reduce((n, v) => n + v.warnings.length, vault.snapshot.warnings.length), manifestAndGitUnchanged: true, browserChecked: false }, null, 2));
