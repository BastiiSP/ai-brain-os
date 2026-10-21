import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { agentPlist, appScript, dockEntry, isOurDockEntry, LOG_LIMIT } from '../scripts/access-lib.mjs';
import { setAppIcon } from '../scripts/app-icon.mjs';

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

test('Dock change preserves data, date and nested values; add is idempotent and remove is exact', { skip: process.platform !== 'darwin' }, () => {
  const root = path.join(process.cwd(), '.test-work');
  mkdirSync(root, { recursive: true });
  const work = mkdtempSync(path.join(root, 'dock-'));
  const plist = path.join(work, 'dock.plist');
  const appURL = 'file:///Users/test/Applications/AI%20Brain%20OS.app/';
  const swift = path.join(process.cwd(), 'scripts', 'dock-entry.swift');
  const run = (...args) => execFileSync('/usr/bin/swift', [swift, ...args, '--file', plist], { encoding: 'utf8' }).trim();
  const extract = key => execFileSync('/usr/bin/plutil', ['-extract', key, 'xml1', '-o', '-', plist], { encoding: 'utf8' });
  try {
    writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
      <key>blob</key><data>AAECAwQFBgc=</data>
      <key>when</key><date>2026-10-21T12:34:56Z</date>
      <key>nested</key><dict><key>list</key><array><string>alpha</string><dict><key>flag</key><true/></dict></array></dict>
      <key>persistent-apps</key><array><dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>file:///Applications/Other.app/</string></dict></dict></dict></array>
    </dict></plist>`);
    const otherKeys = Object.fromEntries(['blob', 'when', 'nested'].map(key => [key, extract(key)]));
    const originalApps = extract('persistent-apps');
    assert.equal(run('add', appURL), 'changed');
    const once = readFileSync(plist);
    const apps = execFileSync('/usr/bin/plutil', ['-extract', 'persistent-apps', 'json', '-o', '-', plist], { encoding: 'utf8' });
    assert.equal(JSON.parse(apps).length, 2);
    assert.equal(run('add', appURL), 'unchanged');
    assert.deepEqual(readFileSync(plist), once);
    assert.equal(run('remove', appURL), 'changed');
    assert.equal(extract('persistent-apps'), originalApps);
    for (const [key, xml] of Object.entries(otherKeys)) assert.equal(extract(key), xml, key);
    assert.equal(run('remove', appURL), 'unchanged');
  } finally { rmSync(work, { recursive: true, force: true }); }
});

test('SVG renders a valid macOS icon package at standard and Retina sizes', { skip: process.platform !== 'darwin' }, () => {
  const root = path.join(process.cwd(), '.test-work');
  mkdirSync(root, { recursive: true });
  const work = mkdtempSync(path.join(root, 'icon-'));
  const icon = path.join(work, 'brain.icns');
  const extracted = path.join(work, 'brain.iconset');
  try {
    execFileSync('/usr/bin/swift', [path.join(process.cwd(), 'scripts', 'build-icon.swift'), path.join(process.cwd(), 'assets', 'icon-chip-hirn.svg'), icon]);
    execFileSync('/usr/bin/iconutil', ['-c', 'iconset', icon, '-o', extracted]);
    for (const [name, pixels] of [
      ['16x16', 16], ['16x16@2x', 32], ['32x32', 32], ['32x32@2x', 64],
      ['128x128', 128], ['128x128@2x', 256], ['256x256', 256],
      ['256x256@2x', 512], ['512x512', 512], ['512x512@2x', 1024]
    ]) {
      const png = path.join(extracted, `icon_${name}.png`);
      const info = execFileSync('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', png], { encoding: 'utf8' });
      assert.match(info, new RegExp(`pixelWidth: ${pixels}\\b`));
      assert.match(info, new RegExp(`pixelHeight: ${pixels}\\b`));
    }
  } finally { rmSync(work, { recursive: true, force: true }); }
});


test('temporary Dock app selects Chip-Hirn icon and has a valid signature', { skip: process.platform !== 'darwin' }, () => {
  const root = path.join(process.cwd(), '.test-work');
  mkdirSync(root, { recursive: true });
  const work = mkdtempSync(path.join(root, 'app-icon-'));
  const updated = path.join(work, 'Updated.app');
  const script = path.join(work, 'dock.applescript');
  const icon = path.join(work, 'brain.icns');
  const compile = app => execFileSync('/usr/bin/osacompile', ['-o', app, script]);
  try {
    writeFileSync(script, appScript(4321));
    compile(updated);
    execFileSync('/usr/bin/swift', [path.join(process.cwd(), 'scripts', 'build-icon.swift'), path.join(process.cwd(), 'assets', 'icon-chip-hirn.svg'), icon]);
    setAppIcon(updated, icon);
    setAppIcon(updated, icon); // existing app: update must remain valid
    execFileSync('/usr/bin/codesign', ['-v', updated]);
    const info = path.join(updated, 'Contents', 'Info.plist');
    const plist = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', info], { encoding: 'utf8' }));
    assert.equal(plist.CFBundleIconFile, 'AI Brain OS.icns');
    assert.equal(plist.CFBundleIconName, undefined);
    const resources = path.join(updated, 'Contents', 'Resources');
    assert.ok(readFileSync(path.join(resources, 'AI Brain OS.icns')).equals(readFileSync(icon)));
    assert.throws(() => readFileSync(path.join(resources, 'Assets.car')));
    assert.throws(() => readFileSync(path.join(resources, 'applet.icns')));
  } finally { rmSync(work, { recursive: true, force: true }); }
});
