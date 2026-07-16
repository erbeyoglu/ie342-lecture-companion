/* Theme switcher: light | dark | projector.
   Load this in <head> (synchronously) so the data-theme attribute is set
   before first paint. Priority: ?theme= URL param (not persisted, handy for
   bookmarking the projector view) > localStorage > OS preference.
   Dispatches 'themechange' so viz.js can redraw every canvas. */

(() => {
  const KEY = 'ie342-theme';
  const THEMES = ['light', 'dark', 'projector'];
  const LABELS = { light: 'Light', dark: 'Dark', projector: 'Projector' };

  const urlTheme = new URLSearchParams(location.search).get('theme');
  const stored = localStorage.getItem(KEY);
  let theme =
    THEMES.includes(urlTheme) ? urlTheme :
    THEMES.includes(stored) ? stored :
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function apply(t) {
    theme = t;
    document.documentElement.dataset.theme = t;
    window.dispatchEvent(new Event('themechange'));
    render();
  }

  function render() {
    const host = document.getElementById('theme-switch');
    if (!host) return;
    host.innerHTML = '';
    THEMES.forEach(t => {
      const btn = document.createElement('button');
      btn.textContent = LABELS[t];
      btn.classList.toggle('active', t === theme);
      btn.addEventListener('click', () => {
        localStorage.setItem(KEY, t);
        apply(t);
      });
      host.appendChild(btn);
    });
  }

  document.documentElement.dataset.theme = theme; // before first paint
  document.addEventListener('DOMContentLoaded', render);

  // Embed mode: ?embed=<sectionId> strips the page down to a single widget.
  // Used by the (local, unpublished) instructor deck to interleave activities
  // between slides.
  const embedId = new URLSearchParams(location.search).get('embed');
  if (embedId) {
    document.documentElement.classList.add('embed-mode');
    document.addEventListener('DOMContentLoaded', () => {
      const target = document.getElementById(embedId);
      if (target) target.classList.add('embed-target');
    });
  }
})();
