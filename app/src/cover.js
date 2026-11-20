// Vice Cover Studio — cover renderer. No dependencies, plain canvas 2d.
// drawCover(ctx, state, W, H) paints the whole poster: panels, grade,
// title, callouts, seal, role tags and billing. Everything scales with W/H,
// so the same state renders the preview and the 1080/1350/1920 exports.
(function (global) {
  'use strict';

  var GRADES = [
    { id: 'sunset', name: 'Vice Sunset', deep: '#2a0a2e', wash: ['rgba(255,122,24,0.28)', 'rgba(255,46,136,0.22)', 'rgba(123,47,247,0.20)'], tint: 'rgba(255,46,136,0.10)', accent: '#ffc93c', glow: '#ff2e88' },
    { id: 'neon', name: 'Neon Nights', deep: '#04122b', wash: ['rgba(34,230,255,0.26)', 'rgba(255,46,136,0.24)', 'rgba(123,47,247,0.22)'], tint: 'rgba(34,230,255,0.10)', accent: '#22e6ff', glow: '#22e6ff' },
    { id: 'ocean', name: 'Ocean Drive', deep: '#032b2b', wash: ['rgba(0,210,190,0.26)', 'rgba(34,230,255,0.20)', 'rgba(0,80,120,0.22)'], tint: 'rgba(0,210,190,0.10)', accent: '#7df1ff', glow: '#00d2be' },
    { id: 'gold', name: 'Palm Gold', deep: '#2b1a02', wash: ['rgba(255,201,60,0.30)', 'rgba(255,122,24,0.24)', 'rgba(120,60,0,0.20)'], tint: 'rgba(255,201,60,0.10)', accent: '#ff7a18', glow: '#ffc93c' },
    { id: 'midnight', name: 'Midnight Purple', deep: '#12041f', wash: ['rgba(123,47,247,0.30)', 'rgba(255,46,136,0.20)', 'rgba(40,10,80,0.24)'], tint: 'rgba(123,47,247,0.12)', accent: '#c77dff', glow: '#7b2ff7' },
    { id: 'bayside', name: 'Bayside Blue', deep: '#061a33', wash: ['rgba(60,120,255,0.28)', 'rgba(34,230,255,0.20)', 'rgba(10,40,90,0.22)'], tint: 'rgba(60,120,255,0.10)', accent: '#9cc3ff', glow: '#3c78ff' },
    { id: 'haze', name: 'Heat Haze', deep: '#33120a', wash: ['rgba(255,140,60,0.30)', 'rgba(255,80,80,0.20)', 'rgba(255,200,120,0.18)'], tint: 'rgba(255,140,60,0.10)', accent: '#ffb37d', glow: '#ff8c3c' },
  ];

  // Panel rects are fractions of the canvas. `poly` (optional) clips a panel
  // to a polygon instead of a rectangle, for the diagonal layout.
  var LAYOUTS = [
    { id: 'hero-split', name: 'Hero Split', panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ] },
    { id: 'triptych', name: 'Triptych', panels: [
      { x: 0, y: 0, w: 0.34, h: 1 },
      { x: 0.34, y: 0, w: 0.32, h: 1 },
      { x: 0.66, y: 0, w: 0.34, h: 1 },
    ] },
    { id: 'quad', name: 'Quad Grid', panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ] },
    { id: 'focal', name: 'Focal Hero', hero: 0, panels: [
      { x: 0, y: 0, w: 1, h: 0.72 },
      { x: 0, y: 0.72, w: 0.5, h: 0.28 },
      { x: 0.5, y: 0.72, w: 0.5, h: 0.28 },
    ] },
    { id: 'slash', name: 'Diagonal Slash', panels: [
      { x: 0, y: 0, w: 1, h: 0.58, poly: [[0, 0], [1, 0], [1, 0.42], [0, 0.58]] },
      { x: 0, y: 0.42, w: 0.55, h: 0.58, poly: [[0, 0.28], [0.55, 0], [0.55, 1], [0, 1]] },
      { x: 0.55, y: 0.42, w: 0.45, h: 0.58, poly: [[0.45, 0], [1, 0.28], [1, 1], [0.45, 1]] },
    ] },
    { id: 'stack', name: 'Poster Stack', panels: [
      { x: 0.06, y: 0.04, w: 0.88, h: 0.6 },
      { x: 0.06, y: 0.68, w: 0.42, h: 0.28 },
      { x: 0.52, y: 0.68, w: 0.42, h: 0.28 },
    ] },
  ];

  var TITLE_STYLES = [
    { id: 'neon', name: 'Neon Reign' },
    { id: 'slab', name: 'Sunset Slab' },
    { id: 'script', name: 'Vice Script' },
  ];

  var SIZES = [
    { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080' },
    { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350' },
    { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080' },
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].id === id) return GRADES[i];
    return GRADES[0];
  }

  function layoutById(id) {
    for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === id) return LAYOUTS[i];
    return LAYOUTS[0];
  }

  function defaultState(photos) {
    var panels = [];
    for (var i = 0; i < 4; i++) {
      panels.push({ photo: i % Math.max(1, photos.length), zoom: 1, panX: 0, panY: 0, focus: 50 });
    }
    return {
      layout: 'hero-split',
      grade: 'sunset',
      titleStyle: 'neon',
      title: 'Neon Reign',
      subtitle: 'VICE CITY',
      tagline: 'One last score under the neon sun.',
      callout: 'THE SCORE OF THE CENTURY',
      role: 'THE DRIVER',
      showCallouts: true,
      showSeal: true,
      showRoles: true,
      showBilling: true,
      size: '1080x1080',
      photos: photos,
      panels: panels,
    };
  }

  // Cover-fit draw of one photo into a rect, with zoom / pan / focus.
  function drawPhoto(ctx, img, rect, t) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(rect.w / iw, rect.h / ih) * t.zoom;
    var dw = iw * scale;
    var dh = ih * scale;
    // Focus shifts the crop window: 0 looks left/top, 100 looks right/bottom.
    var fx = ((t.focus - 50) / 50) * Math.max(0, (dw - rect.w) / 2);
    var fy = ((t.focus - 50) / 50) * Math.max(0, (dh - rect.h) / 2) * 0.5;
    var cx = rect.x + rect.w / 2 + (t.panX / 100) * rect.w * 0.25 - fx;
    var cy = rect.y + rect.h / 2 + (t.panY / 100) * rect.h * 0.25 - fy;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  }

  function clipPanel(ctx, p, W, H) {
    ctx.beginPath();
    if (p.poly) {
      for (var i = 0; i < p.poly.length; i++) {
        var px = p.poly[i][0] * W;
        var py = p.poly[i][1] * H;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.rect(p.x * W, p.y * H, p.w * W, p.h * H);
    }
    ctx.clip();
  }

  function spaced(ctx, text, x, y, spacing) {
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], cx, y);
      cx += ctx.measureText(text[i]).width + spacing;
    }
    return cx;
  }

  function wrapText(ctx, text, maxW) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawTitle(ctx, state, grade, W, H) {
    var u = W / 1080; // scale unit
    var title = (state.title || 'UNTITLED').toUpperCase();
    var sub = (state.subtitle || '').toUpperCase();
    var pad = 44 * u;
    var titleSize = Math.round(W * 0.105);
    var y = H - 150 * u;

    // Subtitle above the title, letterspaced.
    if (sub) {
      ctx.font = Math.round(30 * u) + 'px "Bebas Neue", sans-serif';
      ctx.fillStyle = grade.accent;
      ctx.textBaseline = 'alphabetic';
      spaced(ctx, sub, pad, y - titleSize - 18 * u, 10 * u);
    }

    if (state.titleStyle === 'slab') {
      // Solid slab band behind white block type.
      ctx.font = titleSize + 'px Anton, sans-serif';
      var tw = ctx.measureText(title).width;
      var bandH = titleSize * 1.18;
      var bandY = y - titleSize - 8 * u;
      ctx.fillStyle = grade.glow;
      ctx.fillRect(pad - 14 * u, bandY, tw + 28 * u, bandH);
      ctx.fillStyle = '#fff';
      ctx.fillText(title, pad, y);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2 * u;
      ctx.strokeText(title, pad, y);
    } else if (state.titleStyle === 'script') {
      // Slanted script-style block type with a gold underline sweep.
      ctx.save();
      ctx.translate(pad, y);
      ctx.transform(1, 0, -0.14, 1, 0, 0);
      ctx.font = 'italic ' + titleSize + 'px Anton, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = grade.glow;
      ctx.shadowBlur = 26 * u;
      ctx.fillText(title, 0, 0);
      ctx.restore();
      ctx.fillStyle = grade.accent;
      ctx.fillRect(pad, y + 16 * u, Math.min(W * 0.5, ctx.measureText(title).width), 5 * u);
    } else {
      // Neon Reign: white block type, pink edge, cyan echo.
      ctx.font = titleSize + 'px Anton, sans-serif';
      ctx.fillStyle = 'rgba(34,230,255,0.85)';
      ctx.fillText(title, pad + 6 * u, y + 6 * u);
      ctx.strokeStyle = grade.glow;
      ctx.lineWidth = 3 * u;
      ctx.strokeText(title, pad, y);
      ctx.fillStyle = '#fff';
      ctx.fillText(title, pad, y);
    }

    // Tagline under the title.
    if (state.tagline) {
      ctx.font = 'italic ' + Math.round(26 * u) + 'px Georgia, serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      var lines = wrapText(ctx, state.tagline, W - pad * 2);
      var ty = y + 42 * u;
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], pad, ty + i * 34 * u);
      }
    }
  }

  function drawCallout(ctx, state, grade, W, H) {
    if (!state.showCallouts || !state.callout) return;
    var u = W / 1080;
    ctx.font = Math.round(26 * u) + 'px "Archivo Black", sans-serif';
    var text = state.callout.toUpperCase();
    var tw = ctx.measureText(text).width;
    var bw = tw + 44 * u;
    var bh = 64 * u;
    var bx = W - bw - 36 * u;
    var by = 36 * u;
    ctx.fillStyle = 'rgba(10,4,24,0.92)';
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 10 * u);
    ctx.fill();
    ctx.stroke();
    // Tail.
    ctx.beginPath();
    ctx.moveTo(bx + 30 * u, by + bh);
    ctx.lineTo(bx + 52 * u, by + bh + 22 * u);
    ctx.lineTo(bx + 62 * u, by + bh);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10,4,24,0.92)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 22 * u, by + bh / 2 + 1 * u);
    ctx.textBaseline = 'alphabetic';
  }

  function drawSeal(ctx, state, grade, W, H) {
    if (!state.showSeal) return;
    var u = W / 1080;
    var cx = W - 92 * u;
    var cy = H - 92 * u;
    var r = 62 * u;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.18);
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r - 9 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = grade.accent;
    ctx.font = Math.round(34 * u) + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VC', 0, 4 * u);
    ctx.font = Math.round(15 * u) + 'px "Bebas Neue", sans-serif';
    ctx.fillText('VICE CITY', 0, 26 * u);
    ctx.fillText('EST. 2026', 0, -24 * u);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  function drawRoles(ctx, state, grade, W, H) {
    if (!state.showRoles || !state.role) return;
    var u = W / 1080;
    var layout = layoutById(state.layout);
    var p0 = layout.panels[0];
    var x = (p0.x + 0.03) * W;
    var y = (p0.y + 0.05) * H;
    ctx.font = Math.round(24 * u) + 'px "Archivo Black", sans-serif';
    var text = state.role.toUpperCase();
    var tw = ctx.measureText(text).width;
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.roundRect(x, y, tw + 30 * u, 44 * u, 6 * u);
    ctx.fill();
    ctx.fillStyle = '#14061f';
    ctx.fillText(text, x + 15 * u, y + 31 * u);
  }

  function drawBilling(ctx, state, grade, W, H) {
    if (!state.showBilling) return;
    var u = W / 1080;
    var line = 'A NEON REIGN PRODUCTION  •  STARRING THE DRIVER  •  THE FIXER  •  THE LOOKOUT  •  VICE CITY 2026';
    ctx.font = Math.round(17 * u) + 'px "Bebas Neue", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(line, W / 2, H - 14 * u);
    ctx.textAlign = 'left';
  }

  function drawCover(ctx, state, W, H) {
    var grade = gradeById(state.grade);
    var layout = layoutById(state.layout);
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = grade.deep;
    ctx.fillRect(0, 0, W, H);

    var photos = state.photos || [];
    for (var i = 0; i < layout.panels.length; i++) {
      var p = layout.panels[i];
      var t = state.panels[i] || { photo: 0, zoom: 1, panX: 0, panY: 0, focus: 50 };
      var rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
      ctx.save();
      clipPanel(ctx, p, W, H);
      var photo = photos[t.photo % Math.max(1, photos.length)];
      if (photo && photo.img) {
        drawPhoto(ctx, photo.img, rect, t);
      } else {
        // Empty panel: grade-coloured placeholder so the poster never breaks.
        var g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
        g.addColorStop(0, grade.wash[0]);
        g.addColorStop(1, grade.deep);
        ctx.fillStyle = g;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      // Grade tint over the photo.
      ctx.fillStyle = grade.tint;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
      // Panel seam.
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(2, W / 540);
      ctx.beginPath();
      if (p.poly) {
        for (var k = 0; k < p.poly.length; k++) {
          var px = p.poly[k][0] * W;
          var py = p.poly[k][1] * H;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.rect(rect.x, rect.y, rect.w, rect.h);
      }
      ctx.stroke();
    }

    // Full-canvas grade wash + vignette.
    var wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, grade.wash[0]);
    wash.addColorStop(0.55, grade.wash[1]);
    wash.addColorStop(1, grade.wash[2]);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    var vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    drawRoles(ctx, state, grade, W, H);
    drawCallout(ctx, state, grade, W, H);
    drawTitle(ctx, state, grade, W, H);
    drawSeal(ctx, state, grade, W, H);
    drawBilling(ctx, state, grade, W, H);
    ctx.restore();
  }

  function renderCover(canvas, state, W, H) {
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    drawCover(ctx, state, W, H);
    return canvas;
  }

  global.ViceCover = {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    TITLE_STYLES: TITLE_STYLES,
    SIZES: SIZES,
    defaultState: defaultState,
    drawCover: drawCover,
    renderCover: renderCover,
    gradeById: gradeById,
    layoutById: layoutById,
  };
})(typeof window !== 'undefined' ? window : globalThis);
