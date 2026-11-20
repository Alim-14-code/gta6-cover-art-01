/* Vice Cover Studio — cover renderer.
   Draws a multi-panel GTA-style poster on a canvas from a state object
   and a set of loaded photos. No network: every image comes from the
   app folder or from a file the user picked on their own machine. */
(function () {
  "use strict";

  var EXPORT_SIZES = {
    square: [1080, 1080],
    portrait: [1080, 1350],
    wide: [1920, 1080]
  };

  /* Panel rectangles as fractions [x, y, w, h] of the cover. */
  var LAYOUTS = {
    hero: {
      label: "Focal Hero",
      panels: [
        [0, 0, 1, 0.62],
        [0, 0.64, 0.49, 0.36],
        [0.51, 0.64, 0.49, 0.36]
      ]
    },
    triptych: {
      label: "Triptych",
      panels: [
        [0, 0, 0.32, 1],
        [0.34, 0, 0.32, 1],
        [0.68, 0, 0.32, 1]
      ]
    },
    grid: {
      label: "Grid 2x2",
      panels: [
        [0, 0, 0.49, 0.49],
        [0.51, 0, 0.49, 0.49],
        [0, 0.51, 0.49, 0.49],
        [0.51, 0.51, 0.49, 0.49]
      ]
    },
    split: {
      label: "Split",
      panels: [
        [0, 0, 0.58, 1],
        [0.6, 0, 0.4, 0.49],
        [0.6, 0.51, 0.4, 0.49]
      ]
    },
    banner: {
      label: "Banner",
      panels: [
        [0, 0, 1, 0.49],
        [0, 0.51, 1, 0.49]
      ]
    },
    mosaic: {
      label: "Mosaic",
      panels: [
        [0, 0, 0.58, 1],
        [0.6, 0, 0.4, 0.32],
        [0.6, 0.34, 0.4, 0.32],
        [0.6, 0.68, 0.4, 0.32]
      ]
    }
  };

  /* Colour grades: two stops for a diagonal tint wash. */
  var GRADES = {
    sunset: { label: "Sunset", from: "#ff7a2e", to: "#d63384" },
    neon: { label: "Neon", from: "#ff2e88", to: "#2ee6ff" },
    dusk: { label: "Dusk", from: "#1a0533", to: "#ff6b35" },
    vice: { label: "Vice", from: "#ff9a3d", to: "#7b2ff7" },
    mono: { label: "Mono", from: "#e8e8e8", to: "#101010" },
    teal: { label: "Teal", from: "#00e5a0", to: "#0057ff" },
    candy: { label: "Candy", from: "#ff5da2", to: "#ffd23d" }
  };

  var TITLE_STYLES = {
    solid: "Solid",
    outline: "Outline",
    gradient: "Gradient"
  };

  var DEFAULT_TAGS = ["LUCIA", "JASON", "VICE CITY", "OCEAN DR", "NEON", "PIER"];

  function defaultState() {
    var panels = [];
    for (var i = 0; i < 6; i++) {
      panels.push({
        photo: ["boulevard", "neon", "pier"][i % 3],
        panX: 0,
        panY: 0,
        zoom: 1.2,
        tag: DEFAULT_TAGS[i % DEFAULT_TAGS.length]
      });
    }
    return {
      layout: "hero",
      grade: "sunset",
      titleStyle: "solid",
      title: "VICE CITY",
      subtitle: "NEON REIGN",
      panels: panels,
      callouts: true,
      callout1: "WELCOME BACK",
      callout2: "TWO PROTAGONISTS",
      seal: true,
      tags: true,
      billing: true
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /* Draw one photo into a panel rect, cover-fit, with pan and zoom. */
  function drawPhoto(ctx, img, rect, setting) {
    var px = rect[0], py = rect[1], pw = rect[2], ph = rect[3];
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var zoom = setting.zoom || 1;
    var scale = Math.max(pw / iw, ph / ih) * zoom;
    var dw = iw * scale;
    var dh = ih * scale;
    var ox = (pw - dw) / 2 + ((setting.panX || 0) / 100) * ((dw - pw) / 2);
    var oy = (ph - dh) / 2 + ((setting.panY || 0) / 100) * ((dh - ph) / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.drawImage(img, px + ox, py + oy, dw, dh);
    ctx.restore();
  }

  /* Tint wash for the chosen grade, plus a soft edge darkening. */
  function applyGrade(ctx, rect, grade, w, h) {
    var px = rect[0], py = rect[1], pw = rect[2], ph = rect[3];
    var wash = ctx.createLinearGradient(px, py, px + pw, py + ph);
    wash.addColorStop(0, grade.from);
    wash.addColorStop(1, grade.to);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    if (grade === GRADES.mono) {
      ctx.globalCompositeOperation = "saturation";
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#808080";
      ctx.fillRect(px, py, pw, ph);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = wash;
    ctx.fillRect(px, py, pw, ph);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    var vig = ctx.createRadialGradient(
      px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.35,
      px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.75
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vig;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    void w; void h;
  }

  function drawTag(ctx, text, x, y, size) {
    ctx.save();
    ctx.font = size + "px 'Archivo Black', sans-serif";
    var tw = ctx.measureText(text).width;
    var pad = size * 0.55;
    ctx.fillStyle = "rgba(10,6,20,0.82)";
    ctx.fillRect(x, y, tw + pad * 2, size * 1.7);
    ctx.fillStyle = "#2ee6ff";
    ctx.fillRect(x, y, 4, size * 1.7);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + pad + 2, y + size * 0.88);
    ctx.restore();
  }

  function drawCallout(ctx, text, x, y, size, color, dark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.07);
    ctx.font = size + "px 'Bebas Neue', sans-serif";
    var tw = ctx.measureText(text).width;
    var pad = size * 0.6;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, tw + pad * 2, size * 1.55);
    ctx.fillStyle = dark;
    ctx.textBaseline = "middle";
    ctx.fillText(text, pad, size * 0.82);
    ctx.restore();
  }

  /* Circular seal with text running around the rim and a star inside. */
  function drawSeal(ctx, cx, cy, r, label) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "rgba(12,6,24,0.88)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffb02e";
    ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffb02e";
    ctx.font = "bold " + Math.round(r * 0.34) + "px 'Archivo Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var ring = label + "  \u2022  EST. 1986  \u2022  ";
    var step = (Math.PI * 2) / ring.length;
    for (var i = 0; i < ring.length; i++) {
      var a = -Math.PI / 2 + i * step;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -r * 0.77);
      ctx.font = Math.round(r * 0.16) + "px 'Archivo Black', sans-serif";
      ctx.fillText(ring[i], 0, 0);
      ctx.restore();
    }
    /* five-point star */
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var rr = k % 2 === 0 ? r * 0.42 : r * 0.18;
      var aa = -Math.PI / 2 + (k * Math.PI) / 5;
      var sx = Math.cos(aa) * rr;
      var sy = Math.sin(aa) * rr;
      if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTitleBlock(ctx, state, grade, w, h) {
    var titleSize = Math.round(w * 0.115);
    var subSize = Math.round(w * 0.038);
    var bottom = h * 0.985;
    /* scrim so the lettering reads over any photo */
    var scrim = ctx.createLinearGradient(0, h * 0.62, 0, h);
    scrim.addColorStop(0, "rgba(8,4,18,0)");
    scrim.addColorStop(0.55, "rgba(8,4,18,0.55)");
    scrim.addColorStop(1, "rgba(8,4,18,0.88)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);

    var title = (state.title || "VICE CITY").toUpperCase();
    var sub = (state.subtitle || "").toUpperCase();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    var titleY = bottom - subSize * 2.1 - (state.billing ? h * 0.045 : h * 0.01);
    ctx.font = titleSize + "px 'Anton', sans-serif";
    if (state.titleStyle === "outline") {
      ctx.lineWidth = Math.max(2, titleSize * 0.045);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(title, w / 2, titleY);
      ctx.fillStyle = "rgba(10,6,20,0.55)";
      ctx.fillText(title, w / 2, titleY);
    } else if (state.titleStyle === "gradient") {
      var g = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY);
      g.addColorStop(0, grade.from);
      g.addColorStop(1, grade.to);
      ctx.fillStyle = g;
      ctx.lineWidth = Math.max(2, titleSize * 0.03);
      ctx.strokeStyle = "rgba(10,6,20,0.9)";
      ctx.strokeText(title, w / 2, titleY);
      ctx.fillText(title, w / 2, titleY);
    } else {
      ctx.lineWidth = Math.max(2, titleSize * 0.04);
      ctx.strokeStyle = "rgba(10,6,20,0.95)";
      ctx.strokeText(title, w / 2, titleY);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(title, w / 2, titleY);
    }
    if (sub) {
      ctx.font = subSize + "px 'Bebas Neue', sans-serif";
      ctx.fillStyle = "#ffd23d";
      var subY = titleY + subSize * 1.15;
      /* letter-spacing by hand: spaces between letters */
      var spaced = sub.split("").join("\u2009");
      ctx.fillText(spaced, w / 2, subY);
    }
    if (state.billing) {
      var bSize = Math.max(9, Math.round(w * 0.011));
      ctx.font = bSize + "px 'Archivo Black', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      var line = "A NEON REIGN PRODUCTION  \u00b7  STARRING LUCIA & JASON  \u00b7  VICE CITY  \u00b7  MMXXVI";
      ctx.fillText(line, w / 2, bottom - bSize * 0.4);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(w * 0.08, bottom - bSize * 1.9, w * 0.84, 1);
    }
    ctx.restore();
  }

  /* Main entry: paint the whole cover onto a canvas of its own size. */
  function renderCover(canvas, state, photos) {
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    var layout = LAYOUTS[state.layout] || LAYOUTS.hero;
    var grade = GRADES[state.grade] || GRADES.sunset;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0d0716";
    ctx.fillRect(0, 0, w, h);

    var gap = Math.round(Math.min(w, h) * 0.008);
    layout.panels.forEach(function (frac, i) {
      var rect = [
        Math.round(frac[0] * w) + (frac[0] > 0 ? gap / 2 : 0),
        Math.round(frac[1] * h) + (frac[1] > 0 ? gap / 2 : 0),
        Math.round(frac[2] * w) - (frac[0] > 0 ? gap / 2 : 0) - (frac[0] + frac[2] < 1 ? gap / 2 : 0),
        Math.round(frac[3] * h) - (frac[1] > 0 ? gap / 2 : 0) - (frac[1] + frac[3] < 1 ? gap / 2 : 0)
      ];
      var setting = state.panels[i] || state.panels[0];
      var img = photos[setting.photo];
      if (img) drawPhoto(ctx, img, rect, setting);
      applyGrade(ctx, rect, grade, w, h);
      if (state.tags && setting.tag) {
        drawTag(ctx, setting.tag, rect[0] + Math.round(w * 0.012), rect[1] + rect[3] - Math.round(w * 0.045), Math.round(w * 0.016));
      }
    });

    if (state.callouts) {
      var cSize = Math.round(w * 0.028);
      if (state.callout1) drawCallout(ctx, state.callout1, Math.round(w * 0.03), Math.round(h * 0.035), cSize, "#ff2e88", "#ffffff");
      if (state.callout2) drawCallout(ctx, state.callout2, Math.round(w * 0.62), Math.round(h * 0.035), cSize, "#2ee6ff", "#0d0716");
    }
    if (state.seal) {
      drawSeal(ctx, w * 0.9, h * 0.56, Math.round(w * 0.055), "VICE CITY");
    }
    drawTitleBlock(ctx, state, grade, w, h);
  }

  /* Render the same cover at an export size and hand back the canvas. */
  function renderExport(state, photos, sizeKey) {
    var size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES.square;
    var canvas = document.createElement("canvas");
    canvas.width = size[0];
    canvas.height = size[1];
    renderCover(canvas, state, photos);
    return canvas;
  }

  window.ViceCover = {
    EXPORT_SIZES: EXPORT_SIZES,
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    TITLE_STYLES: TITLE_STYLES,
    DEFAULT_TAGS: DEFAULT_TAGS,
    defaultState: defaultState,
    renderCover: renderCover,
    renderExport: renderExport
  };
})();
