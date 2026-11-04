/* Akan altın zeytinyağı — Canvas2D metaball simülasyonu (v2, 04.11.2026).
   Gerçek yağ gibi: ağır ve yavaş. Üstte damla büyür, ince bir ip halinde uzayıp sarkar,
   kopunca ip yukarı geri toplanır. Sürekli akan ipler düştükçe incelir, havuzda tümsek yapar.
   Renk yarı saydam altın-yeşil, kalın yerde koyu kehribar; parlak ışık yansıması.
   Fare / dokunuş akışı iter, havuzu çeker; tıklayınca damla düşer. */
(function () {
  const hero = document.querySelector('.hero');
  const cv = document.getElementById('yag');
  if (!hero || !cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ESIK = 0.5, KOLON = 12;
  const G = 520;            // yerçekimi (px/s²) — yağ ağır ve yavaş
  let W, H, C, GW, GH, alan, resim, mobil;
  let kaynaklar = [], akislar = [], damlalar = [], geriIpler = [], havuz, havuzH, seviye, tabanSeviye, tavanSeviye;
  let zaman = 0;
  const imlec = { x: -999, y: -999, aktif: false, r: 0, sonHareket: 0, vx: 0 };

  const rnd = (a, b) => a + Math.random() * (b - a);

  function yeniKaynak(s) {
    s.faz = 'buyu'; s.r = rnd(3, 5); s.max = rnd(10, 15); s.hiz = rnd(2.2, 4);
    s.dy = 0; s.vy = 0; s.kop = rnd(70, 170); s.bekle = rnd(0, 1.5);
  }

  function kur() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    mobil = W < 700;
    C = W > 1600 ? 4 : 3;
    GW = Math.ceil(W / C) + 1; GH = Math.ceil(H / C) + 1;
    cv.width = GW; cv.height = GH;
    alan = new Float32Array(GW * GH);
    resim = ctx.createImageData(GW, GH);
    const n = mobil ? 4 : 7;
    kaynaklar = [];
    for (let i = 0; i < n; i++) {
      const s = { x: W * (i + 0.5) / n + rnd(-0.22, 0.22) * W / n };
      yeniKaynak(s); s.r = rnd(3, s.max); kaynaklar.push(s);
    }
    akislar = [];
    const xs = mobil ? [0.8] : [0.58, 0.9];
    for (let i = 0; i < xs.length; i++) {
      akislar.push({ x0: W * xs[i], x: W * xs[i], acik: true, sure: rnd(6, 11), guc: 0, faz: rnd(0, 6), parca: [], birikim: 0 });
    }
    const k = Math.ceil(W / KOLON) + 2;
    tabanSeviye = H * (mobil ? 0.07 : 0.085);
    tavanSeviye = H * (mobil ? 0.11 : 0.14);
    seviye = tabanSeviye;
    havuz = new Float32Array(k).fill(seviye);
    havuzH = new Float32Array(k);
    damlalar = []; geriIpler = [];
  }

  function havuzY(x) {
    const f = x / KOLON, i = Math.max(0, Math.min(havuz.length - 2, f | 0)), t = f - i;
    return H - (havuz[i] * (1 - t) + havuz[i + 1] * t);
  }
  function havuzaVur(x, guc, gen) {
    const j = Math.round(x / KOLON);
    for (let k = -gen; k <= gen; k++) if (havuzH[j + k] !== undefined) havuzH[j + k] += guc * (1 - Math.abs(k) / (gen + 1));
  }

  // Sınırlı çekirdek (1 - d²/R²)^3, R = 2.2r → tek topun eşik yarıçapı ≈ r
  function ekle(x, y, r, w) {
    if (r < 0.6) return;
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
  // İki nokta arası incelen ip (r1 → r2)
  function ip(x1, y1, r1, x2, y2, r2) {
    const sx = x2 - x1, sy = y2 - y1, l = Math.sqrt(sx * sx + sy * sy);
    if (l < 0.5) return;
    const ad = Math.max(1.5, Math.min(r1, r2) * 0.7);
    for (let u = 0; u <= l; u += ad) {
      const t = u / l;
      ekle(x1 + sx * t, y1 + sy * t, r1 + (r2 - r1) * t, 1);
    }
  }

  function damlaBirak(x, y, r, vy) {
    damlalar.push({ x, y, vx: 0, vy: vy || 30, r, iz: [], yas: 0 });
  }

  function itme(o, menzil, kuvvet, dt) {
    if (!imlec.aktif) return;
    const dx = o.x - imlec.x, dy = o.y - imlec.y, d2 = dx * dx + dy * dy;
    if (d2 < menzil * menzil) o.vx += Math.sign(dx || 1) * (1 - Math.sqrt(d2) / menzil) * kuvvet * dt + imlec.vx * 0.01;
  }

  function adim(dt) {
    zaman += dt;
    // 1) Sarkan damlalar: büyü → ip halinde uza → kop
    for (const s of kaynaklar) {
      if (s.bekle > 0) { s.bekle -= dt; continue; }
      if (s.faz === 'buyu') {
        s.r += s.hiz * dt * (1 - s.r / (s.max * 1.4));
        if (s.r >= s.max) { s.faz = 'uza'; s.vy = 6; }
      } else {
        // ağırlık ipi germeye başlar; ip uzadıkça hızlanır
        s.vy += (G * 0.22 - s.vy * 0.9) * dt;
        s.dy += s.vy * dt;
        s.r += 0.6 * dt;
        if (s.dy > s.kop) {
          damlaBirak(s.x, s.r + s.dy, s.r * 0.95, s.vy + 20);
          geriIpler.push({ x: s.x, boy: s.dy * 0.55, r: Math.max(1.6, s.r * 0.22), t: 0 });
          yeniKaynak(s);
        }
      }
    }
    // Kopan ipin üst parçası yukarı geri toplanır
    for (let i = geriIpler.length - 1; i >= 0; i--) {
      const g = geriIpler[i]; g.t += dt;
      g.boy *= Math.pow(0.02, dt);
      if (g.boy < 2) geriIpler.splice(i, 1);
    }
    // 2) Sürekli akan ipler — düştükçe hızlanır ve incelir (süreklilik)
    for (const a of akislar) {
      a.sure -= dt;
      if (a.sure <= 0) { a.acik = !a.acik; a.sure = a.acik ? rnd(7, 13) : rnd(2.5, 5); }
      a.guc += ((a.acik ? 1 : 0) - a.guc) * Math.min(1, dt * (a.acik ? 0.9 : 1.6));
      a.x = a.x0 + Math.sin(zaman * 0.35 + a.faz) * 22;
      if (a.guc > 0.04) {
        a.birikim += dt;
        while (a.birikim > 0.016) {
          a.birikim -= 0.016;
          a.parca.push({ x: a.x, y: 10, vx: 0, vy: 35, g: a.guc });
        }
      }
      for (let i = a.parca.length - 1; i >= 0; i--) {
        const q = a.parca[i];
        q.vy += (G - 0.55 * q.vy) * dt;
        itme(q, 110, 900, dt);
        q.vx *= Math.pow(0.2, dt);
        q.x += q.vx * dt; q.y += q.vy * dt;
        // süreklilik: kesit ∝ 1/hız → yarıçap ∝ 1/√hız
        q.r = Math.max(2.2, 9.5 * q.g * Math.sqrt(35 / Math.max(35, q.vy)) + 1.2) * (1 + Math.sin(q.y * 0.045 + zaman * 3 + a.faz) * 0.07);
        if (q.y > havuzY(q.x) - 1) {
          havuzaVur(q.x, 5 * q.g, 3);           // yağ havuzda tümsek yapar
          seviye = Math.min(tavanSeviye, seviye + 0.006);
          a.parca.splice(i, 1);
        }
      }
    }
    // 3) Düşen damlalar: viskoz yerçekimi, gözyaşı biçimi
    for (let i = damlalar.length - 1; i >= 0; i--) {
      const d = damlalar[i];
      d.yas += dt;
      d.vy += (G - 1.1 * d.vy) * dt;
      itme(d, 110, 1500, dt);
      d.vx *= Math.pow(0.1, dt);
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < 4) d.x = 4; if (d.x > W - 4) d.x = W - 4;
      d.iz.unshift(d.x, d.y);
      if (d.iz.length > 80) d.iz.length = 80;
      const yuzey = havuzY(d.x);
      if (d.y + d.r * 0.5 > yuzey) {
        havuzaVur(d.x, -Math.min(d.vy, 500) * 0.05 * (d.r / 10), 2);   // çukur…
        havuzaVur(d.x + 30, 4 * d.r / 10, 1); havuzaVur(d.x - 30, 4 * d.r / 10, 1); // …ve yanlara kabarma
        seviye = Math.min(tavanSeviye, seviye + (Math.PI * d.r * d.r) / W * 0.45);
        damlalar.splice(i, 1);
      }
    }
    // 4) Havuz: ağır, tembel dalgalar
    seviye += (tabanSeviye - seviye) * 0.04 * dt;
    const n = havuz.length;
    for (let j = 0; j < n; j++) {
      const hedef = seviye + Math.sin(zaman * 0.6 + j * 0.22) * 2 + Math.sin(zaman * 0.33 - j * 0.09) * 3;
      let a = (hedef - havuz[j]) * 4;
      const l = havuz[j > 0 ? j - 1 : j], r = havuz[j < n - 1 ? j + 1 : j];
      a += (l + r - 2 * havuz[j]) * 38;
      if (imlec.aktif) {
        const dx = j * KOLON - imlec.x, mesafe = (H - havuz[j]) - imlec.y;
        if (Math.abs(dx) < 100 && mesafe < 170 && mesafe > -40) a += (1 - Math.abs(dx) / 100) * (1 - Math.max(0, mesafe) / 170) * 520;
      }
      havuzH[j] = (havuzH[j] + a * dt) * Math.pow(0.25, dt);
    }
    for (let j = 0; j < n; j++) havuz[j] += havuzH[j] * dt;
    const hedefR = imlec.aktif && zaman - imlec.sonHareket < 1.2 ? (mobil ? 9 : 12) : 0;
    imlec.r += (hedefR - imlec.r) * Math.min(1, dt * 4);
    imlec.vx *= Math.pow(0.02, dt);
  }

  function ciz() {
    alan.fill(0);
    // Üst kenarda ince yağ filmi (yavaş nefes alır)
    const filmAdim = mobil ? 30 : 26;
    for (let x = -10; x < W + 20; x += filmAdim) ekle(x, -7, 10 + Math.sin(zaman * 0.5 + x * 0.04) * 2.2, 1);
    // Sarkan damlalar + uzayan ip
    for (const s of kaynaklar) {
      const sall = Math.sin(zaman * 1.4 + s.x) * 0.6;
      if (s.faz === 'buyu') {
        ekle(s.x, s.r * 0.3, s.r * 0.95 + 3, 1);
        ekle(s.x + sall, s.r * 1.05, s.r, 1);
      } else {
        const dy = s.r + s.dy, boyun = s.r * Math.max(0.16, 0.6 - s.dy / s.kop * 0.45);
        ekle(s.x, s.r * 0.35, s.r * 0.75 + 3, 1);
        ip(s.x, s.r * 0.6, s.r * 0.55, s.x + sall, dy - s.r * 0.8, boyun);   // incelen boyun
        ekle(s.x + sall, dy - s.r * 0.35, s.r * 0.8, 1);                       // damlanın üstü (armut)
        ekle(s.x + sall, dy, s.r, 1);
      }
    }
    for (const g of geriIpler) {
      const k = Math.min(1, g.boy / 30);
      ip(g.x, 4, 5, g.x, 4 + g.boy, g.r * k + 0.8);
      ekle(g.x, 4 + g.boy, g.r * 1.4 * k + 1, 1);
    }
    // Düşen damlalar: gözyaşı + ince kuyruk
    for (const d of damlalar) {
      ekle(d.x, d.y, d.r, 1);
      ekle(d.x, d.y - d.r * 0.7, d.r * 0.7, 1);
      const iz = d.iz, boy = Math.min(150, 20 + d.vy * 0.28) * Math.max(0, 1 - d.yas * 0.4);
      let px = d.x, py = d.y - d.r, yol = 0;
      for (let k = 2; k < iz.length && yol < boy; k += 2) {
        const qx = iz[k], qy = iz[k + 1] - d.r, sx = qx - px, sy = qy - py, l = Math.sqrt(sx * sx + sy * sy);
        for (let u = 2; u <= l && yol + u < boy; u += 2) {
          const t = (yol + u) / boy;
          ekle(px + sx * u / l, py + sy * u / l, d.r * (0.42 - t * 0.36), 0.95);
        }
        yol += l; px = qx; py = qy;
      }
    }
    // Akan ipler: ağız + kesintisiz gövde
    for (const a of akislar) {
      if (a.guc > 0.04) { ekle(a.x, 2, 10 * a.guc + 4, 1); ekle(a.x, 12, 8 * a.guc + 2, 1); }
      const ps = a.parca;
      for (let i = 0; i < ps.length; i++) {
        const q = ps[i]; ekle(q.x, q.y, q.r, 1);
        const o = ps[i - 1];
        if (!o) continue;
        const sx = o.x - q.x, sy = o.y - q.y, l = Math.sqrt(sx * sx + sy * sy);
        if (l > 90) continue;
        const rr = Math.min(q.r, o.r), ad = Math.max(1.5, rr * 0.7);
        for (let u = ad; u < l; u += ad) ekle(q.x + sx * u / l, q.y + sy * u / l, rr, 1);
      }
    }
    if (imlec.r > 0.5) ekle(imlec.x, imlec.y, imlec.r, 0.95);
    // Havuz
    for (let gx = 0; gx < GW; gx++) {
      const s = havuzY(gx * C);
      const bas = Math.max(0, Math.floor((s - 10) / C));
      for (let gy = bas, i = bas * GW + gx; gy < GH; gy++, i += GW) {
        const v = (gy * C - s) / 12 + 0.5;
        if (v > 0) alan[i] += v > 2.2 ? 2.2 : v;
      }
    }
    golgele();
    ctx.putImageData(resim, 0, 0);
  }

  function golgele() {
    const d = resim.data;
    let lx = -0.4 + (imlec.aktif ? (imlec.x / W - 0.5) * 0.6 : Math.sin(zaman * 0.25) * 0.18);
    let ly = -0.7, lz = 0.6;
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz); lx /= ll; ly /= ll; lz /= ll;
    let hx = lx, hy = ly, hz = lz + 1; const hl = Math.sqrt(hx * hx + hy * hy + hz * hz); hx /= hl; hy /= hl; hz /= hl;
    const NZ = 0.22;
    d.fill(0);
    for (let gy = 1; gy < GH - 1; gy++) {
      let i = gy * GW + 1, p = i * 4;
      for (let gx = 1; gx < GW - 1; gx++, i++, p += 4) {
        const v = alan[i];
        if (v < 0.16) continue;
        if (v < ESIK) { // çok hafif sıcak hale
          const a = (v - 0.16) / (ESIK - 0.16);
          d[p] = 225; d[p + 1] = 170; d[p + 2] = 45; d[p + 3] = a * a * 40;
          continue;
        }
        const gxv = alan[i + 1] - alan[i - 1], gyv = alan[i + GW] - alan[i - GW];
        const nl = Math.sqrt(gxv * gxv + gyv * gyv + NZ * NZ);
        const nx = -gxv / nl, ny = -gyv / nl, nz = NZ / nl;
        let dif = nx * lx + ny * ly + nz * lz; if (dif < 0) dif = 0;
        let sp = nx * hx + ny * hy + nz * hz; if (sp < 0) sp = 0;
        const sp2 = sp * sp * sp * sp;                 // geniş yumuşak parlama
        let sp1 = sp2 * sp2; sp1 *= sp1; sp1 *= sp1;   // ^64 keskin ışık noktası
        // kalınlık: ince yerde açık altın-yeşil, kalın yerde koyu kehribar
        let kal = (v - ESIK) * 0.75; if (kal > 1) kal = 1;
        const r0 = 236 - kal * 120, g0 = 200 - kal * 112, b0 = 70 - kal * 58;
        // içten gelen sıcak ışık (arkadan aydınlanan yağ)
        const ic = nz * nz * (0.35 + 0.25 * (1 - kal));
        const isik = 0.38 + 0.62 * dif;
        let r = r0 * isik + 255 * (ic * 0.55 + sp1 * 1.0 + sp2 * 0.18);
        let g = g0 * isik + 210 * (ic * 0.5) + 248 * (sp1 + sp2 * 0.14);
        let b = b0 * isik + 60 * ic + 215 * (sp1 + sp2 * 0.08);
        const kenar = 1 - nz; r += kenar * 30; g += kenar * 22;
        d[p] = r > 255 ? 255 : r; d[p + 1] = g > 255 ? 255 : g; d[p + 2] = b > 255 ? 255 : b;
        // yarı saydam: kenar ve ince ip daha şeffaf, kalın yer dolu
        const a = (v - ESIK) / 0.14;
        const opak = 150 + kal * 95 + sp1 * 60;
        d[p + 3] = a >= 1 ? (opak > 250 ? 250 : opak) : 60 + a * (opak - 60);
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
    damlaBirak(e.clientX - r.left, e.clientY - r.top, rnd(9, 13), 40);
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
    for (let i = 0; i < (azHareket ? 600 : 300); i++) adim(1 / 60); // sahne dolu başlasın
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
