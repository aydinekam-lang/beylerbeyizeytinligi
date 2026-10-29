/* Akan altın zeytinyağı — Canvas2D metaball simülasyonu.
   Üstten sarkan damlalar büyür, kopar, iz bırakarak düşer ve altta bir havuzda toplanır.
   Fare / dokunuş damlaları iter, havuzu kendine çeker; tıklayınca yeni damla düşer. */
(function () {
  const hero = document.querySelector('.hero');
  const cv = document.getElementById('yag');
  if (!hero || !cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ESIK = 0.5, KOLON = 16;
  let W, H, C, GW, GH, alan, resim, mobil;
  let kaynaklar = [], akislar = [], damlalar = [], sicrama = [], havuz, havuzH, seviye, tabanSeviye, tavanSeviye;
  let zaman = 0;
  const imlec = { x: -999, y: -999, aktif: false, r: 0, sonHareket: 0, vx: 0 };

  const rnd = (a, b) => a + Math.random() * (b - a);

  function kur() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    mobil = W < 700;
    C = W > 1500 ? 5 : 4;
    GW = Math.ceil(W / C) + 1; GH = Math.ceil(H / C) + 1;
    cv.width = GW; cv.height = GH;
    alan = new Float32Array(GW * GH);
    resim = ctx.createImageData(GW, GH);
    const n = mobil ? 4 : 8;
    kaynaklar = [];
    for (let i = 0; i < n; i++) {
      kaynaklar.push({ x: W * (i + 0.5) / n + rnd(-0.25, 0.25) * W / n, r: rnd(2, 8), hiz: rnd(1.6, 3.4), max: rnd(9, 15), faz: rnd(0, 6) });
    }
    // Sürekli akan ince yağ ipleri
    akislar = [];
    const na = mobil ? 1 : 2;
    for (let i = 0; i < na; i++) {
      akislar.push({ x0: W * (mobil ? 0.82 : (i ? 0.88 : 0.6)), x: 0, acik: i === 0, sure: rnd(2, 5), birikim: 0, faz: rnd(0, 6), parca: [] });
    }
    const k = Math.ceil(W / KOLON) + 2;
    tabanSeviye = H * (mobil ? 0.07 : 0.09);
    tavanSeviye = H * (mobil ? 0.12 : 0.15);
    seviye = tabanSeviye;
    havuz = new Float32Array(k).fill(seviye);
    havuzH = new Float32Array(k);
    damlalar = []; sicrama = [];
  }

  function havuzY(x) {
    const f = x / KOLON, i = Math.max(0, Math.min(havuz.length - 2, f | 0)), t = f - i;
    return H - (havuz[i] * (1 - t) + havuz[i + 1] * t);
  }

  // Sınırlı çekirdek: (1 - d²/R²)^3, R = 2.2r → tek topun eşik yarıçapı ≈ r
  function ekle(x, y, r, w) {
    const R = r * 2.2, R2 = R * R;
    const x0 = Math.max(0, Math.floor((x - R) / C)), x1 = Math.min(GW - 1, Math.ceil((x + R) / C));
    const y0 = Math.max(0, Math.floor((y - R) / C)), y1 = Math.min(GH - 1, Math.ceil((y + R) / C));
    for (let gy = y0; gy <= y1; gy++) {
      const dy = gy * C - y, dy2 = dy * dy;
      if (dy2 >= R2) continue;
      let i = gy * GW + x0;
      for (let gx = x0; gx <= x1; gx++, i++) {
        const dx = gx * C - x, q = (dx * dx + dy2) / R2;
        if (q < 1) { const t = 1 - q; alan[i] += t * t * t * w; }
      }
    }
  }

  function damlaBirak(x, y, r, vy) {
    damlalar.push({ x, y, vx: 0, vy: vy || 20, r, iz: [] });
  }

  function adim(dt) {
    zaman += dt;
    // Kaynaklar: büyür ve kopar
    for (const s of kaynaklar) {
      s.r += s.hiz * dt;
      if (s.r >= s.max) {
        damlaBirak(s.x, s.r * 1.1, s.r * 0.9, 25);
        s.r = rnd(2, 4); s.max = rnd(9, 15); s.hiz = rnd(1.6, 3.4);
      }
    }
    // Akışlar: açılıp kapanan, imleçle sapan ince yağ ipleri
    for (const a of akislar) {
      a.sure -= dt;
      if (a.sure <= 0) { a.acik = !a.acik; a.sure = a.acik ? rnd(4, 8) : rnd(2, 5); }
      a.x = a.x0 + Math.sin(zaman * 0.5 + a.faz) * 30;
      if (a.acik) {
        a.birikim += dt;
        while (a.birikim > 0.022) {
          a.birikim -= 0.022;
          a.parca.push({ x: a.x, y: 6, vx: 0, vy: 90, r: 4.2 + Math.sin(zaman * 9 + a.faz) * 1.3 });
        }
      }
      for (let i = a.parca.length - 1; i >= 0; i--) {
        const q = a.parca[i];
        q.vy += (1100 - 1.6 * q.vy) * dt;
        if (imlec.aktif) {
          const dx = q.x - imlec.x, dy = q.y - imlec.y, d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) q.vx += Math.sign(dx || 1) * (1 - Math.sqrt(d2) / 120) * 1800 * dt;
        }
        q.vx *= Math.pow(0.15, dt);
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.y > havuzY(q.x) + 2) {
          const j = Math.round(q.x / KOLON);
          if (havuzH[j] !== undefined) havuzH[j] -= 6;
          seviye = Math.min(tavanSeviye, seviye + 0.012);
          a.parca.splice(i, 1);
        }
      }
    }
    // Düşen damlalar: viskoz yerçekimi
    for (let i = damlalar.length - 1; i >= 0; i--) {
      const d = damlalar[i];
      d.vy += (1500 - 2.3 * d.vy) * dt;
      if (imlec.aktif) {
        const dx = d.x - imlec.x, dy = d.y - imlec.y, d2 = dx * dx + dy * dy;
        if (d2 < 110 * 110) {
          const k = (1 - Math.sqrt(d2) / 110) * 2200 * dt;
          d.vx += Math.sign(dx || 1) * k + imlec.vx * 0.02;
          d.vy -= k * 0.25;
        }
      }
      d.vx *= Math.pow(0.08, dt);
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < 4) d.x = 4; if (d.x > W - 4) d.x = W - 4;
      d.iz.unshift(d.x, d.y);
      if (d.iz.length > 60) d.iz.length = 60;
      const yuzey = havuzY(d.x);
      if (d.y + d.r * 0.6 > yuzey) {
        const j = Math.round(d.x / KOLON);
        const guc = Math.min(d.vy, 700) * 0.06 * (d.r / 10);
        for (let k = -2; k <= 2; k++) if (havuzH[j + k] !== undefined) havuzH[j + k] -= guc * (1 - Math.abs(k) * 0.35);
        seviye = Math.min(tavanSeviye, seviye + (Math.PI * d.r * d.r) / W * 0.5);
        if (!mobil || Math.random() < 0.5) {
          const n = 2 + (Math.random() * 2 | 0);
          for (let k = 0; k < n; k++) sicrama.push({ x: d.x, y: yuzey - 2, vx: rnd(-130, 130), vy: rnd(-280, -140), r: rnd(1.8, 3.6) });
        }
        damlalar.splice(i, 1);
      }
    }
    // Sıçrayan küçük damlacıklar
    for (let i = sicrama.length - 1; i >= 0; i--) {
      const s = sicrama[i];
      s.vy += 1100 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.vy > 0 && s.y > havuzY(s.x)) sicrama.splice(i, 1);
    }
    // Havuz: yay + yayılma (dalga)
    seviye += (tabanSeviye - seviye) * 0.05 * dt;
    const n = havuz.length;
    for (let j = 0; j < n; j++) {
      const hedef = seviye + Math.sin(zaman * 1.3 + j * 0.35) * 2.2 + Math.sin(zaman * 0.7 - j * 0.12) * 3;
      let a = (hedef - havuz[j]) * 9;
      const l = havuz[j > 0 ? j - 1 : j], r = havuz[j < n - 1 ? j + 1 : j];
      a += (l + r - 2 * havuz[j]) * 70;
      if (imlec.aktif) {
        const dx = j * KOLON - imlec.x, mesafe = (H - havuz[j]) - imlec.y;
        if (Math.abs(dx) < 90 && mesafe < 170 && mesafe > -40) a += (1 - Math.abs(dx) / 90) * (1 - Math.max(0, mesafe) / 170) * 900;
      }
      havuzH[j] = (havuzH[j] + a * dt) * Math.pow(0.18, dt);
    }
    for (let j = 0; j < n; j++) havuz[j] += havuzH[j] * dt;
    // İmleç damlası yumuşak büyür/küçülür
    const hedefR = imlec.aktif && zaman - imlec.sonHareket < 1.2 ? (mobil ? 9 : 12) : 0;
    imlec.r += (hedefR - imlec.r) * Math.min(1, dt * 6);
    imlec.vx *= Math.pow(0.02, dt);
  }

  function ciz() {
    alan.fill(0);
    // Üst film
    const filmAdim = mobil ? 34 : 30;
    for (let x = -10; x < W + 20; x += filmAdim) ekle(x, -6, 11 + Math.sin(zaman * 0.8 + x * 0.05) * 2.5, 1);
    for (const s of kaynaklar) {
      const sall = Math.sin(zaman * 2 + s.faz) * 0.8;
      ekle(s.x, s.r * 0.35, s.r * 0.9 + 3, 1);
      ekle(s.x + sall, s.r * 1.05, s.r, 1);
    }
    for (const d of damlalar) {
      ekle(d.x, d.y, d.r, 1);
      // iz: geçmiş konumlar boyunca eşit aralıklı, incelen toplar
      const iz = d.iz, boy = Math.min(220, 30 + d.vy * 0.25);
      let px = d.x, py = d.y, yol = 0;
      for (let k = 2; k < iz.length && yol < boy; k += 2) {
        const qx = iz[k], qy = iz[k + 1], sx = qx - px, sy = qy - py, l = Math.sqrt(sx * sx + sy * sy);
        for (let u = 3; u <= l && yol + u < boy; u += 3) {
          const t = (yol + u) / boy;
          ekle(px + sx * u / l, py + sy * u / l, d.r * (0.6 - t * 0.48), 0.9);
        }
        yol += l; px = qx; py = qy;
      }
    }
    for (const s of sicrama) ekle(s.x, s.y, s.r, 1);
    for (const a of akislar) {
      if (a.acik) ekle(a.x, 4, 9, 1);
      // ardışık parçaların arası doldurulur → kesintisiz ip
      const ps = a.parca;
      for (let i = 0; i < ps.length; i++) {
        const q = ps[i]; ekle(q.x, q.y, q.r, 1);
        const o = ps[i - 1];
        if (!o) continue;
        const sx = o.x - q.x, sy = o.y - q.y, l = Math.sqrt(sx * sx + sy * sy);
        if (l > 70) continue;
        for (let u = 3; u < l; u += 3) ekle(q.x + sx * u / l, q.y + sy * u / l, q.r * 0.85, 1);
      }
    }
    if (imlec.r > 0.5) ekle(imlec.x, imlec.y, imlec.r, 0.95);
    // Havuz alanı: yüzeyin altı dolu, yüzey çevresinde yumuşak geçiş
    for (let gx = 0; gx < GW; gx++) {
      const s = havuzY(gx * C);
      const bas = Math.max(0, Math.floor((s - 10) / C));
      for (let gy = bas, i = bas * GW + gx; gy < GH; gy++, i += GW) {
        const v = (gy * C - s) / 14 + 0.5;
        if (v > 0) alan[i] += v > 1.6 ? 1.6 : v;
      }
    }
    golgele();
    ctx.putImageData(resim, 0, 0);
  }

  function golgele() {
    const d = resim.data;
    // Işık yönü imleçle hafif kayar
    let lx = -0.45 + (imlec.aktif ? (imlec.x / W - 0.5) * 0.7 : Math.sin(zaman * 0.3) * 0.2);
    let ly = -0.65, lz = 0.62;
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz); lx /= ll; ly /= ll; lz /= ll;
    let hx = lx, hy = ly, hz = lz + 1; const hl = Math.sqrt(hx * hx + hy * hy + hz * hz); hx /= hl; hy /= hl; hz /= hl;
    const NZ = 0.32;
    d.fill(0);
    for (let gy = 1; gy < GH - 1; gy++) {
      let i = gy * GW + 1, p = i * 4;
      for (let gx = 1; gx < GW - 1; gx++, i++, p += 4) {
        const v = alan[i];
        if (v < 0.14) continue;
        if (v < ESIK) { // dış parıltı
          const a = (v - 0.14) / (ESIK - 0.14);
          d[p] = 240; d[p + 1] = 165; d[p + 2] = 40; d[p + 3] = a * a * 70;
          continue;
        }
        const gxv = alan[i + 1] - alan[i - 1], gyv = alan[i + GW] - alan[i - GW];
        const nl = Math.sqrt(gxv * gxv + gyv * gyv + NZ * NZ);
        const nx = -gxv / nl, ny = -gyv / nl, nz = NZ / nl;
        let dif = nx * lx + ny * ly + nz * lz; if (dif < 0) dif = 0;
        let sp = nx * hx + ny * hy + nz * hz; if (sp < 0) sp = 0;
        sp *= sp; sp *= sp; sp *= sp; sp *= sp; sp *= sp; // ^32
        let kal = (v - ESIK) * 0.9; if (kal > 1) kal = 1;
        // kenar: açık altın → iç: koyu kehribar
        const r0 = 250 - kal * 95, g0 = 196 - kal * 110, b0 = 78 - kal * 66;
        const isik = 0.42 + 0.75 * dif;
        let r = r0 * isik + sp * 255, g = g0 * isik + sp * 240, b = b0 * isik + sp * 190;
        // kenarda ince parlak çizgi (Fresnel benzeri)
        const kenar = 1 - nz; r += kenar * 40; g += kenar * 28;
        d[p] = r > 255 ? 255 : r; d[p + 1] = g > 255 ? 255 : g; d[p + 2] = b > 255 ? 255 : b;
        const a = (v - ESIK) / 0.16;
        d[p + 3] = a >= 1 ? 245 : 80 + a * 165;
      }
    }
  }

  // Etkileşim
  function imlecAyarla(cx, cy) {
    const r = hero.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    if (imlec.aktif) imlec.vx = (x - imlec.x) * 30;
    imlec.x = x; imlec.y = y; imlec.aktif = true; imlec.sonHareket = zaman;
  }
  hero.addEventListener('pointermove', e => imlecAyarla(e.clientX, e.clientY), { passive: true });
  hero.addEventListener('pointerleave', () => { imlec.aktif = false; });
  hero.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) imlecAyarla(t.clientX, t.clientY); }, { passive: true });
  hero.addEventListener('touchend', () => { imlec.aktif = false; }, { passive: true });
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    const r = hero.getBoundingClientRect();
    damlaBirak(e.clientX - r.left, e.clientY - r.top, rnd(9, 14), 60);
  });

  // Döngü
  let calisiyor = false, gorunur = true, son = 0, raf = 0;
  function dongu(t) {
    raf = 0;
    if (!calisiyor) return;
    const dt = Math.min(0.033, (t - son) / 1000 || 0.016); son = t;
    adim(dt); ciz();
    raf = requestAnimationFrame(dongu);
  }
  function guncelle() {
    const olmali = gorunur && !document.hidden && !azHareket;
    if (olmali && !calisiyor) { calisiyor = true; son = performance.now(); if (!raf) raf = requestAnimationFrame(dongu); }
    else if (!olmali) calisiyor = false;
  }

  function baslat() {
    kur();
    for (let i = 0; i < (azHareket ? 420 : 200); i++) adim(1 / 60); // sahne dolu başlasın
    ciz();
    guncelle();
  }

  new IntersectionObserver(e => { gorunur = e[0].isIntersecting; guncelle(); }).observe(hero);
  document.addEventListener('visibilitychange', guncelle);
  let sonG = 0, sonY = 0, zm;
  addEventListener('resize', () => {
    clearTimeout(zm);
    zm = setTimeout(() => {
      const r = hero.getBoundingClientRect();
      if (Math.abs(r.width - sonG) > 2 || Math.abs(r.height - sonY) > 140) { sonG = r.width; sonY = r.height; baslat(); }
    }, 200);
  });
  const r0 = hero.getBoundingClientRect(); sonG = r0.width; sonY = r0.height;
  baslat();
})();
