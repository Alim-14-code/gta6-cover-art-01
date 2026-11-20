// Vice Cover Studio — editor wiring + ?shot= scenes (vanilla ES module).
import { PHOTOS, LAYOUTS, GRADES, TITLES, defaultState, loadPhoto, loadPhotoFile, drawCover, exportPNG } from "./cover.js";

const qs = new URLSearchParams(location.search);
const shot = qs.get("shot") || "";
const state = defaultState();

if (qs.get("photo") && PHOTOS.includes(qs.get("photo"))) state.panels[0].photo = qs.get("photo");
if (qs.get("caption")) state.title = qs.get("caption").slice(0, 40);
if (qs.get("layout") && LAYOUTS[qs.get("layout")]) state.layout = qs.get("layout");
if (qs.get("grade") && GRADES[qs.get("grade")]) state.grade = qs.get("grade");
if (qs.get("title") && TITLES[qs.get("title")]) state.titleStyle = qs.get("title");

const $ = (s) => document.querySelector(s);
const canvas = $("#cover");
let sel = 0;

async function readyFonts() {
  try {
    await Promise.all([
      document.fonts.load('40px "Anton"'),
      document.fonts.load('40px "Archivo Black"'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch (e) { /* system sans fallback */ }
}

async function draw() {
  await readyFonts();
  await drawCover(canvas, state, shot === "cover" ? -1 : sel);
  window.__shotDone = true;
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function doExport(w, h, label) {
  const b = await exportPNG(state, w, h);
  download(b, `vice-cover-${label}-${w}x${h}.png`);
  const st = $("#status");
  if (st) st.textContent = `Exported ${label} ${w}×${h} PNG`;
}

if (shot === "cover") {
  // Cover-only scene: canvas = viewport, no editor chrome.
  document.body.classList.add("shot-cover");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  draw().then(() => { document.title = "cover"; });
} else {
  // Editor.
  const stage = $("#stage");
  function fitCanvas() {
    const r = stage.getBoundingClientRect();
    const side = Math.max(200, Math.floor(Math.min(r.width, r.height)));
    canvas.width = side;
    canvas.height = side;
  }
  addEventListener("resize", () => { fitCanvas(); draw(); });

  function chipRow(el, items, cur, fn) {
    el.innerHTML = "";
    for (const [k, v] of Object.entries(items)) {
      const b = document.createElement("button");
      b.className = "chip" + (k === cur ? " on" : "");
      b.textContent = v.name;
      b.onclick = () => { fn(k); draw(); sync(); };
      el.appendChild(b);
    }
  }
  function rebuildPanels() {
    const pe = $("#panels");
    pe.innerHTML = "";
    const n = LAYOUTS[state.layout].panels.length;
    for (let i = 0; i < n; i++) {
      const b = document.createElement("button");
      b.className = "chip" + (i === sel ? " on" : "");
      b.textContent = `Panel ${i + 1}`;
      b.onclick = () => { sel = i; draw(); sync(); };
      pe.appendChild(b);
    }
  }
  function sync() {
    chipRow($("#layouts"), LAYOUTS, state.layout, (k) => { state.layout = k; sel = 0; rebuildPanels(); });
    chipRow($("#grades"), GRADES, state.grade, (k) => { state.grade = k; });
    chipRow($("#titles"), TITLES, state.titleStyle, (k) => { state.titleStyle = k; });
    const p = state.panels[sel % state.panels.length];
    $("#zoom").value = p.zoom;
    $("#panx").value = p.panX;
    $("#pany").value = p.panY;
    $("#panelLabel").textContent = `Panel ${sel + 1} — ${p.photo} · tag ${p.tag}`;
    document.querySelectorAll("#panels button").forEach((b, i) => b.classList.toggle("on", i === sel));
  }

  $("#title").value = state.title;
  $("#title").oninput = (e) => { state.title = e.target.value.toUpperCase().slice(0, 40); draw(); };
  $("#subtitle").value = state.subtitle;
  $("#subtitle").oninput = (e) => { state.subtitle = e.target.value.slice(0, 60); draw(); };
  $("#photo").onchange = (e) => { state.panels[sel % state.panels.length].photo = e.target.value; draw(); };
  $("#tag").onchange = (e) => { state.panels[sel % state.panels.length].tag = e.target.value.toUpperCase().slice(0, 10); draw(); };
  $("#zoom").oninput = (e) => { state.panels[sel % state.panels.length].zoom = +e.target.value; draw(); };
  $("#panx").oninput = (e) => { state.panels[sel % state.panels.length].panX = +e.target.value; draw(); };
  $("#pany").oninput = (e) => { state.panels[sel % state.panels.length].panY = +e.target.value; draw(); };
  $("#focus").onclick = () => {
    const p = state.panels[sel % state.panels.length];
    p.fx = 0.5; p.fy = 0.42; p.zoom = Math.max(p.zoom, 1.4);
    draw();
  };
  $("#upload").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const im = await loadPhotoFile(f);
    const p = state.panels[sel % state.panels.length];
    p._img = im;
    p.photo = "upload";
    draw();
  };
  const toggles = [
    ["seal", () => state.seal.on, (v) => { state.seal.on = v; }],
    ["billing", () => state.billing.on, (v) => { state.billing.on = v; }],
    ["grain", () => state.grain, (v) => { state.grain = v; }],
    ["vignette", () => state.vignette, (v) => { state.vignette = v; }],
  ];
  for (const [id, get, set] of toggles) {
    const el = document.getElementById(id);
    el.checked = get();
    el.onchange = () => { set(el.checked); draw(); };
  }
  $("#exp-square").onclick = () => doExport(1080, 1080, "square");
  $("#exp-portrait").onclick = () => doExport(1080, 1350, "portrait");
  $("#exp-wide").onclick = () => doExport(1920, 1080, "wide");
  $("#shuffle").onclick = () => {
    const lk = Object.keys(LAYOUTS), gk = Object.keys(GRADES);
    state.layout = lk[Math.floor(Math.random() * lk.length)];
    state.grade = gk[Math.floor(Math.random() * gk.length)];
    state.panels.forEach((p) => { p.photo = PHOTOS[Math.floor(Math.random() * PHOTOS.length)]; });
    sel = 0;
    rebuildPanels();
    draw(); sync();
  };

  fitCanvas();
  rebuildPanels();
  sync();
  draw();
}
