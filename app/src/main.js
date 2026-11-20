// Vice Cover Studio — editor wiring (main.js).
// Owns the state, the panel cards, drag / wheel / focus on the preview canvas,
// and PNG export. All drawing lives in cover.js; reproducible scenes in shots.js.

import {
  SAMPLE_PHOTOS, LAYOUTS, LAYOUT_ORDER, GRADES, GRADE_ORDER,
  TITLE_STYLES, drawCover, polyBox, pointInPoly,
} from './cover.js';
import { applyShotScene } from './shots.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const ctx = stage.getContext('2d');

// Photo library: the 3 built-in samples plus anything the user uploads.
const photos = new Map(); // id -> { id, label, src, img }
const images = {}; // photoId -> HTMLImageElement (what cover.js draws)

function defaultPanels(layoutKey) {
  const count = LAYOUTS[layoutKey].panels.length;
  const picks = ['boulevard', 'neon', 'pier', 'boulevard'];
  return Array.from({ length: count }, (_, i) => ({
    photoId: picks[i % picks.length],
    zoom: 1, panX: 0, panY: 0, focusX: 0.5, focusY: 0.42,
  }));
}

const state = {
  layout: 'trio',
  grade: 'sunset',
  title: 'VICE NIGHTS',
  tagline: 'Ocean Drive · 2026',
  titleStyle: 'chrome',
  extras: { chips: true, seal: true, roles: true, billing: true },
  panels: defaultPanels('trio'),
  selected: 0,
};

function loadPhoto(id, label, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      photos.set(id, { id, label, src, img });
      images[id] = img;
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLE_PHOTOS) await loadPhoto(s.id, s.label, s.src);
}

function photoOptions(selectedId) {
  return [...photos.values()]
    .map((p) => `<option value="${p.id}"${p.id === selectedId ? ' selected' : ''}>${p.label}</option>`)
    .join('');
}

function buildPanelCards() {
  const wrap = $('panelCards');
  wrap.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card' + (i === state.selected ? ' selected' : '');
    card.innerHTML = `
      <img alt="Panel ${i + 1} photo">
      <div class="row">
        <button type="button" data-act="upload">Upload</button>
        <select data-act="select" aria-label="Photo for panel ${i + 1}">${photoOptions(panel.photoId)}</select>
      </div>
      <label>Zoom</label>
      <input type="range" min="1" max="2.5" step="0.01" value="${panel.zoom}" data-act="zoom" aria-label="Zoom panel ${i + 1}">
      <input type="file" accept="image/*" hidden data-act="file">`;
    card.addEventListener('click', () => selectPanel(i));
    const img = card.querySelector('img');
    const photo = photos.get(panel.photoId);
    if (photo) img.src = photo.src;
    card.querySelector('[data-act="select"]').addEventListener('change', (e) => {
      panel.photoId = e.target.value;
      panel.zoom = 1; panel.panX = 0; panel.panY = 0;
      buildPanelCards();
      render();
    });
    card.querySelector('[data-act="zoom"]').addEventListener('input', (e) => {
      panel.zoom = Number(e.target.value);
      render();
    });
    card.querySelector('[data-act="zoom"]').addEventListener('click', (e) => e.stopPropagation());
    const file = card.querySelector('[data-act="file"]');
    card.querySelector('[data-act="upload"]').addEventListener('click', (e) => {
      e.stopPropagation();
      file.click();
    });
    file.addEventListener('change', () => addUploads(file.files, i));
    wrap.appendChild(card);
  });
  const fill = $('fillSelect');
  fill.innerHTML = photoOptions(state.panels[0]?.photoId);
}

function selectPanel(i) {
  state.selected = i;
  buildPanelCards();
  render();
}

async function addUploads(fileList, targetPanel = -1) {
  for (const file of [...(fileList || [])]) {
    if (!file.type.startsWith('image/')) continue;
    const id = 'up-' + Math.random().toString(36).slice(2, 9);
    const url = URL.createObjectURL(file);
    await loadPhoto(id, file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Upload', url);
    if (targetPanel >= 0) {
      const p = state.panels[targetPanel];
      p.photoId = id; p.zoom = 1; p.panX = 0; p.panY = 0;
      state.selected = targetPanel;
    }
  }
  buildPanelCards();
  render();
}

function buildPickers() {
  const layouts = $('layoutPicker');
  layouts.innerHTML = '';
  for (const key of LAYOUT_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = LAYOUTS[key].label;
    if (key === state.layout) b.classList.add('active');
    b.addEventListener('click', () => {
      const old = state.panels;
      state.layout = key;
      state.panels = defaultPanels(key).map((p, i) => ({ ...p, ...(old[i] ? { photoId: old[i].photoId } : {}) }));
      state.selected = 0;
      buildPickers();
      buildPanelCards();
      render();
    });
    layouts.appendChild(b);
  }
  const grades = $('gradePicker');
  grades.innerHTML = '';
  for (const key of GRADE_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = GRADES[key].label;
    if (key === state.grade) b.classList.add('active');
    b.addEventListener('click', () => {
      state.grade = key;
      buildPickers();
      render();
    });
    grades.appendChild(b);
  }
  const styles = $('stylePicker');
  styles.innerHTML = '';
  for (const [key, s] of Object.entries(TITLE_STYLES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.label;
    if (key === state.titleStyle) b.classList.add('active');
    b.addEventListener('click', () => {
      state.titleStyle = key;
      buildPickers();
      render();
    });
    styles.appendChild(b);
  }
}

function fitStageToAspect(w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  stage.width = Math.round(w * dpr);
  stage.height = Math.round(h * dpr);
}

function render() {
  const rect = stage.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width));
  const h = Math.max(200, Math.round(rect.height));
  if (stage.width !== w || stage.height !== h) fitStageToAspect(w, h);
  const scale = stage.width / w;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawCover(ctx, w, h, state, images, state.selected);
}

// ---- Pointer interaction on the preview canvas ----
function canvasPoint(e) {
  const r = stage.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
}

function panelAt(x, y, w, h) {
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    if (pointInPoly(x, y, layout.panels[i].poly, w, h)) return i;
  }
  return -1;
}

let drag = null;

stage.addEventListener('pointerdown', (e) => {
  const { x, y, w, h } = canvasPoint(e);
  const i = panelAt(x, y, w, h);
  if (i < 0) return;
  selectPanel(i);
  drag = { i, startX: x, startY: y, panX: state.panels[i].panX, panY: state.panels[i].panY, moved: false };
  stage.setPointerCapture(e.pointerId);
});

stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const dx = x - drag.startX;
  const dy = y - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  const p = state.panels[drag.i];
  p.panX = drag.panX + dx;
  p.panY = drag.panY + dy;
  render();
});

stage.addEventListener('pointerup', (e) => {
  if (!drag) return;
  // A click without a drag sets the focus point where the user clicked.
  if (!drag.moved) {
    const { x, y, w, h } = canvasPoint(e);
    const layout = LAYOUTS[state.layout];
    const box = polyBox(layout.panels[drag.i].poly, w, h);
    const p = state.panels[drag.i];
    p.focusX = Math.min(1, Math.max(0, (x - box.x) / box.w));
    p.focusY = Math.min(1, Math.max(0, (y - box.y) / box.h));
    render();
  }
  drag = null;
});

stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { x, y, w, h } = canvasPoint(e);
  const i = panelAt(x, y, w, h);
  if (i < 0) return;
  const p = state.panels[i];
  p.zoom = Math.min(2.5, Math.max(1, p.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  state.selected = i;
  buildPanelCards();
  render();
}, { passive: false });

// ---- PNG export ----
export function renderExport(width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const c = off.getContext('2d');
  drawCover(c, width, height, state, images, -1);
  return off;
}

async function exportPNG() {
  const [w, h] = $('exportSize').value.split('x').map(Number);
  const status = $('exportStatus');
  status.textContent = 'Rendering…';
  try {
    await document.fonts.ready;
    const off = renderExport(w, h);
    const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Exported ${w}×${h} PNG.`;
  } catch (err) {
    status.textContent = 'Export failed — try again.';
    console.error(err);
  }
}

// ---- Static wiring ----
function wireStatic() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
  $('exChips').addEventListener('change', (e) => { state.extras.chips = e.target.checked; render(); });
  $('exSeal').addEventListener('change', (e) => { state.extras.seal = e.target.checked; render(); });
  $('exRoles').addEventListener('change', (e) => { state.extras.roles = e.target.checked; render(); });
  $('exBilling').addEventListener('change', (e) => { state.extras.billing = e.target.checked; render(); });
  $('fillAllBtn').addEventListener('click', () => {
    const id = $('fillSelect').value;
    state.panels.forEach((p) => { p.photoId = id; p.zoom = 1; p.panX = 0; p.panY = 0; });
    buildPanelCards();
    render();
  });
  $('uploadInput').addEventListener('change', (e) => {
    addUploads(e.target.files, state.selected);
    e.target.value = '';
  });
  $('exportBtn').addEventListener('click', exportPNG);
  $('exportBtn2').addEventListener('click', exportPNG);
  window.addEventListener('resize', render);
}

// ---- Boot ----
async function boot() {
  wireStatic();
  await loadSamples();
  buildPickers();
  buildPanelCards();
  // Reproducible screenshot scenes (?shot=cover, editor, cover-square, cover-portrait).
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await applyShotScene(shot, state, { buildPickers, buildPanelCards, render, photos });
  }
  // Wait for the display fonts so the first paint already has the real lettering.
  try {
    await Promise.all([
      document.fonts.load('400 80px Anton'),
      document.fonts.load('400 40px "Bebas Neue"'),
      document.fonts.load('400 80px "Archivo Black"'),
    ]);
  } catch { /* fall back to system fonts */ }
  render();
  if (shot) {
    document.title = `Vice Cover Studio — shot:${shot}`;
    render();
  }
}

boot();
