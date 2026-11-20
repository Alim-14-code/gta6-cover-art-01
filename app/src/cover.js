// Vice Cover Studio — cover render engine.
// Draws GTA-style multi-panel poster art onto any canvas 2D context, at any
// size. Pure canvas, no DOM, no network: every layout, grade and title style
// is computed here from the state object, so the preview and the PNG export
// are the same drawing at different resolutions.
'use strict';

// ---------------------------------------------------------------- layouts
// Each layout names its panels as polygons in normalized cover coordinates
// (0..1). The numbers are the design: slanted dividers, a hero with a strip,
// four corners, one full bleed, a diagonal duo, three stacked bands.
const LAYOUTS = {
  trio: {
    name: 'Vice Trio', panels: 3,
    polys: [
      [[0, 0], [0.36, 0], [0.30, 1], [0, 1]],
      [[0.38, 0], [0.70, 0], [0.64, 1], [0.32, 1]],
      [[0.72, 0], [1, 0], [1, 1], [0.66, 1]],
    ],
  },
  hero: {
    name: 'Hero + Strip', panels: 4,
    polys: [
      [[0, 0], [1, 0], [1, 0.66], [0, 0.66]],
      [[0, 0.685], [0.325, 0.685], [0.325, 1], [0, 1]],
      [[0.34, 0.685], [0.66, 0.685], [0.66, 1], [0.34, 1]],
      [[0.675, 0.685], [1, 0.685], [1, 1], [0.675, 1]],
    ],
  },
  corners: {
    name: 'Four Corners', panels: 4,
    polys: [
      [[0, 0], [0.52, 0], [0.46, 0.48], [0, 0.48]],
      [[0.54, 0], [1, 0], [1, 0.48], [0.48, 0.48]],
      [[0, 0.52], [0.46, 0.52], [0.52, 1], [0, 1]],
      [[0.48, 0.52], [1, 0.52], [1, 1], [0.54, 1]],
    ],
  },
  bleed: {
    name: 'Full Bleed', panels: 1,
    polys: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
  },
  duo: {
    name: 'Duo', panels: 2,
    polys: [
      [[0, 0], [0.56, 0], [0.44, 1], [0, 1]],
      [[0.58, 0], [1, 0], [1, 1], [0.46, 1]],
    ],
  },
  stacked: {
    name: 'Stacked', panels: 3,
    polys: [
      [[0, 0], [1, 0], [1, 0.32], [0, 0.28]],
      [[0, 0.30], [1, 0.34], [1, 0.66], [0, 0.62]],
      [[0, 0.64], [1, 0.68], [1, 1], [0, 1]],
    ],
  },
};

// ------------------------------------------------------------------ grades
// A grade is a canvas filter for the photos plus a coloured wash drawn over
// the whole cover in a blend mode, plus a vignette. All seven are Vice City
// moods: sunset pink, neon night, ocean drive teal, golden hour, midnight,
// heatwave and a pink-ink poster duotone.
const GRADES = {
  sunset: { name: 'Vice Sunset', filter: 'saturate(1.30) contrast(1.06) sepia(0.12)', wash: [['#ff5e8a', 0.26], ['#ff9a3d', 0.18]], blend: 'screen', vig: 0.38 },
  neon: { name: 'Neon Night', filter: 'saturate(1.45) contrast(1.08) brightness(0.96)', wash: [['#ff2d78', 0.20], ['#00e5ff', 0.16]], blend: 'overlay', vig: 0.45 },
  ocean: { name: 'Ocean Drive', filter: 'saturate(1.18) brightness(1.06) contrast(1.02)', wash: [['#00c2a8', 0.18], ['#ffd76a', 0.14]], blend: 'soft-light', vig: 0.30 },
  golden: { name: 'Golden Hour', filter: 'sepia(0.28) saturate(1.35) brightness(1.07)', wash: [['#ffb347', 0.24]], blend: 'screen', vig: 0.32 },
  midnight: { name: 'Midnight Drive', filter: 'brightness(0.88) contrast(1.14) saturate(1.25)', wash: [['#1b2a6b', 0.28], ['#7b2ff7', 0.12]], blend: 'overlay', vig: 0.50 },
  heat: { name: 'Heatwave', filter: 'saturate(1.55) contrast(1.10) hue-rotate(12deg)', wash: [['#ff3d00', 0.22]], blend: 'screen', vig: 0.34 },
  ink: { name: 'Poster Ink', filter: 'grayscale(0.92) contrast(1.28) brightness(1.04)', wash: [['#ff2d78', 0.18]], blend: 'overlay', vig: 0.30 },
};

// ------------------------------------------------------------- title styles
const TITLE_STYLES = {
  solid: { name: 'Solid Bold', fill: '#ffffff', stroke: '#12061e', strokeW: 0.09, chrome: false },
  chrome: { name: 'Retro Chrome', fill: null, stroke: '#12061e', strokeW: 0.07, chrome: true },
  outline: { name: 'Outline', fill: 'rgba(0,0,0,0)', stroke: '#ffffff', strokeW: 0.16, chrome: false },
};

// The chrome gradient every Retro Chrome title is drawn with, top to bottom.
const CHROME_STOPS = [
  [0.00, '#fdfdfd'], [0.28, '#ffd76a'], [0.46, '#ff5e8a'],
  [0.62, '#7b2ff7'], [0.82, '#00e5ff'], [1.00, '#ffffff'],
];

// ------------------------------------------------------------------ helpers
function polyPath(ctx, poly, W, H) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0] * W, poly[0][1] * H);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0] * W, poly[i][1] * H);
  ctx.closePath();
}

function polyBBox(poly, W, H) {
  const xs = poly.map((p) => p[0] * W);
  const ys = poly.map((p) => p[1] * H);
  const bx = Math.min.apply(null, xs);
  const by = Math.min.apply(null, ys);
  return { x: bx, y: by, w: Math.max.apply(null, xs) - bx, h: Math.max.apply(null, ys) - by };
}

function pointInPoly(px, py, poly, W, H) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0] * W, yi = poly[i][1] * H;
    const xj = poly[j][0] * W, yj = poly[j][1] * H;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Draw one photo inside a panel polygon: cover-fit, zoomed around the panel's
// focus point, panned by (ox, oy). Returns the transform so the editor can
// invert a click back into focus coordinates.
function drawPhoto(ctx, img, poly, W, H, pan, filter) {
  const b = polyBBox(poly, W, H);
  const z = Math.max(1, pan.zoom || 1);
  const scale = Math.max(b.w / img.naturalWidth, b.h / img.naturalHeight) * z;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  let dx = b.x + b.w / 2 - (pan.fx || 0.5) * dw + (pan.ox || 0);
  let dy = b.y + b.h / 2 - (pan.fy || 0.5) * dh + (pan.oy || 0);
  dx = Math.min(b.x, Math.max(b.x + b.w - dw, dx));
  dy = Math.min(b.y, Math.max(b.y + b.h - dh, dy));
  ctx.save();
  polyPath(ctx, poly, W, H);
  ctx.clip();
  if (filter) ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
  return { dx, dy, dw, dh, bx: b.x, by: b.y, bw: b.w, bh: b.h };
}

function drawPlaceholder(ctx, poly, W, H, label) {
  const b = polyBBox(poly, W, H);
  ctx.save();
  polyPath(ctx, poly, W, H);
  ctx.clip();
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  g.addColorStop(0, '#3a1055');
  g.addColorStop(1, '#12061e');
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = Math.max(14, W * 0.03) + 'px "Bebas Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
  ctx.restore();
}

// ------------------------------------------------------------------- render
// Draw the whole cover for a state onto ctx at W x H. The same function
// draws the live preview and the exported PNG, only the size changes.
function renderCover(ctx, state, W, H) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.trio;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const style = TITLE_STYLES[state.titleStyle] || TITLE_STYLES.chrome;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#12061e';
  ctx.fillRect(0, 0, W, H);

  // 1. Panels: photos (or placeholders) clipped to their polygons.
  const transforms = [];
  for (let i = 0; i < layout.panels; i++) {
    const panel = state.panels[i];
    const poly = layout.polys[i];
    if (panel && panel.img) {
      transforms.push(drawPhoto(ctx, panel.img, poly, W, H, panel, grade.filter));
    } else {
      drawPlaceholder(ctx, poly, W, H, 'ADD PHOTO');
      transforms.push(null);
    }
  }

  // 2. White divider strokes along every panel edge.
  ctx.lineWidth = Math.max(2, W * 0.006);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineJoin = 'round';
  for (let i = 0; i < layout.panels; i++) {
    polyPath(ctx, layout.polys[i], W, H);
    ctx.stroke();
  }

  // 3. Grade wash: a diagonal colour veil in the grade's blend mode.
  if (grade.wash.length) {
    ctx.save();
    ctx.globalCompositeOperation = grade.blend;
    const g = ctx.createLinearGradient(0, 0, W, H);
    grade.wash.forEach((s, i) => {
      g.addColorStop(i / Math.max(1, grade.wash.length - 1 || 1), s[0]);
    });
    ctx.globalAlpha = Math.max.apply(null, grade.wash.map((s) => s[1]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 4. Vignette: darken the corners so the middle pops.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(10,4,20,0)');
  vg.addColorStop(1, 'rgba(10,4,20,' + grade.vig + ')');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // 5. Bottom scrim so the lettering always reads.
  const sc = ctx.createLinearGradient(0, H * 0.62, 0, H);
  sc.addColorStop(0, 'rgba(8,2,14,0)');
  sc.addColorStop(1, 'rgba(8,2,14,0.84)');
  ctx.fillStyle = sc;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  // Title metrics first: the lettering's size and box, so the role tags can
  // stay out of its way. The title block ends at 92.5% of the height so the
  // billing line always has room, and a line is never taller than 22% of
  // the height (which keeps wide covers from getting an oversized title).
  const title = (state.title || 'VICE CITY').toUpperCase();
  const titleLines = title.split(/\s+/).filter(Boolean);
  const maxTitleW = W * 0.92;
  let titleSize = Math.min(W * 0.20, H * 0.22);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (;;) {
    ctx.font = titleSize + 'px Anton, sans-serif';
    const widest = Math.max.apply(null, titleLines.map((l) => ctx.measureText(l).width));
    if (widest <= maxTitleW || titleSize <= W * 0.05) break;
    titleSize *= 0.92;
  }
  const titleLineH = titleSize * 0.94;
  const titleBlockH = titleLineH * titleLines.length;
  const titleBaseY = H * 0.925; // baseline of the last title line
  const titleSubY = titleBaseY - titleBlockH - titleSize * 0.10;
  const titleWidest = Math.max.apply(null, titleLines.map((l) => ctx.measureText(l).width));
  const titleLeft = W / 2 - titleWidest / 2 - W * 0.05;
  const titleRight = W / 2 + titleWidest / 2 + W * 0.05;

  // 6. Role tags: one small label per panel, top corner — dropped below the
  // chips/seal when it would collide with them, and skipped entirely when
  // it would sit under the title.
  if (state.showRoles) {
    for (let i = 0; i < layout.panels; i++) {
      const panel = state.panels[i];
      if (!panel || !panel.role) continue;
      const b = polyBBox(layout.polys[i], W, H);
      const fs = Math.max(11, W * 0.024);
      ctx.font = fs + 'px "Bebas Neue", sans-serif';
      const tw = ctx.measureText(panel.role).width + fs * 1.1;
      const th = fs * 1.5;
      let tx = b.x + Math.max(6, W * 0.012);
      let ty = b.y + Math.max(6, H * 0.012);
      // Chips live top-left and the seal top-right: a tag under either
      // drops below them instead of sliding sideways into its neighbour.
      if ((tx < W * 0.24 && ty < H * 0.10) || (tx + tw > W * 0.80 && ty < H * 0.17)) {
        ty = b.y + H * 0.10;
      }
      // A tag the title would cover is left out rather than half-hidden:
      // the tag's whole rectangle is tested against the title's box.
      if (tx < titleRight && tx + tw > titleLeft && ty + th > titleSubY - titleSize * 0.5 && ty < H * 0.95) continue;
      ctx.fillStyle = 'rgba(10,4,20,0.72)';
      roundRect(ctx, tx, ty, tw, th, fs * 0.35);
      ctx.fill();
      ctx.fillStyle = '#ffd76a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      try { ctx.letterSpacing = '0.14em'; } catch (e) { /* older canvas: no letter-spacing */ }
      ctx.fillText(panel.role, tx + fs * 0.55, ty + fs * 0.78);
      try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
    }
  }

  // 7. Callout chips, top-left and top-right of the cover.
  if (state.showCallouts) {
    const chips = [['NEW', '#ff2d78'], ['LEONIDA', 'rgba(10,4,20,0.72)']];
    const fs = Math.max(12, W * 0.026);
    ctx.font = fs + 'px "Bebas Neue", sans-serif';
    let cx = Math.max(8, W * 0.014);
    const cy = Math.max(8, H * 0.012);
    chips.forEach((c) => {
      const tw = ctx.measureText(c[0]).width + fs * 1.2;
      ctx.fillStyle = c[1];
      roundRect(ctx, cx, cy, tw, fs * 1.6, fs * 0.4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(c[0], cx + fs * 0.6, cy + fs * 0.82);
      cx += tw + fs * 0.5;
    });
  }

  // 8. VC seal: a gold-ringed badge, top-right.
  if (state.showSeal) {
    const sx = W * 0.885, sy = H * 0.085, sr = W * 0.068;
    ctx.save();
    ctx.fillStyle = 'rgba(10,4,20,0.78)';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.strokeStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, sr * 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = (sr * 0.72) + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VC', sx, sy - sr * 0.08);
    ctx.fillStyle = '#ffd76a';
    ctx.font = (sr * 0.2) + 'px "Bebas Neue", sans-serif';
    ctx.fillText('LEONIDA', sx, sy + sr * 0.52);
    ctx.restore();
  }

  // 9. Subtitle, title, billing — the poster's lettering, using the metrics
  // computed above (size, lines, baselines).
  const lines = titleLines;
  const size = titleSize;
  const lineH = titleLineH;
  const baseY = titleBaseY;
  const subtitleY = titleSubY;

  ctx.save();
  ctx.translate(W / 2, baseY);
  ctx.rotate(-0.035);
  ctx.translate(-W / 2, -baseY);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  lines.forEach((line, i) => {
    const y = baseY - (lines.length - 1 - i) * lineH;
    ctx.font = size + 'px Anton, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * style.strokeW;
    ctx.strokeStyle = style.stroke;
    if (style.chrome) {
      const g = ctx.createLinearGradient(0, y - size, 0, y + size * 0.12);
      CHROME_STOPS.forEach((s) => g.addColorStop(s[0], s[1]));
      ctx.strokeText(line, W / 2, y);
      ctx.fillStyle = g;
      ctx.fillText(line, W / 2, y);
    } else {
      ctx.strokeText(line, W / 2, y);
      if (style.fill && style.fill !== 'rgba(0,0,0,0)') {
        ctx.fillStyle = style.fill;
        ctx.fillText(line, W / 2, y);
      }
    }
  });
  ctx.restore();

  // Subtitle above the title, billing at the very bottom.
  if (state.subtitle) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = Math.max(12, W * 0.042) + 'px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = '0.34em'; } catch (e) { /* ignore */ }
    ctx.fillText(state.subtitle.toUpperCase(), W / 2, subtitleY);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  }
  if (state.showBilling && state.billing) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = Math.max(10, W * 0.020) + 'px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = '0.22em'; } catch (e) { /* ignore */ }
    ctx.fillText(state.billing.toUpperCase(), W / 2, H - Math.max(10, H * 0.016));
    try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  }

  ctx.restore();
  return transforms;
}

// Which panel, if any, holds the point (x, y) in cover coordinates.
function panelAt(state, x, y, W, H) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.trio;
  for (let i = layout.panels - 1; i >= 0; i--) {
    if (pointInPoly(x, y, layout.polys[i], W, H)) return i;
  }
  return -1;
}

// Export sizes: the three common post sizes.
const EXPORT_SIZES = [
  { id: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];
