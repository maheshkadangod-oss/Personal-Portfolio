// Thin gradient lines that wave from the top of the page to the bottom and draw as you scroll.
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'waves');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="wave-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000">
        <stop offset="0" stop-color="#a3d9c5"/><stop offset=".25" stop-color="#9cc3e6"/>
        <stop offset=".5" stop-color="#bfb2e6"/><stop offset=".75" stop-color="#9cc3e6"/>
        <stop offset="1" stop-color="#a3d9c5"/>
      </linearGradient>
      <filter id="wave-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>`;
  main.appendChild(svg);
  const grad = svg.querySelector('#wave-grad');

  const lines = [
    { amp: .36, phase: 0.0, freq: 1.05, width: 1.4, op: .75 },
    { amp: .28, phase: 2.1, freq: 1.25, width: 1, op: .45 },
    { amp: .42, phase: 4.0, freq: .9, width: .8, op: .3 }
  ];
  const paths = lines.map(l => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'url(#wave-grad)');
    p.setAttribute('stroke-width', l.width);
    p.setAttribute('stroke-linecap', 'round');
    p.style.opacity = l.op;
    svg.appendChild(p);
    return p;
  });
  const glow = document.createElementNS(NS, 'circle');
  glow.setAttribute('r', 9); glow.setAttribute('fill', '#a3d9c5'); glow.setAttribute('filter', 'url(#wave-glow)');
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', 3.2); dot.setAttribute('fill', '#e8f3ee');
  svg.appendChild(glow); svg.appendChild(dot);

  let lens = [], H = 0;

  function build() {
    const W = document.documentElement.clientWidth;
    H = Math.max(main.scrollHeight, document.documentElement.scrollHeight);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    grad.setAttribute('y2', Math.max(2000, window.innerHeight * 4));
    grad.setAttribute('spreadMethod', 'reflect');
    const step = Math.max(420, window.innerHeight * 0.75);
    const mobile = W < 700;
    paths.forEach((p, k) => {
      const L = lines[k];
      const amp = mobile ? L.amp * 0.9 : L.amp;
      const pts = [];
      for (let y = -40, i = 0; y <= H + step; y += step, i++) {
        pts.push([W * (0.5 + amp * Math.sin(i * L.freq + L.phase)), y]);
      }
      let d = `M${pts[0][0].toFixed(1)},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], c = (y1 - y0) * 0.55;
        d += ` C${x0.toFixed(1)},${(y0 + c).toFixed(1)} ${x1.toFixed(1)},${(y1 - c).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
      }
      p.setAttribute('d', d);
      lens[k] = p.getTotalLength();
      p.style.strokeDasharray = lens[k];
    });
    draw();
  }

  // Find how far along a path we are when it reaches a given height
  function lengthAtY(p, len, y) {
    let lo = 0, hi = len;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      if (p.getPointAtLength(mid).y < y) lo = mid; else hi = mid;
    }
    return lo;
  }

  function draw() {
    if (!H) return;
    const target = reduce ? H : window.scrollY + window.innerHeight * 0.72;
    paths.forEach((p, k) => {
      const l = lengthAtY(p, lens[k], target);
      p.style.strokeDashoffset = Math.max(0, lens[k] - l);
      if (k === 0) {
        const pt = p.getPointAtLength(l);
        dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
        glow.setAttribute('cx', pt.x); glow.setAttribute('cy', pt.y);
      }
    });
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; draw(); });
  }, { passive: true });
  window.addEventListener('resize', () => setTimeout(build, 250));
  if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', build);
  window.addEventListener('load', () => setTimeout(build, 300));
  build();
})();
