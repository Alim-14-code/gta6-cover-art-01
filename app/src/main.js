// Vice Cover Studio — editor UI.
// Wires the sidebar controls to the cover engine, handles panel picking,
// drag-to-pan, scroll-to-zoom and double-click-to-focus, photo uploads, PNG
// export, and the ?shot= scenes the screenshots are taken from.
'use strict';

// ------------------------------------------------------------------ samples
const SAMPLES = {
  boulevard: { label: 'Boulevard', src: 'samples/boulevard.jpg' },
  neon: { label: 'Neon Street', src: 'samples/neon.jpg' },
  pier: { label: 'Pier Sunset', src: 'samples/pier.jpg' },
};

const ROLE_NAMES = ['LUCIA', 'JASON', 'THE CITY', 'VICE'];

function defaultState() {
  return {
    layout: 'trio',
    grade: 'sunset',
    titleStyle: 'chrome',
    title: 'VICE CITY',
    subtitle: 'LEONIDA',
    billing: 'Starring Lucia & Jason',
    showCallouts: true,
    showSeal: true,
    showRoles: true,
    showBilling: true,
    panels: [
      { sample: 'boulevard', img: null, zoom: 1, fx: 0.5, fy: 0.42, ox: 0, oy: 0, role: 'LUCIA' },
      { sample: 'neon', img: null, zoom: 1, fx: 0.32, fy: 0.38, ox: 0, oy: 0, role: 'JASON' },
      { sample: 'pier', img: null, zoom: 1, fx: 0.5, fy: 0.45, ox: 0, oy: 0, role: 'THE CITY' },
      { sample: 'boulevard', img: null, zoom: 1, fx: 0.5, fy: 0.5, ox: 0, oy: 0, role: 'VICE' },
    ],
    selectedPanel: 0,
    exportSize: 'portrait',
  };
}

// The four screenshot scenes. Each is a preset the app applies to itself
// when ?shot=<id> is in the URL; the cover scenes hide the editor chrome and
// show the finished cover full-frame.
const SHOTS = {
  cover: { layout: 'trio', grade: 'sunset', titleStyle: 'chrome', size: 'portrait' },
  'cover-square': { layout: 'corners', grade: 'neon', titleStyle: 'solid', size: 'square' },
  'cover-portrait': { layout: 'hero', grade: 'midnight', titleStyle: 'chrome', size: 'wide' },
};

const state = defaultState();
let images = {};          // sample key -> HTMLImageElement
let lastTransforms = []; // per-panel transform from the last render
let previewW = 540, previewH = 675;
let drag = null;         // {x, y, ox, oy, panel, moved}

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('could not load ' + src));
    im.src = src;
  });
}

function exportSize() {
  return EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[1];
}

// ------------------------------------------------------------------- render
function render() {
  const size = exportSize();
  if (!document.body.classList.contains('shot')) {
    // Editor preview: portrait 540x675, square 540x540, wide 960x540.
    previewW = size.id === 'wide' ? 960 : 540;
    previewH = size.id === 'square' ? 540 : size.id === 'wide' ? 540 : 675;
  } else {
    previewW = size.w;
    previewH = size.h;
  }
  canvas.width = previewW;
  canvas.height = previewH;
  lastTransforms = renderCover(ctx, state, previewW, previewH) || [];
  syncPanelUI();
}

function syncPanelUI() {
  const layout = LAYOUTS[state.layout];
  const chips = $('panelChips');
  chips.innerHTML = '';
  for (let i = 0; i < layout.panels; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === state.selectedPanel ? ' on' : '');
    b.textContent = 'Panel ' + (i + 1) + ' · ' + (state.panels[i].role || '');
    b.addEventListener('click', () => { state.selectedPanel = i; render(); });
    chips.appendChild(b);
  }
  const p = state.panels[state.selectedPanel];
  if (p) {
    $('zoomRange').value = String(Math.round((p.zoom - 1) / 3 * 100));
    document.querySelectorAll('#samplePick button').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.sample === p.sample);
    });
  }
}

// ----------------------------------------------------------------- pickers
function svgForLayout(polys) {
  const pts = polys.map((poly) => '<polygon points="' +
    poly.map((p) => (p[0] * 100).toFixed(1) + ',' + (p[1] * 100).toFixed(1)).join(' ') +
    '" fill="currentColor" opacity="0.85"/>').join('');
  return '<svg viewBox="0 0 100 100" aria-hidden="true">' + pts + '</svg>';
}

function buildPickers() {
  const lp = $('layoutPick');
  Object.keys(LAYOUTS).forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick layout-pick' + (key === state.layout ? ' on' : '');
    b.dataset.layout = key;
    b.innerHTML = svgForLayout(LAYOUTS[key].polys) + '<span>' + LAYOUTS[key].name + '</span>';
    b.addEventListener('click', () => {
      state.layout = key;
      state.selectedPanel = 0;
      document.querySelectorAll('.layout-pick').forEach((x) => x.classList.toggle('on', x.dataset.layout === key));
      render();
    });
    lp.appendChild(b);
  });

  const gp = $('gradePick');
  Object.keys(GRADES).forEach((key) => {
    const g = GRADES[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick grade-pick' + (key === state.grade ? ' on' : '');
    b.dataset.grade = key;
    const cols = g.wash.map((w) => w[0]).join(', ');
    b.style.background = 'linear-gradient(135deg,' + cols + ')';
    b.innerHTML = '<span>' + g.name + '</span>';
    b.addEventListener('click', () => {
      state.grade = key;
      document.querySelectorAll('.grade-pick').forEach((x) => x.classList.toggle('on', x.dataset.grade === key));
      render();
    });
    gp.appendChild(b);
  });

  const tp = $('titlePick');
  Object.keys(TITLE_STYLES).forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick title-pick ' + key + (key === state.titleStyle ? ' on' : '');
    b.dataset.style = key;
    b.innerHTML = '<span class="sample">Ag</span><span>' + TITLE_STYLES[key].name + '</span>';
    b.addEventListener('click', () => {
      state.titleStyle = key;
      document.querySelectorAll('.title-pick').forEach((x) => x.classList.toggle('on', x.dataset.style === key));
      render();
    });
    tp.appendChild(b);
  });

  const sp = $('samplePick');
  Object.keys(SAMPLES).forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick sample-pick';
    b.dataset.sample = key;
    b.innerHTML = '<img src="' + SAMPLES[key].src + '" alt="' + SAMPLES[key].label + '"><span>' + SAMPLES[key].label + '</span>';
    b.addEventListener('click', () => setPanelPhoto(key));
    sp.appendChild(b);
  });

  const sz = $('sizePick');
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (s.id === state.exportSize ? ' on' : '');
    b.dataset.size = s.id;
    b.textContent = s.label;
    b.addEventListener('click', () => {
      state.exportSize = s.id;
      document.querySelectorAll('#sizePick .chip').forEach((x) => x.classList.toggle('on', x.dataset.size === s.id));
      render();
    });
    sz.appendChild(b);
  });
}

function setPanelPhoto(sampleKey) {
  const p = state.panels[state.selectedPanel];
  if (!p) return;
  p.sample = sampleKey;
  p.img = images[sampleKey] || null;
  p.zoom = 1; p.ox = 0; p.oy = 0;
  render();
}

// ------------------------------------------------------------------- events
function bindEvents() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('billingInput').addEventListener('input', (e) => { state.billing = e.target.value; render(); });
  [['tglCallouts', 'showCallouts'], ['tglSeal', 'showSeal'], ['tglRoles', 'showRoles'], ['tglBilling', 'showBilling']]
    .forEach(([id, key]) => {
      $(id).addEventListener('change', (e) => { state[key] = e.target.checked; render(); });
    });

  $('uploadBtn').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(String(reader.result)).then((im) => {
        const p = state.panels[state.selectedPanel];
        p.img = im; p.sample = null; p.zoom = 1; p.ox = 0; p.oy = 0;
        toast('Photo loaded into Panel ' + (state.selectedPanel + 1));
        render();
      }).catch(() => toast('That file could not be read as a photo'));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  $('fillAllBtn').addEventListener('click', () => {
    const src = state.panels[state.selectedPanel];
    state.panels.forEach((p) => {
      p.img = src.img; p.sample = src.sample; p.zoom = 1; p.ox = 0; p.oy = 0;
    });
    toast('One photo across all panels');
    render();
  });

  $('zoomRange').addEventListener('input', (e) => {
    const p = state.panels[state.selectedPanel];
    p.zoom = 1 + (Number(e.target.value) / 100) * 3;
    render();
  });

  $('resetViewBtn').addEventListener('click', () => {
    const p = state.panels[state.selectedPanel];
    p.zoom = 1; p.fx = 0.5; p.fy = 0.5; p.ox = 0; p.oy = 0;
    render();
  });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => exportPng(btn.dataset.export));
  });

  // Canvas: click selects a panel, drag pans its photo, wheel zooms it,
  // double-click moves its focus point to the click.
  canvas.addEventListener('pointerdown', (e) => {
    const pt = toCover(e);
    const hit = panelAt(state, pt.x, pt.y, previewW, previewH);
    if (hit >= 0) {
      state.selectedPanel = hit;
      drag = { x: pt.x, y: pt.y, ox: state.panels[hit].ox, oy: state.panels[hit].oy, panel: hit, moved: false };
      canvas.setPointerCapture(e.pointerId);
      render();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = toCover(e);
    const dx = pt.x - drag.x, dy = pt.y - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    const p = state.panels[drag.panel];
    p.ox = Math.max(-previewW * 0.4, Math.min(previewW * 0.4, drag.ox + dx));
    p.oy = Math.max(-previewH * 0.4, Math.min(previewH * 0.4, drag.oy + dy));
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('dblclick', (e) => {
    const pt = toCover(e);
    const hit = panelAt(state, pt.x, pt.y, previewW, previewH);
    if (hit < 0) return;
    const t = lastTransforms[hit];
    const p = state.panels[hit];
    if (t && t.dw > 0 && t.dh > 0) {
      p.fx = Math.max(0.05, Math.min(0.95, (pt.x - t.dx) / t.dw));
      p.fy = Math.max(0.05, Math.min(0.95, (pt.y - t.dy) / t.dh));
      p.ox = 0; p.oy = 0;
      state.selectedPanel = hit;
      toast('Focus set on Panel ' + (hit + 1));
      render();
    }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.selectedPanel];
    if (!p) return;
    p.zoom = Math.max(1, Math.min(4, p.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
  }, { passive: false });
}

function toCover(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (previewW / r.width),
    y: (e.clientY - r.top) * (previewH / r.height),
  };
}

// ------------------------------------------------------------------- export
function exportPng(sizeId) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[1];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext('2d'), state, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) { toast('Export failed'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vice-cover-' + size.w + 'x' + size.h + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Exported PNG · ' + size.w + ' × ' + size.h);
  }, 'image/png');
}

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// --------------------------------------------------------------------- boot
async function boot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const preset = shot ? SHOTS[shot] : null;

  buildPickers();
  bindEvents();

  // Fonts first, so the first render already uses the real lettering.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
      document.fonts.load('40px "Archivo Black"'),
    ]);
    await document.fonts.ready;
  } catch (e) { /* fall back to system fonts */ }

  // Sample photos.
  const loaded = await Promise.all(Object.keys(SAMPLES).map((key) =>
    loadImage(SAMPLES[key].src).then((im) => [key, im]).catch(() => null)));
  loaded.forEach((pair) => { if (pair) images[pair[0]] = pair[1]; });
  state.panels.forEach((p) => { if (p.sample && images[p.sample]) p.img = images[p.sample]; });

  if (preset) {
    Object.assign(state, {
      layout: preset.layout, grade: preset.grade,
      titleStyle: preset.titleStyle, exportSize: preset.size,
    });
    document.body.classList.add('shot');
  }

  render();
}

document.addEventListener('DOMContentLoaded', boot);
