/* ============================================================
   AURA — Lip-sync engine
   Speech is articulated procedurally with orthographic & phonetic
   viseme blendshapes. Also supports pre-baked Rhubarb lip-sync
   mouth cues for zero-latency studio playback.
   ============================================================ */

import { LIPSYNC as L, VISEMES, LETTER_VISEME } from './config.js';

const CHANNELS = ['jawOpen', 'smile', 'lipRound', 'lipWide', 'lipPress', 'lipFunnel'];

const RHUBARB_MAP = {
  A: 'MBP',
  B: 'KG',
  C: 'EE',
  D: 'AA',
  E: 'OH',
  F: 'OO',
  G: 'FV',
  H: 'TH',
  X: 'rest',
};

export class LipSync {
  constructor() {
    this.active = false;
    this.env = 0;
    this.text = '';
    this.word = '';
    this.rate = 1;
    this._queue = [];
    this._qi = 0;
    this._hold = 0;
    this._t = 0;
    this._cues = null;
    this._cueIndex = 0;
    this._startTime = 0;
    this._target = { ...VISEMES.rest };
    this.out = { energy: 0, activeViseme: 'rest' };
    for (const c of CHANNELS) this.out[c] = VISEMES.rest[c];
    this._cur = { ...this.out };
  }

  /** Called when speech begins. */
  start(text = '', rate = 1) {
    this.text = text;
    this.rate = rate || 1;
    this.active = true;
    this.word = '';
    this._cues = null;
    this._queue = [];
    this._qi = 0;
    this._t = 0;
    this.out.activeViseme = 'rest';
  }

  /** Play pre-baked Rhubarb mouth cues (from intro_0.json, api_0.json, etc.) */
  playCues(cues, startTime = performance.now() / 1000) {
    this._cues = cues?.mouthCues || cues || null;
    this._startTime = startTime;
    this._cueIndex = 0;
    this.active = true;
    this.env = 1;
  }

  /** Called on every `boundary` event from speechSynthesis. */
  mark(charIndex, charLength) {
    if (!this.text) return;
    const slice = this.text.slice(charIndex, charIndex + (charLength || 14));
    const word = (slice.match(/[A-Za-z']+/) || [''])[0].toLowerCase();
    if (!word) return;
    this.word = word;
    this._queue = visemesFor(word);
    this._qi = 0;
    this._hold = 0;
  }

  /** Optional: drive the jaw from live microphone amplitude instead. */
  pushAmplitude(a) {
    this._amp = a;
    this._ampAt = performance.now();
  }

  /** Real-time spectral feed from neural TTS (ElevenLabs) */
  feedSpectrum(low, mid, high, rms) {
    this.active = rms > 0.015;
    this.env = Math.min(1, Math.max(0, rms * 2.4));
    this._amp = Math.max(rms, low * 0.75);
    this._ampAt = performance.now();

    if (rms > 0.025) {
      if (high > 0.45 && high > low) {
        this.out.activeViseme = 'viseme_FF';
        this._target = VISEMES.FV;
      } else if (mid > 0.40 && mid > low) {
        this.out.activeViseme = 'viseme_I';
        this._target = VISEMES.EE;
      } else if (low > 0.35) {
        this.out.activeViseme = 'viseme_AA';
        this._target = VISEMES.AA;
      } else {
        this.out.activeViseme = 'viseme_O';
        this._target = VISEMES.OH;
      }
    } else {
      this.out.activeViseme = 'viseme_PP';
      this._target = VISEMES.rest;
    }
  }

  stop() {
    this.active = false;
    this.word = '';
    this._queue = [];
    this._cues = null;
    this._target = { ...VISEMES.rest };
    this.out.activeViseme = 'rest';
  }

  update(dt) {
    this._t += dt;

    // 1. Handle pre-baked Rhubarb cue track if active
    if (this.active && this._cues && this._cues.length) {
      const nowAudio = performance.now() / 1000 - this._startTime;
      let activeCue = null;
      for (let i = 0; i < this._cues.length; i++) {
        const c = this._cues[i];
        if (nowAudio >= c.start && nowAudio <= c.end) {
          activeCue = c;
          break;
        }
      }
      if (activeCue) {
        const vKey = RHUBARB_MAP[activeCue.value] || 'AA';
        this._target = VISEMES[vKey] || VISEMES.rest;
        this.out.activeViseme = vKey;
        this.env = 1;
      } else if (nowAudio > (this._cues[this._cues.length - 1]?.end || 0) + 0.2) {
        this.stop();
      }
    } else {
      // 2. Walk the procedural queue at syllable rate
      const k = this.active ? L.attack : L.release;
      this.env += (Number(this.active) - this.env) * Math.min(1, k * dt);

      if (this.active && this._queue.length) {
        this._hold -= dt;
        if (this._hold <= 0) {
          const v = this._queue[this._qi % this._queue.length];
          this._target = VISEMES[v] || VISEMES.rest;
          this.out.activeViseme = v;
          this._hold = (v === 'MBP' ? L.closureHold * 2 : 1 / (L.syllableHz * this.rate));
          this._qi++;
          if (this._qi >= this._queue.length) this._queue = [];
        }
      } else if (!this.active) {
        this._target = VISEMES.rest;
        this.out.activeViseme = 'rest';
      }
    }

    // Ease toward the target shape
    const e = Math.min(1, L.visemeRate * dt);
    for (const c of CHANNELS) {
      this._cur[c] += ((this._target[c] ?? 0) - this._cur[c]) * e;
    }

    // A small syllable wave on the jaw
    const wave = 0.5 + 0.5 * Math.sin(this._t * L.syllableHz * this.rate * Math.PI * 2);
    let jaw = this._cur.jawOpen * (1 - L.waveDepth * 0.5 + L.waveDepth * 0.5 * wave);

    if (this._amp !== undefined && performance.now() - this._ampAt < 180) {
      jaw = jaw * 0.4 + this._amp * 0.85;
    }

    this.out.jawOpen = clamp01(jaw) * this.env;
    this.out.smile = this._cur.smile * this.env;
    this.out.lipRound = clamp01(this._cur.lipRound) * this.env;
    this.out.lipWide = clamp01(this._cur.lipWide) * this.env;
    this.out.lipPress = clamp01(this._cur.lipPress) * this.env;
    this.out.lipFunnel = clamp01(this._cur.lipFunnel) * this.env;
    this.out.energy = this.env;
    return this.out;
  }
}

/**
 * Turns a written word into a short queue of mouth shapes.
 */
function visemesFor(word) {
  const out = [];
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    const next = word[i + 1];

    if (c === 'o' && next === 'o') { out.push('OO'); i++; continue; }
    if (c === 'e' && next === 'e') { out.push('EE'); i++; continue; }
    if (c === 'o' && next === 'u') { out.push('OH'); i++; continue; }
    if (c === 'c' && next === 'h') { out.push('CH'); i++; continue; }
    if (c === 's' && next === 'h') { out.push('CH'); i++; continue; }
    if (c === 't' && next === 'h') { out.push('TH'); i++; continue; }
    if (c === 'p' && next === 'h') { out.push('FV'); i++; continue; }
    if (c === 'w' && next === 'h') { out.push('KG'); i++; continue; }

    const v = LETTER_VISEME[c];
    if (v) out.push(v);
  }

  const dedup = out.filter((v, i) => v !== out[i - 1]);
  if (!dedup.length) return ['UH'];
  if (dedup.length <= 5) return dedup;

  const rank = { OO: 5, OH: 5, MBP: 5, EE: 4, FV: 4, AA: 4, CH: 3, IH: 2, UH: 2, KG: 1, TH: 1, SS: 1 };
  const middle = dedup.slice(1, -1)
    .map((v, i) => ({ v, i, r: rank[v] ?? 1 }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.v);
  return [dedup[0], ...middle, dedup[dedup.length - 1]];
}

const clamp01 = (x) => Math.min(1, Math.max(0, x || 0));
