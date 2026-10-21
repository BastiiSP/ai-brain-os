const SOURCE_VIEW_BOX = 'viewBox="0 0 1024 1024"';
const CROPPED_VIEW_BOX = 'viewBox="100 100 824 824"';

export function faviconFromSource(svg: string): string {
  if (!svg.includes(SOURCE_VIEW_BOX)) throw new Error('Icon-SVG hat nicht den erwarteten Ausschnitt.');
  return svg.replace(SOURCE_VIEW_BOX, CROPPED_VIEW_BOX);
}
