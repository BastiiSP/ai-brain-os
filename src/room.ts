import * as T from './three.module.js';
import type { Graph } from './graph.js';
import { layoutGraph } from './room-layout.js';
export interface CameraState { azimuth: number; polar: number; distance: number }
export function createRoom(graph: Graph, read: (path: string) => void, cameraState: CameraState, started: number) {
  const layout = layoutGraph(graph);
  const root = document.createElement('section'); root.className = 'knowledge-room';
  const heading = document.createElement('h1'); heading.textContent = 'Wissensraum'; root.append(heading);
  const help = document.createElement('p'); help.textContent = 'Ziehen dreht · Scrollen zoomt · Chip anklicken zum Lesen. Tastatur: Pfeile drehen, +/− zoomen. Notizen sind auch über die Auswahlliste erreichbar.'; root.append(help);
  const controls = document.createElement('div'); controls.className = 'room-controls'; root.append(controls);
  const button = (text: string, fn: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = fn; controls.append(b); return b; };
  const stage = document.createElement('div'); stage.className = 'room-stage'; root.append(stage);
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas.setAttribute('aria-label', '3D-Platine. Pfeiltasten drehen, Plus und Minus zoomen.'); stage.append(canvas);
  const metrics = document.createElement('p'); metrics.className = 'room-metrics'; root.append(metrics);
  const card = document.createElement('section'); card.className = 'room-card'; card.hidden = true; stage.append(card);
  const selectLabel = document.createElement('label'); selectLabel.textContent = 'Notiz auswählen'; selectLabel.htmlFor = 'room-note'; root.append(selectLabel);
  const select = document.createElement('select'); select.id = 'room-note'; root.append(select);
  const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Eine Notiz wählen …'; select.append(empty);
  graph.nodes.forEach((n, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = n.path; select.append(o); });
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new T.Scene(), world = new T.Group(); scene.add(world);
  scene.add(new T.AmbientLight(0xffffff, 2)); const light = new T.DirectionalLight(0xffffff, 2); light.position.set(30, 100, 50); scene.add(light);
  const camera = new T.PerspectiveCamera(45, 1, .1, layout.extent * 15);
  if (!cameraState.distance) cameraState.distance = layout.extent * 1.5;
  const box = new T.BoxGeometry(1, 1, 1);
  const chips = new T.InstancedMesh(box, new T.MeshLambertMaterial(), graph.nodes.length); world.add(chips);
  chips.frustumCulled = false;
  const matrix = new T.Matrix4();
  const sockets: T.Mesh[] = [];
  const labels: T.Sprite[] = [];
  for (const b of layout.boards) {
    const mesh = new T.Mesh(box, new T.MeshLambertMaterial()); mesh.position.set(b.x, 0, b.z); mesh.scale.set(b.size, .8, b.size); world.add(mesh); sockets.push(mesh);
    const label = new T.Sprite(new T.SpriteMaterial({ depthTest: false })); label.position.set(b.x, 1, b.z + b.size / 2 + 3); label.scale.set(Math.min(b.size, 65), 5, 1); world.add(label); labels.push(label);
  }
  const lineGeometry = new T.BufferGeometry();
  const linePositions = new Float32Array(graph.edges.length * 24), lineColors = new Float32Array(linePositions.length);
  lineGeometry.setAttribute('position', new T.BufferAttribute(linePositions, 3)); lineGeometry.setAttribute('color', new T.BufferAttribute(lineColors, 3));
  const lines = new T.LineSegments(lineGeometry, new T.LineBasicMaterial({ vertexColors: true, transparent: true })); lines.frustumCulled = false; world.add(lines);
  const pulseGeometry = new T.BufferGeometry(); const pulsePositions = new Float32Array(Math.min(60, graph.edges.length) * 3); pulseGeometry.setAttribute('position', new T.BufferAttribute(pulsePositions, 3));
  const pulses = new T.Points(pulseGeometry, new T.PointsMaterial({ size: 3, sizeAttenuation: false })); pulses.frustumCulled = false; world.add(pulses);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !reduced.matches, daily = true, selected = -1, hover = -1, active = false, disposed = false, raf = 0;
  let visible = graph.nodes.length, growthStart: number | undefined;
  let phase = 0, last = 0, sampleStart = 0, frames = 0, fps = 0, buildMs = 0, first = true;
  let showNodes = 0, showEdges = 0;
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
  let bg = new T.Color(), teal = new T.Color(), pink = new T.Color(); let folderColors: T.Color[] = [];
  function theme() {
    const css = getComputedStyle(document.documentElement); const value = (key: string) => css.getPropertyValue(key).trim();
    bg.set(value('--bg')); teal.set(value('--teal')); pink.set(value('--pink'));
    folderColors = graph.folders.map((_, i) => teal.clone().lerp(pink, i / Math.max(1, graph.folders.length - 1)));
    sockets.forEach((mesh, i) => { (mesh.material as T.MeshLambertMaterial).color.copy(folderColors[i]!).lerp(bg, .85); });
    labels.forEach((label, i) => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 96; const context = c.getContext('2d')!;
      context.fillStyle = value('--panel'); context.fillRect(0, 0, c.width, c.height); context.fillStyle = value('--ink'); context.font = '32px "JetBrains Mono", monospace'; context.textAlign = 'center'; context.textBaseline = 'middle';
      const name = layout.boards[i]!.name; context.fillText(/^\d/.test(name) ? name : `${String(i + 1).padStart(2, '0')} · ${name}`, 512, 48, 1000);
      label.material.map?.dispose(); label.material.map = new T.CanvasTexture(c); label.material.needsUpdate = true;
    });
    (pulses.material as T.PointsMaterial).color.copy(pink); repaint();
  }
  function repaint() {
    const focus = hover >= 0 ? hover : selected; showNodes = 0; showEdges = 0;
    graph.nodes.forEach((n, i) => {
      const p = layout.positions[i]!, size = shown(i) ? layout.sizes[i]! : 0; if (size) showNodes++;
      matrix.makeScale(size, size ? 1 : 0, size); matrix.setPosition(...p); chips.setMatrixAt(i, matrix);
      const color = folderColors[graph.folders.indexOf(n.folder)]?.clone() ?? teal.clone(); if (n.daily) color.lerp(bg, .65); chips.setColorAt(i, color);
      select.options[i + 1]!.disabled = !shown(i);
    });
    chips.boundingSphere = null;
    chips.instanceMatrix.needsUpdate = true; if (chips.instanceColor) chips.instanceColor.needsUpdate = true;
    graph.edges.forEach(([a, b], i) => {
      const show = shown(a) && shown(b); if (show) showEdges++;
      const dim = focus >= 0 && a !== focus && b !== focus && a !== selected && b !== selected;
      const route = layout.routes[i]!;
      for (let s = 0; s < 4; s++) for (let e = 0; e < 2; e++) {
        const offset = i * 24 + s * 6 + e * 3;
        linePositions.set(show ? route[s + e]! : [0, -100, 0], offset);
        const color = teal.clone().lerp(pink, (s + e) / 4); if (dim) color.lerp(bg, .9); lineColors.set([color.r, color.g, color.b], offset);
      }
    });
    lineGeometry.attributes.position!.needsUpdate = true; lineGeometry.attributes.color!.needsUpdate = true;
    growthButton.disabled = !motion || reduced.matches;
  }
  function close() { selected = -1; select.value = ''; card.hidden = true; repaint(); }
  function open(i: number) {
    if (!shown(i)) return; selected = i; select.value = String(i); card.replaceChildren(); card.hidden = false;
    const n = graph.nodes[i]!;
    const title = document.createElement('h2'); title.textContent = n.title; card.append(title);
    const path = document.createElement('p'); path.className = 'breadcrumb'; path.textContent = n.path; card.append(path);
    const closeButton = document.createElement('button'); closeButton.textContent = 'Schließen'; closeButton.onclick = close; card.append(closeButton);
    const readButton = document.createElement('button'); readButton.textContent = 'Lesen'; readButton.onclick = () => read(n.path); card.append(readButton);
    const neighbours = graph.edges.flatMap(([a, b]) => a === i ? [b] : b === i ? [a] : []);
    const subtitle = document.createElement('h3'); subtitle.textContent = `${neighbours.length} verknüpfte Notizen`; card.append(subtitle);
    const list = document.createElement('ul'); card.append(list);
    neighbours.forEach(j => { const li = document.createElement('li'), b = document.createElement('button'); b.textContent = graph.nodes[j]!.title; b.disabled = !shown(j); b.onclick = () => open(j); li.append(b); list.append(li); });
    const resourcesTitle = document.createElement('h3'); resourcesTitle.textContent = `${n.resources.length} Links auf Anhänge und Ordner`; card.append(resourcesTitle);
    const resources = document.createElement('ul'); card.append(resources);
    n.resources.forEach(r => { const li = document.createElement('li'), a = document.createElement('a'); a.textContent = `${r.label} (${r.kind === 'folder' ? 'Ordner' : 'Anhang'})`; a.href = '/?path=' + encodeURIComponent(r.path); li.append(a); resources.append(li); });
    repaint();
  }
  select.onchange = () => { if (select.value !== '') open(Number(select.value)); else close(); };
  const ray = new T.Raycaster(), pointer = new T.Vector2(); let drag: { x: number; y: number; distance: number } | undefined;
  function pick(event: PointerEvent) { const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2); ray.setFromCamera(pointer, camera); return ray.intersectObject(chips).find(h => h.instanceId !== undefined && shown(h.instanceId))?.instanceId ?? -1; }
  canvas.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, distance: 0 }; canvas.setPointerCapture(e.pointerId); };
  canvas.onpointermove = e => { if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.distance += Math.abs(dx) + Math.abs(dy); cameraState.azimuth -= dx * .005; cameraState.polar = Math.max(.15, Math.min(1.4, cameraState.polar + dy * .005)); drag.x = e.clientX; drag.y = e.clientY; } else { const next = pick(e); if (next !== hover) { hover = next; canvas.title = hover >= 0 ? graph.nodes[hover]!.title : ''; repaint(); } } };
  canvas.onpointerup = e => { if (drag && drag.distance < 5) { const i = pick(e); if (i >= 0) open(i); else close(); } drag = undefined; };
  canvas.onpointercancel = () => { drag = undefined; }; canvas.onlostpointercapture = () => { drag = undefined; };
  canvas.onpointerleave = () => { hover = -1; repaint(); };
  const zoom = (factor: number) => { cameraState.distance = Math.max(20, Math.min(layout.extent * 5, cameraState.distance * factor)); };
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(Math.max(-100, Math.min(100, e.deltaY)) * .002)); }, { passive: false });
  canvas.onkeydown = e => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Escape'].includes(e.key)) return; e.preventDefault(); if (e.key === 'Escape') close(); else if (e.key === '+') zoom(.9); else if (e.key === '-') zoom(1.1); else if (e.key === 'ArrowLeft') cameraState.azimuth -= .1; else if (e.key === 'ArrowRight') cameraState.azimuth += .1; else cameraState.polar = Math.max(.15, Math.min(1.4, cameraState.polar + (e.key === 'ArrowUp' ? -.1 : .1))); };
  const resize = new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }); resize.observe(stage);
  const observer = new MutationObserver(theme); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const scheme = matchMedia('(prefers-color-scheme: dark)'); scheme.addEventListener('change', theme); reduced.addEventListener('change', syncMotion);
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
    if (measureStart !== undefined) { measureFrames++; if (now - measureStart >= 10000) { measurement.textContent = `10-s-Mittel: ${(measureFrames * 1000 / (now - measureStart)).toFixed(1)} Bilder/s · ${canvas.width} × ${canvas.height} Pixel · Bewegung ${motion ? 'an' : 'aus'}`; measureStart = undefined; } }
    if (first) { buildMs = performance.now() - started; first = false; sampleStart = now; }
    frames++; if (now - sampleStart >= 1000) { fps = frames * 1000 / (now - sampleStart); frames = 0; sampleStart = now; }
    metrics.textContent = `${showNodes}/${graph.nodes.length} Chips · ${showEdges}/${graph.edges.length} Bahnen · ${fps.toFixed(1)} Bilder/s (1 s) · Aufbau ${Math.round(buildMs)} ms`;
    raf = requestAnimationFrame(frame);
  }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); active = false; cancelAnimationFrame(raf); metrics.textContent = '3D-Grafikkontext verloren. Bitte Aktualisieren oder zur Faktenansicht wechseln.'; });
  theme(); syncMotion();
  void document.fonts.ready.then(() => { if (!disposed) theme(); });
  return { root, activate(value: boolean) { active = value; if (!value) { measureStart = undefined; hover = -1; } cancelAnimationFrame(raf); last = 0; frames = 0; sampleStart = performance.now(); if (value) { repaint(); raf = requestAnimationFrame(frame); } }, dispose() { disposed = true; active = false; cancelAnimationFrame(raf); resize.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); scheme.removeEventListener('change', theme); reduced.removeEventListener('change', syncMotion); scene.traverse(o => { if (o instanceof T.Mesh || o instanceof T.LineSegments || o instanceof T.Points) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } if (o instanceof T.Sprite) { o.material.map?.dispose(); o.material.dispose(); } }); chips.dispose(); renderer.dispose(); root.remove(); } };
}
