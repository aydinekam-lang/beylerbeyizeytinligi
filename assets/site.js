/* Beylerbeyi Zeytinliği — sayfa etkileşimleri */
(function () {
  const $ = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));
  const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kok = document.documentElement;

  /* Menü */
  const menu = $('#menu'), burger = $('.burger', menu);
  const menuDolu = () => menu.classList.toggle('dolu', scrollY > 40);
  addEventListener('scroll', menuDolu, { passive: true }); menuDolu();
  burger.addEventListener('click', () => {
    const acik = menu.classList.toggle('acik');
    burger.setAttribute('aria-expanded', acik);
    burger.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
  });
  $$('#menu-liste a').forEach(a => a.addEventListener('click', () => { menu.classList.remove('acik'); burger.setAttribute('aria-expanded', false); }));
  $('#yil').textContent = new Date().getFullYear();

  /* Hero harfleri */
  $$('[data-harf]').forEach((el, satir) => {
    if (el.classList.contains('altin-yazi')) { // altın degrade tek parça kalsın
      el.classList.add('harf'); el.style.animationDelay = (0.35 + satir * 0.25) + 's'; return;
    }
    const metin = el.textContent; el.textContent = '';
    [...metin].forEach((h, i) => {
      const s = document.createElement('span'); s.className = 'harf'; s.textContent = h;
      s.style.animationDelay = (0.15 + i * 0.045) + 's'; el.appendChild(s);
    });
  });

  /* Başlıkları kelimelere böl */
  $$('[data-bol]').forEach(h => {
    let n = 0;
    (function bol(dugum) {
      [...dugum.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const parca = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(k => {
            if (!k) return;
            if (/^\s+$/.test(k)) { parca.appendChild(document.createTextNode(' ')); return; }
            const d = document.createElement('span'); d.className = 'kelime';
            const i = document.createElement('span'); i.textContent = k; i.style.setProperty('--i', n++);
            d.appendChild(i); parca.appendChild(d);
          });
          c.replaceWith(parca);
        } else if (c.nodeType === 1) bol(c);
      });
    })(h);
  });

  /* Görününce: maske, belir, başlık */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('gorundu'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('.maske,.belir,[data-bol]').forEach(el => io.observe(el));

  /* Sayaçlar */
  const sayIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; sayIO.unobserve(e.target);
    const el = e.target, sure = azHareket ? 1 : 1800, bas = performance.now();
    const iki = n => String(n).padStart(2, '0');
    (function kare(t) {
      const p = Math.min(1, (t - bas) / sure), k = 1 - Math.pow(1 - p, 3);
      if (el.hasAttribute('data-saat')) el.textContent = iki(Math.round(9 * k)) + '–' + iki(Math.round(17 * k));
      else if (el.dataset.ondalik) el.textContent = (+el.dataset.say * k).toFixed(1).replace('.', ',');
      else el.textContent = Math.round(+el.dataset.say * k);
      if (p < 1) requestAnimationFrame(kare);
    })(bas);
  }), { threshold: 0.5 });
  $$('[data-say],[data-saat]').forEach(el => sayIO.observe(el));

  /* Videolar: görününce oynat */
  const vIO = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { v.preload = 'auto'; if (!azHareket) v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: 0.3 });
  $$('video').forEach(v => { if (azHareket) v.controls = true; vIO.observe(v); });

  /* Kart ışıltısı */
  $$('.kart').forEach(k => k.addEventListener('pointermove', e => {
    const r = k.getBoundingClientRect();
    k.style.setProperty('--mx', (e.clientX - r.left) + 'px'); k.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  /* Işık kutusu */
  const kutu = $('#kutu'), kImg = $('img', kutu), sayac = $('.sayac', kutu);
  const resimler = $$('img[data-buyuk]');
  let sira = 0, sonOdak = null;
  function goster(i) {
    sira = (i + resimler.length) % resimler.length;
    const r = resimler[sira];
    kImg.src = r.dataset.buyuk; kImg.alt = r.alt;
    sayac.textContent = (sira + 1) + ' / ' + resimler.length;
  }
  function ac(i) { sonOdak = document.activeElement; goster(i); kutu.classList.add('acik'); $('.kapat', kutu).focus(); }
  function kapat() { kutu.classList.remove('acik'); if (sonOdak) sonOdak.focus(); }
  resimler.forEach((r, i) => {
    const hedef = r.closest('figure,.m') || r;
    hedef.style.cursor = 'zoom-in';
    hedef.tabIndex = 0; hedef.setAttribute('role', 'button'); hedef.setAttribute('aria-label', r.alt + ' — büyüt');
    hedef.addEventListener('click', () => ac(i));
    hedef.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ac(i); } });
  });
  $('.kapat', kutu).onclick = kapat;
  $('.onceki', kutu).onclick = e => { e.stopPropagation(); goster(sira - 1); };
  $('.sonraki', kutu).onclick = e => { e.stopPropagation(); goster(sira + 1); };
  kutu.addEventListener('click', e => { if (e.target === kutu) kapat(); });
  addEventListener('keydown', e => {
    if (!kutu.classList.contains('acik')) return;
    if (e.key === 'Escape') kapat();
    if (e.key === 'ArrowLeft') goster(sira - 1);
    if (e.key === 'ArrowRight') goster(sira + 1);
  });
  let dokunX = null;
  kutu.addEventListener('touchstart', e => { dokunX = e.touches[0].clientX; }, { passive: true });
  kutu.addEventListener('touchend', e => {
    if (dokunX === null) return;
    const fark = e.changedTouches[0].clientX - dokunX; dokunX = null;
    if (Math.abs(fark) > 50) goster(sira + (fark < 0 ? 1 : -1));
  });

  if (azHareket) { kok.classList.add('gsapyok'); return; }

  /* Sayfadan akan yağ çizgisi + yüzen yapraklar */
  const belge = $('#belge'), hero = $('.hero');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'yag-yol'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<defs><linearGradient id="yagGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d27a"/><stop offset=".5" stop-color="#e6ad35"/><stop offset="1" stop-color="#b9781a"/></linearGradient>' +
    '<radialGradient id="damlaGrad" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#f6d27a"/><stop offset="1" stop-color="#b9781a"/></radialGradient></defs>' +
    '<path/><circle r="7"/>';
  belge.appendChild(svg);
  const yol = svg.querySelector('path'), damla = svg.querySelector('circle');
  let yolUz = 0, ornek = [];
  function yolKur() {
    const g = belge.clientWidth, y = belge.scrollHeight, bas = hero.offsetHeight - 10, mob = g < 700;
    svg.setAttribute('width', g); svg.setAttribute('height', y); svg.setAttribute('viewBox', `0 0 ${g} ${y}`);
    svg.style.height = y + 'px';
    const x0 = mob ? g - 9 : g - Math.max(28, (g - 1240) / 2 * 0.5 + 18), genlik = mob ? 3 : 14;
    let d = `M${x0} ${bas}`, yy = bas, i = 0;
    while (yy < y - 60) {
      const adim = 380, ny = Math.min(y - 60, yy + adim), s = i % 2 ? 1 : -1;
      d += ` C${x0 + s * genlik} ${yy + adim * 0.35} ${x0 - s * genlik} ${yy + adim * 0.65} ${x0} ${ny}`;
      yy = ny; i++;
    }
    yol.setAttribute('d', d); yol.setAttribute('stroke-width', mob ? 2 : 3);
    damla.setAttribute('r', mob ? 5 : 7);
    yolUz = yol.getTotalLength();
    yol.style.strokeDasharray = yolUz; yol.style.strokeDashoffset = yolUz;
    ornek = [];
    for (let k = 0; k <= 300; k++) { const l = yolUz * k / 300; ornek.push([l, yol.getPointAtLength(l).y]); }
  }
  function yolGuncelle() {
    if (!ornek.length) return;
    const hedefY = scrollY + innerHeight * 0.62;
    let lo = 0, hi = ornek.length - 1;
    if (hedefY <= ornek[0][1]) { damla.style.opacity = 0; yol.style.strokeDashoffset = yolUz; return; }
    while (lo < hi) { const m = (lo + hi) >> 1; if (ornek[m][1] < hedefY) lo = m + 1; else hi = m; }
    const l = ornek[lo][0];
    yol.style.strokeDashoffset = yolUz - l;
    const p = yol.getPointAtLength(l);
    damla.setAttribute('cx', p.x); damla.setAttribute('cy', p.y + 4); damla.style.opacity = 1;
  }

  const yapraklar = $$('.yapraklar svg').map((el, i) => ({
    el, hiz: 0.25 + i * 0.12, faz: i * 1.7, don: (i % 2 ? -1 : 1) * (0.08 + i * 0.03), bas: parseFloat(el.style.top) / 100
  }));
  let saat = 0, oncekiY = scrollY, hizY = 0;
  function dongu(t) {
    saat = t / 1000;
    const sy = scrollY, vh = innerHeight;
    hizY += ((sy - oncekiY) - hizY) * 0.1; oncekiY = sy;
    for (const y of yapraklar) {
      const aralik = vh + 240;
      let py = (y.bas * vh - sy * y.hiz) % aralik; if (py < -120) py += aralik;
      const px = Math.sin(sy * 0.0025 + y.faz + saat * 0.4) * 50;
      const r = sy * y.don + Math.sin(saat * 0.8 + y.faz) * 12 + hizY * 0.8;
      y.el.style.transform = `translate3d(${px}px,${py - y.bas * vh}px,0) rotate(${r}deg)`;
    }
    yolGuncelle();
    requestAnimationFrame(dongu);
  }

  /* GSAP: yatay galeri, perde, paralaks */
  function gsapKur() {
    if (!window.gsap || !window.ScrollTrigger) { kok.classList.add('gsapyok'); return; }
    gsap.registerPlugin(ScrollTrigger);

    const iz = $('.yatay-iz'), bar = $('.yatay-ilerleme i');
    const mesafe = () => Math.max(0, iz.scrollWidth - innerWidth);
    const yatayTw = gsap.to(iz, {
      x: () => -mesafe(), ease: 'none',
      scrollTrigger: {
        trigger: '.yatay', pin: true, start: 'top top', end: () => '+=' + mesafe(), scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: s => { bar.style.transform = `scaleX(${s.progress})`; }
      }
    });
    $$('.kare img').forEach(img => {
      gsap.fromTo(img, { xPercent: -7 }, {
        xPercent: 7, ease: 'none',
        scrollTrigger: { trigger: img.closest('.kare'), containerAnimation: yatayTw, start: 'left right', end: 'right left', scrub: true }
      });
    });
    $$('.kare').forEach((k, i) => {
      gsap.from(k, {
        rotate: i % 2 ? 4 : -4, scale: 0.88, opacity: 0.3, ease: 'power2.out',
        scrollTrigger: { trigger: k, containerAnimation: yatayTw, start: 'left 100%', end: 'left 60%', scrub: true }
      });
    });

    const perde = $('.perde');
    gsap.timeline({ scrollTrigger: { trigger: perde, pin: true, start: 'top top', end: '+=110%', scrub: 0.8 } })
      .fromTo('.perde .resim', { '--c': '9%', '--s': 1.35 }, { '--c': '75%', '--s': 1, ease: 'power2.inOut' }, 0)
      .fromTo('.perde h2', { scale: 0.7, opacity: 0.4 }, { scale: 1, opacity: 1, ease: 'power2.out' }, 0);

    $$('[data-hiz]').forEach(el => {
      gsap.to(el, { yPercent: +el.dataset.hiz, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    gsap.matchMedia().add('(min-width: 701px)', () => {
      const s = $$('.duvar .sutun');
      const st = { trigger: '.duvar', start: 'top bottom', end: 'bottom top', scrub: true };
      gsap.fromTo(s[0], { yPercent: 4 }, { yPercent: -4, ease: 'none', scrollTrigger: st });
      gsap.fromTo(s[1], { yPercent: -3 }, { yPercent: 3, ease: 'none', scrollTrigger: st });
      gsap.fromTo(s[2], { yPercent: 9 }, { yPercent: -7, ease: 'none', scrollTrigger: st });
    });

    gsap.to('.hero-ic', { y: () => innerHeight * 0.25, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-foto', { scale: 1.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Bantlar kaydırma hızıyla eğilsin
    const bantlar = $$('.bant .akis');
    ScrollTrigger.create({
      onUpdate: s => { const v = gsap.utils.clamp(-12, 12, s.getVelocity() / 300); gsap.to(bantlar, { skewX: -v, duration: 0.4, overwrite: true }); }
    });

    ScrollTrigger.addEventListener('refresh', yolKur);
    ScrollTrigger.refresh();
  }

  function hazir() {
    gsapKur();
    yolKur();
    requestAnimationFrame(dongu);
    let z; addEventListener('resize', () => { clearTimeout(z); z = setTimeout(yolKur, 250); });
    addEventListener('load', () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); else yolKur(); });
  }
  hazir();
})();
