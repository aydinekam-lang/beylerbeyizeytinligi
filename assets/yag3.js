/* Akan zeytinyağı v3 — WebGL metaball + ışık (04.11.2026).
   Her piksel için yağın kalınlığı, yüzey normali, kırılma rengi ve parlak yansıma hesaplanır:
   ince yerde açık altın-yeşil ve yarı saydam, kalın yerde koyu kehribar, üstte keskin ışık noktası,
   altta içinden geçen sıcak ışık. Üstten damlalar büyür, ip gibi sarkar, kopar; sağda ince sürekli
   bir yağ ipi akar; altta havuz dalgalanır. WebGL yoksa hiçbir şey çizilmez. */
(function () {
  const hero = document.querySelector('.hero');
  const cv = document.getElementById('yag3');
  if (!hero || !cv) return;
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) { cv.remove(); return; }
  const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 64, PK = 48, NT = 8;
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision highp float;
uniform vec4 B[${N}];uniform vec4 T[${NT}];uniform vec4 U[${NT}];uniform float P[${PK}];uniform vec2 R;uniform float S;uniform float Z;uniform vec2 Y;
void main(){
  vec2 q=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y);
  float f=0.;vec2 g=vec2(0.);
  for(int i=0;i<${N};i++){
    vec4 b=B[i];if(b.z<=0.)continue;
    vec2 d=q-b.xy;float d2=dot(d,d);float r2=b.z*b.z;
    if(d2>r2*40.)continue;
    float w=r2/(d2+1.);f+=w;g-=2.*w/(d2+1.)*d;
  }
  for(int i=0;i<${NT};i++){
    vec4 a=T[i];vec4 u=U[i];if(a.w<=0.)continue;
    float cy=clamp(q.y,a.y,a.z);float t=(cy-a.y)/max(a.z-a.y,1.);
    float cx=a.x+u.y*S*t*sin(cy*.012/S+Z*.7+u.z);
    float r=mix(a.w,u.x,t)*(1.+u.w*sin(cy*.045/S-Z*3.2+u.z));
    vec2 d=q-vec2(cx,cy);float d2=dot(d,d);float r2=r*r;
    if(d2>r2*40.)continue;
    float w=r2/(d2+1.);f+=w;g-=2.*w/(d2+1.)*d;
  }
  float fx=q.x/R.x*${PK - 1}.;float h=0.;float dh=0.;
  for(int j=0;j<${PK};j++){
    float u=fx-float(j);float w=max(0.,1.-abs(u));h+=P[j]*w;
    if(abs(u)<1.)dh-=P[j]*sign(u);
  }
  dh*=${PK - 1}./R.x;
  float k=5.*S;float s=(q.y-(Y.x+Y.y*q.x-h))/k;float fp=exp(clamp(s,-12.,4.));
  f+=fp;g.y+=fp/k;g.x+=fp*(dh-Y.y)/k;
  float gn=max(length(g),1e-4);
  float sd=(f-1.)/gn;
  float a=clamp(sd+.5,0.,1.);
  float hale=sd<0.?exp(sd/(5.*S))*.16:0.;
  if(a<=0.){gl_FragColor=vec4(vec3(.85,.82,.25)*hale,hale);return;}
  float th=clamp(sd/(9.*S),0.,1.);
  vec3 n=normalize(vec3(-g/f*5.,1.));
  vec3 L=normalize(vec3(-.45,-.7,.55));
  vec3 H=normalize(L+vec3(0.,0.,1.));
  float dif=clamp(dot(n,L),0.,1.);
  float sp=pow(clamp(dot(n,H),0.,1.),90.);
  float sp2=pow(clamp(dot(n,H),0.,1.),14.);
  float rim=pow(1.-n.z,2.);
  vec2 nl=n.xy/max(length(n.xy),1e-4);
  float kos=pow(clamp(dot(nl,-normalize(L.xy)),0.,1.),2.)*(1.-n.z)*smoothstep(.15,.8,th);
  vec3 ince=vec3(.97,.94,.42),kalin=vec3(.66,.64,.07);
  vec3 c=mix(ince,kalin,th);
  vec3 col=c*(.52+.55*dif)+vec3(1.,.96,.5)*kos*.8+vec3(.95,.86,.5)*rim*.18+vec3(1.)*sp2*.18;
  float al=a*mix(.8,.97,th)+rim*.1*a;
  al=clamp(al,0.,1.);
  vec3 pre=col*al+vec3(1.,.98,.92)*sp*a*1.1;
  gl_FragColor=vec4(min(pre,vec3(1.)),min(1.,al+sp*a*.6));
}`;
  function sh(t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  const pr = gl.createProgram();
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) { cv.remove(); return; }
  gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  const uB = gl.getUniformLocation(pr, 'B'), uT = gl.getUniformLocation(pr, 'T'), uU = gl.getUniformLocation(pr, 'U'), uZ = gl.getUniformLocation(pr, 'Z'), uY = gl.getUniformLocation(pr, 'Y'), uP = gl.getUniformLocation(pr, 'P'),
        uR = gl.getUniformLocation(pr, 'R'), uS = gl.getUniformLocation(pr, 'S');
  const TA = new Float32Array(NT * 4), UA = new Float32Array(NT * 4), BA = new Float32Array(N * 4), PA = new Float32Array(PK);

  const rnd = (a, b) => a + Math.random() * (b - a);
  const G = 420;
  let zeminY0 = 0, zeminEgim = 0, W, H, S, mobil, kaynak = [], dusen = [], akis = [], havuz, hiz, taban, zaman = 0;

  function yeniKaynak(s) { s.faz = 'buyu'; s.r = rnd(4, 6); s.max = rnd(9, 13) * (mobil ? .85 : 1);
    s.dy = 0; s.vy = 0; s.kop = rnd(60, 150); s.bekle = rnd(.2, 2.5); }

  function kur() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height; mobil = W < 700;
    S = Math.min(window.devicePixelRatio || 1, mobil ? 1.5 : 1.25);
    cv.width = Math.round(W * S); cv.height = Math.round(H * S);
    gl.viewport(0, 0, cv.width, cv.height);
    const xs = mobil ? [.12, .5, .9] : [.05, .19, .43, .69, .96];
    kaynak = xs.map(x => { const s = { x: W * x + rnd(-15, 15) }; yeniKaynak(s); s.bekle = rnd(0, 1.5); return s; });
    akis = mobil ? [] : [{ x0: W * .975, r0: 3.4 }];
    taban = mobil ? 4 : 6;
    zeminY0 = H; zeminEgim = 0;
    const bant = hero.nextElementSibling;
    if (bant && bant.classList.contains('bant')) {
      const m = new DOMMatrix(getComputedStyle(bant).transform);
      const br = bant.getBoundingClientRect(), cx = br.left + br.width / 2 - r.left, cy = br.top + br.height / 2 - r.top;
      const w2 = bant.offsetWidth / 2, h2 = bant.offsetHeight / 2;
      const sol = { x: cx - m.a * w2 - m.c * h2, y: cy - m.b * w2 - m.d * h2 };
      const sag = { x: cx + m.a * w2 - m.c * h2, y: cy + m.b * w2 - m.d * h2 };
      zeminEgim = (sag.y - sol.y) / (sag.x - sol.x);
      zeminY0 = sol.y - zeminEgim * sol.x + 1;
    }
    havuz = new Float32Array(PK).fill(taban); hiz = new Float32Array(PK);
    dusen = [];
  }

  function vur(x, guc) { guc *= 1.2;
    const fx = x / W * (PK - 1);
    for (let j = 0; j < PK; j++) { const d = j - fx; havuz[j] += guc * Math.exp(-d * d / 1.2); }
  }

  function adim(dt) {
    zaman += dt;
    for (const s of kaynak) {
      if (s.bekle > 0) { s.bekle -= dt; continue; }
      if (s.faz === 'buyu') { s.r += dt * 1.6; s.dy = s.r * .55;
        if (s.r >= s.max) { s.faz = 'sark'; s.vy = 4; } }
      else { s.vy = Math.min(s.vy + 22 * dt * (1 + s.dy / 60), 70); s.dy += s.vy * dt;
        if (s.dy > s.kop) { dusen.push({ x: s.x, y: s.dy, vy: s.vy, r: s.max * .78, k: false });
          s.geri = { y: s.dy, t: 0 }; yeniKaynak(s); s.r = 5; s.bekle = rnd(.8, 3); } }
      if (s.geri) { s.geri.t += dt; if (s.geri.t > .7) s.geri = null; }
    }
    for (const d of dusen) {
      d.vy = Math.min(d.vy + G * dt, 520); d.y += d.vy * dt;
      const zemin = zeminY0 + zeminEgim * d.x - (havuz[Math.max(0, Math.min(PK - 1, Math.round(d.x / W * (PK - 1))))] || taban);
      if (d.y > zemin - d.r * .3) { d.bitti = true; vur(d.x, d.r * (d.k ? .25 : .55));
        if (!d.k) { const n = mobil ? 2 : 4; for (let i = 0; i < n; i++)
          dusen.push({ x: d.x + rnd(-4, 4), y: zemin - 5, vy: -rnd(90, 170) * Math.min(1, d.r / 6), r: rnd(1.4, 2.4), k: true, vx: (i % 2 ? 1 : -1) * rnd(25, 70) }); } }
      if (d.vx) d.x += d.vx * dt;
    }
    dusen = dusen.filter(d => !d.bitti).slice(-20);
    for (const a of akis) vur(a.x0, 1.2 * dt);
    // havuz: dalga + taban seviyesine yavaş dönüş
    for (let j = 0; j < PK; j++) {
      const l = havuz[j - 1] ?? havuz[j], rr = havuz[j + 1] ?? havuz[j];
      hiz[j] += ((l + rr - 2 * havuz[j]) * 9 - hiz[j] * 1.6 - (havuz[j] - taban) * .8) * dt;
    }
    for (let j = 0; j < PK; j++) havuz[j] += hiz[j] * dt * 6;
    const yon = zeminEgim > 0 ? 1 : -1, akma = Math.min(.9, Math.abs(zeminEgim) * 25) * dt;
    if (yon < 0) for (let j = 0; j < PK - 1; j++) { const fz = Math.max(0, havuz[j + 1] - taban) * akma; havuz[j + 1] -= fz; havuz[j] += fz; }
    else for (let j = PK - 1; j > 0; j--) { const fz = Math.max(0, havuz[j - 1] - taban) * akma; havuz[j - 1] -= fz; havuz[j] += fz; }
    for (let j = 0; j < PK; j++) havuz[j] = Math.min(havuz[j], 26);
  }

  function doldur() {
    let i = 0, t = 0;
    const top = (x, y, r) => { if (i >= N || r <= .3) return; BA[i * 4] = x * S; BA[i * 4 + 1] = y * S; BA[i * 4 + 2] = r * S; i++; };
    const ip = (x, y0, y1, r0, r1, wob, faz, bon) => { if (t >= NT || r0 <= .3) return;
      TA.set([x * S, y0 * S, y1 * S, r0 * S], t * 4); UA.set([r1 * S, wob, faz, bon], t * 4); t++; };
    for (const s of kaynak) {
      const tr = Math.max(s.r * .75, 6);
      top(s.x, -2, tr + 3);
      top(s.x, s.dy, s.r);
      if (s.faz === 'sark') { const inc = Math.max(.35, 1 - s.dy / (s.kop * 1.25));
        ip(s.x, 0, s.dy, tr * .6 * inc + 1.2, s.r * .42 * inc + .8, .4, s.x, 0); }
      if (s.geri) { const p = s.geri.t / .7; ip(s.x, 0, s.geri.y * (1 - p) * .55, 2.6 * (1 - p), 1.2 * (1 - p), 0, 0, 0); }
    }
    for (const d of dusen) {
      const uz = Math.min(Math.abs(d.vy) * .035, d.r * 2.2);
      if (d.k) top(d.x, d.y, d.r);
      else { top(d.x, d.y, d.r); top(d.x, d.y - uz * .5, d.r * .7); top(d.x, d.y - uz, d.r * .4); }
    }
    for (const a of akis) ip(a.x0, -4, zeminY0 + zeminEgim * a.x0 + 2, a.r0, a.r0 * .72, 2.5, 0, .14);
    for (; i < N; i++) BA[i * 4 + 2] = 0;
    for (; t < NT; t++) TA[t * 4 + 3] = 0;
    for (let j = 0; j < PK; j++) PA[j] = havuz[j] * S;
  }

  function ciz() {
    doldur();
    gl.uniform4fv(uB, BA); gl.uniform4fv(uT, TA); gl.uniform4fv(uU, UA); gl.uniform1f(uZ, zaman); gl.uniform2f(uY, zeminY0 * S, zeminEgim); gl.uniform1fv(uP, PA);
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uS, S);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  let son = 0, gorunur = true, id = 0;
  function dongu(t) {
    id = 0;
    if (!gorunur || document.hidden) return;
    const dt = Math.min(.05, son ? (t - son) / 1000 : .016); son = t;
    adim(dt); ciz(); id = requestAnimationFrame(dongu);
  }
  function basla() { if (!id && !azHareket) { son = 0; id = requestAnimationFrame(dongu); } }

  // fare gezdikçe imleçten azar azar yağ damlar (yol başına bir damla, en fazla 6 havada)
  let sx = null, sy = null, yol = 0;
  hero.addEventListener('pointermove', e => {
    if (azHareket) return;
    const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (sx !== null) yol += Math.hypot(x - sx, y - sy);
    sx = x; sy = y;
    if (yol > 70 && dusen.filter(d => d.fare).length < 6) {
      yol = 0;
      dusen.push({ x: x + rnd(-3, 3), y: y + 8, vy: rnd(10, 40), r: rnd(3.2, 5.2), k: false, fare: true, vx: (Math.random() - .5) * 12 });
      basla();
    }
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { sx = sy = null; yol = 0; });

  kur();
  if (azHareket) { for (let k = 0; k < 240; k++) adim(1 / 30); ciz(); }
  else basla();
  new IntersectionObserver(e => { gorunur = e[0].isIntersecting; if (gorunur) basla(); }).observe(hero);
  document.addEventListener('visibilitychange', basla);
  let zt; addEventListener('resize', () => { clearTimeout(zt); zt = setTimeout(() => { kur(); if (azHareket) ciz(); }, 200); });
})();
