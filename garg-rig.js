/* 2D skeletal rig for the Deep Sea Gargantuar, built from the extracted sprite-sheet pieces.
   Parts are placed in the coordinate space of the reference image (rest pose), bones rotate
   them around pivots, and children inherit their parent's motion (shoulder -> forearm -> fist -> weapon). */
(function () {
  const A = 'assets/garg/parts/';
  // bone: [parent, pivotX, pivotY]  (pivots are in reference-image pixels)
  const BONES = {
    root: [null, 225, 430], torso: ['root', 205, 335], head: ['torso', 175, 262], jaw: ['head', 172, 256],
    armR: ['torso', 300, 225], foreR: ['armR', 300, 305], fistR: ['foreR', 292, 368],
    armL: ['torso', 150, 300], foreL: ['armL', 150, 345],
    legL: ['root', 195, 362], footL: ['legL', 190, 408], legR: ['root', 275, 375], footR: ['legR', 280, 418],
    imp: ['torso', 295, 160], tail: ['imp', 320, 170]
  };
  // image, bone, x, y, width   (drawn back -> front)
  const PARTS = [
    ['p10', 'head', 188, 198, 34], ['p66', 'head', 72, 214, 34],
    ['p27', 'armL', 112, 293, 95], ['p21', 'foreL', 112, 342, 62],
    ['p67', 'torso', 300, 288, 80],
    ['p24', 'legL', 165, 335, 90], ['p36', 'footL', 137, 395, 80],
    ['p24', 'torso', 176, 342, 118], ['p25', 'torso', 212, 346, 100], ['p21', 'torso', 195, 338, 78], ['p23', 'torso', 235, 335, 62],
    ['p13', 'torso', 118, 128, 182], ['p16', 'torso', 165, 288, 95], ['p15', 'torso', 172, 330, 112],
    ['p25', 'legR', 222, 350, 95], ['p20', 'legR', 235, 376, 95], ['p37', 'footR', 222, 392, 105],
    ['p46', 'tail', 322, 170, 62], ['p45', 'imp', 300, 162, 44], ['p42', 'imp', 305, 105, 40], ['p44', 'imp', 258, 135, 50], ['p41', 'imp', 250, 92, 80],
    ['p12', 'jaw', 108, 236, 66], ['p09', 'head', 85, 130, 131], ['p07', 'head', 131, 203, 44], ['p06', 'head', 90, 218, 22],
    ['weapon', 'fistR', -38, 330, 400],
    ['p17', 'armR', 250, 188, 100], ['p22', 'foreR', 250, 282, 88], ['p28', 'fistR', 235, 368, 75]
  ];
  const IMGS = {};
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const T = (x, y) => [1, 0, 0, 1, x, y];
  const R = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
  const S = (x, y) => [x, 0, 0, y, 0, 0];
  const deg = Math.PI / 180, ease = t => t * t * (3 - 2 * t), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const names = Object.keys(BONES);

  function blank() { const p = {}; names.forEach(n => p[n] = { r: 0, dx: 0, dy: 0, sx: 1, sy: 1 }); return p; }

  /* g: {t, walkPhase, walking(0..1), squash(-1..1), air(0..1), atk(0..1 or -1), hurt(0..1), groan(0..1)} */
  function pose(g) {
    const p = blank(), t = g.t, w = g.walking || 0, ph = g.walkPhase || 0;
    const br = Math.sin(t * 2.1);
    p.torso.dy += br * 2 * (1 - w); p.torso.sy += br * 0.008; p.head.r += Math.sin(t * 2.1 + 1) * 1.6 * deg;
    p.armR.r += Math.sin(t * 2.1 + .4) * 1.5 * deg; p.armL.r += Math.sin(t * 2.1 + 2) * 2 * deg;
    p.imp.dy += Math.sin(t * 3.1) * 2; p.tail.r += Math.sin(t * 5) * 9 * deg;
    // walk cycle
    if (w > 0) {
      const s = Math.sin(ph), c = Math.cos(ph);
      p.legL.r += s * 17 * deg * w; p.footL.r -= s * 12 * deg * w; p.legR.r -= s * 17 * deg * w; p.footR.r += s * 12 * deg * w;
      p.root.dy -= Math.abs(c) * 7 * w; p.torso.r += s * 2.5 * deg * w; p.armL.r += s * 7 * deg * w; p.head.r -= s * 2 * deg * w;
      p.armR.r -= s * 3 * deg * w;
    }
    // jump: squash on take-off/landing, stretch + tucked legs in the air
    const sq = g.squash || 0, air = g.air || 0;
    p.root.sx *= 1 + .13 * sq - .05 * air; p.root.sy *= 1 - .15 * sq + .07 * air;
    p.legL.r += -26 * deg * air; p.legR.r += 22 * deg * air; p.footL.r += 18 * deg * air; p.footR.r -= 14 * deg * air;
    p.armR.r += -28 * deg * air; p.armL.r += 25 * deg * air; p.head.r += 6 * deg * air;
    // weapon swing: wind up -> smash -> recover
    if (g.atk >= 0) {
      const a = g.atk; let k, wr, ar, tr;
      if (a < .5) { k = ease(a / .5); ar = -45 * k; wr = 70 * k; tr = 7 * k; }
      else if (a < .64) { k = ease((a - .5) / .14); ar = -45 + 95 * k; wr = 70 - 108 * k; tr = 7 - 17 * k; }
      else { k = ease((a - .64) / .36); ar = 50 * (1 - k); wr = -38 * (1 - k); tr = -10 * (1 - k); }
      p.armR.r += ar * deg; p.fistR.r += wr * deg; p.foreR.r += ar * .3 * deg; p.torso.r += tr * deg;
      p.head.r += -tr * .5 * deg; p.root.dx += -tr * .6;
    }
    // hurt flinch
    const h = g.hurt || 0; p.torso.r += h * 7 * deg; p.head.r += h * 10 * deg; p.root.dx += h * 5; p.armL.r -= h * 14 * deg;
    // groan: jaw drops, head tips back, chest swells
    const gr = g.groan || 0; p.jaw.r -= gr * 22 * deg; p.head.r += gr * 7 * deg; p.torso.sx += gr * .03; p.torso.sy += gr * .02;
    p.armR.r -= gr * 8 * deg; p.armL.r += gr * 8 * deg;
    return p;
  }

  function worlds(p) {
    const W = {};
    (function walk(n) {
      names.forEach(b => { if (!W[b] && (BONES[b][0] === null ? n === null : W[BONES[b][0]])) {
        const [par, px, py] = BONES[b], q = p[b];
        const L = mul(T(q.dx, q.dy), mul(T(px, py), mul(R(q.r), mul(S(q.sx, q.sy), T(-px, -py)))));
        W[b] = par ? mul(W[par], L) : L; walk(0); } });
    })(null);
    return W;
  }

  const imgH = id => IMGS[id].height / IMGS[id].width;
  function drawParts(ctx, W) {
    for (const [id, bone, x, y, w] of PARTS) {
      const m = W[bone], im = IMGS[id];
      ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); ctx.drawImage(im, x, y, w, w * imgH(id)); ctx.restore();
    }
  }
  let buf = null;
  /* Draw the garg with ground-contact point at (px,py), scaled by s. flash (0..1) paints him white. */
  function draw(ctx, p, px, py, s, flash) {
    const W = worlds(p), base = mul(T(px, py), mul(S(s, s), T(-225, -430)));
    if (flash > 0.02) {
      if (!buf) buf = document.createElement('canvas');
      const bw = Math.ceil(780 * s), bh = Math.ceil(740 * s);
      if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
      const b = buf.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, bw, bh);
      const ox = 440 * s, oy = 450 * s, m = mul(T(ox - px, oy - py), base);   // keep him inside the buffer
      b.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); drawParts(b, W);
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-atop'; b.fillStyle = `rgba(255,255,255,${flash})`; b.fillRect(0, 0, bw, bh);
      b.globalCompositeOperation = 'source-over';
      ctx.drawImage(buf, px - ox, py - oy);
    } else { ctx.save(); ctx.transform(base[0], base[1], base[2], base[3], base[4], base[5]); drawParts(ctx, W); ctx.restore(); }
  }
  /* Turn every part into a flying piece (used when the garg is defeated). Returns debris objects. */
  function shatter(p, px, py, s) {
    const W = worlds(p), base = mul(T(px, py), mul(S(s, s), T(-225, -430)));
    return PARTS.map(([id, bone, x, y, w]) => {
      const h = w * imgH(id), m = mul(base, mul(W[bone], T(x + w / 2, y + h / 2)));
      const cx = m[4], cy = m[5], ang = Math.atan2(m[1], m[0]), k = Math.hypot(m[0], m[1]);
      const dx = cx - px, dy = cy - (py - 170 * s);
      return { id, w: w * k, h: h * k, x: cx, y: cy, r: ang, vx: dx * 2.2 + (Math.random() - .5) * 160, vy: dy * 2.6 - 260 - Math.random() * 200, vr: (Math.random() - .5) * 9, life: 3.2 };
    });
  }
  function drawDebris(ctx, d) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.r); ctx.globalAlpha = clamp(d.life, 0, 1); ctx.drawImage(IMGS[d.id], -d.w / 2, -d.h / 2, d.w, d.h); ctx.restore(); }
  function load() {
    const ids = [...new Set(PARTS.map(p => p[0]).concat(['p68', 'p71', 'p76', 'p77', 'p86', 'p87', 'p73', 'p70']))];
    return Promise.all(ids.map(id => new Promise(res => { const im = new Image(); im.onload = () => { IMGS[id] = im; res(); }; im.onerror = res; im.src = A + id + '.png'; })));
  }
  window.GargRig = { load, pose, draw, shatter, drawDebris, imgs: IMGS, parts: PARTS, bones: BONES };
})();
