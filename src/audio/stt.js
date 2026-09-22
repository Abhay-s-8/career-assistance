/* ============================================================
   AURA — Speech to text
   Web Speech recognition for the words, Web Audio for the meter.
   The two run side by side: recognition gives us text, the
   AnalyserNode gives the HUD something honest to draw.
   ============================================================ */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const sttSupported = !!SR;

export class SpeechInput extends EventTarget {
  constructor({ lang = 'en-US', silenceMs = 1400, bars = 22 } = {}) {
    super();
    this.lang = lang;
    this.silenceMs = silenceMs;
    this.barCount = bars;
    this.listening = false;
    this.finalText = '';
    this.interimText = '';
    this._levels = new Float32Array(bars);
    this._stopping = false;
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  /* ------------------------------------------------------------- start */
  async start() {
    if (this.listening) return;
    if (!SR) {
      this._emit('error', { code: 'unsupported', message: 'This browser has no Web Speech recognition. Chrome or Edge will work.' });
      return;
    }

    // Mic permission + analyser first, so the HUD is live the moment it opens.
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      this._emit('error', {
        code: err?.name === 'NotAllowedError' ? 'denied' : 'mic',
        message: err?.name === 'NotAllowedError'
          ? 'Microphone permission was blocked. Allow it in the address bar to talk to Siya.'
          : 'No microphone was available.',
      });
      return;
    }

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.72;
    src.connect(this.analyser);
    this._freq = new Uint8Array(this.analyser.frequencyBinCount);
    this._time = new Uint8Array(this.analyser.fftSize);

    // Recognition.
    const rec = new SR();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.listening = true;
      this._stopping = false;
      this.finalText = '';
      this.interimText = '';
      this._emit('start');
    };

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      this.interimText = interim;
      this._emit('text', { final: this.finalText.trim(), interim: interim.trim() });
      this._armSilence();
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      this._emit('error', {
        code: e.error,
        message: e.error === 'not-allowed'
          ? 'Microphone permission was blocked.'
          : `Speech recognition stopped (${e.error}).`,
      });
    };

    rec.onend = () => {
      // Chrome ends the session on its own after a pause; restart unless
      // we asked it to stop, so "continuous" really is continuous.
      if (this.listening && !this._stopping) {
        try { rec.start(); return; } catch { /* fall through to teardown */ }
      }
      this._teardown();
      this._emit('end', { text: this.result() });
    };

    this.rec = rec;
    try { rec.start(); } catch { /* already started */ }
    this._armSilence();
    this._tick();
  }

  /** Auto-confirm after a natural pause. */
  _armSilence() {
    clearTimeout(this._silenceT);
    this._silenceT = setTimeout(() => {
      if (this.listening && this.result()) this.stop('silence');
    }, this.silenceMs);
  }

  /* -------------------------------------------------------------- meter */
  _tick() {
    if (!this.listening || !this.analyser) return;
    this.analyser.getByteFrequencyData(this._freq);
    this.analyser.getByteTimeDomainData(this._time);

    // RMS from the time domain — a true loudness reading.
    let sum = 0;
    for (let i = 0; i < this._time.length; i++) {
      const s = (this._time[i] - 128) / 128;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / this._time.length);

    // Log-spaced bars over the speech band so the HUD looks like a voice
    // and not like a spectrum analyser.
    const bins = this._freq.length;
    const n = this.barCount;
    for (let b = 0; b < n; b++) {
      const lo = Math.floor(Math.pow(b / n, 1.7) * bins * 0.55);
      const hi = Math.max(lo + 1, Math.floor(Math.pow((b + 1) / n, 1.7) * bins * 0.55));
      let peak = 0;
      for (let i = lo; i < hi; i++) peak = Math.max(peak, this._freq[i]);
      const v = Math.min(1, (peak / 255) * 1.55);
      this._levels[b] += (v - this._levels[b]) * 0.45;
    }
    this._emit('level', { levels: this._levels, rms });
    this._raf = requestAnimationFrame(() => this._tick());
  }

  /* --------------------------------------------------------------- stop */
  stop(reason = 'user') {
    if (!this.listening) return;
    this._stopping = true;
    this.listening = false;
    this._lastReason = reason;
    clearTimeout(this._silenceT);
    try { this.rec?.stop(); } catch { /* noop */ }
    // onend does the teardown; guard in case it never fires.
    setTimeout(() => { if (this.ctx) { this._teardown(); this._emit('end', { text: this.result(), reason }); } }, 350);
  }

  abort() {
    this.finalText = '';
    this.interimText = '';
    this.stop('cancel');
  }

  _teardown() {
    cancelAnimationFrame(this._raf);
    clearTimeout(this._silenceT);
    this.listening = false;
    this._levels.fill(0);
    this._emit('level', { levels: this._levels, rms: 0 });
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { this.ctx?.close(); } catch { /* noop */ }
    this.stream = null; this.ctx = null; this.analyser = null; this.rec = null;
  }

  result() { return (this.finalText + ' ' + this.interimText).replace(/\s+/g, ' ').trim(); }
}
