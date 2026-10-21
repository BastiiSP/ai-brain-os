import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Always creates a NEW invented vault within the application's ignored test area.
export async function roomFixture(count = 2000) {
  await mkdir('.test-work', { recursive: true });
  const root = await mkdtemp(path.resolve('.test-work/room-'));
  const folders = ['00 Beispiel', '01 Eingang', '02 Projekte', '03 Bereiche', '04 Wissen', '05 Daily Notes', '06 Archiv'];
  const name = i => `${folders[i % folders.length]}/Notiz-${String(i).padStart(4, '0')}.md`;
  for (const folder of folders) await mkdir(path.join(root, folder));
  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10);
    await writeFile(path.join(root, name(i)), `---\ndate: ${date}\n---\n# Erfundenes Beispiel ${i}\n\n[[${name((i + 1) % count)}]]\n[[${name((i + 37) % count)}]]\n`);
  }
  return root;
}
