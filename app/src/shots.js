// Vice Cover Studio — reproducible screenshot scenes (shots.js).
// ?shot= picks a fixed scene so every screenshot is a real render of the app
// with the same state: layout, grade, lettering and extras. Cover scenes hide
// the editor chrome (body.shot-cover); the editor scene keeps it visible.

export const SHOTS = {
  // 16:9 cover, Vice Trio + Vice Sunset, chrome title.
  cover: {
    layout: 'trio', grade: 'sunset', title: 'VICE NIGHTS', tagline: 'Ocean Drive · 2026',
    titleStyle: 'chrome', extras: { chips: true, seal: true, roles: true, billing: true },
    coverOnly: true,
  },
  // The full editor: Hero + Strip layout, Neon Night grade, outline title.
  editor: {
    layout: 'hero-strip', grade: 'neon', title: 'NEON HEAT', tagline: 'Vice City · After Dark',
    titleStyle: 'outline', extras: { chips: true, seal: true, roles: true, billing: false },
    coverOnly: false,
  },
  // Square cover, Full Bleed + Golden Hour, solid title.
  'cover-square': {
    layout: 'fullbleed', grade: 'golden', title: 'GOLDEN VICE', tagline: 'Pier Sunset · 2026',
    titleStyle: 'solid', extras: { chips: true, seal: true, roles: false, billing: true },
    coverOnly: true,
  },
  // Portrait cover, Duo + Midnight Drive, chrome title.
  'cover-portrait': {
    layout: 'duo', grade: 'midnight', title: 'MIDNIGHT RUN', tagline: 'Leonida · 2026',
    titleStyle: 'chrome', extras: { chips: true, seal: false, roles: true, billing: true },
    coverOnly: true,
  },
};

export async function applyShotScene(name, state, ui) {
  const scene = SHOTS[name];
  if (!scene) return;
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.title = scene.title;
  state.tagline = scene.tagline;
  state.titleStyle = scene.titleStyle;
  state.extras = { ...scene.extras };
  // Keep the layout's panel count in sync and give each panel a photo.
  const picks = ['boulevard', 'neon', 'pier', 'boulevard'];
  const { LAYOUTS } = await import('./cover.js');
  const count = LAYOUTS[scene.layout].panels.length;
  state.panels = Array.from({ length: count }, (_, i) => ({
    photoId: picks[i % picks.length],
    zoom: 1, panX: 0, panY: 0, focusX: 0.5, focusY: 0.42,
  }));
  state.selected = name === 'editor' ? 1 : -1;
  // Sync the visible inputs with the scene.
  const title = document.getElementById('titleInput');
  const tagline = document.getElementById('taglineInput');
  if (title) title.value = scene.title;
  if (tagline) tagline.value = scene.tagline;
  document.getElementById('exChips').checked = scene.extras.chips;
  document.getElementById('exSeal').checked = scene.extras.seal;
  document.getElementById('exRoles').checked = scene.extras.roles;
  document.getElementById('exBilling').checked = scene.extras.billing;
  if (scene.coverOnly) document.body.classList.add('shot-cover');
  ui.buildPickers();
  ui.buildPanelCards();
  ui.render();
}
