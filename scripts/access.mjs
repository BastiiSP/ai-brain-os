#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, renameSync, rmSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LABEL, APP_NAME, agentPlist, appScript } from './access-lib.mjs';
import { pathToFileURL } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const app = path.join(home, 'Applications', APP_NAME);
const plist = path.join(home, 'Library', 'LaunchAgents', `${LABEL}.plist`);
const logDir = path.join(home, 'Library', 'Logs', 'AI Brain OS');
const target = `gui/${process.getuid()}`;
const command = process.argv[2];
const run = (file, args, options = {}) => execFileSync(file, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options });

function dockModify(add) {
  const result = run('/usr/bin/swift', [path.join(base, 'scripts', 'dock-entry.swift'), add ? 'add' : 'remove', pathToFileURL(`${app}/`).href]);
  if (result.trim() === 'changed') {
    try { run('/usr/bin/killall', ['Dock']); } catch { /* Dock startet bei Bedarf erneut. */ }
  }
}

function buildIcon(work) {
  const icon = path.join(work, 'AI Brain OS.icns');
  run('/usr/bin/swift', [path.join(base, 'scripts', 'build-icon.swift'), path.join(base, 'assets', 'icon-chip-hirn.svg'), icon]);
  return icon;
}

function setAppIcon(appPath, icon) {
  const resources = path.join(appPath, 'Contents', 'Resources');
  mkdirSync(resources, { recursive: true });
  const targetIcon = path.join(resources, 'AI Brain OS.icns');
  const stagedIcon = path.join(resources, '.AI Brain OS.icns.tmp');
  try {
    copyFileSync(icon, stagedIcon);
    run('/usr/bin/plutil', ['-replace', 'CFBundleIconFile', '-string', 'AI Brain OS.icns', path.join(appPath, 'Contents', 'Info.plist')]);
    renameSync(stagedIcon, targetIcon);
  } finally { rmSync(stagedIcon, { force: true }); }
}

function assertMac() {
  if (process.platform !== 'darwin') throw new Error('Einrichtung ist nur auf macOS möglich.');
  if (process.getuid() === 0) throw new Error('Bitte als angemeldeter Benutzer, nicht mit sudo, ausführen.');
}

async function install(work) {
  if (existsSync(plist) || existsSync(app)) throw new Error('Bereits installiert oder Ziel belegt. Erst mit „node scripts/access.mjs uninstall“ entfernen.');
  // Build before reading config: no service or Dock entry is touched if build fails.
  run('npm', ['ci'], { cwd: base, stdio: 'inherit' });
  run('npm', ['run', 'build'], { cwd: base, stdio: 'inherit' });
  const { loadConfig } = await import('../dist/src/config.js');
  const { port } = await loadConfig(base);
  try {
    const listeners = run('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN']);
    if (listeners.trim()) throw new Error(`Port ${port} ist bereits belegt. Laufenden Server selbst beenden und Einrichtung erneut starten.`);
  } catch (error) { if (error.message?.includes('bereits belegt')) throw error; if (error.status !== 1) throw error; }

  const icon = buildIcon(work);
  const source = path.join(work, 'dock.applescript');
  const stagedApp = path.join(work, APP_NAME);
  const stagedPlist = path.join(work, `${LABEL}.plist`);
  writeFileSync(source, appScript(port));
  run('/usr/bin/osacompile', ['-o', stagedApp, source]);
  setAppIcon(stagedApp, icon);
  writeFileSync(stagedPlist, agentPlist(process.execPath, path.join(base, 'scripts', 'service-launcher.mjs'), base));
  run('/usr/bin/plutil', ['-lint', stagedPlist]);
  mkdirSync(path.dirname(app), { recursive: true });
  mkdirSync(path.dirname(plist), { recursive: true });
  renameSync(stagedApp, app);
  renameSync(stagedPlist, plist);
  try {
    run('/bin/launchctl', ['bootstrap', target, plist]);
    dockModify(true);
  } catch (error) {
    try { run('/bin/launchctl', ['bootout', target, plist]); } catch { /* Job eventuell nicht geladen. */ }
    rmSync(plist, { force: true });
    rmSync(app, { recursive: true, force: true });
    throw error;
  }
  console.log(`Installiert: ${app}\nDienst: ${LABEL}\nProtokoll: ${path.join(logDir, 'server.log')}`);
}

function uninstall() {
  if (existsSync(plist)) {
    try { run('/bin/launchctl', ['bootout', target, plist]); }
    catch (error) { if (!String(error.stderr).includes('No such process') && !String(error.stderr).includes('Could not find service')) throw error; }
  }
  dockModify(false);
  rmSync(plist, { force: true });
  rmSync(app, { recursive: true, force: true });
  rmSync(logDir, { recursive: true, force: true });
  console.log('AI Brain OS Dienst, Dock-App, Startdatei und Protokolle entfernt.');
}

function update(work) {
  if (!existsSync(plist)) throw new Error('Dienst ist nicht installiert.');
  run('npm', ['ci'], { cwd: base, stdio: 'inherit' });
  run('npm', ['run', 'build'], { cwd: base, stdio: 'inherit' });
  if (!existsSync(app)) throw new Error('Dock-App fehlt. Bitte Installation prüfen.');
  const icon = buildIcon(work);
  setAppIcon(app, icon);
  run('/bin/launchctl', ['kickstart', '-k', `${target}/${LABEL}`]);
  try { run('/usr/bin/killall', ['Dock']); } catch { /* Dock startet bei Bedarf erneut. */ }
  console.log('Code aktualisiert und Dienst neu gestartet. Bei geändertem Port: uninstall und install ausführen.');
}

if (!['install', 'uninstall', 'update'].includes(command)) {
  console.error('Nutzung: node scripts/access.mjs install|uninstall|update');
  process.exitCode = 2;
} else {
  let work;
  try {
    assertMac();
    mkdirSync(path.join(base, '.access-work'), { recursive: true });
    work = mkdtempSync(path.join(base, '.access-work', 'run-'));
    if (command === 'install') await install(work);
    else if (command === 'uninstall') uninstall();
    else update(work);
  } catch (error) {
    console.error(`Zugang: ${error.message}`);
    process.exitCode = 1;
  } finally { if (work) rmSync(work, { recursive: true, force: true }); }
}
