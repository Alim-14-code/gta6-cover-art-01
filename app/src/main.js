// Vice Cover Studio — UI wiring: controls, photo loading, export, shot modes.
// Runs entirely in the browser; photos are read on the user's machine.
(function () {
  'use strict';

  var SAMPLES = [
    { name: 'Boulevard', src: 'samples/boulevard.jpg' },
    { name: 'Neon', src: 'samples/neon.jpg' },
    { name: 'Pier', src: 'samples/pier.jpg' },
  ];

  var canvas = document.getElementById('cover');
  var params = new URLSearchParams(location.search);
  var shot = params.get('shot') || '';
  var state = null;
  var photosLoaded = 0;
  var activePanel = 0;
  var exportSize = { w: 1080, h: 1080 };

  function $(id) { return document.getElementById(id); }

  function loadPhoto(entry) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        photosLoaded++;
        resolve({ name: entry.name, src: entry.src, img: img });
      };
      img.onerror = function () {
        photosLoaded++;
        resolve({ name: entry.name, src: entry.src, img: null });
      };
      img.src = entry.src;
    });
  }

  function render() {
    if (!state) return;
    var w = canvas.width;
    var h = canvas.height;
    ViceCover.renderCover(canvas, state, w, h);
    $('stage-size').textContent = w + ' × ' + h;
  }

  function syncPanelControls() {
    var t = state.panels[activePanel];
    $('in-zoom').value = t.zoom;
    $('in-panx').value = t.panX;
    $('in-pany').value = t.panY;
    $('in-focus').value = t.focus;
    $('zoom-val').textContent = Number(t.zoom).toFixed(2);
    $('panx-val').textContent = t.panX;
    $('pany-val').textContent = t.panY;
    $('focus-val').textContent = t.focus;
    $('panel-photo').value = String(t.photo);
    $('panel-select').value = String(activePanel);
  }

  function rebuildPanelSelect() {
    var layout = ViceCover.layoutById(state.layout);
    var sel = $('panel-select');
    sel.innerHTML = '';
    layout.panels.forEach(function (_p, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = 'Panel ' + (i + 1) + (i === 0 ? ' (hero)' : '');
      sel.appendChild(o);
    });
    if (activePanel >= layout.panels.length) activePanel = 0;
    var photoSel = $('panel-photo');
    photoSel.innerHTML = '';
    state.photos.forEach(function (p, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = p.name;
      photoSel.appendChild(o);
    });
    syncPanelControls();
  }

  function buildControls() {
    // Photo thumbs.
    var thumbs = $('photo-thumbs');
    thumbs.innerHTML = '';
    state.photos.forEach(function (p, i) {
      var img = document.createElement('img');
      img.src = p.src;
      img.alt = p.name;
      img.title = p.name;
      img.className = i === 0 ? 'active' : '';
      img.addEventListener('click', function () {
        state.panels[activePanel].photo = i;
        thumbs.querySelectorAll('img').forEach(function (t, j) {
          t.classList.toggle('active', j === i);
        });
        syncPanelControls();
        render();
      });
      thumbs.appendChild(img);
    });

    // Layout buttons.
    var lb = $('layout-btns');
    lb.innerHTML = '';
    ViceCover.LAYOUTS.forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = l.name;
      b.className = l.id === state.layout ? 'active' : '';
      b.addEventListener('click', function () {
        state.layout = l.id;
        lb.querySelectorAll('button').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        rebuildPanelSelect();
        render();
      });
      lb.appendChild(b);
    });

    // Grade swatches.
    var gs = $('grade-swatches');
    gs.innerHTML = '';
    ViceCover.GRADES.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (g.id === state.grade ? ' active' : '');
      b.title = g.name;
      b.style.background = 'linear-gradient(135deg,' + g.wash[0] + ',' + g.wash[1] + ',' + g.wash[2] + ')';
      b.addEventListener('click', function () {
        state.grade = g.id;
        gs.querySelectorAll('.swatch').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        render();
      });
      gs.appendChild(b);
    });

    // Title styles.
    var tb = $('title-btns');
    tb.innerHTML = '';
    ViceCover.TITLE_STYLES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.name;
      b.className = t.id === state.titleStyle ? 'active' : '';
      b.addEventListener('click', function () {
        state.titleStyle = t.id;
        tb.querySelectorAll('button').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        render();
      });
      tb.appendChild(b);
    });

    rebuildPanelSelect();
  }

  function bindInputs() {
    $('in-title').addEventListener('input', function (e) { state.title = e.target.value; render(); });
    $('in-subtitle').addEventListener('input', function (e) { state.subtitle = e.target.value; render(); });
    $('in-tagline').addEventListener('input', function (e) { state.tagline = e.target.value; render(); });
    $('in-callout').addEventListener('input', function (e) { state.callout = e.target.value; render(); });
    $('in-role').addEventListener('input', function (e) { state.role = e.target.value; render(); });
    $('tgl-callouts').addEventListener('change', function (e) { state.showCallouts = e.target.checked; render(); });
    $('tgl-seal').addEventListener('change', function (e) { state.showSeal = e.target.checked; render(); });
    $('tgl-roles').addEventListener('change', function (e) { state.showRoles = e.target.checked; render(); });
    $('tgl-billing').addEventListener('change', function (e) { state.showBilling = e.target.checked; render(); });
    $('panel-select').addEventListener('change', function (e) { activePanel = Number(e.target.value); syncPanelControls(); render(); });
    $('panel-photo').addEventListener('change', function (e) {
      state.panels[activePanel].photo = Number(e.target.value);
      render();
    });
    $('in-zoom').addEventListener('input', function (e) {
      state.panels[activePanel].zoom = Number(e.target.value);
      $('zoom-val').textContent = Number(e.target.value).toFixed(2);
      render();
    });
    $('in-panx').addEventListener('input', function (e) {
      state.panels[activePanel].panX = Number(e.target.value);
      $('panx-val').textContent = e.target.value;
      render();
    });
    $('in-pany').addEventListener('input', function (e) {
      state.panels[activePanel].panY = Number(e.target.value);
      $('pany-val').textContent = e.target.value;
      render();
    });
    $('in-focus').addEventListener('input', function (e) {
      state.panels[activePanel].focus = Number(e.target.value);
      $('focus-val').textContent = e.target.value;
      render();
    });

    document.querySelectorAll('.size-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.size-btn').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        var parts = b.dataset.size.split('x');
        exportSize = { w: Number(parts[0]), h: Number(parts[1]) };
        state.size = b.dataset.size;
      });
    });

    $('export-btn').addEventListener('click', function () {
      var off = document.createElement('canvas');
      ViceCover.renderCover(off, state, exportSize.w, exportSize.h);
      off.toBlob(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'vice-cover-' + exportSize.w + 'x' + exportSize.h + '.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      }, 'image/png');
    });

    $('upload').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      files.forEach(function (file) {
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), src: reader.result, img: img });
            buildControls();
            render();
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    });
  }

  function applyShotParams() {
    var photo = params.get('photo');
    var caption = params.get('caption');
    if (caption) {
      state.title = caption;
      $('in-title').value = caption;
    }
    if (photo) {
      var idx = -1;
      state.photos.forEach(function (p, i) {
        if (p.name.toLowerCase() === photo.toLowerCase()) idx = i;
      });
      if (idx >= 0) {
        state.panels.forEach(function (t, i) { t.photo = (idx + i) % state.photos.length; });
        state.panels[0].photo = idx;
      }
    }
    if (shot === 'cover') {
      document.body.classList.add('shot-cover');
      // Vary the look per cover shot so the three covers are distinct.
      if (photo === 'neon') { state.layout = 'triptych'; state.grade = 'neon'; state.titleStyle = 'script'; }
      if (photo === 'pier') { state.layout = 'focal'; state.grade = 'sunset'; state.titleStyle = 'neon'; }
      if (photo === 'boulevard') { state.layout = 'hero-split'; state.grade = 'gold'; state.titleStyle = 'slab'; }
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  function ready() {
    // Signal to screenshot tooling that the first frame is painted.
    window.__shotReady = true;
    document.title = 'Vice Cover Studio — ready';
  }

  Promise.all(SAMPLES.map(loadPhoto)).then(function (photos) {
    state = ViceCover.defaultState(photos);
    buildControls();
    bindInputs();
    applyShotParams();
    // Wait for the bundled fonts so titles render in their real typeface.
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      render();
      setTimeout(ready, 120);
    });
    render();
  });
})();
