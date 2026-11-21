// Vice Cover Studio v2 — screenshot scene driver.
// ?shot=cover draws one exported cover full-frame (the app's own drawing,
// at the size the gate allows) so a screenshot of it IS the exported cover.
// ?size=portrait|square|landscape picks the post size. Without ?shot the
// normal editor loads.
import { defaultState, drawCover, SIZES } from "./cover.js";

const params = new URLSearchParams(location.search);
if (params.get("shot") === "cover") {
  const size = SIZES.find((s) => s.id === params.get("size")) || SIZES[0];
  const state = defaultState();
  const canvas = document.createElement("canvas");
  canvas.id = "shotCanvas";
  document.body.innerHTML = "";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#160a24";
  canvas.style.display = "block";
  document.body.appendChild(canvas);
  const fit = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const ctx = canvas.getContext("2d");
    const scale = Math.max(innerWidth / size.w, innerHeight / size.h);
    const dw = size.w * scale, dh = size.h * scale;
    const off = document.createElement("canvas");
    off.width = size.w; off.height = size.h;
    drawCover(off.getContext("2d"), size.w, size.h, state);
    ctx.drawImage(off, (innerWidth - dw) / 2, (innerHeight - dh) / 2, dw, dh);
  };
  const loadOne = (src) => new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
  Promise.all([
    document.fonts.load("40px Anton"),
    document.fonts.load("40px Pacifico"),
    document.fonts.ready,
  ]).then(async () => {
    for (const panel of state.panels) panel.img = await loadOne(panel.src);
    fit();
    document.title = "Vice Cover Studio v2 — exported cover";
  });
}
