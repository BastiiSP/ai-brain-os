import type { Entry } from './vault.js';
import { folderColor, hiddenBy, moveBeforePosition, noteCounts, ordered, palette, parentOf, rememberOrder } from './preferences.js';
import type { Preferences, SettingsState, Tone } from './preferences.js';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
  const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el;
};

export class Navigation {
  private entries: Entry[] = [];
  private settings?: SettingsState;
  private editing = false;
  private reveal = false;
  private busy = false;
  private message = '';
  private opened = new Set<string>();
  private drag?: { path: string; group: string };
  constructor(private root: HTMLElement, private save: (current: Preferences, revision: string) => Promise<SettingsState>, private reload: () => Promise<void>) {
    new MutationObserver(() => this.paintColors()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.paintColors());
  }
  update(entries: Entry[], settings: SettingsState) { this.entries = entries; this.settings = settings; this.message = ''; this.render(); }
  private paintColors() {
    if (!this.settings) return;
    const dark = getComputedStyle(document.documentElement).colorScheme === 'dark';
    this.root.querySelectorAll<HTMLElement>('[data-color-path]').forEach(mark => {
      mark.style.backgroundColor = folderColor(this.settings!.current, mark.dataset.colorPath!, mark.dataset.folder === 'true', dark);
    });
  }
  private async change(mutator: (p: Preferences) => void, focus?: string) {
    if (this.busy || !this.settings?.writable) return;
    const next = rememberOrder(this.settings.current, this.entries); mutator(next);
    this.busy = true; this.message = 'Einstellungen werden gespeichert …'; this.render();
    try { this.settings = await this.save(next, this.settings.revision); this.message = 'Gespeichert.'; }
    catch (error) {
      this.message = error instanceof Error ? error.message : 'Speichern fehlgeschlagen. Bitte neu laden.';
      // Fail closed after a conflict or storage error. Reload is an explicit user action.
      this.settings.writable = false;
    } finally {
      this.busy = false; this.render();
      if (focus) [...this.root.querySelectorAll<HTMLElement>('[data-focus]')].find(e => e.dataset.focus === focus)?.focus();
    }
  }
  private render() {
    if (!this.settings) return;
    const prefs = this.settings.current;
    const controls = element('div'); controls.className = 'navigation-controls';
    const button = (text: string, fn: () => void, focus?: string) => {
      const b = element('button', text); b.type = 'button'; b.onclick = fn; if (focus) b.dataset.focus = focus; return b;
    };
    const edit = button(this.editing ? 'Anpassen beenden' : 'Anpassen', () => { this.editing = !this.editing; this.render(); });
    edit.setAttribute('aria-pressed', String(this.editing)); edit.disabled = this.busy; controls.append(edit);
    const reveal = button(this.reveal ? 'Ausgeblendete verbergen' : `Ausgeblendete zeigen (${prefs.hidden.length})`, () => { this.reveal = !this.reveal; this.render(); });
    reveal.setAttribute('aria-pressed', String(this.reveal)); controls.append(reveal);
    const reload = button('Einstellungen neu laden', () => { void this.reload().catch(e => { this.message = String(e); this.render(); }); }); reload.disabled = this.busy; controls.append(reload);
    const message = element('p', this.message || this.settings.warning || ''); message.className = 'navigation-status'; message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
    if (!this.settings.writable) message.classList.add('notice');
    this.root.replaceChildren(controls, message);
    if (this.editing) this.root.append(element('p', 'Reihenfolge: am Griff ziehen oder ↑/↓ wählen. Neue Einträge kommen ans Ende. Anzahl zählt alle Notizen einschließlich Unterordnern und ausgeblendeter Notizen.'));
    const fields = element('fieldset'); fields.className = 'navigation-fields'; fields.disabled = this.busy || !this.settings.writable;
    const legend = element('legend', 'Ordner und angeheftete Notizen'); legend.className = 'sr-only'; fields.append(legend); this.root.append(fields);
    const counts = noteCounts(this.entries);
    const byPath = new Map(this.entries.map(e => [e.path, e]));
    const children = new Map<string, Entry[]>();
    this.entries.forEach(e => { const parent = parentOf(e.path); const list = children.get(parent) ?? []; list.push(e); children.set(parent, list); });
    const listFor = (group: string) => group === '/pinned' ? [...prefs.pinned] : ordered(children.get(group) ?? [], prefs.order[group]).map(e => e.path);
    const reorder = (p: string, target: string, group: string) => {
      if (p === target) return;
      const items = listFor(group); const from = items.indexOf(p), to = items.indexOf(target);
      if (from < 0 || to < 0) return;
      const moved = moveBeforePosition(items, p, target);
      void this.change(next => {
        if (group === '/pinned') next.pinned = moved;
        else Object.defineProperty(next.order, group, { value: moved, writable: true, configurable: true, enumerable: true });
      }, `${group}:${p}:drag`);
    };
    const actions = (e: Entry, group: string): HTMLElement => {
      const actions = element('span'); actions.className = 'entry-actions';
      const add = (text: string, name: string, action: (p: Preferences) => void) => {
        const key = `${group}:${e.path}:${name}`;
        const b = button(text, () => { void this.change(action, key); }, key); b.setAttribute('aria-label', `${text}: ${e.path}`); actions.append(b); return b;
      };
      if (group !== '/pinned') add(prefs.hidden.includes(e.path) ? 'Einblenden' : 'Ausblenden', 'hide', p => { p.hidden = p.hidden.includes(e.path) ? p.hidden.filter(x => x !== e.path) : [...p.hidden, e.path]; });
      if (e.kind === 'note') add(prefs.pinned.includes(e.path) ? 'Lösen' : 'Anheften', 'pin', p => { p.pinned = p.pinned.includes(e.path) ? p.pinned.filter(x => x !== e.path) : [...p.pinned, e.path]; });
      const items = listFor(group); const index = items.indexOf(e.path);
      const handle = button('↕', () => {}, `${group}:${e.path}:drag`); handle.draggable = !fields.disabled; handle.className = 'drag-handle'; handle.setAttribute('aria-label', `Reihenfolge ändern: ${e.path}. Alt und Pfeiltaste oben oder unten.`);
      handle.ondragstart = ev => { this.drag = { path: e.path, group }; if (ev.dataTransfer) { ev.dataTransfer.setData('text/plain', e.path); ev.dataTransfer.effectAllowed = 'move'; } };
      handle.ondragend = () => { this.drag = undefined; };
      handle.onkeydown = ev => { if (ev.altKey && ['ArrowUp', 'ArrowDown'].includes(ev.key)) { ev.preventDefault(); const target = items[index + (ev.key === 'ArrowUp' ? -1 : 1)]; if (target) reorder(e.path, target, group); } };
      actions.append(handle);
      for (const [text, offset] of [['↑', -1], ['↓', 1]] as const) {
        const b = button(text, () => reorder(e.path, items[index + offset]!, group)); b.disabled = !items[index + offset]; b.setAttribute('aria-label', `${e.path} ${offset < 0 ? 'nach oben' : 'nach unten'}`); actions.append(b);
      }
      if (e.kind === 'folder' && parentOf(e.path) === '') {
        const label = element('label', 'Farbe'); const select = element('select'); select.setAttribute('aria-label', `Farbe für ${e.path}`); select.dataset.focus = `${group}:${e.path}:color`;
        for (const [value, tone] of Object.entries(palette)) { const option = element('option', tone.label); option.value = value; select.append(option); }
        select.value = Object.hasOwn(prefs.colors, e.path) ? prefs.colors[e.path]! : 'teal';
        select.onchange = () => { const value = select.value as Tone; void this.change(p => { Object.defineProperty(p.colors, e.path, { value, writable: true, configurable: true, enumerable: true }); }, select.dataset.focus); };
        label.append(select); actions.append(label);
      }
      return actions;
    };
    const row = (entry: Entry, group: string, found = true): HTMLLIElement => {
      const li = element('li'); const hidden = hiddenBy(entry.path, prefs); if (hidden) li.classList.add('is-hidden');
      if (this.editing) {
        li.ondragover = ev => { if (this.drag?.group === group && !fields.disabled) { ev.preventDefault(); ev.stopPropagation(); } };
        li.ondrop = ev => { ev.stopPropagation(); ev.preventDefault(); if (this.drag?.group === group && !fields.disabled) reorder(this.drag.path, entry.path, group); this.drag = undefined; };
      }
      const mark = element('span'); mark.className = 'folder-mark'; mark.dataset.colorPath = entry.path; mark.dataset.folder = String(entry.kind === 'folder'); mark.setAttribute('aria-hidden', 'true');
      const link = element('a'); link.href = '/?path=' + encodeURIComponent(entry.path); link.title = entry.path;
      const icon = element('span'); icon.setAttribute('aria-hidden', 'true');
      const extension = entry.path.split('.').at(-1)?.toLowerCase() ?? '';
      const type = entry.kind === 'file' ? (/^(png|jpg|jpeg|svg|webp|gif|avif)$/.test(extension) ? 'image' : extension === 'pdf' ? 'pdf' : /^(zip|gz)$/.test(extension) ? 'archive' : /^(mp3|wav|m4a)$/.test(extension) ? 'audio' : /^(mp4|mov|webm)$/.test(extension) ? 'video' : 'text') : entry.kind;
      icon.className = 'entry-icon ' + type;
      if (entry.kind === 'file') icon.textContent = /^[a-z0-9]{1,4}$/.test(extension) ? extension.slice(0, 3).toUpperCase() : 'FILE';
      link.append(icon, element('span', entry.kind === 'folder' ? entry.path.split('/').at(-1)! : entry.title));
      let line: HTMLElement = element('div'); line.className = 'navigation-row';
      if (entry.kind === 'folder' && group !== '/pinned') {
        const details = element('details'); details.open = this.opened.has(entry.path); details.ontoggle = () => { if (details.open) this.opened.add(entry.path); else this.opened.delete(entry.path); };
        const summary = element('summary'); summary.append(mark, icon.cloneNode(true), element('span', ' ' + entry.path.split('/').at(-1)!));
        const count = element('small', ` ${counts.get(entry.path) ?? 0}`); count.title = 'Notizen einschließlich Unterordnern und ausgeblendeter Notizen'; summary.append(count); details.append(summary);
        link.textContent = 'Ordner öffnen'; details.append(link, tree(entry.path)); line = summary; li.append(details);
      } else {
        line.append(mark);
        if (found) line.append(link); else line.append(element('span', `${entry.path} — nicht gefunden`)); li.append(line);
      }
      if (hidden) line.append(element('small', prefs.hidden.includes(entry.path) ? ' ausgeblendet' : ' über Ordner ausgeblendet'));
      if (this.editing) li.append(actions(entry, group));
      return li;
    };
    const tree = (parent: string): HTMLUListElement => {
      const ul = element('ul');
      for (const entry of ordered(children.get(parent) ?? [], prefs.order[parent])) if (this.reveal || !hiddenBy(entry.path, prefs)) ul.append(row(entry, parent));
      return ul;
    };
    if (prefs.pinned.length) {
      fields.append(element('h2', 'Angeheftet')); const pins = element('ul'); pins.className = 'pinned-notes';
      for (const p of prefs.pinned) {
        const entry = byPath.get(p); if (!this.reveal && hiddenBy(p, prefs)) continue;
        pins.append(row(entry?.kind === 'note' ? entry : { path: p, title: p, kind: 'note' }, '/pinned', entry?.kind === 'note'));
      }
      fields.append(pins);
    }
    fields.append(tree(''));
    const stale = prefs.hidden.filter(p => !byPath.has(p));
    if (this.reveal && stale.length) {
      fields.append(element('h2', 'Ausgeblendet, nicht gefunden'));
      for (const p of stale) { const b = button(`Ausblendung entfernen: ${p}`, () => { void this.change(next => { next.hidden = next.hidden.filter(x => x !== p); }); }); fields.append(b); }
    }
    this.paintColors();
  }
}
