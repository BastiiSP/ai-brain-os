import test from 'node:test';
import assert from 'node:assert/strict';
import { agentPlist, appScript, dockEntry, isOurDockEntry, LOG_LIMIT } from '../scripts/access-lib.mjs';

test('LaunchAgent stays local to this account and restarts', () => {
  const xml = agentPlist('/test/node', '/test/launcher', '/test/project');
  assert.match(xml, /<key>RunAtLoad<\/key><true\/>/);
  assert.match(xml, /<key>KeepAlive<\/key><true\/>/);
  assert.match(xml, /<key>ThrottleInterval<\/key><integer>1<\/integer>/);
  assert.match(xml, /<string>\/test\/launcher<\/string>/);
  assert.ok(!xml.includes('NetworkState'));
});

test('Dock application probes the actual loopback port and explains failure', () => {
  const script = appScript(4321);
  assert.match(script, /127\.0\.0\.1:4321\/api\/state/);
  assert.match(script, /127\.0\.0\.1:4321\//);
  assert.match(script, /nicht erreichbar/);
  assert.throws(() => appScript(0));
});

test('Dock entry recognition preserves unrelated tiles', () => {
  const entry = dockEntry('/Users/test/Applications/AI Brain OS.app');
  assert.ok(isOurDockEntry(entry, '/Users/test/Applications/AI Brain OS.app'));
  assert.ok(!isOurDockEntry(entry, '/Users/test/Applications/Other.app'));
  assert.equal(LOG_LIMIT, 1048576);
});
