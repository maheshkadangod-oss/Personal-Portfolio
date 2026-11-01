// Neon strands: 30+ glowing lines run top to bottom behind the whole page.
// They sway on their own, wave harder as you scroll, and ripple away from clicks and taps.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'strands';
  canvas.setAttribute('aria-hidden', 'true');
  const main = document.querySelector('main');
  document.body.insertBefore(canvas, main || document.body.firstChild);
  const ctx = canvas.getContext('2d');

  const palette = [[61, 255, 197], [46, 230, 255], [77, 141, 255], [155, 107, 255], [211, 107, 255]];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const colorAt = t => {
    const p = t * (palette.length - 1), i = Math.min(palette.length - 2, Math.floor(p));
    return mix(palette[i], palette[i + 1], p - i);
  };

  let W = 0, H = 0, dpr = 1, lines = [];
  const calmEls = [...document.querySelectorAll(
    '.hero__lede, .hero__contact, .statement__text, .case__info, .about__text, .index__list, .facts,' +
    '.pi-hero__lede, .pi-tier, .pi-step, .pi-why p, .pi-problem .statement__text, .mist__line'
  )];
  const ripples = [];
  let scrollPhase = 0, lastY = window.scrollY, vel = 0, energy = 0;

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const n = W < 700 ? 32 : W < 1100 ? 36 : 42;
    lines = Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const rgb = colorAt(t);
      const near = Math.random();
      return {
        base: (i + 0.5) / n,                 // spread across the width
        rgb,
        width: 1.6 + near * 2.2,             // thick, with some depth variety
        alpha: 0.32 + near * 0.38,
        k1: 0.0026 + Math.random() * 0.0018, // wave lengths
        k2: 0.0011 + Math.random() * 0.0009,
        ph: Math.random() * Math.PI * 2,
        amp: 14 + Math.random() * 18,
        spark: Math.random() < 0.45 ? { y: Math.random() * H, speed: 0.08 + Math.random() * 0.22 } : null
      };
    });
  }

  function xAt(L, y, time) {
    const sway = Math.sin(y * L.k1 + time * 0.00035 + L.ph + scrollPhase) * (L.amp + energy * 70)
               + Math.sin(y * L.k2 - time * 0.00022 + L.ph * 1.7 - scrollPhase * 0.6) * (L.amp * 1.4 + energy * 40);
    let x = L.base * W + sway;
    for (const r of ripples) {
      const age = time - r.t0;
      const dx = x - r.x, dy = y - r.y;
      const d = Math.hypot(dx, dy);
      const front = age * 0.75;
      const ring = Math.exp(-((d - front) ** 2) / (2 * 90 * 90));
      x += Math.sign(dx || 1) * 60 * ring * Math.exp(-age / 1100);
    }
    return x;
  }

  function frame(time) {
    // scroll drives the wave
    const y = window.scrollY;
    const dy = y - lastY; lastY = y;
    vel += (dy - vel) * 0.15;
    energy += (Math.min(1, Math.abs(vel) / 40) - energy) * 0.06;
    scrollPhase += vel * 0.004;
    for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t0 > 3000) ripples.splice(i, 1);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const step = W < 700 ? 30 : 22;

    for (const L of lines) {
      ctx.beginPath();
      let px = xAt(L, -20, time), py = -20;
      ctx.moveTo(px, py);
      for (let yy = -20 + step; yy <= H + 20 + step; yy += step) {
        const nx = xAt(L, yy, time);
        ctx.quadraticCurveTo(px, py, (px + nx) / 2, (py + yy) / 2);
        px = nx; py = yy;
      }
      ctx.lineTo(px, py);
      const [r, g, b] = L.rgb;
      // soft outer glow, then the bright core
      ctx.strokeStyle = `rgba(${r},${g},${b},${(L.alpha * 0.16).toFixed(3)})`;
      ctx.lineWidth = L.width * 5;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${r},${g},${b},${L.alpha.toFixed(3)})`;
      ctx.lineWidth = L.width;
      ctx.stroke();

      if (L.spark) {
        L.spark.y += L.spark.speed * 16 * (1 + energy * 3);
        if (L.spark.y > H + 40) L.spark.y = -40;
        const sx = xAt(L, L.spark.y, time);
        const grd = ctx.createRadialGradient(sx, L.spark.y, 0, sx, L.spark.y, 10);
        grd.addColorStop(0, `rgba(255,255,255,.9)`);
        grd.addColorStop(.3, `rgba(${r},${g},${b},.6)`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(sx - 10, L.spark.y - 10, 20, 20);
      }
    }
    // Fade the strands softly behind blocks of text so copy stays readable
    ctx.globalCompositeOperation = 'destination-out';
    for (const el of calmEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -60 || r.top > H + 60 || r.width === 0) continue;
      for (const [pad, a] of [[56, .22], [30, .3], [10, .4]]) {
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2, 28)
                      : ctx.rect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!reduce && !document.hidden) requestAnimationFrame(frame);
  }

  window.addEventListener('pointerdown', e => {
    ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
    energy = Math.min(1, energy + 0.35);
  }, { passive: true });
  window.addEventListener('resize', () => { setup(); if (reduce) frame(0); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(frame); });

  setup();
  requestAnimationFrame(frame);
})();
