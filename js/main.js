/* JUGGS — interactions
   GSAP 3.15 (ScrollTrigger, SplitText) + Lenis. Everything degrades if a lib fails to load. */
(function () {
  'use strict';

  const CA = '0x8D58B75afee1D6159250289195302d72dcc4c71D';
  const PAIR = '0xe6e3cb83850dc54452ebb4183c6a5280773fa49a96adf477e39825202fef1056';
  const API = 'https://api.dexscreener.com/latest/dex/pairs/arc/' + PAIR;

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGSAP = typeof gsap !== 'undefined';
  const hasST = hasGSAP && typeof ScrollTrigger !== 'undefined';
  const hasSplit = hasGSAP && typeof SplitText !== 'undefined';

  if (reduced) document.documentElement.classList.add('reduced');
  if (hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    else { const el = typeof target === 'string' ? $(target) : target; el && el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      e.preventDefault();
      document.body.classList.remove('menu-open');
      scrollTo(id);
    });
  });

  /* ---------------- Loader ---------------- */
  const loader = $('#loader');
  const countEl = $('#loaderCount');
  const barEl = $('#loaderBar');
  document.body.classList.add('is-loading');
  if (lenis) lenis.stop();

  function runIntro() {
    const heroTitle = $('.hero__title');
    let chars = null;
    if (hasSplit) {
      try { chars = SplitText.create('.hero__word', { type: 'chars', mask: 'chars' }).chars; } catch (e) { chars = null; }
    }
    if (!hasGSAP || reduced) {
      loader.style.display = 'none';
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();
      window.SILK && window.SILK.reveal(10);
      return;
    }
    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete() {
        loader.style.display = 'none';
        document.body.classList.remove('is-loading');
        if (lenis) lenis.start();
        if (hasST) ScrollTrigger.refresh();
      }
    });
    tl.call(() => window.SILK && window.SILK.reveal(950), null, 0.1)
      .to(loader, { yPercent: -100, duration: 0.95, ease: 'expo.inOut' }, 0)
      .from('.hero__top .eyebrow', { y: 16, opacity: 0, duration: 0.9, stagger: 0.07 }, 0.5);
    if (chars) tl.from(chars, { yPercent: 110, duration: 1.25, stagger: 0.045, ease: 'expo.out' }, 0.45);
    else tl.from(heroTitle, { y: 60, opacity: 0, duration: 1.1 }, 0.45);
    tl.from('.hero__dollar', { opacity: 0, y: 20, duration: 0.9 }, 0.82)
      .from('.hero__tag', { y: 30, opacity: 0, duration: 1 }, 0.82)
      .from('.hero__copy > *', { y: 24, opacity: 0, duration: 0.95, stagger: 0.09 }, 0.9)
      .from('.ca', { y: 16, opacity: 0, duration: 0.85 }, 1.05)
      .from('.nav', { y: -20, opacity: 0, duration: 0.85 }, 0.8)
      .from('.hero__scroll', { opacity: 0, duration: 0.9 }, 1.25);
  }

  function preload() {
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const minTime = new Promise((r) => setTimeout(r, reduced ? 0 : 800));
    const counter = { v: 0 };
    if (hasGSAP && !reduced) {
      gsap.to('.loader__word span', { y: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out', delay: 0.1 });
      gsap.to(counter, {
        v: 100, duration: 0.9, ease: 'power2.inOut', delay: 0.1,
        onUpdate() {
          countEl.textContent = String(Math.round(counter.v)).padStart(2, '0');
          barEl.style.width = counter.v + '%';
        }
      });
    }
    Promise.all([fontsReady, minTime]).then(() => {
      countEl.textContent = '100'; barEl.style.width = '100%';
      setTimeout(runIntro, 120);
    });
  }
  if (document.readyState === 'complete') preload();
  else window.addEventListener('load', preload);

  /* ---------------- Cursor ---------------- */
  if (finePointer && !reduced && hasGSAP) {
    document.body.classList.add('has-cursor');
    const cursor = $('#cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { x: pos.x, y: pos.y };
    window.addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%,-50%)`;
    });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-hover], a, button');
      if (!t) return;
      cursor.classList.add('is-hover');
      const txt = t.getAttribute('data-hover');
      if (txt) { label.textContent = txt; cursor.classList.add('has-label'); }
    });
    document.addEventListener('pointerout', (e) => {
      const t = e.target.closest('[data-hover], a, button');
      if (!t) return;
      cursor.classList.remove('is-hover', 'has-label');
    });
    document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (finePointer && !reduced && hasGSAP) {
    $$('.magnetic').forEach((el) => {
      const strength = 0.22;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: x * strength, y: y * strength, duration: 0.6, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'power4.out' }));
    });
  }

  /* ---------------- Nav ---------------- */
  const nav = $('#nav');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 300 && !document.body.classList.contains('menu-open'));
    lastY = y;
  }
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  $('#burger').addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    $('#menu').setAttribute('aria-hidden', String(!open));
    $('#burger').setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });

  /* ---------------- Contract copy ---------------- */
  const caBtn = $('#caBtn');
  const caCopied = $('#caCopied');
  caBtn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(CA); ok = true; }
    catch (e) {
      try {
        const ta = document.createElement('textarea'); ta.value = CA; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy'); ta.remove();
      } catch (e2) { ok = false; }
    }
    caCopied.textContent = ok ? 'Copied' : 'Copy failed';
    caCopied.classList.add('is-on');
    setTimeout(() => caCopied.classList.remove('is-on'), 1800);
  });

  /* ---------------- Live data ---------------- */
  function fmtUsd(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(0);
  }
  function fmtPrice(p) {
    const n = Number(p);
    if (!n) return '—';
    if (n >= 1) return '$' + n.toFixed(2);
    const s = n.toFixed(12);
    const m = s.match(/^0\.(0*)(\d+)/);
    if (!m) return '$' + n;
    const zeros = m[1].length;
    const sig = m[2].slice(0, 4);
    if (zeros >= 3) return `$0.0<sub>${zeros}</sub>${sig}`;
    return '$' + n.toPrecision(4);
  }
  async function fetchStats() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      const data = await res.json();
      const p = data.pair || (data.pairs && data.pairs[0]);
      if (!p) return;
      $('#sPrice').innerHTML = fmtPrice(p.priceUsd);
      $('#navPriceValue').innerHTML = fmtPrice(p.priceUsd);
      const ch = p.priceChange && p.priceChange.h24;
      const chEl = $('#sChange');
      if (ch != null) {
        chEl.textContent = (ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch).toFixed(2) + '% · 24h';
        chEl.className = 'stat__sub ' + (ch >= 0 ? 'up' : 'down');
      }
      $('#sMcap').textContent = fmtUsd(p.fdv || p.marketCap);
      $('#sLiq').textContent = fmtUsd(p.liquidity && p.liquidity.usd);
      $('#sVol').textContent = fmtUsd(p.volume && p.volume.h24);
      const tx = p.txns && p.txns.h24;
      if (tx) $('#sTx').textContent = `${tx.buys} buys · ${tx.sells} sells`;
    } catch (e) { /* keep placeholders */ }
  }
  fetchStats();
  setInterval(fetchStats, 30000);

  /* ---------------- Counters: static value first ---------------- */
  $$('[data-count]').forEach((el) => { el.textContent = Number(el.getAttribute('data-count')).toLocaleString('en-US'); });

  /* ---------------- Scroll animations ---------------- */
  if (!hasGSAP || reduced) return;

  // Marquee (ticker-driven, direction reacts to scroll velocity)
  (function marquee() {
    const track = $('#marquee');
    if (!track) return;
    track.innerHTML += track.innerHTML;
    let half = track.scrollWidth / 2;
    window.addEventListener('resize', () => { half = track.scrollWidth / 2; }, { passive: true });
    let x = 0, speed = 0.6, vel = 0;
    if (lenis) lenis.on('scroll', (e) => { vel = e.velocity; });
    gsap.ticker.add(() => {
      const boost = Math.min(Math.abs(vel) * 0.04, 3);
      x -= speed + boost;
      if (x <= -half) x += half;
      track.style.transform = `translate3d(${x}px,0,0)`;
      vel *= 0.9;
    });
  })();

  if (!hasST) return;

  // Hero parallax + fade on scroll
  gsap.to('.hero__title', {
    yPercent: 25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero__bottom, .ca, .hero__top', {
    opacity: 0, y: -40, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: '30% top', end: '80% top', scrub: true }
  });

  // Generic reveals
  $$('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  // Split headings (lines masked)
  if (hasSplit) {
    $$('[data-split], [data-split-lines]').forEach((el) => {
      let split;
      try { split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' }); } catch (e) { return; }
      gsap.from(split.lines, {
        yPercent: 110, duration: 1.4, stagger: 0.09, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
  } else {
    $$('[data-split], [data-split-lines]').forEach((el) => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
  }

  // Masked image reveal + inner parallax
  $$('[data-reveal-mask] .frame__art').forEach((el) => {
    gsap.to(el, {
      clipPath: 'inset(0 0 0% 0)', duration: 1.15, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
  $$('.frame--tall .art').forEach((el) => {
    gsap.fromTo(el, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: el.closest('.frame'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // Counters
  $$('[data-count]').forEach((el) => {
    const target = Number(el.getAttribute('data-count'));
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter() {
        gsap.fromTo(obj, { v: 0 }, { v: target, duration: 2.2, ease: 'expo.out', onUpdate() { el.textContent = Math.round(obj.v).toLocaleString('en-US'); } });
      }
    });
  });

  // Stacking cards (desktop)
  ScrollTrigger.matchMedia({
    '(min-width: 721px)': function () {
      const cards = $$('.buy__cards .card');
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        gsap.to(card, {
          scale: 1 - (cards.length - 1 - i) * 0.03, '--dim': 0.55, ease: 'none',
          scrollTrigger: { trigger: cards[i + 1], start: 'top 80%', end: 'top 20%', scrub: true }
        });
      });

      // Horizontal lookbook
      const track = $('#lookTrack');
      const pin = $('.lookbook__pin');
      if (track && pin) {
        const dist = () => track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: pin, start: 'top top', end: () => '+=' + dist(),
            pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
          }
        });
        $$('.frame--look .art').forEach((art) => {
          gsap.fromTo(art, { xPercent: -4 }, {
            xPercent: 4, ease: 'none',
            scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: true }
          });
        });
      }
    }
  });

  // Roadmap line
  gsap.to('#phaseLine', {
    width: '100%', ease: 'none',
    scrollTrigger: { trigger: '.phases', start: 'top 75%', end: 'bottom 60%', scrub: true }
  });

  // CTA gradient breathe
  gsap.fromTo('.cta__title', { yPercent: 12 }, {
    yPercent: -6, ease: 'none',
    scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.fromTo('.footer__mark', { yPercent: 30 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
