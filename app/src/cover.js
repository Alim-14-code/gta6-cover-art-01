// Vice Cover Studio — the cover renderer. Pure canvas 2D, no network: it paints
// the chosen layout's photo panels, washes the grade over them, and sets the big
// condensed caption on top. Everything is drawn from a plain state object so the
// editor, the export and the screenshot scenes all share one code path.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const FONTS = ['Anton', 'Bebas Neue', 'Archivo Black'];

// Each grade is a canvas filter for the photos, a diagonal colour wash laid
// over the whole cover, and how dark the vignette gets towards the corners.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.28) contrast(1.08) sepia(0.14)',
    wash: [
      [0, 'rgba(255, 122, 60, 0.10)'],
      [0.55, 'rgba(255, 80, 120, 0.10)'],
      [1, 'rgba(190, 30, 110, 0.30)'],
    ],
    vignette: 0.32,
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.55) contrast(1.16) hue-rotate(-10deg)',
    wash: [
      [0, 'rgba(255, 45, 150, 0.16)'],
      [0.5, 'rgba(90, 40, 180, 0.10)'],
      [1, 'rgba(0, 220, 255, 0.16)'],
    ],
    vignette: 0.4,
  },
  drive: {
    label: 'Ocean Drive',
    filter: 'saturate(1.18) contrast(1.06)',
    wash: [
      [0, 'rgba(0, 190, 210, 0.10)'],
      [0.5, 'rgba(255, 170, 80, 0.06)'],
      [1, 'rgba(255, 110, 60, 0.20)'],
    ],
    vignette: 0.3,
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(0.9) contrast(1.28) brightness(0.94)',
    wash: [
      [0, 'rgba(20, 20, 40, 0.10)'],
      [1, 'rgba(0, 0, 0, 0.34)'],
    ],
    vignette: 0.48,
  },
};

export const LAYOUTS = {
  trio: { label: 'Vice Trio', panels: 3 },
  hero: { label: 'Hero + Strip', panels: 3 },
  quad: { label: 'Four Corners', panels: 4 },
  single: { label: 'Full Bleed', panels: 1 },
};

// Panel outlines in unit space (0..1). The trio's slanted edges are the
// poster's comic-book look; hero is one wide top panel over two bottom ones.
export function layoutPolygons(layout, w, h) {
  const scale = (points) => points.map(([x, y]) => [x * w, y * h]);
  if (layout === 'trio') {
    return [
      scale([[0, 0], [0.44, 0], [0.36, 1], [0, 1]]),
      scale([[0.46, 0], [0.70, 0], [0.62, 1], [0.38, 1]]),
      scale([[0.72, 0], [1, 0], [1, 1], [0.64, 1]]),
    ];
  }
  if (layout === 'hero') {
    return [
      scale([[0, 0], [1, 0], [1, 0.60], [0, 0.60]]),
      scale([[0, 0.63], [0.485, 0.63], [0.485, 1], [0, 1]]),
      scale([[0.515, 0.63], [1, 0.63], [1, 1], [0.515, 1]]),
    ];
  }
  if (layout === 'quad') {
    return [
      scale([[0, 0], [0.485, 0], [0.485, 0.485], [0, 0.485]]),
      scale([[0.515, 0], [1, 0], [1, 0.485], [0.515, 0.485]]),
      scale([[0, 0.515], [0.485, 0.515], [0.485, 1], [0, 1]]),
      scale([[0.515, 0.515], [1, 0.515], [1, 1], [0.515, 1]]),
    ];
  }
  return [scale([[0, 0], [1, 0], [1, 1], [0, 1]])];
}

function trace(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

function boundsOf(poly) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

// Which panel (if any) holds the point (x, y) in cover pixels.
export function panelAtPoint(x, y, w, h, layout) {
  const polys = layoutPolygons(layout, w, h);
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

// Paints one photo into one panel: cover-fit, scaled by the panel's zoom and
// shifted by its pan offsets (fractions of the panel size, -0.5..0.5).
function paintPanel(ctx, poly, panel, filter) {
  const [x0, y0, x1, y1] = boundsOf(poly);
  const pw = x1 - x0;
  const ph = y1 - y0;
  ctx.save();
  trace(ctx, poly);
  ctx.clip();
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(x0, y0, pw, ph);
  const img = panel.img;
  if (img) {
    const zoom = panel.zoom || 1;
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    const dx = x0 + (pw - dw) / 2 + (panel.ox || 0) * pw;
    const dy = y0 + (ph - dh) / 2 + (panel.oy || 0) * ph;
    ctx.filter = filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  }
  ctx.restore();
}

// Shrink the font until the line fits maxWidth, never below 12px.
function fitSize(ctx, text, family, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${size}px "${family}", sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 2;
    ctx.font = `${size}px "${family}", sans-serif`;
  }
  return size;
}

// Draws the caption block: tagline on the far side of the main line, the
// whole block tilted and placed at the top or the bottom of the cover.
function paintCaption(ctx, w, h, caption) {
  const text = (caption.text || '').trim().toUpperCase();
  const tagline = (caption.tagline || '').trim().toUpperCase();
  if (!text && !tagline) return;
  const tilt = ((caption.tilt || 0) * Math.PI) / 180;
  const atTop = (caption.position || 'bottom') === 'top';
  // The tagline rides on the far side of the main caption: above it when the
  // caption sits at the bottom, below it when the caption sits at the top.
  const dir = atTop ? 1 : -1;
  // The block's anchor sits near the edge it belongs to; the tagline rides
  // on the far side of the main line (above it at the bottom, below at top).
  const anchorY = atTop ? h * 0.10 : h * 0.90;
  const gap = h * 0.016;
  ctx.save();
  ctx.translate(w / 2, anchorY);
  ctx.rotate(tilt);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mainSize = text
    ? fitSize(ctx, text, caption.font || 'Anton', h * (caption.size || 0.11), w * 0.92)
    : 0;
  const tagSize = tagline
    ? fitSize(ctx, tagline, 'Bebas Neue', h * 0.038, w * 0.8)
    : 0;
  const letter = (line, size, family, color, dy) => {
    if (!line) return;
    ctx.font = `${size}px "${family}", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.04)}px`; } catch (_) { /* older canvas */ }
    if (caption.outline !== false) {
      ctx.lineWidth = Math.max(2, size * 0.10);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineJoin = 'round';
      ctx.strokeText(line, 0, dy);
    }
    ctx.fillStyle = color;
    ctx.fillText(line, 0, dy);
  };
  letter(tagline, tagSize, 'Bebas Neue', caption.tagColor || '#ffd166', text ? dir * (mainSize + gap) : 0);
  letter(text, mainSize, caption.font || 'Anton', caption.color || '#ffffff', 0);
  try { ctx.letterSpacing = '0px'; } catch (_) { /* older canvas */ }
  ctx.restore();
}

// `state`: { layout, grade, panels: [{img, zoom, ox, oy}], caption }.
// Paints the whole cover onto the canvas at the canvas's own size.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  // White first: the gaps between panels read as white rules.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const polys = layoutPolygons(state.layout || 'trio', w, h);
  const panels = state.panels || [];
  polys.forEach((poly, i) => paintPanel(ctx, poly, panels[i] || {}, grade.filter));
  // Colour grade: a warm or neon wash over everything, then a vignette.
  const wash = ctx.createLinearGradient(0, 0, w, h);
  for (const [stop, color] of grade.wash) wash.addColorStop(stop, color);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, `rgba(0, 0, 0, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  paintCaption(ctx, w, h, state.caption || {});
}

// Renders the same cover at an export size and hands back a fresh canvas.
export function renderExport(state, sizeName) {
  const [w, h] = SIZES[sizeName] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  return canvas;
}
