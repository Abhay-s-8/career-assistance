/* ============================================================
   AURA — Voice HUD
   Live transcript banner + a waveform driven by the real
   AnalyserNode, not a decorative animation.
   ============================================================ */

import { $, el } from './dom.js';

export class VoiceHud {
  constructor(barCount = 22) {
    this.root = $('#voice-hud');
    this.textWrap = this.root.querySelector('.voice-hud__text');
    this.finalEl = $('#voice-final');
    this.interimEl = $('#voice-interim');
    this.wave = $('#wave');
    this.bars = [];
    for (let i = 0; i < barCount; i++) {
      const b = el('i');
      this.wave.append(b);
      this.bars.push(b);
    }
  }

  open() {
    this.root.classList.add('is-open');
    this.set('', '');
  }

  close() {
    this.root.classList.remove('is-open');
    this.levels(null);
  }

  get isOpen() { return this.root.classList.contains('is-open'); }

  set(final, interim) {
    this.finalEl.textContent = final ? final + ' ' : '';
    this.interimEl.textContent = interim || '';
    this.textWrap.classList.toggle('has-text', !!(final || interim));
  }

  levels(arr) {
    if (!arr) {
      for (const b of this.bars) b.style.height = '3px';
      return;
    }
    for (let i = 0; i < this.bars.length; i++) {
      const v = arr[i] ?? 0;
      this.bars[i].style.height = `${3 + v * 25}px`;
    }
  }
}
