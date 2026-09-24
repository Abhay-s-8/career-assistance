/* ============================================================
   AURA — Text to speech coordinator
   Supports high-fidelity ElevenLabs Neural Voice synthesis
   with real-time spectral lip-sync, with zero-latency browser
   SpeechSynthesis fallback.
   ============================================================ */

import { ElevenLabsSpeaker } from './elevenlabs.js';
import { BUILTIN_ELEVENLABS_KEY, ELEVENLABS_VOICES } from '../core/config.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
export const ttsSupported = !!synth || true;

/** Voices that tend to sound least robotic in browser speech, best first. */
const PREFERRED = [
  'google uk english female', 'microsoft aria', 'microsoft jenny', 'samantha',
  'victoria', 'karen', 'microsoft zira', 'google us english', 'natural', 'english'
];

// Persistent global array to prevent Chromium V8 garbage collection of active utterances
if (typeof window !== 'undefined') {
  window._auraActiveUtterances = window._auraActiveUtterances || [];
}

export class Speaker extends EventTarget {
  constructor({ ttsProvider = 'browser', elevenApiKey = '', elevenVoiceId = '' } = {}) {
    super();
    this.muted = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voiceURI = '';
    this.voices = [];
    this.speaking = false;
    this.ttsProvider = ttsProvider || 'browser';
    this._activeUtterances = [];

    this.elevenSpeaker = new ElevenLabsSpeaker({
      apiKey: elevenApiKey || BUILTIN_ELEVENLABS_KEY,
      voiceId: elevenVoiceId || ELEVENLABS_VOICES[0].id,
    });

    this.elevenSpeaker.addEventListener('start', (e) => {
      this.speaking = true;
      this._emit('start', e.detail);
    });

    this.elevenSpeaker.addEventListener('end', (e) => {
      this.speaking = false;
      this._emit('end', e.detail);
    });

    this._load();
    if (synth) {
      synth.onvoiceschanged = () => this._load();
      setTimeout(() => this._load(), 100);
      setTimeout(() => this._load(), 500);
      setTimeout(() => this._load(), 1200);
    }

    // Chrome drops long utterances after ~14 s unless nudged.
    this._keepAlive = setInterval(() => {
      if (this.speaking && synth && !synth.paused) {
        try { synth.pause(); synth.resume(); } catch { /* noop */ }
      }
    }, 5000);
  }

  _emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  setElevenConfig({ apiKey, voiceId }) {
    if (apiKey !== undefined) this.elevenSpeaker.apiKey = apiKey;
    if (voiceId !== undefined) this.elevenSpeaker.voiceId = voiceId;
  }

  _load() {
    if (!synth) return;
    try {
      const all = synth.getVoices() || [];
      const en = all.filter((v) => /^en/i.test(v.lang));
      this.voices = en.length ? en : all;
      if (this.voices.length) {
        this._emit('voices', { voices: this.voices });
      }
    } catch { /* noop */ }
  }

  pickVoice() {
    if (!this.voices || !this.voices.length) {
      this._load();
    }
    if (this.voiceURI && this.voices && this.voices.length) {
      const v = this.voices.find((x) => x.voiceURI === this.voiceURI);
      if (v) return v;
    }
    const voiceList = this.voices || [];
    for (const want of PREFERRED) {
      const v = voiceList.find((x) => x.name.toLowerCase().includes(want));
      if (v) return v;
    }
    return voiceList.find((v) => v.localService) || voiceList.find((v) => /^en/i.test(v.lang)) || voiceList[0] || null;
  }

  /**
   * @param {string} text
   * @param {import('../core/lipsync.js').LipSync} [lip] driven in real time
   */
  async speak(text, lip) {
    if (this.muted || !text || !text.trim()) return false;

    // Clean text: strip markdown symbols, asterisks, brackets, raw code blocks
    const clean = text
      .replace(/```[\s\S]*?```/g, 'Code example shown on screen.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~>[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return false;

    // 1. Attempt ElevenLabs Neural Voice if valid key is configured
    const hasValidElevenKey = !!(
      this.elevenSpeaker?.apiKey &&
      (this.elevenSpeaker.apiKey.startsWith('sk_') || this.elevenSpeaker.apiKey.startsWith('sk-'))
    );

    if (this.ttsProvider === 'elevenlabs' && this.elevenSpeaker && hasValidElevenKey) {
      try {
        const ok = await this.elevenSpeaker.speak(clean, lip);
        if (ok) return true;
      } catch (err) {
        console.warn('[Speaker] ElevenLabs unavailable, falling back to browser speech synthesis:', err?.message || err);
      }
    }

    // 2. High-Performance Browser SpeechSynthesis Fallback
    if (!synth) {
      this.speaking = true;
      this._emit('start', { text: clean });
      lip?.start(clean, this.rate);
      const estDuration = Math.max(1500, clean.length * 55);
      return new Promise((resolve) => {
        setTimeout(() => {
          this._finish(lip);
          resolve(true);
        }, estDuration);
      });
    }

    if (synth.paused) {
      try { synth.resume(); } catch { /* noop */ }
    }

    this._load();
    const matchedVoice = this.pickVoice();

    this.speaking = true;
    lip?.start(clean, this.rate);
    this._emit('start', { text: clean });

    const u = new SpeechSynthesisUtterance(clean);
    if (matchedVoice) {
      u.voice = matchedVoice;
      u.lang = matchedVoice.lang || 'en-US';
    } else {
      u.lang = 'en-US';
    }
    u.rate = Math.max(0.8, Math.min(1.25, this.rate || 1.0));
    u.pitch = Math.max(0.8, Math.min(1.2, this.pitch || 1.0));
    u.volume = 1.0;

    u.onboundary = (e) => {
      if (e.name === 'word' || e.charIndex !== undefined) {
        lip?.mark(e.charIndex || 0, e.charLength || 6);
        this._emit('boundary', { index: e.charIndex || 0 });
      }
    };

    // Retain reference on window to prevent Chromium V8 garbage collection mid-speech
    this._activeUtterances = [u];
    if (typeof window !== 'undefined') {
      window._auraActiveUtterances = [u];
    }

    return new Promise((resolve) => {
      let settled = false;

      const finishAndResolve = (val) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        this._finish(lip);
        resolve(val);
      };

      // Watchdog timeout based on length (10 chars/sec + 4s buffer)
      const maxTime = Math.max(4500, (clean.length / 8) * 1000 + 4000);
      const watchdog = setTimeout(() => {
        if (!settled && this.speaking) {
          finishAndResolve(true);
        }
      }, maxTime);

      u.onstart = () => {
        this.speaking = true;
        lip?.start(clean, this.rate);
      };

      u.onend = () => {
        finishAndResolve(true);
      };

      u.onerror = (e) => {
        console.warn('[AURA TTS] Utterance note:', e.error || e);
        if ((e.error === 'network' || e.error === 'voice-unavailable' || e.error === 'language-unavailable') && u.voice) {
          // Retry immediately with system default voice
          const retryU = new SpeechSynthesisUtterance(clean);
          retryU.lang = 'en-US';
          retryU.volume = 1.0;
          retryU.rate = u.rate;
          retryU.pitch = u.pitch;
          retryU.onboundary = u.onboundary;
          retryU.onend = () => finishAndResolve(true);
          retryU.onerror = () => finishAndResolve(false);
          window._auraActiveUtterances = [retryU];
          try {
            synth.speak(retryU);
            if (synth.paused) synth.resume();
            return;
          } catch { /* noop */ }
        }
        finishAndResolve(false);
      };

      try {
        synth.speak(u);
        if (synth.paused) {
          try { synth.resume(); } catch { /* noop */ }
        }
      } catch (err) {
        console.warn('[AURA TTS] speak error:', err);
        finishAndResolve(false);
      }
    });
  }

  _finish(lip) {
    this.speaking = false;
    this._activeUtterances = [];
    if (typeof window !== 'undefined') {
      window._auraActiveUtterances = [];
    }
    lip?.stop();
    this._emit('end');
  }

  cancel() {
    this.elevenSpeaker?.cancel();
    if (synth && (synth.speaking || synth.pending)) {
      try { synth.cancel(); } catch { /* noop */ }
    }
    this._activeUtterances = [];
    if (typeof window !== 'undefined') {
      window._auraActiveUtterances = [];
    }
    const was = this.speaking;
    this.speaking = false;
    if (was) this._emit('end');
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.muted) this.cancel();
    return this.muted;
  }

  dispose() {
    clearInterval(this._keepAlive);
    this.cancel();
  }
}
