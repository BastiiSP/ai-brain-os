import { pathToFileURL } from 'node:url';

export const LABEL = 'io.github.ai-brain-os.local';
export const APP_NAME = 'AI Brain OS.app';
export const LOG_LIMIT = 1024 * 1024;

export function agentPlist(node, launcher, cwd) {
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${LABEL}</string>
<key>ProgramArguments</key><array><string>${escape(node)}</string><string>${escape(launcher)}</string></array>
<key>WorkingDirectory</key><string>${escape(cwd)}</string>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>1</integer>
<key>StandardOutPath</key><string>/dev/null</string>
<key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>
`;
}

export function appScript(port) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Ungültiger Port');
  return `on run
  try
    do shell script "/usr/bin/curl --noproxy '*' --silent --show-error --fail --max-time 2 http://127.0.0.1:${port}/api/state > /dev/null"
    open location "http://127.0.0.1:${port}/"
  on error
    display dialog "AI Brain OS ist gerade nicht erreichbar. Bitte einige Sekunden warten und erneut öffnen. Falls das Problem bleibt, siehe Protokoll und Prüfbefehle im README." with title "AI Brain OS" buttons {"OK"} default button "OK" with icon caution
  end try
end run
`;
}

export function dockEntry(appPath) {
  return { 'tile-data': { 'file-data': { '_CFURLString': pathToFileURL(`${appPath}/`).href, '_CFURLStringType': 15 }, 'file-label': 'AI Brain OS' }, 'tile-type': 'file-tile' };
}

export function isOurDockEntry(entry, appPath) {
  return entry?.['tile-data']?.['file-data']?.['_CFURLString'] === pathToFileURL(`${appPath}/`).href;
}

