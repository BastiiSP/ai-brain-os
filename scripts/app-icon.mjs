import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, renameSync, rmSync, utimesSync } from 'node:fs';
import path from 'node:path';

const run = (file, args) => execFileSync(file, args, { stdio: ['pipe', 'pipe', 'pipe'] });

export function setAppIcon(appPath, icon) {
  const contents = path.join(appPath, 'Contents');
  const resources = path.join(contents, 'Resources');
  const info = path.join(contents, 'Info.plist');
  const targetIcon = path.join(resources, 'AI Brain OS.icns');
  const stagedIcon = path.join(resources, '.AI Brain OS.icns.tmp');
  mkdirSync(resources, { recursive: true });
  try {
    copyFileSync(icon, stagedIcon);
    // osacompile adds an asset catalog selected by CFBundleIconName ahead of CFBundleIconFile.
    const plist = JSON.parse(run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', info]).toString());
    if (Object.hasOwn(plist, 'CFBundleIconName')) run('/usr/bin/plutil', ['-remove', 'CFBundleIconName', info]);
    run('/usr/bin/plutil', ['-replace', 'CFBundleIconFile', '-string', 'AI Brain OS.icns', info]);
    rmSync(path.join(resources, 'Assets.car'), { force: true });
    rmSync(path.join(resources, 'applet.icns'), { force: true });
    renameSync(stagedIcon, targetIcon);
    // Modifying Info.plist/resources invalidates osacompile's signature.
    run('/usr/bin/codesign', ['--force', '--sign', '-', appPath]);
    run('/usr/bin/codesign', ['--verify', appPath]);
    const now = new Date();
    utimesSync(appPath, now, now);
  } finally { rmSync(stagedIcon, { force: true }); }
}
