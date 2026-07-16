/* Shared canvas helpers for the interactive lecture widgets.
   Every widget registers a draw() callback; we re-run it on resize and on
   light/dark theme changes so canvas colors always match the CSS tokens. */

window.VIZ = (() => {
  const drawFns = [];

  function cssv(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // canvas text multiplier (the projector theme bumps --viz-font-scale)
  function font(px, bold) {
    const scale = parseFloat(cssv('--viz-font-scale')) || 1;
    return (bold ? '600 ' : '') + Math.round(px * scale) + 'px system-ui, sans-serif';
  }

  // Snapshot of the theme tokens, read at draw time (so dark mode "just works").
  function theme() {
    return {
      ink: cssv('--ink'),
      ink2: cssv('--ink-2'),
      muted: cssv('--muted'),
      grid: cssv('--grid'),
      axis: cssv('--axis'),
      surface: cssv('--surface'),
      s1: cssv('--s1'),
      s2: cssv('--s2'),
      s5: cssv('--s5'),
      good: cssv('--good'),
      bad: cssv('--critical'),
      region: cssv('--region-fill'),
    };
  }

  // Size the backing store for the device pixel ratio; drawing then uses CSS px.
  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // World-coordinate plot area with x/y mapping helpers.
  function plot(canvas, view) {
    const { ctx, w, h } = setup(canvas);
    const padL = view.padL ?? 48;
    const padR = view.padR ?? 18;
    const padT = view.padT ?? 16;
    const padB = view.padB ?? 40;
    const X = x => padL + (x - view.x0) / (view.x1 - view.x0) * (w - padL - padR);
    const Y = y => h - padB - (y - view.y0) / (view.y1 - view.y0) * (h - padT - padB);
    const invX = px => view.x0 + (px - padL) / (w - padL - padR) * (view.x1 - view.x0);
    const invY = py => view.y0 + (h - padB - py) / (h - padT - padB) * (view.y1 - view.y0);
    return { ctx, w, h, X, Y, invX, invY, padL, padR, padT, padB, view };
  }

  // Recessive grid + axis lines + tick labels.
  function axes(p, t, opts = {}) {
    const { ctx, X, Y } = p;
    const xt = opts.xticks || [];
    const yt = opts.yticks || [];
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = t.grid;
    xt.forEach(x => {
      ctx.beginPath();
      ctx.moveTo(X(x), Y(p.view.y0));
      ctx.lineTo(X(x), Y(p.view.y1));
      ctx.stroke();
    });
    yt.forEach(y => {
      ctx.beginPath();
      ctx.moveTo(X(p.view.x0), Y(y));
      ctx.lineTo(X(p.view.x1), Y(y));
      ctx.stroke();
    });
    // baseline axes through the origin of the view box
    ctx.strokeStyle = t.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(p.view.x0), Y(opts.yAxisAt ?? 0));
    ctx.lineTo(X(p.view.x1), Y(opts.yAxisAt ?? 0));
    ctx.moveTo(X(opts.xAxisAt ?? 0), Y(p.view.y0));
    ctx.lineTo(X(opts.xAxisAt ?? 0), Y(p.view.y1));
    ctx.stroke();
    // tick labels
    ctx.fillStyle = t.muted;
    ctx.font = font(13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    xt.forEach(x => ctx.fillText(String(x), X(x), Y(opts.yAxisAt ?? 0) + 6));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yt.forEach(y => ctx.fillText(String(y), X(opts.xAxisAt ?? 0) - 7, Y(y)));
    // axis titles
    ctx.fillStyle = t.ink2;
    ctx.font = font(14, true);
    if (opts.xlabel) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(opts.xlabel, p.w - p.padR - 4, p.h - 6);
    }
    if (opts.ylabel) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.ylabel, 6, 4);
    }
    ctx.restore();
  }

  // Plot a 1-D function as a polyline, skipping points outside the view band.
  function curve(p, f, color, width = 2) {
    const { ctx, X, Y } = p;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    let pen = false;
    const n = 400;
    for (let i = 0; i <= n; i++) {
      const x = p.view.x0 + (p.view.x1 - p.view.x0) * i / n;
      const y = f(x);
      if (y < p.view.y0 - 1 || y > p.view.y1 + 1 || !isFinite(y)) { pen = false; continue; }
      if (pen) ctx.lineTo(X(x), Y(y)); else { ctx.moveTo(X(x), Y(y)); pen = true; }
    }
    ctx.stroke();
    ctx.restore();
  }

  function dot(p, x, y, color, r = 6, ring = false) {
    const { ctx, X, Y } = p;
    ctx.save();
    ctx.beginPath();
    ctx.arc(X(x), Y(y), r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // 2px surface ring so overlapping marks stay separable
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme().surface;
    ctx.stroke();
    if (ring) {
      ctx.beginPath();
      ctx.arc(X(x), Y(y), r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function star(p, x, y, color, r = 10) {
    const { ctx, X, Y } = p;
    const cx = X(x), cy = Y(y);
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const px = cx + rad * Math.cos(a);
      const py = cy + rad * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme().surface;
    ctx.stroke();
    ctx.restore();
  }

  function label(p, text, x, y, color, opts = {}) {
    const { ctx, X, Y } = p;
    ctx.save();
    ctx.font = font(opts.size || 14, opts.bold);
    ctx.fillStyle = color;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'bottom';
    ctx.fillText(text, X(x) + (opts.dx || 0), Y(y) + (opts.dy || 0));
    ctx.restore();
  }

  // Register a widget's draw callback: run now, on resize, and on theme flips.
  function register(canvas, draw) {
    drawFns.push(draw);
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    draw();
  }

  // theme.js dispatches 'themechange' whenever the user switches themes
  window.addEventListener('themechange', () => drawFns.forEach(d => d()));

  // Pointer position in CSS-pixel canvas coordinates.
  function pointer(canvas, ev) {
    const rect = canvas.getBoundingClientRect();
    return { px: ev.clientX - rect.left, py: ev.clientY - rect.top };
  }

  // Small "what can I do here" badge overlaid on an interactive canvas.
  function hint(canvas, text) {
    const wrap = document.createElement('div');
    wrap.className = 'viz-hint';
    wrap.innerHTML = '<span>' + text + '</span>';
    canvas.parentNode.insertBefore(wrap, canvas);
  }

  return { cssv, theme, setup, plot, axes, curve, dot, star, label, register, pointer, hint };
})();
