/* Vice Cover Studio — app wiring: state, controls, photos, export. */
(function () {
  "use strict";

  var SAMPLES = {
    boulevard: "samples/boulevard.jpg",
    neon: "samples/neon.jpg",
    pier: "samples/pier.jpg"
  };
  var SAMPLE_LABELS = { boulevard: "Boulevard", neon: "Neon", pier: "Pier" };

  var state = window.ViceCover.defaultState();
  var photos = {};          /* key -> loaded Image */
  var uploaded = {};        /* key -> uploaded Image (user files) */
  var uploadCount = 0;
  var selectedPanel = 0;
  var raf = 0;

  function $(id) { return document.getElementById(id); }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("cannot load " + src)); };
      img.src = src;
    });
  }

  function scheduleDraw() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      draw();
    });
  }

  function draw() {
    var canvas = $("cover");
    if (!canvas) return;
    window.ViceCover.renderCover(canvas, state, photos);
    var size = canvas.width + " \u00d7 " + canvas.height;
    var label = $("sizeLabel");
    if (label) label.textContent = "Preview " + size + " \u00b7 drag the sliders to frame each panel";
  }

  function setActive(rowId, attr, value) {
    var row = $(rowId);
    if (!row) return;
    Array.prototype.forEach.call(row.querySelectorAll("[data-" + attr + "]"), function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-" + attr) === value);
    });
  }

  function refreshPanelControls() {
    var layout = window.ViceCover.LAYOUTS[state.layout];
    var sel = $("panelSelect");
    var current = sel.value;
    sel.innerHTML = "";
    layout.panels.forEach(function (_frac, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = "Panel " + (i + 1);
      sel.appendChild(opt);
    });
    if (Number(current) < layout.panels.length) sel.value = current;
    selectedPanel = Number(sel.value || 0);
    var setting = state.panels[selectedPanel];
    $("panX").value = String(setting.panX);
    $("panY").value = String(setting.panY);
    $("zoom").value = String(Math.round(setting.zoom * 100));
    refreshPhotoSelect();
  }

  function refreshPhotoSelect() {
    var sel = $("panelPhoto");
    var setting = state.panels[selectedPanel];
    sel.innerHTML = "";
    Object.keys(SAMPLES).forEach(function (key) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = SAMPLE_LABELS[key];
      sel.appendChild(opt);
    });
    Object.keys(uploaded).forEach(function (key) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = "Uploaded " + key.slice(3);
      sel.appendChild(opt);
    });
    sel.value = setting.photo;
  }

  function bindChips(rowId, attr, apply) {
    var row = $(rowId);
    row.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-" + attr + "]");
      if (!btn) return;
      apply(btn.getAttribute("data-" + attr));
      setActive(rowId, attr, btn.getAttribute("data-" + attr));
      scheduleDraw();
    });
  }

  function bind() {
    bindChips("photoRow", "photo", function (key) {
      state.panels[selectedPanel].photo = key;
      refreshPhotoSelect();
    });
    bindChips("layoutRow", "layout", function (key) {
      state.layout = key;
      refreshPanelControls();
    });
    bindChips("gradeRow", "grade", function (key) { state.grade = key; });
    bindChips("titleRow", "tstyle", function (key) { state.titleStyle = key; });

    $("titleInput").addEventListener("input", function (ev) {
      state.title = ev.target.value;
      scheduleDraw();
    });
    $("subtitleInput").addEventListener("input", function (ev) {
      state.subtitle = ev.target.value;
      scheduleDraw();
    });
    $("panelSelect").addEventListener("change", function (ev) {
      selectedPanel = Number(ev.target.value);
      var setting = state.panels[selectedPanel];
      $("panX").value = String(setting.panX);
      $("panY").value = String(setting.panY);
      $("zoom").value = String(Math.round(setting.zoom * 100));
      refreshPhotoSelect();
    });
    $("panelPhoto").addEventListener("change", function (ev) {
      state.panels[selectedPanel].photo = ev.target.value;
      scheduleDraw();
    });
    $("panX").addEventListener("input", function (ev) {
      state.panels[selectedPanel].panX = Number(ev.target.value);
      scheduleDraw();
    });
    $("panY").addEventListener("input", function (ev) {
      state.panels[selectedPanel].panY = Number(ev.target.value);
      scheduleDraw();
    });
    $("zoom").addEventListener("input", function (ev) {
      state.panels[selectedPanel].zoom = Number(ev.target.value) / 100;
      scheduleDraw();
    });
    $("calloutToggle").addEventListener("change", function (ev) {
      state.callouts = ev.target.checked;
      scheduleDraw();
    });
    $("callout1").addEventListener("input", function (ev) {
      state.callout1 = ev.target.value;
      scheduleDraw();
    });
    $("callout2").addEventListener("input", function (ev) {
      state.callout2 = ev.target.value;
      scheduleDraw();
    });
    $("sealToggle").addEventListener("change", function (ev) {
      state.seal = ev.target.checked;
      scheduleDraw();
    });
    $("tagsToggle").addEventListener("change", function (ev) {
      state.tags = ev.target.checked;
      scheduleDraw();
    });
    $("billingToggle").addEventListener("change", function (ev) {
      state.billing = ev.target.checked;
      scheduleDraw();
    });

    $("upload").addEventListener("change", function (ev) {
      var files = Array.prototype.slice.call(ev.target.files || []);
      if (!files.length) return;
      var pending = files.length;
      files.forEach(function (file) {
        var reader = new FileReader();
        reader.onload = function () {
          uploadCount += 1;
          var key = "up" + uploadCount;
          loadImage(reader.result).then(function (img) {
            uploaded[key] = img;
            photos[key] = img;
            state.panels[selectedPanel].photo = key;
            $("photoName").textContent = files.length + " photo(s) loaded: " + file.name;
            refreshPhotoSelect();
            scheduleDraw();
          }).catch(function () { /* ignore a bad file */ });
          pending -= 1;
        };
        reader.readAsDataURL(file);
      });
      ev.target.value = "";
    });

    document.querySelectorAll("[data-export]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-export");
        var canvas = window.ViceCover.renderExport(state, photos, key);
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var size = window.ViceCover.EXPORT_SIZES[key];
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "vice-cover-" + key + "-" + size[0] + "x" + size[1] + ".png";
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            URL.revokeObjectURL(a.href);
            a.remove();
          }, 500);
        }, "image/png");
      });
    });
  }

  /* Screenshot helper: render the current state at an export size and
     return a PNG data URL, so the maker can capture exact exports. */
  function shotPng(sizeKey) {
    var canvas = window.ViceCover.renderExport(state, photos, sizeKey);
    return canvas.toDataURL("image/png");
  }

  function applyShot(preset) {
    if (preset.layout) state.layout = preset.layout;
    if (preset.grade) state.grade = preset.grade;
    if (preset.titleStyle) state.titleStyle = preset.titleStyle;
    if (preset.title) state.title = preset.title;
    if (preset.subtitle) state.subtitle = preset.subtitle;
    if (preset.panels) {
      preset.panels.forEach(function (p, i) {
        if (state.panels[i]) {
          if (p.photo) state.panels[i].photo = p.photo;
          if (typeof p.panX === "number") state.panels[i].panX = p.panX;
          if (typeof p.panY === "number") state.panels[i].panY = p.panY;
          if (typeof p.zoom === "number") state.panels[i].zoom = p.zoom;
          if (p.tag) state.panels[i].tag = p.tag;
        }
      });
    }
    if (typeof preset.callouts === "boolean") state.callouts = preset.callouts;
    if (typeof preset.seal === "boolean") state.seal = preset.seal;
    if (typeof preset.tags === "boolean") state.tags = preset.tags;
    if (typeof preset.billing === "boolean") state.billing = preset.billing;
    setActive("layoutRow", "layout", state.layout);
    setActive("gradeRow", "grade", state.grade);
    setActive("titleRow", "tstyle", state.titleStyle);
    refreshPanelControls();
    draw();
  }

  function ready() {
    var keys = Object.keys(SAMPLES);
    var jobs = keys.map(function (key) {
      return loadImage(SAMPLES[key]).then(function (img) { photos[key] = img; });
    });
    return Promise.all(jobs).then(function () {
      bind();
      refreshPanelControls();
      if (document.fonts && document.fonts.ready) {
        return document.fonts.ready.then(draw);
      }
      draw();
    }).catch(function () {
      bind();
      refreshPanelControls();
      draw();
    });
  }

  window.__coverStudio = {
    state: state,
    photos: photos,
    shotPng: shotPng,
    applyShot: applyShot,
    draw: draw
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
