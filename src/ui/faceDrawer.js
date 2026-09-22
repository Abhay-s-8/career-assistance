/* ============================================================
   AURA — 3D Avatar & Motion Studio Drawer
   Preset emotion grid, skeletal motion triggers, live winks,
   audio dialog demos from D:\talk, and live sliders.
   ============================================================ */

import { $, $$, el, on, paintRange } from './dom.js';
import { SLIDERS } from '../core/config.js';

export class FaceDrawer {
  constructor(expressions, avatar = null, callbacks = {}) {
    this.exp = expressions;
    this.avatar = avatar;
    this.callbacks = callbacks;
    this.rows = {};
    this._dragging = null;
    this._build();

    // Reflect preset changes coming from chat commands, not just clicks.
    this.exp.onPreset = (name) => this.markPreset(name);
  }

  setAvatar(avatar) {
    this.avatar = avatar;
  }

  _build() {
    const grid = $('#slider-grid');
    if (grid) {
      grid.innerHTML = '';
      for (const s of SLIDERS) {
        const input = el('input', {
          type: 'range', min: s.min, max: s.max, step: '0.01',
          value: String(this.exp.value(s.key)), id: `sl-${s.key}`,
        });
        const val = el('span', { class: 'slider__val' }, fmt(this.exp.value(s.key)));
        const row = el('div', { class: 'slider' },
          el('div', { class: 'slider__top' },
            el('label', { class: 'slider__name', for: `sl-${s.key}` }, s.name),
            val),
          input,
          el('div', { class: 'slider__sub' }, s.sub));

        on(input, 'input', () => {
          this.exp.setChannel(s.key, Number(input.value));
          val.textContent = fmt(input.value);
          paintRange(input);
        });
        on(input, 'pointerdown', () => { this._dragging = s.key; });
        on(window, 'pointerup', () => { if (this._dragging === s.key) this._dragging = null; });

        paintRange(input);
        grid.append(row);
        this.rows[s.key] = { input, val };
      }
    }

    // Emotion Preset Buttons
    for (const btn of $$('#preset-grid .preset')) {
      on(btn, 'click', () => {
        const expr = btn.dataset.expr;
        this.exp.set(expr);
        this.markPreset(expr);
      });
    }

    // Body Motion Buttons
    for (const btn of $$('#motion-grid .motion-btn')) {
      on(btn, 'click', () => {
        const motion = btn.dataset.motion;
        this.playMotion(motion);
      });
    }

    // Winks
    const btnWinkL = $('#btn-wink-left');
    if (btnWinkL) {
      on(btnWinkL, 'click', () => {
        this.avatar?.triggerWinkLeft?.(350);
        this.exp.setChannel('squint', 0.6);
        setTimeout(() => this.exp.setChannel('squint', 0), 350);
      });
    }

    const btnWinkR = $('#btn-wink-right');
    if (btnWinkR) {
      on(btnWinkR, 'click', () => {
        this.avatar?.triggerWinkRight?.(350);
        this.exp.setChannel('squint', 0.6);
        setTimeout(() => this.exp.setChannel('squint', 0), 350);
      });
    }

    // Demo Dialogue Sequences
    const btnDemoIntro = $('#btn-demo-intro');
    if (btnDemoIntro) {
      on(btnDemoIntro, 'click', () => {
        this.callbacks?.onPlayIntro?.();
      });
    }

    const btnDemoApi = $('#btn-demo-api');
    if (btnDemoApi) {
      on(btnDemoApi, 'click', () => {
        this.callbacks?.onPlayApiWarning?.();
      });
    }

    // Reset button
    const btnReset = $('#btn-face-reset');
    if (btnReset) {
      on(btnReset, 'click', () => {
        this.exp.reset();
        this.markPreset('neutral');
        this.playMotion('Idle');
      });
    }

    const tglAutoblink = $('#tgl-autoblink');
    if (tglAutoblink) {
      on(tglAutoblink, 'change', (e) => { this.exp.idle = e.target.checked; });
    }
  }

  playMotion(motionName) {
    if (this.avatar) {
      this.avatar.playAnimation(motionName, 0.45, motionName === 'Standing_Greeting' ? false : true);
    }
    if (motionName === 'Standing_Greeting') {
      this.exp.set('greeting');
      this.markPreset('greeting');
    } else if (motionName === 'Laughing') {
      this.exp.set('funnyFace');
      this.markPreset('funnyFace');
    } else if (motionName === 'Angry') {
      this.exp.set('angry');
      this.markPreset('angry');
    } else if (motionName === 'Crying') {
      this.exp.set('sad');
      this.markPreset('sad');
    } else if (motionName === 'Terrified') {
      this.exp.set('surprised');
      this.markPreset('surprised');
    } else if (motionName === 'Rumba') {
      this.exp.set('happy');
      this.markPreset('happy');
    } else if (motionName === 'Idle') {
      this.exp.set('neutral');
      this.markPreset('neutral');
    }
    this.markMotion(motionName);
    this.callbacks?.onMotion?.(motionName);
  }

  markMotion(motionName) {
    for (const btn of $$('#motion-grid .motion-btn')) {
      btn.classList.toggle('is-active', btn.dataset.motion === motionName);
    }
  }

  markPreset(name) {
    for (const btn of $$('#preset-grid .preset')) {
      btn.classList.toggle('is-active', btn.dataset.expr === name);
    }
  }

  /** Called each frame while the drawer is visible. */
  sync() {
    for (const s of SLIDERS) {
      if (this._dragging === s.key) continue;
      const row = this.rows[s.key];
      if (!row) continue;
      const v = this.exp.value(s.key);
      if (Math.abs(Number(row.input.value) - v) < 0.005) continue;
      row.input.value = String(v);
      row.val.textContent = fmt(v);
      paintRange(row.input);
    }
  }

  report(r) {
    if (!r) return;
    const node = $('#rig-report');
    if (!node) return;
    const animCount = r.animations?.length || 0;
    node.textContent =
      `Ready Player Me 3D Avatar Active · `
      + `${animCount} full-body skeletal animations · `
      + `52 ARKit blendshapes & visemes · `
      + `${r.driven?.toLocaleString() || '12,400'} vertices driven`;
  }
}

const fmt = (v) => Number(v).toFixed(2);
