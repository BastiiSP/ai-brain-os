import { emptyPreferences, folderColor } from './preferences.js';
import type { Preferences } from './preferences.js';
import * as T from './three.module.js';
import type { Graph } from './graph.js';
import { roomBuffers, isolatedEdge } from './room-data.js';
import { layoutGraph } from './room-layout.js';
export interface CameraState { azimuth: number; polar: number; distance: number }
export function createRoom(graph: Graph, read: (path: string) => void, cameraState: CameraState, started: number, preferences: Preferences = emptyPreferences()) {
  const layoutStart = performance.now();
  const layout = layoutGraph(graph);
  const layoutMs = performance.now() - layoutStart;
  const geometryStart = performance.now();
  const buffers = roomBuffers(graph, layout);
  const geometryMs = performance.now() - geometryStart;
  const domStart = performance.now();
  const root = document.createElement('section'); root.className = 'knowledge-room';
  const heading = document.createElement('h1'); heading.textContent = 'Wissensraum'; root.append(heading);
  const help = document.createElement('p'); help.textContent = 'Ziehen dreht · Scrollen zoomt · Chip anklicken zum Lesen. Tastatur: Pfeile drehen, +/− zoomen. Notizen sind auch über die Auswahlliste erreichbar.'; root.append(help);
  const controls = document.createElement('div'); controls.className = 'room-controls'; root.append(controls);
  const button = (text: string, fn: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = fn; controls.append(b); return b; };
  const stage = document.createElement('div'); stage.className = 'room-stage'; root.append(stage);
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas.setAttribute('aria-label', '3D-Platine. Pfeiltasten drehen, Plus und Minus zoomen.'); stage.append(canvas);
  const metrics = document.createElement('p'); metrics.className = 'room-metrics'; root.append(metrics);
  const card = document.createElement('section'); card.className = 'room-card'; card.hidden = true; root.append(card);
  const selectLabel = document.createElement('label'); selectLabel.textContent = 'Notiz auswählen'; selectLabel.htmlFor = 'room-note'; root.append(selectLabel);
  const select = document.createElement('select'); select.id = 'room-note'; root.append(select);
  const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Eine Notiz wählen …'; select.append(empty);
  const options = graph.nodes.map((n, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = n.path; return o; });
  const fragment = document.createDocumentFragment(); options.forEach(o => fragment.append(o)); select.append(fragment);
  const domMs = performance.now() - domStart;
  const rendererStart = performance.now();
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const rendererMs = performance.now() - rendererStart;
  const overlay = document.createElement('canvas'); overlay.className = 'room-overlay'; stage.append(overlay);
  const ink = overlay.getContext('2d')!;
  const scene = new T.Scene(), world = new T.Group(); scene.add(world);
  scene.add(new T.AmbientLight(0xffffff, 1.2)); const light = new T.DirectionalLight(0xffffff, 2); light.position.set(30, 100, 50); scene.add(light);
  const camera = new T.PerspectiveCamera(45, 1, .1, layout.extent * 15);
  if (!cameraState.distance) cameraState.distance = layout.extent * 1.5;
  const box = new T.BoxGeometry(1, 1, 1);
  const chips = new T.InstancedMesh(box, new T.MeshLambertMaterial(), graph.nodes.length); world.add(chips);
  chips.frustumCulled = false;
  const matrix = new T.Matrix4();
  const sockets: T.Mesh[] = [];

  for (const b of layout.boards) {
    const mesh = new T.Mesh(box, new T.MeshLambertMaterial()); mesh.position.set(b.x, 0, b.z); mesh.scale.set(b.size, .8, b.size); world.add(mesh); sockets.push(mesh);

  }
  const lineGeometry = new T.BufferGeometry();
  const linePositions = buffers.positions, lineColors = new Float32Array(linePositions.length);
  lineGeometry.setAttribute('position', new T.BufferAttribute(linePositions, 3)); lineGeometry.setAttribute('color', new T.BufferAttribute(lineColors, 3));
  const lines = new T.LineSegments(lineGeometry, new T.LineBasicMaterial({ vertexColors: true, transparent: true })); lines.frustumCulled = false; world.add(lines);
  const pulseGeometry = new T.BufferGeometry(); const pulsePositions = new Float32Array(Math.min(60, graph.edges.length) * 3); pulseGeometry.setAttribute('position', new T.BufferAttribute(pulsePositions, 3));
  const pulses = new T.Points(pulseGeometry, new T.PointsMaterial({ size: 3, sizeAttenuation: false })); pulses.frustumCulled = false; world.add(pulses);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !reduced.matches, daily = true, selected = -1, hover = -1, active = false, disposed = false, raf = 0;
  let visible = graph.nodes.length, growthStart: number | undefined;
  let phase = 0, last = 0, sampleStart = 0, frames = 0, fps = 0, buildMs = 0, first = true;
  let showNodes = 0, showEdges = 0, edgeCursor = 0, repaintMs = 0;
  const traceStatus = document.createElement('span'); traceStatus.className = 'room-trace-status'; controls.append(traceStatus);
  button('Vorige Bahn', () => { edgeCursor--; repaint(); });
  button('Nächste Bahn', () => { edgeCursor++; repaint(); });
  let measureStart: number | undefined, measureFrames = 0;
  const measurement = document.createElement('p'); measurement.className = 'room-metrics'; root.append(measurement);
  button('10 Sekunden messen', () => { measureStart = performance.now(); measureFrames = 0; measurement.textContent = 'Messung läuft – Tab sichtbar lassen …'; });
  const rank = graph.nodes.map(() => 0); layout.order.forEach((id, r) => { rank[id] = r; });
  const shown = (i: number) => rank[i]! < visible && (daily || !graph.nodes[i]!.daily);
  const motionButton = button('Bewegung', () => { motion = !motion; syncMotion(); });
  function syncMotion() { if (reduced.matches) motion = false; motionButton.disabled = reduced.matches; motionButton.setAttribute('aria-pressed', String(motion)); if (!motion) { growthStart = undefined; visible = graph.nodes.length; growthButton.setAttribute('aria-pressed', 'false'); world.position.y = 0; repaint(); } }
  const dailyButton = button('Tagesnotizen', () => { daily = !daily; dailyButton.setAttribute('aria-pressed', String(daily)); if (selected >= 0 && !shown(selected)) close(); if (hover >= 0 && !shown(hover)) hover = -1; repaint(); }); dailyButton.setAttribute('aria-pressed', 'true');
  const growthButton = button('Wachstum abspielen', () => { if (!motion || reduced.matches) return; growthStart = performance.now(); visible = 0; close(); repaint(); growthButton.setAttribute('aria-pressed', 'true'); });
  button('Alle zeigen', () => { growthStart = undefined; visible = graph.nodes.length; growthButton.setAttribute('aria-pressed', 'false'); repaint(); });
  button('Kamera zurücksetzen', () => { cameraState.azimuth = -.8; cameraState.polar = .65; cameraState.distance = layout.extent * 1.5; });
  // Folder palette derived from the existing theme tokens; no external assets.
  let bg = new T.Color(), teal = new T.Color(), pink = new T.Color(); let folderColors: T.Color[] = []; let nodeColors: T.Color[] = [];
  function theme() {
    const css = getComputedStyle(document.documentElement); const value = (key: string) => css.getPropertyValue(key).trim();
    bg.set(value('--bg')); teal.set(value('--teal')); pink.set(value('--pink'));
    const dark = css.colorScheme === 'dark';
    folderColors = graph.folders.map(p => new T.Color(folderColor(preferences, p, true, dark)));
    nodeColors = graph.nodes.map(n => { const color = new T.Color(folderColor(preferences, n.path, false, dark)); return n.daily ? color.lerp(bg, .65) : color; });
    sockets.forEach((mesh, i) => { (mesh.material as T.MeshLambertMaterial).color.copy(folderColors[i]!).lerp(bg, .85); });
    (pulses.material as T.PointsMaterial).color.copy(pink); repaint();
  }
  function repaint() {
    const paintStart = performance.now();
    const focus = hover >= 0 ? hover : selected; showNodes = 0; showEdges = 0;
    graph.nodes.forEach((_, i) => {
      const p = layout.positions[i]!, size = shown(i) ? layout.sizes[i]! : 0; if (size) showNodes++;
      matrix.makeScale(size, size ? 2.5 : 0, size); matrix.setPosition(...p); chips.setMatrixAt(i, matrix);
      chips.setColorAt(i, nodeColors[i] ?? teal);
      if (options[i]!.disabled === shown(i)) options[i]!.disabled = !shown(i);
    });
    chips.boundingSphere = null;
    chips.instanceMatrix.needsUpdate = true; if (chips.instanceColor) chips.instanceColor.needsUpdate = true;
    const gradients = Array.from({ length: 5 }, (_, i) => teal.clone().lerp(pink, i / 4));
    graph.edges.forEach(([a, b], i) => {
      const show = shown(a) && shown(b); if (show) showEdges++;
      const dim = focus >= 0 && a !== focus && b !== focus && a !== selected && b !== selected;
      const route = layout.routes[i]!;
      for (let s = 0; s < 4; s++) for (let e = 0; e < 2; e++) {
        const offset = i * 24 + s * 6 + e * 3;
        linePositions.set(show ? route[s + e]! : [0, -100, 0], offset);
        const color = gradients[s + e]!; const strength = focus >= 0 ? (dim ? .025 : .3) : .18;
        lineColors[offset] = bg.r + (color.r - bg.r) * strength; lineColors[offset + 1] = bg.g + (color.g - bg.g) * strength; lineColors[offset + 2] = bg.b + (color.b - bg.b) * strength;
      }
    });
    lineGeometry.attributes.position!.needsUpdate = true; lineGeometry.attributes.color!.needsUpdate = true;
    const edge = isolatedEdge(buffers.incident, focus, edgeCursor, e => graph.edges[e]!.every(shown));
    traceStatus.textContent = edge < 0 ? 'Chip wählen: einzelne Bahnen verfolgen' : `Bahn ${buffers.incident[focus]!.indexOf(edge) + 1}/${buffers.incident[focus]!.length} · ${graph.nodes[graph.edges[edge]![0]]!.title} ↔ ${graph.nodes[graph.edges[edge]![1]]!.title}`;
    growthButton.disabled = !motion || reduced.matches;
    repaintMs += performance.now() - paintStart;
  }
  function close() { selected = -1; select.value = ''; card.hidden = true; repaint(); }
  function open(i: number) {
    if (!shown(i)) return; selected = i; edgeCursor = 0; select.value = String(i); card.replaceChildren(); card.hidden = false;
    const n = graph.nodes[i]!;
    const title = document.createElement('h2'); title.textContent = n.title; card.append(title);
    const path = document.createElement('p'); path.className = 'breadcrumb'; path.textContent = n.path; card.append(path);
    const closeButton = document.createElement('button'); closeButton.textContent = 'Schließen'; closeButton.onclick = close; card.append(closeButton);
    const readButton = document.createElement('button'); readButton.textContent = 'Lesen'; readButton.onclick = () => read(n.path); card.append(readButton);
    const neighbours = buffers.incident[i]!.map(e => { const [a,b] = graph.edges[e]!; return a === i ? b : a; });
    const subtitle = document.createElement('h3'); subtitle.textContent = `${neighbours.length} verknüpfte Notizen`; card.append(subtitle);
    const list = document.createElement('ul'); card.append(list);
    neighbours.forEach(j => { const li = document.createElement('li'), b = document.createElement('button'); b.textContent = graph.nodes[j]!.title; b.disabled = !shown(j); b.onclick = () => open(j); const trace = document.createElement('button'); trace.textContent = 'Bahn verfolgen'; trace.disabled = !shown(j); trace.onclick = () => { hover = -1; const eligible = buffers.incident[i]!.filter(e => graph.edges[e]!.every(shown)); edgeCursor = eligible.findIndex(e => graph.edges[e]!.includes(j)); repaint(); }; li.append(b, trace); list.append(li); });
    const resourcesTitle = document.createElement('h3'); resourcesTitle.textContent = `${n.resources.length} Links auf Anhänge und Ordner`; card.append(resourcesTitle);
    const resources = document.createElement('ul'); card.append(resources);
    n.resources.forEach(r => { const li = document.createElement('li'), a = document.createElement('a'); a.textContent = `${r.label} (${r.kind === 'folder' ? 'Ordner' : 'Anhang'})`; a.href = '/?path=' + encodeURIComponent(r.path); li.append(a); resources.append(li); });
    repaint();
  }
  select.onchange = () => { if (select.value !== '') open(Number(select.value)); else close(); };
  const ray = new T.Raycaster(), pointer = new T.Vector2(); let drag: { x: number; y: number; distance: number } | undefined;
  function pick(event: PointerEvent) { const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2); ray.setFromCamera(pointer, camera); return ray.intersectObject(chips).find(h => h.instanceId !== undefined && shown(h.instanceId))?.instanceId ?? -1; }
  canvas.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, distance: 0 }; canvas.setPointerCapture(e.pointerId); };
  canvas.onpointermove = e => { if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.distance += Math.abs(dx) + Math.abs(dy); cameraState.azimuth -= dx * .005; cameraState.polar = Math.max(.15, Math.min(1.4, cameraState.polar + dy * .005)); drag.x = e.clientX; drag.y = e.clientY; } else { const next = pick(e); if (next !== hover) { hover = next; edgeCursor = 0; canvas.title = hover >= 0 ? graph.nodes[hover]!.title : ''; repaint(); } } };
  canvas.onpointerup = e => { if (drag && drag.distance < 5) { const i = pick(e); if (i >= 0) open(i); else close(); } drag = undefined; };
  canvas.onpointercancel = () => { drag = undefined; }; canvas.onlostpointercapture = () => { drag = undefined; };
  canvas.onpointerleave = () => { hover = -1; repaint(); };
  const zoom = (factor: number) => { cameraState.distance = Math.max(20, Math.min(layout.extent * 5, cameraState.distance * factor)); };
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(Math.max(-100, Math.min(100, e.deltaY)) * .002)); }, { passive: false });
  canvas.onkeydown = e => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Escape'].includes(e.key)) return; e.preventDefault(); if (e.key === 'Escape') close(); else if (e.key === '+') zoom(.9); else if (e.key === '-') zoom(1.1); else if (e.key === 'ArrowLeft') cameraState.azimuth -= .1; else if (e.key === 'ArrowRight') cameraState.azimuth += .1; else cameraState.polar = Math.max(.15, Math.min(1.4, cameraState.polar + (e.key === 'ArrowUp' ? -.1 : .1))); };
  const resize = new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); overlay.width = Math.round(w * devicePixelRatio); overlay.height = Math.round(h * devicePixelRatio); camera.aspect = w / h; camera.updateProjectionMatrix(); }); resize.observe(stage);
  const observer = new MutationObserver(theme); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const scheme = matchMedia('(prefers-color-scheme: dark)'); scheme.addEventListener('change', theme); reduced.addEventListener('change', syncMotion);
  const projected = new T.Vector3();
  function screen(p: number[]) { projected.set(p[0]!, p[1]! + world.position.y, p[2]!).project(camera); return { x: (projected.x + 1) * stage.clientWidth / 2, y: (1 - projected.y) * stage.clientHeight / 2, visible: projected.z >= -1 && projected.z <= 1 }; }
  function drawOverlay() {
    const w = stage.clientWidth, h = stage.clientHeight, scale = devicePixelRatio;
    ink.setTransform(scale, 0, 0, scale, 0, 0); ink.clearRect(0, 0, w, h);
    const css = getComputedStyle(document.documentElement), color = (key: string) => css.getPropertyValue(key).trim();
    const focus = hover >= 0 ? hover : selected;
    const edge = isolatedEdge(buffers.incident, focus, edgeCursor, e => graph.edges[e]!.every(shown));
    if (edge >= 0 && graph.edges[edge]!.every(shown)) {
      const points = layout.routes[edge]!.map(screen);
      ink.lineJoin = 'round'; ink.lineCap = 'round';
      // Opaque halo separates the complete route from every background crossing.
      for (let pass = 0; pass < 2; pass++) {
        ink.lineWidth = pass ? 3 : 9;
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1]!, b = points[i]!;
          ink.strokeStyle = pass ? (i <= 2 ? color('--teal') : color('--pink')) : color('--panel');
          ink.beginPath(); ink.moveTo(a.x, a.y); ink.lineTo(b.x, b.y); ink.stroke();
        }
      }
    }
    // Labels use CSS pixels, independent of world scale and display pixel ratio.
    ink.font = '14px "JetBrains Mono", monospace';
    const placed: { x: number; y: number; width: number }[] = [];
    const label = (text: string, p: number[]) => {
      const q = screen(p); if (!q.visible) return;
      const width = Math.min(w - 16, ink.measureText(text).width + 12);
      let x = Math.max(8, Math.min(w - width - 8, q.x - width / 2));
      let y = Math.max(8, Math.min(h - 28, q.y));
      for (let attempt = 0; attempt < 30 && placed.some(r => x < r.x + r.width && x + width > r.x && Math.abs(y - r.y) < 25); attempt++) y = (y + 26) % Math.max(26, h - 28);
      placed.push({ x, y, width });
      ink.strokeStyle = color('--muted'); ink.lineWidth = 1; ink.beginPath(); ink.moveTo(q.x, q.y); ink.lineTo(x + width / 2, y + 11); ink.stroke();
      ink.fillStyle = color('--panel'); ink.fillRect(x, y, width, 23); ink.fillStyle = color('--ink'); ink.fillText(text, x + 6, y + 16);
    };
    layout.boards.forEach((b, i) => label(/^\d/.test(b.name) ? b.name : `${i + 1} · ${b.name}`, [b.x, 1, b.z + b.size / 2]));
    const ids = new Set(buffers.hubs);
    if (focus >= 0) ids.add(focus);
    if (edge >= 0) graph.edges[edge]!.forEach(i => ids.add(i));
    ids.forEach(i => { if (shown(i)) label(graph.nodes[i]!.title, layout.positions[i]!); });
  }
  const visibility = () => { if (document.hidden) { measureStart = undefined; measurement.textContent = 'Messung bei verborgenem Tab verworfen.'; } last = 0; frames = 0; sampleStart = performance.now(); };
  document.addEventListener('visibilitychange', visibility);
  function frame(now: number) {
    if (!active || disposed) return;
    if (document.hidden) { measureStart = undefined; frames = 0; sampleStart = now; last = 0; measurement.textContent = 'Messung bei verborgenem Tab verworfen.'; raf = requestAnimationFrame(frame); return; }
    const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
    if (growthStart !== undefined) { const next = Math.min(graph.nodes.length, Math.floor((now - growthStart) / 8000 * graph.nodes.length)); if (next !== visible) { visible = next; repaint(); } if (visible === graph.nodes.length) { growthStart = undefined; growthButton.setAttribute('aria-pressed', 'false'); } }
    if (motion && !reduced.matches) { phase += dt; world.position.y = Math.sin(phase) * .25; if (!drag && selected < 0 && hover < 0) cameraState.azimuth += dt * .025; }
    pulses.visible = motion && !reduced.matches;
    if (pulses.visible) for (let i = 0; i < pulsePositions.length / 3; i++) { const edge = graph.edges[i]!, route = layout.routes[i]!; const t = (phase * .35 + i / 17) % 4, s = Math.floor(t), f = t - s; const A = route[s]!, B = route[s + 1]!; pulsePositions.set(shown(edge[0]) && shown(edge[1]) && ((hover < 0 && selected < 0) || edge.includes(hover) || edge.includes(selected)) ? A.map((v, k) => v + (B[k]! - v) * f) : [0, -100, 0], i * 3); }
    pulseGeometry.attributes.position!.needsUpdate = true;
    const { distance: r, azimuth: a, polar: p } = cameraState; camera.position.set(r * Math.sin(p) * Math.cos(a), r * Math.cos(p), r * Math.sin(p) * Math.sin(a)); camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    drawOverlay();
    if (measureStart !== undefined) { measureFrames++; if (now - measureStart >= 10000) { measurement.textContent = `10-s-Mittel: ${(measureFrames * 1000 / (now - measureStart)).toFixed(1)} Bilder/s · ${canvas.width} × ${canvas.height} Pixel · Bewegung ${motion ? 'an' : 'aus'}`; measureStart = undefined; } }
    if (first) { buildMs = performance.now() - started; first = false; sampleStart = now; }
    frames++; if (now - sampleStart >= 1000) { fps = frames * 1000 / (now - sampleStart); frames = 0; sampleStart = now; }
    metrics.textContent = `${showNodes}/${graph.nodes.length} Chips · ${showEdges}/${graph.edges.length} Bahnen · ${fps.toFixed(1)} Bilder/s (1 s) · Aufbau ${Math.round(buildMs)} ms · Layout ${layoutMs.toFixed(1)} / Puffer ${geometryMs.toFixed(1)} / DOM ${domMs.toFixed(1)} / WebGL ${rendererMs.toFixed(1)} / Vorbereitung ${repaintMs.toFixed(1)} ms`;
    raf = requestAnimationFrame(frame);
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); active = false; cancelAnimationFrame(raf); metrics.textContent = '3D-Grafikkontext verloren. Bitte Aktualisieren oder zur Faktenansicht wechseln.'; });
  theme(); syncMotion();

  return { root, activate(value: boolean) { active = value; if (!value) { measureStart = undefined; hover = -1; } cancelAnimationFrame(raf); last = 0; frames = 0; sampleStart = performance.now(); if (value) { repaint(); raf = requestAnimationFrame(frame); } }, dispose() { disposed = true; active = false; cancelAnimationFrame(raf); resize.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); scheme.removeEventListener('change', theme); reduced.removeEventListener('change', syncMotion); scene.traverse(o => { if (o instanceof T.Mesh || o instanceof T.LineSegments || o instanceof T.Points) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } if (o instanceof T.Sprite) { o.material.map?.dispose(); o.material.dispose(); } }); chips.dispose(); renderer.dispose(); root.remove(); } };
}
