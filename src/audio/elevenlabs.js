/* ============================================================
   AURA — ElevenLabs Neural TTS Engine
   Generates ultra-realistic, studio-grade AI voices using
   ElevenLabs API with Web Audio API real-time spectral
   analysis for high-fidelity 3D facial lip synchronization.
   ============================================================ */

import { BUILTIN_ELEVENLABS_KEY, ELEVENLABS_VOICES } from '../core/config.js';

export class ElevenLabsSpeaker extends EventTarget {
  constructor({ apiKey = '', voiceId = '', model = 'eleven_turbo_v2_5' } = {}) {
    super();
    this.apiKey = apiKey || BUILTIN_ELEVENLABS_KEY;
    this.voiceId = voiceId || ELEVENLABS_VOICES[0].id;
    this.model = model || 'eleven_turbo_v2_5';
    this.audioContext = null;
    this.currentSource = null;
    this.analyser = null;
    this.speaking = false;
    this._rafId = null;
    this._audioCache = new Map();
    this._abortController = null;
  }

  _emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  _ensureAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  /**
   * Synthesizes speech with ElevenLabs and plays back with real-time lip analysis
   * @param {string} text
   * @param {import('../core/lipsync.js').LipSync} [lip]
   * @returns {Promise<boolean>}
   */
  async speak(text, lip = null) {
    if (!text || !text.trim()) return false;
    this.cancel();

    const voiceId = this.voiceId || ELEVENLABS_VOICES[0].id;
    const cacheKey = `${voiceId}_${text.trim()}`;

    this.speaking = true;
    this._emit('start', { text });
    lip?.start(text, 1.0);

    this._abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (this._abortController) {
        this._abortController.abort();
      }
    }, 8500);

    try {
      let arrayBuffer;
      if (this._audioCache.has(cacheKey)) {
        arrayBuffer = this._audioCache.get(cacheKey);
      } else {
        const payload = {
          text: text,
          voiceId: voiceId,
          model_id: this.model || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.85,
            style: 0.05,
            use_speaker_boost: true,
          },
          customApiKey: (this.apiKey || '').trim() || undefined,
        };

        // Primary: Secure backend proxy (hides API key from frontend)
        let response = await fetch('/api/elevenlabs/tts', {
          method: 'POST',
          signal: this._abortController.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // Fallback for static hosts only if client provided custom key
        if (response.status === 404 && this.apiKey) {
          response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
            {
              method: 'POST',
              signal: this._abortController.signal,
              headers: {
                'xi-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
              },
              body: JSON.stringify({
                text: text,
                model_id: this.model || 'eleven_turbo_v2_5',
                voice_settings: payload.voice_settings,
              }),
            }
          );
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.detail?.message || errData?.error?.message || `ElevenLabs API error: ${response.status}`);
        }

        arrayBuffer = await response.arrayBuffer();
        if (this._audioCache.size < 50) {
          this._audioCache.set(cacheKey, arrayBuffer);
        }
      }

      clearTimeout(timeoutId);

      const ctx = this._ensureAudioContext();
      if (!ctx) throw new Error('Web Audio API not supported in this browser.');

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

      return await new Promise((resolve) => {
        if (!this.speaking) {
          resolve(false);
          return;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.45;

        source.connect(analyser);
        analyser.connect(ctx.destination);

        this.currentSource = source;
        this.analyser = analyser;

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const timeData = new Uint8Array(analyser.fftSize);

        const analyzeFrame = () => {
          if (!this.speaking || !this.analyser) {
            cancelAnimationFrame(this._rafId);
            return;
          }

          analyser.getByteFrequencyData(freqData);
          analyser.getByteTimeDomainData(timeData);

          // Calculate RMS loudness
          let sumSquares = 0;
          for (let i = 0; i < timeData.length; i++) {
            const val = (timeData[i] - 128) / 128;
            sumSquares += val * val;
          }
          const rms = Math.sqrt(sumSquares / timeData.length);

          // Extract low (100-500Hz), mid (500-1800Hz), and high (2000-6000Hz) bands
          let lowSum = 0, midSum = 0, highSum = 0;
          const binHz = (ctx.sampleRate || 44100) / analyser.fftSize;

          for (let i = 0; i < freqData.length; i++) {
            const hz = i * binHz;
            const norm = freqData[i] / 255;
            if (hz >= 80 && hz < 600) lowSum += norm;
            else if (hz >= 600 && hz < 2000) midSum += norm;
            else if (hz >= 2000 && hz < 6500) highSum += norm;
          }

          const low = Math.min(1, (lowSum / 12) * 1.8);
          const mid = Math.min(1, (midSum / 20) * 2.2);
          const high = Math.min(1, (highSum / 30) * 2.5);

          if (lip?.feedSpectrum) {
            lip.feedSpectrum(low, mid, high, rms);
          } else if (lip?.pushAmplitude) {
            lip.pushAmplitude(rms);
          }

          this._rafId = requestAnimationFrame(analyzeFrame);
        };

        this._rafId = requestAnimationFrame(analyzeFrame);

        source.onended = () => {
          cancelAnimationFrame(this._rafId);
          this._finish(lip);
          resolve(true);
        };

        source.start(0);
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[ElevenLabs TTS]', err.message || err);
      cancelAnimationFrame(this._rafId);
      this._finish(lip);
      this._emit('error', { error: err });
      throw err;
    }
  }

  _finish(lip) {
    this.speaking = false;
    this.currentSource = null;
    this.analyser = null;
    lip?.stop();
    this._emit('end');
  }

  cancel() {
    if (this._abortController) {
      try { this._abortController.abort(); } catch { /* noop */ }
      this._abortController = null;
    }
    cancelAnimationFrame(this._rafId);
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch { /* noop */ }
      this.currentSource = null;
    }
    const was = this.speaking;
    this.speaking = false;
    if (was) this._emit('end');
  }
}
