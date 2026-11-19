// Fixed scenes for screenshots. `?shot=cover` shows the cover alone, `?shot=editor`
// the full editor; the query picks the photos, the words, the layout, the grade
// and the export size. window.__shotReady is set once the scene is painted.
import { SIZES } from './cover.js';

export async function runShot(shot, query, api) {
  const photos = (query.get('photos') || 'pier').split(',').filter(Boolean);
  const sizeName = query.get('size') || '1920x1080';
  const [w, h] = SIZES[sizeName] || SIZES['1920x1080'];
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.canvas.width = w;
  api.canvas.height = h;
  const imgs = await api.loadSamples(photos);
  const panels = imgs.map((img, i) => ({
    sample: photos[i],
    img,
    zoom: 1,
    ox: 0,
    oy: 0,
  }));
  api.apply({
    layout: query.get('layout') || 'trio',
    grade: query.get('grade') || 'sunset',
    panels,
    caption: {
      text: query.get('caption') || 'VICE NIGHTS',
      tagline: query.get('tagline') || 'OCEAN DRIVE • 2026',
    },
  });
  try { await document.fonts.ready; } catch (_) { /* system fonts fall back */ }
  api.apply({});
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
