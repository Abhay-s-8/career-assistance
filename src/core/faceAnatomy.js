/* ============================================================
   AURA — Face anatomy detection
   Finds the real facial landmarks on an arbitrary head mesh by
   measuring it, not by assuming proportions.

   Proportion-based rigs fail on stylised characters: a model with
   a full head of hair puts the crown far above the skull, so
   "eyes at half the head height" lands on the forehead. Every
   landmark here is instead derived from a feature the geometry
   actually has — the frontmost point, the profile's inflections,
   and the lip crease's own surface normals.
   ============================================================ */

/**
 * @param {Float32Array} pos   world-space vertex positions, xyz interleaved
 * @param {Float32Array} nor   world-space vertex normals, xyz interleaved
 * @param {number} count       vertex count
 * @param {number} bodyHeight  overall model height (feet at y = 0)
 */
export function detectFace(pos, nor, count, bodyHeight) {
  const crownY = bodyHeight;

  /* ---------------------------------------------------------- 1. nose tip
     The frontmost vertex of the upper body. On a head this is always the
     nose, and it is the one landmark no proportion system can get wrong. */
  let bestZ = -Infinity, ni = 0;
  const upperCut = bodyHeight * 0.72;
  for (let i = 0; i < count; i++) {
    const y = pos[i * 3 + 1];
    if (y < upperCut) continue;
    const z = pos[i * 3 + 2];
    if (z > bestZ) { bestZ = z; ni = i; }
  }
  const cx = pos[ni * 3];
  const cz = pos[ni * 3 + 2];
  const noseTipY = pos[ni * 3 + 1];

  /* ------------------------------------------ 2. centre-line depth profile
     max Z per height band along a thin slab through the nose. Its peaks and
     troughs are the profile of the face seen from the side. */
  const STEP = 0.0025;
  const lo = noseTipY - 0.12 * (bodyHeight / 1.8);
  const nBands = Math.max(8, Math.ceil((crownY - lo) / STEP));
  const prof = new Float32Array(nBands).fill(NaN);
  const slabW = 0.012 * (bodyHeight / 1.8);
  for (let i = 0; i < count; i++) {
    const y = pos[i * 3 + 1];
    if (y < lo || y >= crownY) continue;
    if (Math.abs(pos[i * 3] - cx) > slabW) continue;
    const b = Math.floor((y - lo) / STEP);
    const z = pos[i * 3 + 2];
    if (!(prof[b] >= z)) prof[b] = z;          // NaN-safe max
  }
  // fill gaps, then a 3-tap smooth
  for (let b = 1; b < nBands; b++) if (Number.isNaN(prof[b])) prof[b] = prof[b - 1];
  for (let b = nBands - 2; b >= 0; b--) if (Number.isNaN(prof[b])) prof[b] = prof[b + 1];
  const sm = new Float32Array(nBands);
  for (let b = 0; b < nBands; b++) {
    const a = prof[Math.max(0, b - 1)], c = prof[Math.min(nBands - 1, b + 1)];
    sm[b] = (a + prof[b] + c) / 3;
  }
  const yOf = (b) => lo + (b + 0.5) * STEP;
  const bOf = (y) => Math.max(0, Math.min(nBands - 1, Math.floor((y - lo) / STEP)));

  /* ------------------------------------------------------------- 3. chin
     Walking down from the nose, the chin's bottom edge is where the face's
     front surface falls away to the neck plane — the largest drop in the
     profile. */
  let chinY = noseTipY - 0.075 * (bodyHeight / 1.8);
  {
    const from = bOf(noseTipY - 0.11 * (bodyHeight / 1.8));
    const to = bOf(noseTipY - 0.03 * (bodyHeight / 1.8));
    let best = -Infinity;
    for (let b = from; b < to; b++) {
      const d = sm[b + 1] - sm[b];             // rising with y = the chin edge
      if (d > best) { best = d; chinY = yOf(b) + STEP * 0.5; }
    }
  }

  /* --------------------------------------------------------- 4. nose base
     Just under the tip, where the profile climbs steeply out of the lip
     plane and onto the nose. */
  let noseBaseY = noseTipY - 0.011 * (bodyHeight / 1.8);
  {
    const from = bOf(noseTipY - 0.035 * (bodyHeight / 1.8));
    const to = bOf(noseTipY - 0.004 * (bodyHeight / 1.8));
    let best = -Infinity;
    for (let b = from; b < to; b++) {
      const d = sm[b + 1] - sm[b];
      if (d > best) { best = d; noseBaseY = yOf(b); }
    }
  }

  /* ------------------------------------------------------ 5. nasion → eyes
     The FIRST local minimum above the nose tip is the bridge between the
     eyes. Taking the lowest point of a wide window instead would find the
     hairline, which is how proportion rigs end up deforming a forehead. */
  let nasionY = noseTipY + 0.28 * (crownY - noseTipY);
  {
    const from = bOf(noseTipY + 0.012 * (bodyHeight / 1.8));
    const to = bOf(noseTipY + 0.55 * (crownY - noseTipY));
    for (let b = from; b < to - 1; b++) {
      if (sm[b + 1] - sm[b] < 0 && sm[b + 2] - sm[b + 1] >= 0) { nasionY = yOf(b + 1); break; }
    }
  }
  const faceUnit = noseBaseY - chinY;          // the lower third of the face
  const eyeY = nasionY - faceUnit * 0.06;
  const browY = nasionY + faceUnit * 0.20;

  /* ---------------------------------------------------- 6. the lip crease
     The seam between the lips is a fold, so its vertices' normals swing away
     from facing forward. Scoring bands by mean |normal.y| finds the fold
     itself rather than a guessed height. */
  const searchLo = noseBaseY - 0.62 * faceUnit;
  const searchHi = noseBaseY - 0.06 * faceUnit;
  const mouthSearchW = 0.045 * (bodyHeight / 1.8);
  const frontCut = cz - 0.075 * (bodyHeight / 1.8);

  const mIdx = [];
  for (let i = 0; i < count; i++) {
    const y = pos[i * 3 + 1];
    if (y <= searchLo || y >= searchHi) continue;
    if (pos[i * 3 + 2] <= frontCut) continue;
    if (Math.abs(pos[i * 3] - cx) > mouthSearchW) continue;
    mIdx.push(i);
  }

  let seamMid = noseBaseY - 0.25 * faceUnit;   // anatomical fallback
  if (mIdx.length >= 40) {
    const band = 0.0035 * (bodyHeight / 1.8);
    let best = -Infinity;
    for (let c = searchLo + band; c < searchHi - band; c += 0.0008) {
      let sum = 0, n = 0;
      for (const i of mIdx) {
        const y = pos[i * 3 + 1];
        if (y < c - band || y > c + band) continue;
        sum += Math.abs(nor[i * 3 + 1]); n++;
      }
      if (n < 10) continue;
      const score = (sum / n) * Math.log1p(n);
      if (score > best) { best = score; seamMid = c; }
    }
  }

  /* ------------------------------------- 7. mouth width + seam tilt
     Mouths are rarely level. Fitting a line through the crease per column
     handles a smirk, and gives the corner positions at the same time. */
  let mouthHalfW = 0.030 * (bodyHeight / 1.8);
  {
    const seamBand = 0.005 * (bodyHeight / 1.8);
    const maxR = 0.075 * (bodyHeight / 1.8);
    const NB = 12, rStep = maxR / NB;
    const sum = new Float64Array(NB), cnt = new Int32Array(NB);
    for (let i = 0; i < count; i++) {
      if (Math.abs(pos[i * 3 + 1] - seamMid) > seamBand) continue;
      if (pos[i * 3 + 2] <= frontCut) continue;
      const r = Math.abs(pos[i * 3] - cx);
      if (r >= maxR) continue;
      const b = Math.floor(r / rStep);
      sum[b] += Math.abs(nor[i * 3 + 1]); cnt[b]++;
    }
    let core = 0, cn = 0;
    for (let b = 0; b < 3; b++) if (cnt[b] >= 4) { core += sum[b] / cnt[b]; cn++; }
    core = cn ? core / cn : 0;
    // The mouth ends where the crease signal decays into plain cheek.
    for (let b = 2; b < NB; b++) {
      if (cnt[b] < 4) continue;
      if (sum[b] / cnt[b] < core * 0.45) { mouthHalfW = (b + 0.5) * rStep; break; }
    }
  }

  let seamSlope = 0;
  {
    const COLS = 9, half = mouthHalfW * 0.95, colW = (half * 2) / (COLS - 1) * 0.8;
    const xs = [], ys = [];
    for (let k = 0; k < COLS; k++) {
      const c = -half + (k * half * 2) / (COLS - 1);
      let wsum = 0, ysum = 0;
      for (let i = 0; i < count; i++) {
        const y = pos[i * 3 + 1];
        if (y < seamMid - 0.012 || y > seamMid + 0.010) continue;
        if (pos[i * 3 + 2] <= frontCut) continue;
        if (Math.abs(pos[i * 3] - (cx + c)) > colW) continue;
        const w = Math.max(0, Math.abs(nor[i * 3 + 1]) - 0.15) ** 2;
        wsum += w; ysum += y * w;
      }
      if (wsum > 1e-6) { xs.push(c); ys.push(ysum / wsum); }
    }
    if (xs.length >= 4) {
      const n = xs.length;
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0;
      for (let k = 0; k < n; k++) { num += (xs[k] - mx) * (ys[k] - my); den += (xs[k] - mx) ** 2; }
      if (den > 1e-9) {
        seamSlope = num / den;
        seamMid = my - seamSlope * mx;
        // A wild slope means the fit found something other than a mouth.
        const maxTilt = (noseBaseY - seamMid) * 1.2;
        const tilt = Math.abs(seamSlope) * mouthHalfW;
        if (!Number.isFinite(seamSlope) || tilt > maxTilt) seamSlope = 0;
      }
    }
  }

  /* --------------------------------------------------- 8. lip band heights */
  const lipUpperH = Math.max(1e-4, noseBaseY - seamMid);   // seam → nose base
  const lipLowerH = lipUpperH * 1.05;                      // lower lip is a touch deeper

  /* --------------------------------------- 9. the depth of the lip surface */
  let lipZ = cz - lipUpperH * 2;
  {
    let best = -Infinity;
    for (let i = 0; i < count; i++) {
      if (Math.abs(pos[i * 3 + 1] - seamMid) > lipUpperH * 0.6) continue;
      if (Math.abs(pos[i * 3] - cx) > mouthHalfW * 0.5) continue;
      if (pos[i * 3 + 2] > best) best = pos[i * 3 + 2];
    }
    if (best > -Infinity) lipZ = best;
  }

  /* ------------------------------------------------ 10. head box + jaw hinge */
  let hx0 = Infinity, hx1 = -Infinity, hz0 = Infinity, hz1 = -Infinity, hy0 = Infinity;
  const headCut = chinY - faceUnit * 0.5;
  for (let i = 0; i < count; i++) {
    const y = pos[i * 3 + 1];
    if (y < headCut) continue;
    const x = pos[i * 3], z = pos[i * 3 + 2];
    if (x < hx0) hx0 = x; if (x > hx1) hx1 = x;
    if (z < hz0) hz0 = z; if (z > hz1) hz1 = z;
    if (y < hy0) hy0 = y;
  }
  const headHalfW = Math.max(1e-4, (hx1 - hx0) / 2);
  const headHalfD = Math.max(1e-4, (hz1 - hz0) / 2);
  const headCz = (hz0 + hz1) / 2;

  // Temporomandibular joint: up near the ear canal, well behind the teeth.
  const jawPivot = [cx, eyeY - faceUnit * 0.16, cz - headHalfD * 1.45];
  // Where the neck meets the skull — the pivot for head tilt / nod.
  const neckY = chinY - faceUnit * 0.30;

  return {
    cx, cz, headCz, crownY,
    noseTipY, noseBaseY, chinY, nasionY, eyeY, browY, neckY,
    faceUnit, headHalfW, headHalfD, headBottomY: hy0,
    seamY: seamMid, seamSlope, mouthHalfW, lipUpperH, lipLowerH, lipZ,
    jawPivot,
  };
}
