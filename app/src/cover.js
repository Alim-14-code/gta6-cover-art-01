// Vice Cover Studio — cover engine (vanilla ES module, no dependencies).
// Draws a GTA-style multi-panel poster to a 2D canvas: layouts, grades,
// title styles, per-panel pan/zoom/focus, callouts, seal, role tags, billing.

export const PHOTOS = ["boulevard", "neon", "pier"];

export const LAYOUTS = {
  hero:   { name: "Hero Solo",     panels: [[0, 0, 1, 1]] },
  hero3:  { name: "Hero + Three",  panels: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.34], [0.62, 0.34, 0.38, 0.33], [0.62, 0.67, 0.38, 0.33]] },
  grid4:  { name: "Four-Panel Grid", panels: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  bleed:  { name: "Full Bleed",    panels: [[0, 0, 1, 1]] },
  trio:   { name: "Trio Strip",    panels: [[0, 0, 0.34, 1], [0.34, 0, 0.32, 1], [0.66, 0, 0.34, 1]] },
  grid9:  { name: "Nine-Panel Grid", panels: [[0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3], [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]] },
};

export const GRADES = {
  sunset: { name: "Sunset", top: "#ff7a5c", mid: "#ff9e7a", bot: "#7a2d6e", ink: "#2a1030", glow: "#ffb347" },
  neon:   { name: "Neon",   top: "#ff2fb3", mid: "#7a2bff", bot: "#00e5ff", ink: "#0d0221", glow: "#00e5ff" },
  vice:   { name: "Vice",   top: "#ff5da2", mid: "#b537f2", bot: "#3a0ca3", ink: "#1b1035", glow: "#ff5da2" },
  gold:   { name: "Gold",   top: "#ffd166", mid: "#ff9f43", bot: "#7a3b12", ink: "#2b1a08", glow: "#ffe08a" },
  teal:   { name: "Teal",   top: "#2ec4b6", mid: "#118ab2", bot: "#073b4c", ink: "#062a33", glow: "#7ef0e2" },
  mono:   { name: "Mono",   top: "#e8e8e8", mid: "#9a9a9a", bot: "#222222", ink: "#111111", glow: "#ffffff" },
  noir:   { name: "Noir",   top: "#ff4d6d", mid: "#3d0c2e", bot: "#050505", ink: "#000000", glow: "#ff4d6d" },
};

export const TITLES = {
  block:     { name: "Block",     font: "Anton",       sub: "Bebas Neue" },
  condensed: { name: "Condensed", font: "Bebas Neue",  sub: "Anton" },
  heavy:     { name: "Heavy",     font: "Archivo Black", sub: "Bebas Neue" },
};

export function defaultState() {
  return {
    layout: "hero3",
    grade: "sunset",
    titleStyle: "block",
    title: "NEON REIGN",
    subtitle: "a Vice City story",
    panels: [
      { photo: "pier", zoom: 1.15, panX: 0, panY: 0, fx: 0.5, fy: 0.42, tag: "LEAD" },
      { photo: "boulevard", zoom: 1.2, panX: 0, panY: 0, fx: 0.5, fy: 0.5, tag: "CREW" },
      { photo: "neon", zoom: 1.2, panX: 0, panY: 0, fx: 0.5, fy: 0.4, tag: "CREW" },
      { photo: "boulevard", zoom: 1.35, panX: 0, panY: 0, fx: 0.5, fy: 0.55, tag: "GUEST" },
    ],
    callouts: [
      { text: "STARRING LEONIDA", x: 0.06, y: 0.06 },
      { text: "EST. 2026", x: 0.82, y: 0.06 },
    ],
    seal: { on: true, pos: "br" },
    billing: { on: true, text: "VICE COVER STUDIO  •  A FAN-MADE POSTER  •  PHOTOS DRAWN IN-BROWSER  •  NO ROCKSTAR ARTWORK" },
    grain: true,
    vignette: true,
  };
}

const cache = new Map();
export function loadPhoto(name) {
  if (cache.has(name)) return cache.get(name);
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = "samples/" + name + ".jpg";
  });
  cache.set(name, p);
  return p;
}
export function loadPhotoFile(file) {
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = rd.result;
    };
    rd.onerror = rej;
    rd.readAsDataURL(file);
  });
}

let noiseCanvas = null;
function noiseTile() {
  if (noiseCanvas) return noiseCanvas;
  const s = 128;
  noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = s;
  noiseCanvas.height = s;
  const c = noiseCanvas.getContext("2d");
  const id = c.createImageData(s, s);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 100 + Math.floor(Math.random() * 100);
    id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  c.putImageData(id, 0, 0);
  return noiseCanvas;
}

function coverFit(img, dw, dh, zoom, panX, panY, fx, fy) {
  // Returns source rect so the focal point (fx, fy) stays centred under zoom/pan.
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(dw / iw, dh / ih);
  const sc = base * zoom;
  const sw = dw / sc, sh = dh / sc;
  let sx = fx * iw - sw / 2 + panX * sw * 0.5;
  let sy = fy * ih - sh / 2 + panY * sh * 0.5;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  return { sx, sy, sw, sh };
}

function gradeWash(ctx, W, H, g) {
  const gr = ctx.createLinearGradient(0, 0, W * 0.25, H);
  gr.addColorStop(0, g.top);
  gr.addColorStop(0.55, g.mid);
  gr.addColorStop(1, g.bot);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g.mid;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawPanel(ctx, img, rect, p, g, W, H, selected) {
  const [fx0, fy0, fw, fh] = rect;
  const x = fx0 * W, y = fy0 * H, w = fw * W, h = fh * H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const r = coverFit(img, w, h, p.zoom, p.panX, p.panY, p.fx, p.fy);
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, x, y, w, h);
  } else {
    ctx.fillStyle = g.ink;
    ctx.fillRect(x, y, w, h);
  }
  gradeWash(ctx, w, h, g);
  ctx.restore();
  // inked band + frame
  ctx.save();
  ctx.strokeStyle = g.ink;
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = g.ink;
  ctx.fillRect(x, y + h - Math.max(4, H * 0.008), w, Math.max(4, H * 0.008));
  if (selected) {
    ctx.strokeStyle = g.glow;
    ctx.lineWidth = Math.max(3, W * 0.005);
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }
  ctx.restore();
  // role tag
  if (p.tag) {
    ctx.save();
    const fs = Math.max(11, Math.round(W * 0.018));
    ctx.font = `${fs}px "Bebas Neue", sans-serif`;
    const tw = ctx.measureText(p.tag).width + fs * 1.1;
    const th = fs * 1.5;
    ctx.fillStyle = g.ink;
    ctx.fillRect(x + 10, y + 10, tw, th);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(p.tag, x + 10 + fs * 0.55, y + 10 + th / 2 + 1);
    ctx.restore();
  }
  return { x, y, w, h };
}

function drawTitle(ctx, st, g, W, H, layout) {
  const t = TITLES[st.titleStyle];
  const bottom = layout !== "bleed";
  const pad = W * 0.045;
  let size = Math.round(W * 0.115);
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.font = `${size}px "${t.font}", sans-serif`;
  let tw = ctx.measureText(st.title).width;
  const maxW = W - pad * 2;
  if (tw > maxW) {
    size = Math.round(size * maxW / tw);
    ctx.font = `${size}px "${t.font}", sans-serif`;
    tw = ctx.measureText(st.title).width;
  }
  const ty = bottom ? H - pad * 2.0 : H * 0.24;
  // gradient letters
  const gr = ctx.createLinearGradient(0, ty - size, 0, ty + size * 0.15);
  gr.addColorStop(0, "#ffffff");
  gr.addColorStop(0.55, g.glow);
  gr.addColorStop(1, g.mid);
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.strokeStyle = g.ink;
  ctx.lineJoin = "round";
  ctx.strokeText(st.title, pad, ty);
  ctx.fillStyle = gr;
  ctx.fillText(st.title, pad, ty);
  // subtitle
  const sub = st.subtitle.toUpperCase();
  const fs = Math.max(12, Math.round(W * 0.026));
  ctx.font = `${fs}px "${t.sub}", sans-serif`;
  const sy = bottom ? ty + fs * 1.55 : ty + fs * 2.1;
  ctx.fillStyle = "#fff";
  ctx.fillText(sub, pad, sy);
  ctx.fillStyle = g.glow;
  ctx.fillRect(pad, sy + fs * 0.7, Math.min(tw, W * 0.4), Math.max(3, fs * 0.16));
  ctx.restore();
}

function drawSeal(ctx, st, g, W, H) {
  if (!st.seal.on) return;
  const r = Math.max(34, W * 0.055);
  const cx = st.seal.pos === "br" ? W - r - W * 0.03 : W * 0.03 + r;
  const cy = H - r - H * 0.03;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = g.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = g.glow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = g.glow;
  ctx.font = `bold ${Math.round(r * 0.42)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", 0, -r * 0.12);
  ctx.font = `${Math.round(r * 0.2)}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.fillText("VICE CITY", 0, r * 0.38);
  ctx.restore();
}

export async function drawCover(canvas, st, selected = -1) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const g = GRADES[st.grade];
  const layout = LAYOUTS[st.layout];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = g.ink;
  ctx.fillRect(0, 0, W, H);
  const rects = layout.panels;
  const imgs = [];
  for (let i = 0; i < rects.length; i++) {
    const p = st.panels[i % st.panels.length];
    let im = null;
    try {
      im = p._img || (await loadPhoto(p.photo));
      p._img = im;
    } catch (e) { im = null; }
    imgs.push(im);
  }
  const gap = Math.max(3, Math.round(W * 0.006));
  for (let i = 0; i < rects.length; i++) {
    const [fx0, fy0, fw, fh] = rects[i];
    const inset = [fx0 + gap / W, fy0 + gap / H, fw - 2 * gap / W, fh - 2 * gap / H];
    drawPanel(ctx, imgs[i], inset, st.panels[i % st.panels.length], g, W, H, i === selected);
  }
  // title band
  if (st.layout !== "bleed") {
    ctx.save();
    const bandH = H * 0.2;
    const gr = ctx.createLinearGradient(0, H - bandH, 0, H);
    gr.addColorStop(0, "rgba(10,4,18,0)");
    gr.addColorStop(1, "rgba(10,4,18,0.82)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, H - bandH, W, bandH);
    ctx.restore();
  }
  drawTitle(ctx, st, g, W, H, st.layout);
  // callouts
  ctx.save();
  ctx.font = `${Math.max(12, Math.round(W * 0.024))}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  for (const c of st.callouts) {
    ctx.fillText(c.text, c.x * W, c.y * H);
  }
  ctx.restore();
  drawSeal(ctx, st, g, W, H);
  // billing
  if (st.billing.on && st.billing.text) {
    ctx.save();
    ctx.font = `${Math.max(9, Math.round(W * 0.011))}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "center";
    ctx.fillText(st.billing.text, W / 2, H - Math.max(10, H * 0.012));
    ctx.restore();
  }
  // vignette + grain
  if (st.vignette) {
    ctx.save();
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (st.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    const pat = ctx.createPattern(noiseTile(), "repeat");
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

export function exportPNG(st, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return drawCover(c, st).then(() => new Promise((res) => c.toBlob(res, "image/png")));
}
