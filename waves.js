// Silk waterfall: fine threads run top to bottom behind the whole page.
// Light streaks and droplets pour down them. Scrolling speeds the flow, clicks and taps send a ripple.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'strands';
  canvas.setAttribute('aria-hidden', 'true');
  const main = document.querySelector('main');
  document.body.insertBefore(canvas, main || document.body.firstChild);
  const ctx = canvas.getContext('2d');

  // muted mint, sage, soft sky and bone, taken from the site palette
  const palette = [[163, 217, 197], [186, 214, 200], [156, 195, 230], [214, 226, 222], [236, 230, 218]];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const colorAt = t => {
    const p = t * (palette.length - 1), i = Math.min(palette.length - 2, Math.floor(p));
    return mix(palette[i], palette[i + 1], p - i);
  };
  const rand = (a, b) => a + Math.random() * (b - a);

  let W = 0, H = 0, dpr = 1, lines = [];
  const ripples = [];
  const calmEls = [...document.querySelectorAll(
    '.hero__lede, .hero__contact, .statement__text, .case__info, .about__text, .index__list, .facts,' +
    '.pi-hero__lede, .pi-tier, .pi-step, .pi-why p, .pi-problem .statement__text, .mist__line'
  )];
  let scrollPhase = 0, lastY = window.scrollY, vel = 0, energy = 0, lastT = 0;

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const n = W < 700 ? 40 : W < 1100 ? 52 : 64;
    lines = Array.from({ length: n }, (_, i) => {
      const near = Math.random();
      const dash = [rand(40, 170), rand(70, 260), rand(10, 50), rand(40, 140)];
      return {
        base: (i + 0.5 + rand(-0.3, 0.3)) / n,
        rgb: colorAt(Math.random()),
        width: 0.6 + near * 1.0,
        alpha: 0.16 + near * 0.34,
        k1: rand(0.0016, 0.003), k2: rand(0.0007, 0.0013),
        ph: rand(0, Math.PI * 2),
        amp: rand(4, 11),
        dash, dashLen: dash.reduce((a, b) => a + b, 0),
        off: rand(0, 600),
        flow: 0.12 + near * 0.26,            // px per ms, nearer threads fall faster
        drops: Math.random() < 0.3 ? [{ y: rand(-H, H), speed: rand(0.35, 0.7) }] : []
      };
    });
  }

  function xAt(L, y, time) {
    const sway = Math.sin(y * L.k1 + time * 0.0005 + L.ph + scrollPhase) * (L.amp + energy * 34)
               + Math.sin(y * L.k2 - time * 0.0003 + L.ph * 1.7) * (L.amp * 0.8 + energy * 18);
    let x = L.base * W + sway;
    for (const r of ripples) {
      const age = time - r.t0;
      const dx = x - r.x, d = Math.hypot(dx, y - r.y);
      const ring = Math.exp(-((d - age * 0.75) ** 2) / (2 * 90 * 90));
      x += Math.sign(dx || 1) * 60 * ring * Math.exp(-age / 1100);
    }
    return x;
  }

  function strandPath(L, time, step) {
    ctx.beginPath();
    let px = xAt(L, -30, time), py = -30;
    ctx.moveTo(px, py);
    for (let yy = -30 + step; yy <= H + 30 + step; yy += step) {
      const nx = xAt(L, yy, time);
      ctx.quadraticCurveTo(px, py, (px + nx) / 2, (py + yy) / 2);
      px = nx; py = yy;
    }
    ctx.lineTo(px, py);
  }

  function frame(time) {
    const dt = Math.min(50, lastT ? time - lastT : 16);
    lastT = time;
    const y = window.scrollY;
    const dy = y - lastY; lastY = y;
    vel += (dy - vel) * 0.15;
    energy += (Math.min(1, Math.abs(vel) / 40) - energy) * 0.06;
    scrollPhase += vel * 0.002;
    for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t0 > 3000) ripples.splice(i, 1);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const step = W < 700 ? 34 : 26;
    const rush = 1 + energy * 3.5;

    for (const L of lines) {
      const [r, g, b] = L.rgb;
      L.off -= L.flow * dt * rush;
      if (L.off < -L.dashLen * 50) L.off += L.dashLen * 50;
      strandPath(L, time, step);

      // dim base strand
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(${r},${g},${b},${(L.alpha * 0.35).toFixed(3)})`;
      ctx.lineWidth = L.width * 0.8;
      ctx.stroke();

      // falling streaks: glow then core
      ctx.setLineDash(L.dash);
      ctx.lineDashOffset = L.off;
      ctx.strokeStyle = `rgba(${r},${g},${b},${(L.alpha * 0.1).toFixed(3)})`;
      ctx.lineWidth = L.width * 3.2;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${r},${g},${b},${L.alpha.toFixed(3)})`;
      ctx.lineWidth = L.width;
      ctx.stroke();

      // droplets
      for (const d of L.drops) {
        d.y += d.speed * dt * rush;
        if (d.y > H + 40) d.y = rand(-260, -40);
        const sx = xAt(L, d.y, time);
        const grd = ctx.createRadialGradient(sx, d.y, 0, sx, d.y, 5);
        grd.addColorStop(0, 'rgba(245,245,240,.7)');
        grd.addColorStop(.4, `rgba(${r},${g},${b},.35)`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(sx - 5, d.y - 5, 10, 10);
      }
    }
    ctx.setLineDash([]);

    // mist where the water lands
    const mist = ctx.createLinearGradient(0, H - 160, 0, H);
    mist.addColorStop(0, 'rgba(163,217,197,0)');
    mist.addColorStop(1, `rgba(186,214,220,${(0.04 + energy * 0.05).toFixed(3)})`);
    ctx.fillStyle = mist;
    ctx.fillRect(0, H - 160, W, 160);

    // fade the strands softly behind blocks of text so copy stays readable
    ctx.globalCompositeOperation = 'destination-out';
    for (const el of calmEls) {
      const rc = el.getBoundingClientRect();
      if (rc.bottom < -60 || rc.top > H + 60 || rc.width === 0) continue;
      for (const [pad, a] of [[56, .22], [30, .3], [10, .4]]) {
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(rc.left - pad, rc.top - pad, rc.width + pad * 2, rc.height + pad * 2, 28)
                      : ctx.rect(rc.left - pad, rc.top - pad, rc.width + pad * 2, rc.height + pad * 2);
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
  window.addEventListener('resize', () => { setup(); if (reduce) frame(performance.now()); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) { lastT = 0; requestAnimationFrame(frame); } });

  setup();
  requestAnimationFrame(frame);
})();
