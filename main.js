(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- Kerala clock ----------
  const clock = document.getElementById('clock');
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    }).format(new Date());
  };
  tick(); setInterval(tick, 30000);

  // ---------- Split statement into words ----------
  document.querySelectorAll('[data-words]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
  });

  // ---------- Marquee: duplicate content so it loops ----------
  document.querySelectorAll('.marquee__track').forEach(t => { t.innerHTML += t.innerHTML; });

  if (!hasGsap || reduce) {
    document.documentElement.classList.add('no-motion');
    document.getElementById('loader').remove();
    document.body.classList.remove('is-loading');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ---------- Letter helpers ----------
  // Slice a heading into horizontal stripes that can move on their own.
  function stripify(el, n = 6) {
    const html = el.innerHTML;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    let bands = '';
    for (let i = 0; i < n; i++) {
      const top = Math.max(0, (i / n) * 100 - 0.4).toFixed(2);
      const bottom = Math.max(0, 100 - ((i + 1) / n) * 100 - 0.4).toFixed(2);
      const dir = (i % 2 ? 1 : -1) * (0.6 + i * 0.12);
      bands += `<span class="stripes__band" aria-hidden="true" style="--dir:${dir.toFixed(2)};clip-path:inset(${top}% 0 ${bottom}% 0)">${html}</span>`;
    }
    el.innerHTML = `<span class="stripes__base">${html}</span>${bands}`;
    return el.querySelectorAll('.stripes__band');
  }
  // Split text into single letters, keeping inner tags like <em>.
  function splitChars(el) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach(c => {
            if (c === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
    return el.querySelectorAll('.ch');
  }
  ScrollTrigger.config({ ignoreMobileResize: true });
  document.body.classList.add('is-loading');

  // ---------- Smooth scroll (wheel only; touch stays native) ----------
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: 'smooth' });
    });
  });

  // ---------- Hero: blended portrait, giant name ----------
  const heroPhoto = document.querySelector('.hero__photo');
  const heroImg = heroPhoto.querySelector('img');
  const nameBands = stripify(document.querySelector('.hero__name'), 7);
  const isPortrait = () => window.innerWidth / window.innerHeight < 1;

  // ---------- Loader ----------
  const num = document.getElementById('loader-num');
  const bar = document.getElementById('loader-bar');
  let started = false;
  const shown = { v: 0 };
  gsap.to(shown, {
    v: 90, duration: 1.2, ease: 'power2.out',
    onUpdate: () => { num.textContent = Math.round(shown.v); bar.style.width = shown.v + '%'; }
  });
  const ready = heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();
  Promise.all([ready, new Promise(r => setTimeout(r, 1200))]).then(start);
  setTimeout(start, 6000);

  function start() {
    if (started) return;
    started = true;
    gsap.to(shown, { v: 100, duration: .3, onUpdate: () => { num.textContent = Math.round(shown.v); bar.style.width = shown.v + '%'; } });
    const tl = gsap.timeline({
      onComplete: () => {
        document.getElementById('loader').remove();
        document.body.classList.remove('is-loading');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    });
    tl.to('#loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut', delay: .35 })
      .fromTo(heroPhoto, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.6, ease: 'expo.inOut' }, '-=.7')
      .from(heroImg, { scale: 1.25, duration: 2, ease: 'expo.out' }, '<')
      .fromTo(nameBands, { xPercent: i => (i % 2 ? 1 : -1) * (30 + i * 8), opacity: 0 },
        { xPercent: 0, opacity: 1, duration: 1.4, stagger: .05, ease: 'expo.out' }, '-=1.4')
      .from('.hero__kicker, .hero__all, .hero__lede, .hero__contact, .hero__scroll',
        { y: 20, opacity: 0, duration: .8, stagger: .06, ease: 'power3.out' }, '-=1');
  }

  // Scroll: the portrait drifts across, the name splits into stripes, then the flip line lands
  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero', start: 'top top', end: () => '+=' + window.innerHeight * 1.7,
      pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true
    }
  });
  heroTl
    .to({}, { duration: 1 }, 0)
    .to(heroPhoto, {
      x: () => isPortrait() ? 0 : -window.innerWidth * 0.4,
      y: () => isPortrait() ? -window.innerHeight * 0.12 : 0,
      scale: () => isPortrait() ? .82 : .8, rotation: -3, ease: 'power2.inOut', duration: .7
    }, 0)
    .to(nameBands, { xPercent: i => (i % 2 ? 1 : -1) * (16 + i * 8), opacity: .0, ease: 'power1.in', duration: .45 }, 0)
    .to('.hero__kicker, .hero__all, .hero__lede, .hero__contact, .hero__scroll', { opacity: 0, y: -40, ease: 'none', duration: .25 }, 0)
    .fromTo('.hero__end', { opacity: 0, rotateX: 180, transformPerspective: 900 },
      { opacity: 1, rotateX: 0, ease: 'power2.inOut', duration: .3 }, .5)
    .to(heroPhoto, { opacity: .35, duration: .2 }, .8);

  // Desktop: the portrait and name drift with the mouse
  if (finePointer) {
    const ix = gsap.quickTo(heroImg, 'x', { duration: 1.2, ease: 'power3' });
    const iy = gsap.quickTo(heroImg, 'y', { duration: 1.2, ease: 'power3' });
    const nx = gsap.quickTo('.hero__name', 'x', { duration: 1.4, ease: 'power3' });
    window.addEventListener('mousemove', e => {
      const dx = e.clientX / window.innerWidth - .5, dy = e.clientY / window.innerHeight - .5;
      ix(dx * -28); iy(dy * -18); nx(dx * 22);
    });
  }

  // ---------- Ribbon: screenshots weave through the headline ----------
  const rcards = [...document.querySelectorAll('.rcard')];
  const rib = { t: 0, drift: 0, active: false };
  // Film runs left to right in a zig-zag through the clear band between the two lines of text
  const tri = v => (2 / Math.PI) * Math.asin(Math.sin(v));
  function renderRibbon() {
    const W = window.innerWidth, H = window.innerHeight, n = rcards.length;
    const cardW = rcards[0].offsetWidth || 200, cardH = cardW * 0.625;
    const spacing = cardW * 1.12;
    const total = Math.max(spacing * n, W + spacing * 2);
    const offset = rib.t * total * 0.9 + rib.drift;
    const amp = Math.max(0, Math.min(H * 0.09, (H * 0.36 - cardH) / 2, 80));
    const freq = Math.PI / (spacing * 2.2);
    rcards.forEach((c, i) => {
      const x = ((((i * spacing - offset) % total) + total) % total) - total / 2;
      const y = tri(x * freq) * amp;
      const slope = (tri((x + 1) * freq) - tri((x - 1) * freq)) / 2 * amp;
      const rot = Math.atan(slope) * 57.3;
      const u = x / (W * 0.5);
      const fade = gsap.utils.clamp(0, 1, 1.7 - Math.abs(u) * 0.8);
      c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg)`;
      c.style.opacity = fade.toFixed(3);
    });
  }
  ScrollTrigger.create({
    trigger: '.ribbon', start: 'top bottom', end: 'bottom top',
    onToggle: self => { rib.active = self.isActive; }
  });
  gsap.ticker.add((_, dt) => {
    if (!rib.active) return;
    rib.drift += dt * 0.035;
    renderRibbon();
  });
  gsap.timeline({
    scrollTrigger: { trigger: '.ribbon', start: 'top top', end: () => '+=' + window.innerHeight * 1.2, pin: true, scrub: 1,
      onUpdate: self => { rib.t = self.progress; } }
  })
    .fromTo('.ribbon__line:not(.ribbon__line--2)', { xPercent: -6 }, { xPercent: 2, ease: 'none', duration: 1 }, 0)
    .fromTo('.ribbon__line--2', { xPercent: 6 }, { xPercent: -2, ease: 'none', duration: 1 }, 0);
  renderRibbon();

  // ---------- Statement: words light up ----------
  gsap.to('.statement__text .w', {
    opacity: 1, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top 70%', end: 'bottom 60%', scrub: true }
  });

  // ---------- Marquee with scroll velocity bounce ----------
  const rows = [...document.querySelectorAll('.marquee__row')].map(row => ({
    el: row.querySelector('.marquee__track'), dir: +row.dataset.dir, x: 0
  }));
  let velocity = 0, skew = 0, dirSign = 1, stripeX = 0;
  const marqueeEl = document.querySelector('.marquee');
  ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onUpdate: self => { velocity = self.getVelocity(); if (velocity) dirSign = velocity < 0 ? -1 : 1; }
  });
  gsap.ticker.add((_, dt) => {
    velocity *= 0.92;
    skew += (gsap.utils.clamp(-10, 10, velocity / -250) - skew) * 0.12;
    const boost = 1 + Math.min(8, Math.abs(velocity) / 300);
    rows.forEach(r => {
      const half = r.el.scrollWidth / 2;
      if (!half) return;
      r.x += r.dir * 0.06 * dt * boost * dirSign;
      if (r.x <= -half) r.x += half;
      if (r.x > 0) r.x -= half;
      r.el.style.transform = `translate3d(${r.x}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    });
    stripeX += 0.03 * dt * boost;
    marqueeEl.style.setProperty('--stripe-x', (stripeX % 200).toFixed(1) + 'px');
  });

  // ---------- Featured cases: spin in, scroll the site, tilt away ----------
  gsap.utils.toArray('[data-case]').forEach((el, i) => {
    const browser = el.querySelector('.browser');
    const screen = el.querySelector('.browser__screen');
    const img = screen.querySelector('img');
    const info = el.querySelectorAll('.case__info > :not(.case__title)');
    const side = i % 2 ? 1 : -1;
    img.loading = 'eager';
    img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

    gsap.fromTo(browser,
      { rotateX: 32, rotateY: 16 * side, rotateZ: -3 * side, scale: .78, yPercent: 18 },
      { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: 1 } });

    gsap.from(info, {
      y: 40, opacity: 0, stagger: .06, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 55%' }
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el, start: 'top top', end: () => '+=' + window.innerHeight * 1.6,
        pin: true, scrub: 1, invalidateOnRefresh: true
      }
    });
    tl.to(img, { y: () => -Math.max(0, img.offsetHeight - screen.offsetHeight), ease: 'none', duration: .85 })
      .to(browser, { rotateX: -10, rotateY: -8 * side, scale: .92, opacity: .5, ease: 'power1.in', duration: .15 });
  });

  // ---------- Spin ring ----------
  const ring = document.querySelector('.ring');
  const panels = [...ring.querySelectorAll('.panel')];
  const N = panels.length, step = 360 / N;
  const spin = { a: 0, r: 0 };

  function renderRing() {
    ring.style.transform = `translateZ(${-spin.r}px) rotateY(${spin.a}deg)`;
    panels.forEach((p, i) => {
      const ang = (((i * step + spin.a) % 360) + 540) % 360 - 180; // -180..180, 0 = front
      const k = Math.cos((ang * Math.PI) / 180);
      p.style.opacity = (0.25 + 0.75 * Math.max(0, k)).toFixed(3);
    });
  }
  function layoutRing() {
    const w = ring.offsetWidth;
    spin.r = Math.round(w / 2 / Math.tan(Math.PI / N) + w * 0.08);
    panels.forEach((p, i) => { p.style.transform = `rotateY(${i * step}deg) translateZ(${spin.r}px)`; });
    document.querySelector('.spin__stage').style.perspective = Math.round(spin.r * 2.6) + 'px';
    renderRing();
  }
  layoutRing();
  window.addEventListener('resize', layoutRing);

  gsap.timeline({
    scrollTrigger: {
      trigger: '#spin', start: 'top top', end: () => '+=' + window.innerHeight * 3,
      pin: true, scrub: 1
    }
  })
    .fromTo('.ring-wrap', { scale: .6, rotateX: 18 }, { scale: 1, rotateX: 6, ease: 'power2.out', duration: .2 }, 0)
    .to(spin, { a: -360 + step, ease: 'none', duration: 1, onUpdate: renderRing }, 0);


  // ---------- Scatter to grid ----------
  const acards = gsap.utils.toArray('.acard');
  const seeds = acards.map((_, i) => {
    const r = k => { const v = Math.sin((i + 1) * 9301 + k * 49297) * 233280; return v - Math.floor(v); };
    return { x: r(1) - .5, y: r(2) - .5, rot: r(3) - .5, rx: r(4) - .5, ry: r(5) - .5, s: r(6) };
  });
  gsap.timeline({
    scrollTrigger: { trigger: '.assemble', start: 'center center', end: () => '+=' + window.innerHeight * 1.1,
      pin: true, scrub: 1, invalidateOnRefresh: true }
  }).fromTo(acards, {
    x: i => seeds[i].x * window.innerWidth * 0.9,
    y: i => seeds[i].y * window.innerHeight * 0.9,
    rotation: i => seeds[i].rot * 60,
    rotateX: i => seeds[i].rx * 80,
    rotateY: i => seeds[i].ry * 100,
    scale: i => 0.45 + seeds[i].s * 0.35,
    opacity: .35
  }, { x: 0, y: 0, rotation: 0, rotateX: 0, rotateY: 0, scale: 1, opacity: 1, ease: 'power3.inOut', stagger: .06, duration: 1 });

  // ---------- Mist: the dark page dissolves into paper ----------
  const mist = document.querySelector('.mist');
  const puffSpots = [[.1,.95],[.35,1.05],[.62,.98],[.9,1.02],[.2,.7],[.78,.72],[.5,.85],[.05,.45],[.95,.4],[.5,.5]];
  const puffs = puffSpots.map(([px, py]) => {
    const d = document.createElement('div');
    d.className = 'mist__puff';
    d.style.width = d.style.height = '70vmax';
    d.style.left = `calc(${px * 100}% - 35vmax)`;
    d.style.top = `calc(${py * 100}% - 35vmax)`;
    mist.insertBefore(d, mist.firstChild);
    return d;
  });
  gsap.timeline({
    scrollTrigger: { trigger: mist, start: 'top top', end: () => '+=' + window.innerHeight * 1.3, pin: true, scrub: 1 }
  })
    .fromTo(puffs, { scale: .05, yPercent: 30, opacity: 0 },
      { scale: 2.6, yPercent: -10, opacity: 1, ease: 'power2.out', stagger: .05, duration: .7 }, 0)
    .to(mist, { backgroundColor: '#ece6da', ease: 'none', duration: .2 }, .6)
    .fromTo('.mist__line', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power2.out', duration: .25 }, .55)
    .to({}, { duration: .15 });

  // ---------- Incubateer block ----------
  gsap.from('.inc__card', {
    y: 80, scale: .94, opacity: 0, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.inc', start: 'top 80%' }
  });
  gsap.from('.inc__chip', {
    y: 24, opacity: 0, stagger: .12, duration: .8, ease: 'back.out(1.8)',
    scrollTrigger: { trigger: '.inc__chips', start: 'top 85%' }
  });

  // ---------- About: the portrait rises and drifts as you scroll ----------
  gsap.fromTo('.about__photo', { yPercent: 35, xPercent: -10, rotation: 4, scale: .85, opacity: 0 }, {
    yPercent: 0, xPercent: 0, rotation: 0, scale: 1, opacity: 1, ease: 'power2.out',
    scrollTrigger: { trigger: '.about', start: 'top 85%', end: 'center 60%', scrub: 1 }
  });
  gsap.to('.about__photo img', {
    yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.about', start: 'center center', end: 'bottom top', scrub: true }
  });

  // ---------- Nav switches colour over the teal block ----------
  ScrollTrigger.create({
    trigger: '.contact', start: 'top 40px', end: 'bottom top',
    toggleClass: { targets: '.nav', className: 'on-accent' }
  });

  // ---------- Contact rises up ----------
  gsap.from('.contact', {
    borderRadius: '80px 80px 0 0', y: 60, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 40%', scrub: true }
  });

  // ---------- Section titles (created after all pins so positions are right) ----------
  gsap.utils.toArray('.section-title, .spin__title, .about__title, .case__title').forEach(t => {
    const bands = stripify(t);
    gsap.fromTo(bands,
      { xPercent: i => (i % 2 ? 1 : -1) * (24 + i * 7), opacity: 0 },
      { xPercent: 0, opacity: 1, ease: 'power3.out', stagger: .03,
        scrollTrigger: { trigger: t, start: 'top 95%', end: 'top 50%', scrub: 1 } });
  });

  // "Let's talk." flips up letter by letter
  const chars = splitChars(document.querySelector('.contact__title'));
  gsap.from(chars, {
    rotateX: -100, yPercent: 50, opacity: 0, duration: 1, ease: 'back.out(1.6)', stagger: .045,
    scrollTrigger: { trigger: '.contact', start: 'top 65%' }
  });

  // Fast scrolling pulls the stripes apart; they settle when you stop
  let shear = 0, lastY = window.scrollY, speed = 0;
  const root = document.documentElement;
  gsap.ticker.add(() => {
    const y = window.scrollY;
    speed += ((y - lastY) - speed) * 0.2;
    lastY = y;
    const target = gsap.utils.clamp(-26, 26, speed * 0.6);
    shear += (target - shear) * 0.15;
    if (Math.abs(shear) < 0.05) shear = 0;
    root.style.setProperty('--shear', shear.toFixed(2) + 'px');
  });
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // ---------- Desktop cursor, magnetic links, index preview ----------
  if (finePointer) {
    const cursor = document.querySelector('.cursor');
    const label = cursor.querySelector('.cursor__label');
    const cx = gsap.quickTo(cursor, 'x', { duration: .25, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: .25, ease: 'power3' });
    const preview = document.querySelector('.index__preview');
    const px = gsap.quickTo(preview, 'x', { duration: .5, ease: 'power3' });
    const py = gsap.quickTo(preview, 'y', { duration: .5, ease: 'power3' });

    window.addEventListener('mousemove', e => {
      cx(e.clientX); cy(e.clientY);
      px(e.clientX + 24); py(e.clientY - 100);
    });
    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { label.textContent = el.dataset.cursor; cursor.classList.add('is-big'); });
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-big'));
    });
    document.querySelectorAll('[data-preview]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        preview.src = el.dataset.preview;
        gsap.to(preview, { opacity: 1, scale: 1, rotate: gsap.utils.random(-4, 4), duration: .4, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(preview, { opacity: 0, scale: .8, duration: .3 }));
    });
    // Scrolling with a still mouse never fires mouseleave, so hide hover states on scroll
    const hideHover = () => {
      gsap.to(preview, { opacity: 0, scale: .8, duration: .2, overwrite: true });
      cursor.classList.remove('is-big');
    };
    window.addEventListener('wheel', hideHover, { passive: true });
    window.addEventListener('scroll', () => { if (+gsap.getProperty(preview, 'opacity') > 0) hideHover(); }, { passive: true });
    document.querySelectorAll('.nav__cta, .link-arrow').forEach(el => {
      const mx = gsap.quickTo(el, 'x', { duration: .4, ease: 'power3' });
      const my = gsap.quickTo(el, 'y', { duration: .4, ease: 'power3' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .25);
        my((e.clientY - r.top - r.height / 2) * .35);
      });
      el.addEventListener('mouseleave', () => { mx(0); my(0); });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
