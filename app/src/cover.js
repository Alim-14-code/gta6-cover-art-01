// Vice Cover Studio — cover engine (cover.js).
// Pure drawing logic: panel polygons, cover-fit placement with pan/zoom/focus,
// colour grades and key-art lettering. No DOM access here, so the same code
// draws the live preview and the exported PNGs.

export const SAMPLE_PHOTOS = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'neon', label: 'Neon Street', src: 'samples/neon.jpg' },
  { id: 'pier', label: 'Pier Sunset', src: 'samples/pier.jpg' },
];

// Panel polygons are normalised [x, y] points (0..1) across the cover.
// Slanted dividers give every layout its diagonal GTA key-art feel.
export const LAYOUTS = {
  trio: {
    label: 'Vice Trio',
    panels: [
      { id: 'p1', poly: [[0, 0], [0.37, 0], [0.315, 1], [0, 1]] },
      { id: 'p2', poly: [[0.37, 0], [0.685, 0], [0.63, 1], [0.315, 1]] },
      { id: 'p3', poly: [[0.685, 0], [1, 0], [1, 1], [0.63, 1]] },
    ],
  },
  'hero-strip': {
    label: 'Hero + Strip',
    panels: [
      { id: 'p1', poly: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
      { id: 'p2', poly: [[0, 0.7], [0.36, 0.7], [0.315, 1], [0, 1]] },
      { id: 'p3', poly: [[0.36, 0.7], [0.685, 0.7], [0.64, 1], [0.315, 1]] },
      { id: 'p4', poly: [[0.685, 0.7], [1, 0.7], [1, 1], [0.64, 1]] },
    ],
  },
  corners: {
    label: 'Four Corners',
    panels: [
      { id: 'p1', poly: [[0, 0], [0.52, 0], [0.47, 0.5], [0, 0.5]] },
      { id: 'p2', poly: [[0.52, 0], [1, 0], [1, 0.5], [0.47, 0.5]] },
      { id: 'p3', poly: [[0, 0.5], [0.47, 0.5], [0.42, 1], [0, 1]] },
      { id: 'p4', poly: [[0.47, 0.5], [1, 0.5], [1, 1], [0.42, 1]] },
    ],
  },
  fullbleed: {
    label: 'Full Bleed',
    panels: [{ id: 'p1', poly: [[0, 0], [1, 0], [1, 1], [0, 1]] }],
  },
  duo: {
    label: 'Duo',
    panels: [
      { id: 'p1', poly: [[0, 0], [0.56, 0], [0.47, 1], [0, 1]] },
      { id: 'p2', poly: [[0.56, 0], [1, 0], [1, 1], [0.47, 1]] },
    ],
  },
  stacked: {
    label: 'Stacked',
    panels: [
      { id: 'p1', poly: [[0, 0], [1, 0], [0.94, 0.36], [0, 0.36]] },
      { id: 'p2', poly: [[0, 0.36], [0.94, 0.36], [0.88, 0.68], [0, 0.68]] },
      { id: 'p3', poly: [[0, 0.68], [0.88, 0.68], [0.82, 1], [0, 1]] },
    ],
  },
};

export const LAYOUT_ORDER = ['trio', 'hero-strip', 'corners', 'fullbleed', 'duo', 'stacked'];

// A grade is a canvas filter plus a tinted gradient wash laid over the photo.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.28) contrast(1.08) sepia(0.16) hue-rotate(-8deg)',
    wash: ['rgba(255,110,60,0.16)', 'rgba(255,40,120,0.12)'],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.16) brightness(0.94) hue-rotate(10deg)',
    wash: ['rgba(255,0,180,0.14)', 'rgba(0,220,255,0.12)'],
  },
  ocean: {
    label: 'Ocean Drive',
    filter: 'saturate(1.15) contrast(1.06) brightness(1.02)',
    wash: ['rgba(0,190,210,0.13)', 'rgba(255,200,120,0.08)'],
  },
  golden: {
    label: 'Golden Hour',
    filter: 'sepia(0.32) saturate(1.32) brightness(1.06) contrast(1.03)',
    wash: ['rgba(255,190,60,0.15)', 'rgba(255,120,20,0.08)'],
  },
  midnight: {
    label: 'Midnight Drive',
    filter: 'brightness(0.86) contrast(1.22) saturate(1.12) hue-rotate(18deg)',
    wash: ['rgba(10,30,120,0.20)', 'rgba(120,0,180,0.10)'],
  },
  heatwave: {
    label: 'Heatwave',
    filter: 'saturate(1.5) contrast(1.12) sepia(0.26) brightness(1.03)',
    wash: ['rgba(255,60,20,0.16)', 'rgba(255,160,0,0.10)'],
  },
  ink: {
    label: 'Poster Ink',
    filter: 'grayscale(0.35) contrast(1.26) saturate(1.25) brightness(0.98)',
    wash: ['rgba(20,10,40,0.14)', 'rgba(255,255,255,0.05)'],
  },
};

export const GRADE_ORDER = ['sunset', 'neon', 'ocean', 'golden', 'midnight', 'heatwave', 'ink'];

export const TITLE_STYLES = {
  solid: { label: 'Solid Bold' },
  chrome: { label: 'Retro Chrome' },
  outline: { label: 'Outline' },
};

export const ROLE_TAGS = ['THE DRIVER', 'THE LOOKOUT', 'THE FIXER', 'THE GETAWAY'];

// Cover-fit placement: the focus point (fx, fy, 0..1 of the photo) lands on the
// panel centre, zoom scales from the minimum cover scale, pan nudges in pixels.
export function coverPlacement(imgW, imgH, panelW, panelH, panel) {
  const base = Math.max(panelW / imgW, panelH / imgH);
  const scale = base * (panel.zoom || 1);
  const dw = imgW * scale;
  const dh = imgH * scale;
  const cx = panelW / 2 - panel.focusX * dw + (panel.panX || 0);
  const cy = panelH / 2 - panel.focusY * dh + (panel.panY || 0);
  // Clamp so the photo always covers the whole panel (no bare edges).
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return { dx: clamp(cx, panelW - dw, 0), dy: clamp(cy, panelH - dh, 0), dw, dh };
}

// Bounding box of a normalised polygon in cover pixels.
export function polyBox(poly, W, H) {
  const xs = poly.map((p) => p[0] * W);
  const ys = poly.map((p) => p[1] * H);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

export function tracePoly(ctx, poly, W, H) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * W, y * H);
    else ctx.lineTo(x * W, y * H);
  });
  ctx.closePath();
}

// Is a cover-space point inside a panel polygon? (ray casting)
export function pointInPoly(px, py, poly, W, H) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0] * W;
    const yi = poly[i][1] * H;
    const xj = poly[j][0] * W;
    const yj = poly[j][1] * H;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Draw the whole cover onto ctx at W x H pixels.
// state: { layout, grade, title, tagline, titleStyle, extras:{chips,seal,billing,roles},
//          panels: [{ photo: HTMLImageElement|null, zoom, panX, panY, focusX, focusY }] }
// selected: index of the panel to outline in the editor preview (-1 = none).
export function drawCover(ctx, W, H, state, images, selected = -1) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.trio;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0614';
  ctx.fillRect(0, 0, W, H);

  layout.panels.forEach((def, i) => {
    const panel = state.panels[i] || {};
    const img = images[panel.photoId];
    const box = polyBox(def.poly, W, H);
    ctx.save();
    tracePoly(ctx, def.poly, W, H);
    ctx.clip();
    if (img && img.naturalWidth) {
      const p = coverPlacement(img.naturalWidth, img.naturalHeight, box.w, box.h, panel);
      ctx.filter = grade.filter;
      ctx.drawImage(img, box.x + p.dx, box.y + p.dy, p.dw, p.dh);
      ctx.filter = 'none';
    } else {
      // Empty panel: dark checker so the layout still reads.
      ctx.fillStyle = i % 2 ? '#1a1030' : '#241640';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `600 ${Math.max(12, Math.round(H * 0.022))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Add a photo', box.x + box.w / 2, box.y + box.h / 2);
    }
    // Grade wash.
    const wash = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    wash.addColorStop(0, grade.wash[0]);
    wash.addColorStop(1, grade.wash[1]);
    ctx.fillStyle = wash;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    // Vignette for depth.
    const vig = ctx.createRadialGradient(
      box.x + box.w / 2, box.y + box.h / 2, Math.min(box.w, box.h) * 0.35,
      box.x + box.w / 2, box.y + box.h / 2, Math.max(box.w, box.h) * 0.75,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();

    // Slanted divider stroke along the panel edge.
    ctx.save();
    tracePoly(ctx, def.poly, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.stroke();
    ctx.restore();

    // Focus marker for the selected panel (editor preview only).
    if (i === selected) {
      const fx = box.x + panel.focusX * box.w;
      const fy = box.y + panel.focusY * box.h;
      ctx.save();
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy, Math.max(10, W * 0.012), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 16, fy);
      ctx.lineTo(fx + 16, fy);
      ctx.moveTo(fx, fy - 16);
      ctx.lineTo(fx, fy + 16);
      ctx.stroke();
      ctx.restore();
    }
  });

  // Selected panel outline.
  if (selected >= 0 && layout.panels[selected]) {
    ctx.save();
    tracePoly(ctx, layout.panels[selected].poly, W, H);
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.stroke();
    ctx.restore();
  }

  drawLettering(ctx, W, H, state);
  drawExtras(ctx, W, H, state);
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  while (px > 10) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  return px;
}

function drawLettering(ctx, W, H, state) {
  const title = (state.title || '').trim();
  const tagline = (state.tagline || '').trim();
  if (!title && !tagline) return;
  const pad = W * 0.04;
  const baseY = H * 0.9;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (tagline) {
    const tagPx = fitFont(ctx, tagline.toUpperCase(), W * 0.6, Math.round(H * 0.045), '"Bebas Neue", sans-serif', 400);
    ctx.font = `400 ${tagPx}px "Bebas Neue", sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = Math.max(2, tagPx * 0.08);
    ctx.strokeText(tagline.toUpperCase(), pad, baseY - H * 0.17);
    ctx.fillText(tagline.toUpperCase(), pad, baseY - H * 0.17);
  }

  if (title) {
    const titlePx = fitFont(ctx, title.toUpperCase(), W - pad * 2, Math.round(H * 0.115), 'Anton, "Archivo Black", sans-serif', 400);
    ctx.font = `400 ${titlePx}px Anton, "Archivo Black", sans-serif`;
    const y = baseY;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = Math.max(4, titlePx * 0.14);
    ctx.strokeText(title.toUpperCase(), pad, y);
    if (state.titleStyle === 'chrome') {
      const g = ctx.createLinearGradient(0, y - titlePx, 0, y);
      g.addColorStop(0, '#fff7d6');
      g.addColorStop(0.45, '#ffb347');
      g.addColorStop(0.55, '#ff2e88');
      g.addColorStop(1, '#7b2ff7');
      ctx.fillStyle = g;
    } else if (state.titleStyle === 'outline') {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, titlePx * 0.07);
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillText(title.toUpperCase(), pad, y);
    if (state.titleStyle === 'outline') ctx.strokeText(title.toUpperCase(), pad, y);
  }
  ctx.restore();
}

function drawExtras(ctx, W, H, state) {
  const ex = state.extras || {};
  const pad = W * 0.04;
  ctx.save();

  if (ex.chips) {
    const chips = ['VICE CITY', 'EST. 2026', 'OPEN WORLD'];
    const chipH = Math.round(H * 0.042);
    const gap = Math.round(W * 0.012);
    let x = pad;
    const y = H * 0.045;
    ctx.font = `400 ${Math.round(chipH * 0.52)}px "Bebas Neue", sans-serif`;
    ctx.textBaseline = 'middle';
    chips.forEach((c, i) => {
      const w = ctx.measureText(c).width + chipH * 1.1;
      ctx.fillStyle = i === 0 ? '#ff2e88' : 'rgba(10,6,20,0.78)';
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, chipH, chipH / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(c, x + w / 2, y + chipH / 2 + 1);
      x += w + gap;
    });
  }

  if (ex.seal) {
    const r = Math.round(H * 0.055);
    const cx = W - pad - r;
    const cy = H * 0.1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,6,20,0.82)';
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,209,102,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = `400 ${Math.round(r * 0.5)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VC', cx, cy - r * 0.12);
    ctx.font = `400 ${Math.round(r * 0.22)}px "Bebas Neue", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('★ 2026 ★', cx, cy + r * 0.42);
  }

  if (ex.roles) {
    const layout = LAYOUTS[state.layout] || LAYOUTS.trio;
    ctx.font = `400 ${Math.max(11, Math.round(H * 0.026))}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    layout.panels.forEach((def, i) => {
      const box = polyBox(def.poly, W, H);
      const label = ROLE_TAGS[i % ROLE_TAGS.length];
      const tw = ctx.measureText(label).width + 18;
      const th = Math.max(18, Math.round(H * 0.034));
      const x = box.x + box.w / 2 - tw / 2;
      const y = box.y + box.h - th - Math.round(H * 0.05);
      ctx.fillStyle = 'rgba(10,6,20,0.8)';
      roundRect(ctx, x, y, tw, th, 3);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.fillText(label, box.x + box.w / 2, y + th / 2 + 1);
    });
  }

  if (ex.billing) {
    const line = 'A VICE COVER STUDIO PRODUCTION  •  STARRING THE DRIVER, THE LOOKOUT & THE FIXER  •  LEONIDA 2026';
    let px = Math.max(10, Math.round(H * 0.016));
    ctx.font = `600 ${px}px system-ui, sans-serif`;
    while (px > 8 && ctx.measureText(line).width > W * 0.96) {
      px -= 1;
      ctx.font = `600 ${px}px system-ui, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(line, W / 2, H - H * 0.015);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
