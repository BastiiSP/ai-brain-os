import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16) / 255);
  const [r, g, b] = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
}
function tokens(css, selector) {
  const start = css.indexOf(selector + '{');
  assert(start >= 0, selector);
  const block = css.slice(start + selector.length + 1, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):#([0-9a-f]{3}(?:[0-9a-f]{3})?)(?=;|})/gi)].map(([, name, value]) => [name, value.length === 3 ? [...value].map(c => c + c).join('') : value]));
}

test('A5: Textfarben beider Modi erreichen mindestens WCAG AA auf ihren Flächen', async () => {
  const css = await readFile('public/style.css', 'utf8');
  const light = tokens(css, ':root');
  const dark = { ...light, ...tokens(css, ':root[data-theme=dark]') };
  for (const [name, t] of [['hell', light], ['dunkel', dark]]) {
    for (const ink of ['ink', 'muted', 'teal', 'pink', 'warning']) {
      const ratio = contrast(t[ink], t.panel);
      assert(ratio >= 4.5, `${name}: ${ink} auf Panel ${ratio.toFixed(2)}:1`);
    }
    assert(contrast(t['chip-ink'], t.chip) >= 4.5, `${name}: Chiptext`);
    assert(contrast(t.ink, t.bg) >= 4.5, `${name}: Haupttext auf Hintergrund`);
  }
});

test('A3/A6/G2/G6: lokale Fonts, keine Fernressourcen und reduzierte Bewegung', async () => {
  const css = await readFile('public/style.css', 'utf8');
  assert(css.includes("url('/fonts/nunito-latin-wght-normal.woff2')"));
  assert(css.includes("url('/fonts/jetbrains-mono-latin-wght-normal.woff2')"));
  assert(!/https?:\/\//.test(css));
  assert(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert(!/animation:[^;}]*infinite/.test(css));
  for (const family of ['Nunito', 'JetBrains-Mono']) {
    const license = await readFile(`public/fonts/LICENSE-${family}.txt`, 'utf8');
    assert(license.includes('SIL OPEN FONT LICENSE'));
  }
});
