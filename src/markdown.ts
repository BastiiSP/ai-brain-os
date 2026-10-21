import MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it';
import { headingId, isImage, type Link, type Note } from './vault.js';

export const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function entryUrl(p: string, anchor = '') {
  return `/?path=${encodeURIComponent(p)}${anchor && !anchor.startsWith('^') ? '#' + encodeURIComponent(headingId(anchor)) : ''}`;
}
export function fileUrl(p: string) { return `/api/file?path=${encodeURIComponent(p)}`; }

export function renderNote(note: Note, resolve: (s: string) => Link): string {
  // Raw HTML is always escaped. Only this renderer can produce HTML attributes.
  const md = new MarkdownIt({ html: false, linkify: true, breaks: false });
  const collect = (raw: string) => { const link = resolve(raw); note.links.push(link); return link; };
  const url = (l: Link) => {
    if (l.kind === 'external') return l.targets[0]!;
    if (l.kind === 'resolved') return entryUrl(l.targets[0]!, l.anchor);
    return `/?source=${encodeURIComponent(note.path)}&link=${encodeURIComponent(l.raw)}`;
  };
  const attrs = (l: Link) => `href="${escape(url(l))}" class="link-${l.kind}"${l.kind === 'external' ? ' target="_blank" rel="noopener noreferrer"' : ''}${l.kind === 'missing' ? ' title="Nicht aufgelöst"' : l.kind === 'ambiguous' ? ' title="Mehrdeutig – Ziel auswählen"' : ''}`;
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    const rest = state.src.slice(state.pos);
    const match = /^(!?)\[\[([^\]\n]+)\]\]/.exec(rest);
    if (!match) return false;
    if (!silent) {
      const token = state.push('wikilink', '', 0);
      token.content = match[2]!;
      token.meta = { embed: Boolean(match[1]) };
    }
    state.pos += match[0].length;
    return true;
  });
  md.renderer.rules.wikilink = (tokens, i) => {
    const token = tokens[i]!;
    const link = collect(token.content);
    if (token.meta?.embed && link.kind === 'resolved' && isImage(link.targets[0]!)) return `<img src="${escape(fileUrl(link.targets[0]!))}" alt="${escape(link.label)}" loading="lazy">`;
    return `<a ${attrs(link)}>${escape(link.label)}${link.kind === 'external' ? ' ↗' : link.kind === 'missing' ? ' ⚠' : link.kind === 'ambiguous' ? ' ◇' : ''}</a>`;
  };
  md.renderer.rules.link_open = (tokens, i) => {
    const l = collect(String(tokens[i]!.attrGet('href') ?? ''));
    return `<a ${attrs(l)}>`;
  };
  md.renderer.rules.image = (tokens, i) => {
    const token = tokens[i]!;
    const l = collect(String(token.attrGet('src') ?? ''));
    if (l.kind === 'resolved' && isImage(l.targets[0]!)) return `<img src="${escape(fileUrl(l.targets[0]!))}" alt="${escape(token.content)}" loading="lazy">`;
    return `<a ${attrs(l)}>${escape(token.content || l.label)}${l.kind === 'external' ? ' (externes Bild ↗)' : ' (Bild öffnen)'}</a>`;
  };
  const seen = new Map<string, number>();
  md.renderer.rules.heading_open = (tokens, i) => {
    const inline = tokens[i + 1];
    const title = inline?.children?.map(t => t.type === 'text' || t.type === 'code_inline' ? t.content : t.type === 'wikilink' ? t.content.split('|').at(-1) : '').join('') ?? inline?.content ?? '';
    const base = headingId(title);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return `<${tokens[i]!.tag} id="${escape(base + (count ? '-' + count : ''))}">`;
  };
  md.core.ruler.after('inline', 'readable-tasks-callouts', state => {
    const walk = (tokens: Token[]) => {
      for (const token of tokens) {
        if (token.type === 'inline' && token.children?.[0]?.type === 'text') {
          token.children[0].content = token.children[0].content.replace(/^\[ \] /, '☐ ').replace(/^\[x\] /i, '☑ ').replace(/^\[!([^\]]+)\][+-]?\s*/, '$1 · ');
        }
        if (token.children) walk(token.children);
      }
    };
    walk(state.tokens);
  });
  return md.render(note.body);
}
