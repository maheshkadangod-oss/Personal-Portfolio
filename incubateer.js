(() => {
  document.getElementById('year').textContent = new Date().getFullYear();

  // Split paragraph into words for the light-up effect
  document.querySelectorAll('[data-words]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    document.documentElement.classList.add('no-motion');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (window.Lenis) {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.4, offset: -40 }); }
    }));
  }

  // Striped headings
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
  document.querySelectorAll('[data-stripes]').forEach((t, k) => {
    const bands = stripify(t);
    const from = { xPercent: i => (i % 2 ? 1 : -1) * (24 + i * 7), opacity: 0 };
    if (k === 0) {
      gsap.fromTo(bands, from, { xPercent: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: .05, delay: .15 });
    } else {
      gsap.fromTo(bands, from, { xPercent: 0, opacity: 1, ease: 'power3.out', stagger: .03,
        scrollTrigger: { trigger: t, start: 'top 95%', end: 'top 50%', scrub: 1 } });
    }
  });

  // Scroll speed pulls the stripes apart
  let shear = 0, lastY = window.scrollY, speed = 0;
  gsap.ticker.add(() => {
    const y = window.scrollY;
    speed += ((y - lastY) - speed) * 0.2; lastY = y;
    shear += (gsap.utils.clamp(-26, 26, speed * 0.6) - shear) * 0.15;
    if (Math.abs(shear) < 0.05) shear = 0;
    document.documentElement.style.setProperty('--shear', shear.toFixed(2) + 'px');
  });

  gsap.from('.pi-hero .pi-rise', { y: 30, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out', delay: .4 });

  // Hero screenshot tilts flat, then the site scrolls inside it
  const shot = document.querySelector('.pi-hero__shot .browser');
  const shotImg = shot.querySelector('img');
  const shotScreen = shot.querySelector('.browser__screen');
  gsap.fromTo(shot, { rotateX: 28, scale: .9 }, { rotateX: 0, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.pi-hero__shot', start: 'top 95%', end: 'top 25%', scrub: 1 } });
  gsap.to(shotImg, { y: () => -Math.max(0, shotImg.offsetHeight - shotScreen.offsetHeight) * 0.6, ease: 'none',
    scrollTrigger: { trigger: '.pi-hero__shot', start: 'top 60%', end: 'bottom top', scrub: 1, invalidateOnRefresh: true } });
  shotImg.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  gsap.to('.pi-problem .w', { opacity: 1, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.pi-problem', start: 'top 70%', end: 'bottom 60%', scrub: true } });

  // Tier cards deal in like a hand of cards
  gsap.from('.pi-tier', { y: 80, rotation: i => (i - 1.5) * 6, opacity: 0, duration: 1, stagger: .1, ease: 'back.out(1.4)',
    scrollTrigger: { trigger: '.pi-score__grid', start: 'top 80%' } });
  gsap.from('.pi-step', { y: 50, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out',
    scrollTrigger: { trigger: '.pi-steps', start: 'top 80%' } });

  // Numbers count up to their floor
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-IN') + '+'; },
      scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  gsap.fromTo('.pi-why__photo', { clipPath: 'inset(100% 0 0 0 round 18px)' }, { clipPath: 'inset(0% 0 0 0 round 18px)', duration: 1.4, ease: 'expo.inOut',
    scrollTrigger: { trigger: '.pi-why', start: 'top 70%' } });
  gsap.utils.toArray('.pi-why .pi-rise').forEach(el => gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));

  // "Find yours." flips up letter by letter
  const title = document.querySelector('.contact__title');
  title.setAttribute('aria-label', title.textContent.trim());
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const f = document.createDocumentFragment();
      [...n.textContent].forEach(c => {
        if (c === ' ') return f.appendChild(document.createTextNode(' '));
        const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; f.appendChild(s);
      });
      n.replaceWith(f);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(title);
  gsap.from('.contact__title .ch', { rotateX: -100, yPercent: 50, opacity: 0, duration: 1, ease: 'back.out(1.6)', stagger: .05,
    scrollTrigger: { trigger: '.pi-cta', start: 'top 65%' } });

  // Desktop cursor
  if (window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.querySelector('.cursor'), label = cursor.querySelector('.cursor__label');
    const cx = gsap.quickTo(cursor, 'x', { duration: .25, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: .25, ease: 'power3' });
    window.addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); });
    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { label.textContent = el.dataset.cursor; cursor.classList.add('is-big'); });
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-big'));
    });
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
