/* ============================================================
   AURA — Expression manager
   Holds the authoritative facial state, blends every change over
   time, layers idle life (breathing, blinking, micro-drift) on
   top, lets speech take over the mouth, and hands one finished
   frame to the avatar's rig.
   ============================================================ */

import { EXPRESSIONS, SLIDERS, IDLE } from './config.js';

const CHANNELS = SLIDERS.map((s) => s.key).concat(['headTurn']);

/** The six channels speech is allowed to drive. */
const MOUTH = ['jawOpen', 'lipRound', 'lipWide', 'lipPress', 'lipFunnel'];

/** Per-channel blend rate — harmonious, synchronized transition speeds. */
const RATE = {
  jawOpen: 14, smile: 11, lipRound: 12, lipWide: 12, lipPress: 13, lipFunnel: 13,
  browRaise: 10, browFurrow: 9, squint: 12,
  headTilt: 4.0, headNod: 4.0, headTurn: 3.5,
};

export class ExpressionManager {
  constructor(avatar) {
    this.avatar = avatar;
    this.current = {};
    this.target = {};
    this.manual = {};
    for (const k of CHANNELS) {
      this.current[k] = 0;
      this.target[k] = 0;
      this.manual[k] = null;
    }
    this.preset = 'neutral';
    this.idle = true;
    this.isDiscovery = false;
    this._discoveryYaw = 0;
    this._discoveryHeadTurn = 0;
    this._blink = { t: 0, next: 1.8 + Math.random() * 3, v: 0 };
    this._out = {};
    this.onPreset = null;
    this.set('neutral');
  }

  /** Discovery mode: turns posture and face toward right to look at discovery studio. */
  setDiscoveryMode(active) {
    this.isDiscovery = Boolean(active);
  }

  /* ------------------------------------------------------------ presets */
  set(name) {
    const p = EXPRESSIONS[name];
    if (!p) return this.preset;
    this.preset = name;
    for (const k of CHANNELS) {
      this.target[k] = p[k] ?? 0;
      this.manual[k] = null;         // a preset releases every slider pin
    }
    this.onPreset?.(name, this.target);
    return name;
  }

  /** Slider input — pins one channel until the next preset. */
  setChannel(key, value) {
    if (!(key in this.target)) return;
    this.manual[key] = value;
    this.target[key] = value;
    if (this.preset !== 'custom') {
      this.preset = 'custom';
      this.onPreset?.('custom', this.target);
    }
  }

  /** A transient expression that decays back to whatever was set before. */
  flash(name, ms = 2200) {
    const prev = this.preset === 'custom' ? null : this.preset;
    this.set(name);
    clearTimeout(this._flashT);
    if (prev) this._flashT = setTimeout(() => this.set(prev), ms);
  }

  reset() {
    for (const k of CHANNELS) this.manual[k] = null;
    return this.set('neutral');
  }

  /**
   * Live microphone loudness, 0…1. Rides on top of whatever expression is
   * set so the avatar visibly attends to the person speaking.
   */
  setListening(rms) {
    this._listen = Math.min(1, (rms || 0) * 3.2);
    this._listenAt = performance.now();
  }

  /* -------------------------------------------------------------- frame */
  /**
   * @param {number} dt seconds
   * @param {number} elapsed seconds since start
   * @param {object|null} lip  output of LipSync.update(), or null
   */
  update(dt, elapsed, lip) {
    // 1. ease every channel toward its target
    for (const k of CHANNELS) {
      const rate = RATE[k] ?? 8;
      this.current[k] += (this.target[k] - this.current[k]) * Math.min(1, rate * dt);
    }

    // Ease discovery mode posture & head turn
    const targetDiscoveryYaw = this.isDiscovery ? (IDLE.discoveryBodyYaw || 0.22) : 0;
    const targetDiscoveryHead = this.isDiscovery ? (IDLE.discoveryHeadTurn || 0.46) : 0;
    this._discoveryYaw += (targetDiscoveryYaw - this._discoveryYaw) * Math.min(1, 3.5 * dt);
    this._discoveryHeadTurn += (targetDiscoveryHead - this._discoveryHeadTurn) * Math.min(1, 3.5 * dt);

    // 2. copy into the frame buffer we hand to the rig
    const o = this._out;
    for (const k of CHANNELS) o[k] = this.current[k];

    // Add discovery head turn towards right when discovery is open
    o.headTurn = (o.headTurn || 0) + this._discoveryHeadTurn;

    // 3. idle life. Head DRIFT is off by default (IDLE.headDrift = 0) — the
    //    avatar should only turn when dragged or told to. Breathing and
    //    blinking stay, since neither is rotation.
    if (this.idle) {
      const breath = Math.sin(elapsed * 0.72);
      if (IDLE.headDrift) {
        o.headNod += breath * 0.035 * IDLE.headDrift;
        o.headTilt += Math.sin(elapsed * 0.41 + 1.1) * 0.03 * IDLE.headDrift;
        o.headTurn += Math.sin(elapsed * 0.29 + 2.4) * 0.05 * IDLE.headDrift;
      }
      o.jawOpen += (0.5 + 0.5 * breath) * IDLE.breathJaw;

      if (IDLE.blink) {
        this._blink.t += dt;
        if (this._blink.t >= this._blink.next) {
          this._blink.t = 0;
          this._blink.next = 1.6 + Math.random() * 4.2;   // bursts, not a metronome
          this._blink.v = 1;
        }
        if (this._blink.v > 0) {
          this._blink.v -= dt * (this._blink.v > 0.5 ? 7.7 : 11);   // ~130 ms close, ~90 ms open
          o.squint = Math.min(1.0, o.squint + Math.sin(Math.max(0, this._blink.v) * Math.PI) * 0.88);
        }
      } else {
        this._blink.v = 0;
      }
    }

    // 4. attentive listening while the person is actually making sound
    if (this._listen !== undefined && performance.now() - this._listenAt < 400) {
      this._listenSm = (this._listenSm ?? 0) + (this._listen - (this._listenSm ?? 0)) * Math.min(1, 6 * dt);
    } else if (this._listenSm) {
      this._listenSm *= Math.max(0, 1 - 4 * dt);
      if (this._listenSm < 0.002) this._listenSm = 0;
    }
    if (this._listenSm) {
      o.browRaise += this._listenSm * 0.2;
      o.headNod += this._listenSm * 0.04;
      o.squint -= this._listenSm * 0.06;
    }

    // 5. speech owns the mouth while the voice is running. Every mouth
    //    channel crossfades, so a spoken "oh" is genuinely round rather than
    //    an expression with the jaw flapping on top of it.
    if (lip && lip.energy > 0.002) {
      const e = Math.min(1, lip.energy);
      for (const k of MOUTH) o[k] = o[k] * (1 - e) + (lip[k] ?? 0) * e;
      // Articulation reads on the smile channel too, but only a little —
      // enough to widen, not enough to grin through a sad line.
      o.smile = o.smile * (1 - e * 0.45) + (lip.smile || 0) * e * 0.45;
      o.headNod += Math.sin(elapsed * 2.3) * 0.38 * IDLE.speechMotion * e;
      o.headTurn += Math.sin(elapsed * 1.31 + 0.7) * 0.42 * IDLE.speechMotion * e;
    }

    o.activeViseme = lip?.activeViseme || null;
    o.speechEnergy = lip?.energy || 0;

    // 6. Root posture — firmly grounded with zero vertical floating motion
    const root = this.avatar?.root;
    if (root) {
      root.position.y = IDLE.breathRise ? Math.sin(elapsed * 0.72) * IDLE.breathRise : 0;
      const baseYaw = this._discoveryYaw;
      root.rotation.y = baseYaw + (IDLE.bodySway ? Math.sin(elapsed * 0.19) * IDLE.bodySway : 0);
      root.rotation.z = IDLE.bodySway ? Math.sin(elapsed * 0.26 + 0.9) * IDLE.bodySway * 0.18 : 0;
    }

    this.avatar?.deform(o, this.preset);
    return o;
  }

  /** Current value for a slider. */
  value(key) { return this.current[key] ?? 0; }
}
