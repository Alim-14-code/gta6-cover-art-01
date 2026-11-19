// Vice Cover Studio — the editor. Wires the controls to the renderer in
// cover.js: pick a layout and a grade, assign photos to panels (click a panel,
// then a sample or your own upload), drag to pan and scroll to zoom, set the
// caption, and export a real PNG. A `?shot=` query sets up a fixed scene for
// a screenshot instead (./shots.js).
import { drawCover, renderExport, panelAtPoint, layoutPolygons, LAYOUTS, GRADES, FONTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

// The three sample photos the app ships with, in panel order.
const SAMPLES = ['boulevard', 'neon', 'pier'];
const SAMPLE_LABELS = { boulevard: 'Boulevard', neon: 'Neon Night', pier: 'Golden Pier' };
const CAPTION_COLORS = ['#ffffff', '#ffd166', '#ff5da2', '#7ef0ff', '#ffe9a8'];

// Fresh state: trio of the three samples, sunset grade, VICE NIGHTS caption.
const state = {
  layout: 'trio',
  grade: 'sunset',
  panels: SAMPLES.map((name) => ({ sample: name, img: null, zoom: 1, ox: 0, oy: 0 })),
  caption: {
    text: 'VICE NIGHTS',
    tagline: 'OCEAN DRIVE • 2026',
    font: 'Anton',
    color: '#ffffff',
    tagColor: '#ffd166',
    size: 0.11,
    tilt: -2,
    outline: true,
    position: 'bottom',
  },
};
let selected = 0;

function redraw() {
  drawCover(canvas, state);
  const panel = state.panels[selected] || {};
  $('zoom').value = String(panel.zoom || 1);
  $('zoomVal').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  document.querySelectorAll('#panelRow .thumb').forEach((el, i) => {
    el.classList.toggle('on', i === selected);
  });
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples(names) {
  const imgs = await Promise.all(names.map((n) => loadImage(`samples/${n}.jpg`)));
  return imgs;
}

// ---- control rows built from the renderer's own tables ----

function chipRow(el, items, current, onPick) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = item.label;
    if (item.key === current()) b.classList.add('on');
    if (item.font) b.style.fontFamily = `"${item.font}", sans-serif`;
    b.addEventListener('click', () => {
      onPick(item.key);
      el.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      redraw();
    });
    el.appendChild(b);
  }
}

function buildControls() {
  chipRow(
    $('layoutRow'),
    Object.entries(LAYOUTS).map(([key, v]) => ({ key, label: v.label })),
    () => state.layout,
    (key) => { state.layout = key; selected = 0; },
  );
  chipRow(
    $('gradeRow'),
    Object.entries(GRADES).map(([key, v]) => ({ key, label: v.label })),
    () => state.grade,
    (key) => { state.grade = key; },
  );
  chipRow(
    $('fontRow'),
    FONTS.map((f) => ({ key: f, label: f, font: f })),
    () => state.caption.font,
    (key) => { state.caption.font = key; },
  );
  // Photo thumbnails: one per panel, click to select that panel.
  const panelRow = $('panelRow');
  panelRow.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'thumb';
    t.dataset.panel = String(i);
    const img = document.createElement('img');
    img.src = `samples/${panel.sample}.jpg`;
    img.alt = `Panel ${i + 1}: ${SAMPLE_LABELS[panel.sample] || panel.sample}`;
    const cap = document.createElement('span');
    cap.textContent = `Panel ${i + 1}`;
    t.append(img, cap);
    t.addEventListener('click', () => { selected = i; redraw(); });
    panelRow.appendChild(t);
  });
  // Sample photos: click to assign to the selected panel.
  const sampleRow = $('sampleRow');
  sampleRow.innerHTML = '';
  for (const name of SAMPLES) {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'thumb';
    const img = document.createElement('img');
    img.src = `samples/${name}.jpg`;
    img.alt = SAMPLE_LABELS[name];
    const cap = document.createElement('span');
    cap.textContent = SAMPLE_LABELS[name];
    t.append(img, cap);
    t.addEventListener('click', async () => {
      state.panels[selected].sample = name;
      state.panels[selected].img = await loadImage(`samples/${name}.jpg`);
      state.panels[selected].zoom = 1;
      state.panels[selected].ox = 0;
      state.panels[selected].oy = 0;
      document.querySelector(`#panelRow .thumb[data-panel="${selected}"] img`).src = `samples/${name}.jpg`;
      redraw();
    });
    sampleRow.appendChild(t);
  }
  // Caption colour swatches.
  const colorRow = $('colorRow');
  colorRow.innerHTML = '';
  for (const color of CAPTION_COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = color;
    b.setAttribute('aria-label', `Caption colour ${color}`);
    if (color === state.caption.color) b.classList.add('on');
    b.addEventListener('click', () => {
      state.caption.color = color;
      colorRow.querySelectorAll('.swatch').forEach((el) => el.classList.remove('on'));
      b.classList.add('on');
      redraw();
    });
    colorRow.appendChild(b);
  }
  // Export size options.
  const sizeSel = $('size');
  sizeSel.innerHTML = '';
  for (const name of Object.keys(SIZES)) {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = `${name.replace('x', ' × ')} PNG`;
    sizeSel.appendChild(o);
  }
  sizeSel.value = '1920x1080';
}

// ---- caption inputs ----

$('caption').addEventListener('input', (e) => { state.caption.text = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.caption.tagline = e.target.value; redraw(); });
$('capSize').addEventListener('input', (e) => {
  state.caption.size = 0.06 + (Number(e.target.value) / 100) * 0.10;
  $('capSizeVal').textContent = `${e.target.value}%`;
  redraw();
});
$('capTilt').addEventListener('input', (e) => {
  state.caption.tilt = Number(e.target.value);
  $('capTiltVal').textContent = `${e.target.value}°`;
  redraw();
});
$('capOutline').addEventListener('change', (e) => { state.caption.outline = e.target.checked; redraw(); });
$('capPos').addEventListener('change', (e) => { state.caption.position = e.target.value; redraw(); });

// ---- panel transform: drag to pan, wheel / slider to zoom ----

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  const hit = panelAtPoint(x, y, canvas.width, canvas.height, state.layout);
  if (hit >= 0) {
    selected = hit;
    dragging = { x: e.clientX, y: e.clientY, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const panel = state.panels[selected];
  const polys = layoutPolygons(state.layout, canvas.width, canvas.height);
  const poly = polys[selected];
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const pw = Math.max(...xs) - Math.min(...xs);
  const ph = Math.max(...ys) - Math.min(...ys);
  panel.ox = Math.max(-0.5, Math.min(0.5, dragging.ox + ((e.clientX - dragging.x) / r.width) * (canvas.width / pw)));
  panel.oy = Math.max(-0.5, Math.min(0.5, dragging.oy + ((e.clientY - dragging.y) / r.height) * (canvas.height / ph)));
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selected];
  panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
  redraw();
}, { passive: false });
$('zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  redraw();
});

// ---- upload + fill all ----

$('upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  const panel = state.panels[selected];
  panel.img = img;
  panel.sample = file.name.replace(/\.[^.]+$/, '');
  document.querySelector(`#panelRow .thumb[data-panel="${selected}"] img`).src = URL.createObjectURL(file);
  redraw();
});
$('fillAll').addEventListener('click', async () => {
  const img = state.panels[selected].img;
  if (!img) return;
  const sample = state.panels[selected].sample;
  for (const panel of state.panels) {
    panel.img = img;
    panel.sample = sample;
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
  }
  document.querySelectorAll('#panelRow .thumb img').forEach((el) => { el.src = `samples/${sample}.jpg`; });
  redraw();
});

// ---- export ----

$('export').addEventListener('click', () => {
  const sizeName = $('size').value;
  const out = renderExport(state, sizeName);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${sizeName}.png`;
    a.click();
    statusEl.textContent = `Saved vice-cover-${sizeName}.png`;
  }, 'image/png');
});

// ---- boot ----

const shot = new URLSearchParams(location.search).get('shot');
buildControls();
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSamples,
    apply: (patch) => {
      Object.assign(state, patch);
      state.panels.forEach((p, i) => { if (patch.panels && patch.panels[i]) Object.assign(p, patch.panels[i]); });
      if (patch.caption) Object.assign(state.caption, patch.caption);
      redraw();
    },
    canvas,
  });
} else {
  // Load the samples, wait for the caption fonts, then paint.
  loadSamples(SAMPLES).then(async (imgs) => {
    imgs.forEach((img, i) => { state.panels[i].img = img; });
    try { await document.fonts.ready; } catch (_) { /* system fonts fall back */ }
    redraw();
  });
}
