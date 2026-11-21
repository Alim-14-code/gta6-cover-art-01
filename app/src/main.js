// Vice Cover Studio v2 — editor wiring.
// Live preview, per-panel photo upload + crop/position, layout and grade
// pickers, text fields, export sizes and PNG export. Photos stay local.

import { defaultState, drawCover, GRADES, LAYOUTS, SIZES, layoutPanels } from "./cover.js";

const state = defaultState();
let selectedPanel = 0;

const preview = document.getElementById("preview");
if (preview) {
const pctx = preview.getContext("2d");
const statusEl = document.getElementById("status");

function currentSize() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

function drawPreview() {
  const size = currentSize();
  const scale = Math.min(560 / size.w, 640 / size.h);
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  pctx.save();
  pctx.scale(preview.width / size.w, preview.height / size.h);
  drawCover(pctx, size.w, size.h, state);
  pctx.restore();
  const rects = layoutPanels(state.layout, preview.width, preview.height);
  if (rects[selectedPanel]) {
    const r = rects[selectedPanel];
    pctx.save();
    pctx.strokeStyle = "#ffd166";
    pctx.lineWidth = 3;
    pctx.setLineDash([8, 5]);
    pctx.strokeRect(r.x, r.y, r.w, r.h);
    pctx.restore();
  }
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadSamples() {
  for (const panel of state.panels) {
    panel.img = await loadImage(panel.src);
  }
  setStatus("Sample cast loaded — 7 portraits, 7 roles. Pick a panel, upload your own photo, then export.");
  drawPreview();
}

function buildPanelSlots() {
  const wrap = document.getElementById("panelSlots");
  wrap.innerHTML = "";
  state.panels.forEach((panel, i) => {
    const slot = document.createElement("div");
    slot.className = "slot" + (i === selectedPanel ? " selected" : "");
    slot.innerHTML =
      `<button type="button" class="slot-pick" data-i="${i}">Panel ${i + 1} · ${panel.role}</button>` +
      `<input type="text" class="role-input" data-i="${i}" value="${panel.role}" aria-label="Role tag panel ${i + 1}">` +
      `<label class="upload">Upload photo<input type="file" accept="image/*" data-i="${i}"></label>`;
    wrap.appendChild(slot);
  });
  wrap.querySelectorAll(".slot-pick").forEach((b) =>
    b.addEventListener("click", () => { selectedPanel = Number(b.dataset.i); syncPanelControls(); buildPanelSlots(); drawPreview(); }));
  wrap.querySelectorAll(".role-input").forEach((inp) =>
    inp.addEventListener("input", () => {
      state.panels[Number(inp.dataset.i)].role = inp.value.toUpperCase();
      drawPreview();
    }));
  wrap.querySelectorAll('input[type="file"]').forEach((inp) =>
    inp.addEventListener("change", async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      if (img) {
        const p = state.panels[Number(inp.dataset.i)];
        p.img = img; p.src = url; p.zoom = 1; p.ox = 0; p.oy = 0;
        selectedPanel = Number(inp.dataset.i);
        syncPanelControls();
        drawPreview();
        setStatus(`Photo loaded into panel ${selectedPanel + 1} — crop it with the sliders, then export.`);
      }
    }));
}

function buildPickers() {
  const layoutWrap = document.getElementById("layoutPicker");
  LAYOUTS.forEach((l) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = l.name;
    b.dataset.id = l.id;
    b.addEventListener("click", () => {
      state.layout = l.id;
      layoutWrap.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      drawPreview();
    });
    if (l.id === state.layout) b.classList.add("active");
    layoutWrap.appendChild(b);
  });
  const gradeWrap = document.getElementById("gradePicker");
  GRADES.forEach((g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = g.name;
    b.dataset.id = g.id;
    b.style.background = `linear-gradient(135deg, ${g.top}, ${g.mid}, ${g.bot})`;
    b.addEventListener("click", () => {
      state.grade = g.id;
      gradeWrap.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      drawPreview();
    });
    if (g.id === state.grade) b.classList.add("active");
    gradeWrap.appendChild(b);
  });
  const sizeWrap = document.getElementById("sizePicker");
  SIZES.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = s.name;
    b.dataset.id = s.id;
    b.addEventListener("click", () => {
      state.size = s.id;
      sizeWrap.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      drawPreview();
    });
    if (s.id === state.size) b.classList.add("active");
    sizeWrap.appendChild(b);
  });
}

function bindText(id, key) {
  const el = document.getElementById(id);
  el.value = state[key];
  el.addEventListener("input", () => { state[key] = el.value; drawPreview(); });
}

function syncPanelControls() {
  const p = state.panels[selectedPanel];
  document.getElementById("zoomRange").value = p.zoom;
  document.getElementById("posXRange").value = p.ox;
  document.getElementById("posYRange").value = p.oy;
  document.getElementById("panelLabel").textContent = `Panel ${selectedPanel + 1} — ${p.role}`;
}

function bindCrop() {
  const zoom = document.getElementById("zoomRange");
  const px = document.getElementById("posXRange");
  const py = document.getElementById("posYRange");
  zoom.addEventListener("input", () => { state.panels[selectedPanel].zoom = Number(zoom.value); drawPreview(); });
  px.addEventListener("input", () => { state.panels[selectedPanel].ox = Number(px.value); drawPreview(); });
  py.addEventListener("input", () => { state.panels[selectedPanel].oy = Number(py.value); drawPreview(); });
  document.getElementById("fillAll").addEventListener("click", () => {
    const src = state.panels[selectedPanel];
    state.panels.forEach((p) => { p.img = src.img; p.src = src.src; });
    drawPreview();
    setStatus("One photo now fills every panel — pick a panel and upload a different photo to mix the cast.");
  });
  document.getElementById("useSamples").addEventListener("click", async () => {
    const fresh = defaultState();
    for (let i = 0; i < state.panels.length; i++) state.panels[i].src = fresh.panels[i].src;
    await loadSamples();
    setStatus("Sample cast reloaded — seven portraits, seven roles.");
  });
}

async function exportPNG() {
  const size = currentSize();
  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext("2d"), size.w, size.h, state);
  const blob = await new Promise((res) => off.toBlob(res, "image/png"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `vice-cover-${state.size}-${Date.now()}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Exported ${size.w} x ${size.h} PNG — share it anywhere.`);
}

// Click a panel in the preview to select it for crop and upload.
preview.addEventListener("click", (ev) => {
  const r = preview.getBoundingClientRect();
  const x = (ev.clientX - r.left) * (preview.width / r.width);
  const y = (ev.clientY - r.top) * (preview.height / r.height);
  const rects = layoutPanels(state.layout, preview.width, preview.height);
  const hit = rects.findIndex((rc) => x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h);
  if (hit >= 0) {
    selectedPanel = hit;
    syncPanelControls();
    buildPanelSlots();
    drawPreview();
  }
});

bindText("titleInput", "title");
bindText("subtitleInput", "subtitle");
bindText("taglineInput", "tagline");
bindText("quoteInput", "quote");
bindText("publicationInput", "publication");
buildPickers();
buildPanelSlots();
bindCrop();
syncPanelControls();
document.getElementById("exportBtn").addEventListener("click", exportPNG);

// Load the local display + script fonts before the first draw so the
// chrome title and neon subtitle render in the right lettering.
Promise.all([
  document.fonts.load('40px Anton'),
  document.fonts.load('40px Pacifico'),
  document.fonts.ready,
]).then(loadSamples);
loadSamples();
}
