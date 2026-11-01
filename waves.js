// Aura waterfall: a soft band of light shaped like a stretched S hangs behind the page.
// Light keeps flowing down through it, and scrolling snakes the S left and right.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'aura-fall';
  canvas.setAttribute('aria-hidden', 'true');
  const main = document.querySelector('main');
  document.body.insertBefore(canvas, main || document.body.firstChild);
  const ctx = canvas.getContext('2d');

  // Drawn small and stretched up with a blur: soft like light, and cheap to animate
  const SCALE = 0.25;
  const colors = [[110, 215, 185], [120, 185, 240], [165, 150, 235], [150, 225, 205], [125, 165, 235]];
  const rand = (a, b) => a + Math.random() * (b - a);

  let W = 0, H = 0, strands = [];
  let target = window.scrollY, smooth = window.scrollY, lastT = 0;

  function setup() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * SCALE));
    canvas.height = Math.max(1, Math.round(H * SCALE));
    const mobile = W < 700;
    const count = mobile ? 10 : 14;
    strands = Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      return {
        lane: t - 0.5,                          // position across the band
        rgb: colors[i % colors.length],
        width: rand(mobile ? 14 : 20, mobile ? 30 : 46),
        alpha: rand(0.1, 0.2),
        dash: [rand(90, 200), rand(120, 260)],
        off: rand(0, 400),
        flow: rand(0.12, 0.26),
        wob: rand(0, Math.PI * 2)
      };
    });
  }

  // The stretched S: one full sideways swing from top to bottom of the screen
  function sx(y, time, s) {
    const mobile = W < 700;
    const amp = W * (mobile ? 0.26 : 0.22);
    const centre = W * (0.5 + (mobile ? 0.12 : 0.2) * Math.sin(s * 0.0011));
    const phase = s * 0.0024 + time * 0.00015;
    return centre + amp * Math.sin((y / H) * Math.PI * 1.5 + phase);
  }

  function frame(time) {
    const dt = Math.min(50, lastT ? time - lastT : 16);
    lastT = time;
    target = window.scrollY;
    const prev = smooth;
    smooth += (target - smooth) * 0.08;               // eased so the S glides, not jerks
    const speed = Math.min(1, Math.abs(smooth - prev) / 18);

    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const band = Math.min(W * (W < 700 ? 0.5 : 0.3), 440);
    const step = 40;

    for (const S of strands) {
      ctx.beginPath();
      for (let y = -80; y <= H + 80; y += step) {
        const breathe = 1 + 0.25 * Math.sin(y * 0.004 + time * 0.0006 + S.wob);
        const x = sx(y, time, smooth) + S.lane * band * breathe;
        y === -80 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const [r, g, b] = S.rgb;

      // the steady glow of the band
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(${r},${g},${b},${(S.alpha * 0.55).toFixed(3)})`;
      ctx.lineWidth = S.width * 1.6;
      ctx.stroke();

      // brighter light pouring down through it
      S.off -= S.flow * dt * (1 + speed * 4);
      ctx.setLineDash(S.dash);
      ctx.lineDashOffset = S.off;
      ctx.strokeStyle = `rgba(${r},${g},${b},${S.alpha.toFixed(3)})`;
      ctx.lineWidth = S.width;
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-over';

    if (!reduce && !document.hidden) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => { setup(); if (reduce) frame(performance.now()); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !reduce) { lastT = 0; requestAnimationFrame(frame); }
  });

  setup();
  requestAnimationFrame(frame);
})();
