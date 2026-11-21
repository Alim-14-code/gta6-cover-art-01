// Vice Cover Studio v2 — cover engine.
// Draws the whole GTA-style multi-panel poster on a 2D canvas:
// sunset sky, palm silhouettes, photo panels with role tags, review strip,
// chrome-striped title, neon script subtitle, tagline, billing block,
// COMING SOON, barcode and gold seal. No network, no libraries.

export const SAMPLE_CAST = [
  { file: "driver.jpg", role: "THE DRIVER" },
  { file: "boss.jpg", role: "THE BOSS" },
  { file: "brains.jpg", role: "THE BRAINS" },
  { file: "fixer.jpg", role: "THE FIXER" },
  { file: "getaway.jpg", role: "THE GETAWAY" },
  { file: "lookout.jpg", role: "THE LOOKOUT" },
  { file: "captain.jpg", role: "THE CAPTAIN" },
];

// Panel order inside the Cast Grid: [hero, left1, left2, left3, right1, right2, right3]
export const CAST_ORDER = [0, 1, 2, 3, 4, 5, 6];

export const GRADES = [
  { id: "sunset", name: "Vice Sunset", top: "#2b1055", mid: "#ff5e78", bot: "#ffb347", glow: "#ff7a18" },
  { id: "neon", name: "Neon Nights", top: "#12002e", mid: "#c026d3", bot: "#ff2e88", glow: "#ff2e88" },
  { id: "purple", name: "Vice Purple", top: "#1b0033", mid: "#7c3aed", bot: "#f472b6", glow: "#a855f7" },
  { id: "teal", name: "Teal Dusk", top: "#04263b", mid: "#0e7490", bot: "#fb923c", glow: "#2dd4bf" },
  { id: "gold", name: "Golden Hour", top: "#3b1d00", mid: "#f97316", bot: "#fde047", glow: "#fbbf24" },
  { id: "magenta", name: "Magenta Heat", top: "#2a0030", mid: "#db2777", bot: "#fb7185", glow: "#ec4899" },
  { id: "chrome", name: "Chrome Vice", top: "#0f172a", mid: "#64748b", bot: "#f59e0b", glow: "#e2e8f0" },
];

export const LAYOUTS = [
  { id: "cast", name: "Cast Grid" },
  { id: "single", name: "Single Photo" },
  { id: "duo", name: "Two-Panel" },
  { id: "trio", name: "Three-Panel" },
  { id: "mosaic", name: "Four-Panel Mosaic" },
  { id: "grid", name: "Grid" },
  { id: "strip", name: "Strip" },
];

export const SIZES = [
  { id: "portrait", name: "Portrait 1080 x 1350", w: 1080, h: 1350 },
  { id: "square", name: "Square 1080 x 1080", w: 1080, h: 1080 },
  { id: "landscape", name: "Wide 1920 x 1080", w: 1920, h: 1080 },
];

export function defaultState() {
  return {
    layout: "cast",
    grade: "sunset",
    size: "portrait",
    title: "VICE CITY",
    subtitle: "Neon Reign",
    tagline: "ONE LAST SUMMER JOB",
    quote: "THE HOTTEST RIDE OF THE YEAR",
    publication: "VICE CITY GAZETTE",
    panels: SAMPLE_CAST.map((c) => ({
      src: "samples/" + c.file, role: c.role, img: null, zoom: 1, ox: 0, oy: 0,
    })),
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Panel rectangles for a layout, as fractions of the canvas.
export function layoutPanels(layout, W, H) {
  const m = W * 0.018;
  const top = H * 0.088;
  const bottom = H * 0.79;
  const ph = bottom - top;
  const hero = { x: W * 0.275, y: top, w: W * 0.45, h: ph * 0.62 };
  const colW = W * 0.245;
  const leftX = m, rightX = W - m - colW;
  const third = ph / 3;
  const gap = H * 0.006;
  const col = (x) => [
    { x, y: top, w: colW, h: third - gap },
    { x, y: top + third, w: colW, h: third - gap },
    { x, y: top + 2 * third, w: colW, h: third - gap },
  ];
  switch (layout) {
    case "cast":
      return [hero, ...col(leftX), ...col(rightX)];
    case "single":
      return [{ x: m, y: top, w: W - 2 * m, h: ph }];
    case "duo":
      return [
        { x: m, y: top, w: (W - 2 * m - W * 0.02) / 2, h: ph },
        { x: W / 2 + W * 0.01, y: top, w: (W - 2 * m - W * 0.02) / 2, h: ph },
      ];
    case "trio":
      return [
        { x: m, y: top, w: W * 0.52, h: ph },
        { x: W * 0.52 + m * 2, y: top, w: W - W * 0.52 - m * 3, h: ph / 2 - gap },
        { x: W * 0.52 + m * 2, y: top + ph / 2, w: W - W * 0.52 - m * 3, h: ph / 2 - gap },
      ];
    case "mosaic":
      return [
        { x: m, y: top, w: (W - 2 * m - W * 0.02) / 2, h: ph / 2 - gap },
        { x: W / 2 + W * 0.01, y: top, w: (W - 2 * m - W * 0.02) / 2, h: ph / 2 - gap },
        { x: m, y: top + ph / 2, w: (W - 2 * m - W * 0.02) / 2, h: ph / 2 - gap },
        { x: W / 2 + W * 0.01, y: top + ph / 2, w: (W - 2 * m - W * 0.02) / 2, h: ph / 2 - gap },
      ];
    case "grid":
      return [0, 1, 2].flatMap((r) => [0, 1].map((c) => ({
        x: m + c * (W - 2 * m + W * 0.02) / 2, y: top + r * ph / 3,
        w: (W - 2 * m - W * 0.02) / 2, h: ph / 3 - gap,
      })));
    case "strip":
      return [0, 1, 2, 3].map((i) => ({
        x: m + i * (W - 2 * m) / 4, y: top, w: (W - 2 * m) / 4 - W * 0.01, h: ph,
      }));
    default:
      return [hero, ...col(leftX), ...col(rightX)];
  }
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPalm(ctx, x, y, s, color, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * 30, -70, lean * 55, -140);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.13);
    const tx = lean * 55 + Math.cos(a) * 62;
    const ty = -140 + Math.sin(a) * 42;
    ctx.beginPath();
    ctx.moveTo(lean * 55, -140);
    ctx.quadraticCurveTo(lean * 55 + Math.cos(a) * 35, -140 + Math.sin(a) * 18 - 14, tx, ty);
    ctx.stroke();
  }
  ctx.restore();
}

// Face-aware cover draw: crops toward the top-centre of the frame (where the
// face is) instead of the frame centre, then applies the user's zoom/offset.
function drawPanelPhoto(ctx, img, rect, panel) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img && img.naturalWidth) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * panel.zoom;
    const dw = iw * scale, dh = ih * scale;
    // Anchor the crop near the top (face zone) with the user's offset.
    const dx = x + (w - dw) / 2 + panel.ox * w * 0.2;
    const dy = y + (h - dh) * 0.28 + panel.oy * h * 0.2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#3b0764"); g.addColorStop(1, "#db2777");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  // Warm grade wash over the photo.
  ctx.fillStyle = "rgba(255,94,120,0.10)";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Thin dark border.
  ctx.strokeStyle = "#12081f";
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.strokeRect(x, y, w, h);
  // Role tag: black bar, white condensed capitals, bottom-left of the panel.
  if (panel.role) {
    ctx.save();
    const fs = Math.max(13, w * 0.085);
    ctx.font = `${fs}px Anton, sans-serif`;
    const tw = ctx.measureText(panel.role).width;
    const bw = tw + fs * 1.1, bh = fs * 1.5;
    const bx = x + w * 0.03, by = y + h - bh - h * 0.04;
    ctx.fillStyle = "#0d0518";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(bx, by, fs * 0.22, bh);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(panel.role, bx + fs * 0.55, by + bh / 2 + fs * 0.04);
    ctx.restore();
  }
}

function drawBarcode(ctx, x, y, w, h, seedText) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);
  const rnd = mulberry32([...seedText].reduce((a, c) => a + c.charCodeAt(0), 7));
  let bx = x + w * 0.06;
  ctx.fillStyle = "#111111";
  while (bx < x + w * 0.94) {
    const bw = (1 + Math.floor(rnd() * 4)) * w * 0.008;
    if (rnd() > 0.35) ctx.fillRect(bx, y + h * 0.08, bw, h * 0.68);
    bx += bw + w * 0.008;
  }
  ctx.fillStyle = "#111111";
  ctx.font = `${Math.max(9, h * 0.11)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("8 90210 61926", x + w / 2, y + h * 0.94);
  ctx.textAlign = "left";
}

function drawSeal(ctx, cx, cy, r, label) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#f5c542";
  ctx.strokeStyle = "#8a6d00";
  ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.strokeStyle = "#8a6d00"; ctx.lineWidth = r * 0.04; ctx.stroke();
  drawStar(ctx, 0, -r * 0.18, r * 0.34, "#8a6d00");
  ctx.fillStyle = "#5c4300";
  ctx.font = `bold ${r * 0.26}px Anton, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(label, 0, r * 0.42);
  ctx.restore();
  ctx.textAlign = "left";
}

function drawChromeTitle(ctx, text, cx, y, W, H) {
  const fs = Math.min(W * 0.13, H * 0.13);
  ctx.save();
  ctx.font = `${fs}px Anton, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const tw = ctx.measureText(text).width;
  // 3D drop shadow copies.
  ctx.fillStyle = "#2a0a3d";
  ctx.fillText(text, cx + fs * 0.05, y + fs * 0.06);
  ctx.fillStyle = "#12081f";
  ctx.fillText(text, cx + fs * 0.035, y + fs * 0.045);
  // Horizontal multi-stop chrome gradient: yellow -> orange -> pink -> purple.
  const grad = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
  grad.addColorStop(0, "#ffe259");
  grad.addColorStop(0.28, "#ffa751");
  grad.addColorStop(0.52, "#ff5e78");
  grad.addColorStop(0.76, "#c026d3");
  grad.addColorStop(1, "#7c3aed");
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, y);
  // Thick dark outline + thin hot highlight.
  ctx.lineWidth = fs * 0.055;
  ctx.strokeStyle = "#160a24";
  ctx.lineJoin = "round";
  ctx.strokeText(text, cx, y);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, y);
  ctx.lineWidth = fs * 0.012;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.strokeText(text, cx, y);
  ctx.restore();
  return tw;
}

// The full poster. state follows defaultState(); panels carry loaded imgs.
export function drawCover(ctx, W, H, state) {
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  const rects = layoutPanels(state.layout, W, H);
  ctx.clearRect(0, 0, W, H);

  // Sunset sky.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.top);
  sky.addColorStop(0.45, grade.mid);
  sky.addColorStop(1, grade.bot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun disc behind the hero panel.
  const sun = ctx.createRadialGradient(W / 2, H * 0.30, 10, W / 2, H * 0.30, W * 0.34);
  sun.addColorStop(0, "rgba(255,240,180,0.95)");
  sun.addColorStop(0.5, "rgba(255,170,80,0.55)");
  sun.addColorStop(1, "rgba(255,170,80,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Palm silhouettes, dense corners, no empty sky.
  drawPalm(ctx, W * 0.02, H * 0.99, W * 0.0011, "rgba(20,4,40,0.55)", 1);
  drawPalm(ctx, W * 0.99, H * 0.99, W * 0.001, "rgba(20,4,40,0.55)", -1);
  drawPalm(ctx, W * 0.06, H * 0.16, W * 0.0006, "rgba(20,4,40,0.35)", 1);
  drawPalm(ctx, W * 0.95, H * 0.14, W * 0.00055, "rgba(20,4,40,0.35)", -1);

  // Review strip: five gold stars + quote + publication + VOL. 1 badge.
  const stripY = H * 0.045;
  const starR = Math.max(9, W * 0.014);
  let sx = W * 0.03;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx + starR, stripY, starR, "#ffd166");
    sx += starR * 2.4;
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(15, W * 0.02)}px Anton, sans-serif`;
  ctx.textBaseline = "middle";
  const quote = "\u201C" + state.quote + "\u201D";
  ctx.fillText(quote, sx + W * 0.015, stripY + 1);
  const qw = ctx.measureText(quote).width;
  ctx.font = `${Math.max(12, W * 0.014)}px Anton, sans-serif`;
  ctx.fillStyle = "#ffd166";
  ctx.fillText("— " + state.publication, sx + W * 0.015 + qw + W * 0.02, stripY + 1);
  // VOL. 1 badge, top right.
  const badge = "VOL. 1";
  ctx.font = `${Math.max(13, W * 0.016)}px Anton, sans-serif`;
  const bw = ctx.measureText(badge).width + W * 0.03;
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.roundRect(W - bw - W * 0.02, stripY - starR * 1.1, bw, starR * 2.2, starR);
  ctx.fill();
  ctx.fillStyle = "#160a24";
  ctx.textAlign = "center";
  ctx.fillText(badge, W - bw / 2 - W * 0.02, stripY + 1);
  ctx.textAlign = "left";

  // Photo panels.
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel) drawPanelPhoto(ctx, panel.img, rect, panel);
  });

  // Title band: tagline above the title, chrome title, neon script subtitle.
  const bandY = H * 0.60;
  ctx.save();
  ctx.fillStyle = "rgba(16,4,32,0.55)";
  ctx.fillRect(0, H * 0.545, W, H * 0.18);
  ctx.restore();
  ctx.fillStyle = "#ffe9a8";
  ctx.font = `${Math.max(14, W * 0.021)}px Anton, sans-serif`;
  ctx.textAlign = "center";
  let spacing = state.tagline.split("").join("  ");
  ctx.fillText(spacing, W / 2, H * 0.545);
  drawChromeTitle(ctx, state.title, W / 2, H * 0.66, W, H);
  // Neon script subtitle with pink glow.
  ctx.save();
  ctx.font = `${Math.max(30, Math.min(W * 0.052, H * 0.075))}px Pacifico, cursive`;
  ctx.textAlign = "center";
  ctx.shadowColor = "#ff2e88";
  ctx.shadowBlur = W * 0.025;
  ctx.fillStyle = "#ff7ac0";
  ctx.fillText(state.subtitle, W / 2, H * 0.72);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffd6ec";
  ctx.fillText(state.subtitle, W / 2, H * 0.72);
  ctx.restore();
  ctx.textAlign = "left";

  // Bottom zone: COMING SOON, billing block, barcode, gold seal.
  const botY = H * 0.815;
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(16, W * 0.024)}px Anton, sans-serif`;
  ctx.fillText("C O M I N G   S O O N", W * 0.03, botY + H * 0.02);
  ctx.font = `${Math.max(10, W * 0.011)}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const billing = [
    "VICE CITY PICTURES presents a NEON REIGN production  •  starring THE DRIVER  THE BOSS  THE BRAINS",
    "THE GETAWAY  THE LOOKOUT  THE FIXER  THE CAPTAIN  •  music by SUNSET DRIVE  •  filmed on location in VICE CITY",
    "© 2026 VICE CITY PICTURES — an original fan-made cover. No Rockstar Games artwork, logo or font is used.",
  ];
  billing.forEach((line, i) => ctx.fillText(line, W * 0.03, botY + H * 0.055 + i * H * 0.022));
  drawSeal(ctx, W * 0.80, H * 0.925, W * 0.038, "VICE CITY");
  drawBarcode(ctx, W * 0.86, H * 0.86, W * 0.115, H * 0.085, state.title + state.subtitle);

  // Warm grade wash + vignette + grain: dense, finished poster feel.
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = grade.glow;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(10,0,25,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  const rnd = mulberry32(20261121);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
  }
}
