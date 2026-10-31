/* 2D skeletal rig for the Deep Sea Gargantuar, built from the extracted sprite-sheet pieces.
   Parts are placed in the coordinate space of the reference image (rest pose), bones rotate
   them around pivots, and children inherit their parent's motion (shoulder -> forearm -> fist -> weapon). */
(function () {
  const A = 'assets/garg/parts/';
  // Placements below were fitted automatically against the reference GIF of the garg (rig space = GIF pixels).
  const UNIT = 1.046, GX = 750, GY = 696;          // ground-contact point; draw() scale 1 == old reference scale
  // bone: [parent, pivotX, pivotY]
  const BONES = {
    root: [null, GX, GY], torso: ['root', 735, 610], head: ['torso', 705, 505], jaw: ['head', 700, 500],
    armR: ['torso', 815, 435], foreR: ['armR', 825, 535], fistR: ['foreR', 795, 612],
    armL: ['torso', 690, 540], foreL: ['armL', 660, 600],
    legL: ['root', 735, 612], footL: ['legL', 705, 668], legR: ['root', 795, 622], footR: ['legR', 780, 676],
    imp: ['torso', 820, 410], tail: ['imp', 850, 425]
  };
  // [image, bone, centerX, centerY, scale, rotation(deg, clockwise), flipX]   drawn back -> front
  const PARTS = [
    ['p33', 'torso', 744.0, 595.5, 0.915, 55.0],
    ['p66', 'torso', 856.5, 639.0, 0.780, -27.0],
    ['p29', 'foreL', 632.5, 625.5, 0.910, -67.0],
    ['p30', 'foreL', 665.0, 629.0, 0.830, -18.0],
    ['p31', 'armL', 683.5, 555.0, 0.935, -9.0],
    ['p32', 'armL', 699.5, 581.0, 0.885, 56.0],
    ['p36', 'footL', 697.0, 684.0, 0.770, 8.0],
    ['p21', 'legL', 724.5, 664.5, 0.760, -16.0],
    ['p22', 'legR', 811.0, 657.5, 0.760, -38.0],
    ['p13', 'torso', 757.0, 465.5, 0.780, -3.0],
    ['p24', 'armL', 653.5, 568.0, 0.865, 49.0],
    ['p16', 'torso', 751.5, 561.0, 0.795, 0.0],
    ['p25', 'legL', 732.5, 647.0, 0.820, 31.0],
    ['p37', 'footR', 767.5, 694.5, 0.785, 1.0],
    ['p42', 'imp', 849.0, 381.0, 0.770, -8.0],
    ['p46', 'tail', 875.0, 433.0, 0.805, 4.0],
    ['p43', 'imp', 813.0, 386.0, 0.735, -4.0],
    ['p44', 'imp', 840.0, 398.0, 0.770, -1.0],
    ['p41', 'imp', 809.5, 351.0, 0.770, 0.0],
    ['p12', 'jaw', 660.5, 511.5, 0.785, -1.0],
    ['p10', 'head', 721.0, 473.0, 0.855, 3.0, 1],
    ['p45', 'head', 611.0, 489.0, 0.770, 70.0, 1],
    ['p09', 'head', 667.0, 451.0, 0.785, 0.0],
    ['p07', 'head', 671.5, 473.5, 0.760, 1.0],
    ['p06', 'head', 621.0, 478.0, 0.770, 10.0],
    ['weapon', 'fistR', 669.0, 624.0, 0.780, 18.0],
    ['p17', 'armR', 821.5, 485.0, 0.760, -8.0],
    ['p28', 'fistR', 785.0, 627.5, 0.770, -24.0],
    ['p18', 'foreR', 831.5, 571.0, 0.770, 0.0]
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

  /* g: {t, walkPhase, walking(0..1), squash(-1..1), air(0..1), atk(0..1 or -1), spit(0..1 or -1), cheer, hurt(0..1), groan(0..1)} */
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
    // ink spit: head rears back, then snaps forward with the jaw wide open
    if (g.spit >= 0) {
      const a = g.spit; let k;
      if (a < .5) { k = ease(a / .5); p.head.r += 12 * k * deg; p.torso.r += 4 * k * deg; p.jaw.r -= 14 * k * deg; p.torso.sx += .04 * k; p.armL.r += 10 * k * deg; p.armR.r -= 6 * k * deg; }
      else if (a < .62) { k = ease((a - .5) / .12); p.head.r += (12 - 26 * k) * deg; p.torso.r += (4 - 12 * k) * deg; p.jaw.r -= (14 + 12 * k) * deg; p.torso.sx += .04 - .03 * k; }
      else { k = ease((a - .62) / .38); p.head.r -= 14 * (1 - k) * deg; p.torso.r -= 8 * (1 - k) * deg; p.jaw.r -= 26 * (1 - k) * deg; }
    }
    // victory cheer (imp bounces, weapon stays raised)
    if (g.cheer) { p.imp.dy -= Math.abs(Math.sin(t * 9)) * 9; p.tail.r += Math.sin(t * 12) * 12 * deg; p.head.r += Math.sin(t * 6) * 3 * deg; }
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

  function drawParts(ctx, W) {
    for (const [id, bone, cx, cy, sc, rot, fl] of PARTS) {
      const m = W[bone], im = IMGS[id], w = im.width * sc, h = im.height * sc;
      ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); ctx.translate(cx, cy); ctx.rotate(rot * deg); if (fl) ctx.scale(-1, 1);
      ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    }
  }
  let buf = null;
  /* Draw the garg with ground-contact point at (px,py), scaled by s. flash (0..1) paints him white. */
  function draw(ctx, p, px, py, s, flash) {
    const W = worlds(p), e = s / UNIT, base = mul(T(px, py), mul(S(e, e), T(-GX, -GY)));
    if (flash > 0.02) {
      if (!buf) buf = document.createElement('canvas');
      const bw = Math.ceil(800 * s), bh = Math.ceil(760 * s);
      if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; }
      const b = buf.getContext('2d'); b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, bw, bh);
      const ox = 450 * s, oy = 470 * s, m = mul(T(ox - px, oy - py), base);   // keep him inside the buffer
      b.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); drawParts(b, W);
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-atop'; b.fillStyle = `rgba(255,255,255,${flash})`; b.fillRect(0, 0, bw, bh);
      b.globalCompositeOperation = 'source-over';
      ctx.drawImage(buf, px - ox, py - oy);
    } else { ctx.save(); ctx.transform(base[0], base[1], base[2], base[3], base[4], base[5]); drawParts(ctx, W); ctx.restore(); }
  }
  /* Turn every part into a flying piece (used when the garg is defeated). Returns debris objects. */
  function shatter(p, px, py, s) {
    const W = worlds(p), e = s / UNIT, base = mul(T(px, py), mul(S(e, e), T(-GX, -GY)));
    return PARTS.map(([id, bone, cx, cy, sc, rot]) => {
      const im = IMGS[id], m = mul(base, mul(W[bone], T(cx, cy))), k = Math.hypot(m[0], m[1]);
      const x = m[4], y = m[5], dx = x - px, dy = y - (py - 170 * s);
      return { id, w: im.width * sc * k, h: im.height * sc * k, x, y, r: Math.atan2(m[1], m[0]) + rot * deg, fl: PARTS.find(q => q[0] === id && q[1] === bone && q[2] === cx)[6] ? -1 : 1,
        vx: dx * 2.2 + (Math.random() - .5) * 160, vy: dy * 2.6 - 260 - Math.random() * 200, vr: (Math.random() - .5) * 9, life: 3.2 };
    });
  }
  function drawDebris(ctx, d) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.r); ctx.globalAlpha = clamp(d.life, 0, 1); if (d.fl < 0) ctx.scale(-1, 1); ctx.drawImage(IMGS[d.id], -d.w / 2, -d.h / 2, d.w, d.h); ctx.restore(); }
  function load() {
    const ids = [...new Set(PARTS.map(p => p[0]).concat(['p68', 'p71', 'p76', 'p77', 'p86', 'p87', 'p73', 'p70']))];
    return Promise.all(ids.map(id => new Promise(res => { const im = new Image(); im.onload = () => { IMGS[id] = im; res(); }; im.onerror = res; im.src = A + id + '.png'; })));
  }
  window.GargRig = { load, pose, draw, shatter, drawDebris, imgs: IMGS, parts: PARTS, bones: BONES };
})();
