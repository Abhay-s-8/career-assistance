/* ============================================================
   AURA — Settings modal
   Provider + key, ElevenLabs neural voice, render quality.
   ============================================================ */

import { $, $$, on, el, paintRange, toast } from './dom.js';
import { STORAGE_KEY, BUILTIN_ELEVENLABS_KEY, ELEVENLABS_VOICES } from '../core/config.js';

const DEFAULTS = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-3.6-flash',
  ttsProvider: 'browser',
  elevenApiKey: '',
  elevenVoiceId: ELEVENLABS_VOICES[0].id,
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  quality: 3,
  particles: 420,
  faceLight: 0.85,
  exposure: 0.95,
  muted: false,
  theme: 'studio',
  showChair: true,
  showRoom: true,
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const s = { ...DEFAULTS, ...saved };

    // Never store or load Gemini API key in frontend
    if (s.provider === 'gemini' || !s.provider || s.provider === 'local') {
      s.provider = 'gemini';
      s.apiKey = '';
      s.model = 'gemini-3.6-flash';
    } else if (s.apiKey && (!s.apiKey.startsWith('sk-'))) {
      s.apiKey = '';
    }

    if (!s.model) {
      s.model = 'gemini-3.6-flash';
    }

    // Default to browser speech unless user specifically configured ElevenLabs with a key
    if (!s.ttsProvider || (s.ttsProvider === 'elevenlabs' && !s.elevenApiKey?.startsWith('sk_'))) {
      s.ttsProvider = 'browser';
    }

    s.elevenApiKey = '';
    if (!s.elevenVoiceId) {
      s.elevenVoiceId = ELEVENLABS_VOICES[0].id;
    }

    saveSettings(s);
    return s;
  } catch { return { ...DEFAULTS }; }
}

export function saveSettings(s) {
  try {
    const toSave = { ...s };
    // Gemini and ElevenLabs keys are kept on the server, never stored in browser localStorage
    if (toSave.provider === 'gemini') {
      toSave.apiKey = '';
    }
    toSave.elevenApiKey = '';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* private mode */ }
}

const QUALITY_LABEL = { 1: 'Performance', 2: 'Balanced', 3: 'High' };

export class SettingsModal {
  constructor(settings, onApply) {
    this.settings = settings;
    this.onApply = onApply;
    this.root = $('#settings');

    this.provider = $('#set-provider');
    this.key = $('#set-key');
    this.model = $('#set-model');
    this.ttsProvider = $('#set-tts-provider');
    this.elevenKey = $('#set-eleven-key');
    this.elevenVoice = $('#set-eleven-voice');
    this.voice = $('#set-voice');
    this.rate = $('#set-rate');
    this.pitch = $('#set-pitch');
    this.quality = $('#set-quality');
    this.particles = $('#set-particles');
    this.faceLight = $('#set-facelight');
    this.exposure = $('#set-exposure');

    this._fill();
    this._wire();
  }

  _fill() {
    const s = this.settings;
    if (this.provider) this.provider.value = s.provider;
    if (this.key) {
      this.key.value = s.provider === 'openai' ? (s.apiKey || '') : '';
    }
    if (this.model) this.model.value = s.model;
    if (this.ttsProvider) this.ttsProvider.value = s.ttsProvider || 'elevenlabs';
    if (this.elevenKey) this.elevenKey.value = s.elevenApiKey || BUILTIN_ELEVENLABS_KEY;
    if (this.elevenVoice) this.elevenVoice.value = s.elevenVoiceId || ELEVENLABS_VOICES[0].id;
    if (this.rate) this.rate.value = s.rate;
    if (this.pitch) this.pitch.value = s.pitch;
    if (this.quality) this.quality.value = s.quality;
    if (this.particles) this.particles.value = s.particles;
    if (this.faceLight) this.faceLight.value = s.faceLight;
    if (this.exposure) this.exposure.value = s.exposure;
    this._syncLabels();
    this._syncVisibility();
  }

  _syncLabels() {
    if ($('#out-rate')) $('#out-rate').textContent = Number(this.rate?.value || 1).toFixed(2);
    if ($('#out-pitch')) $('#out-pitch').textContent = Number(this.pitch?.value || 1).toFixed(2);
    if ($('#out-quality')) $('#out-quality').textContent = QUALITY_LABEL[this.quality?.value] || 'High';
    if ($('#out-particles')) $('#out-particles').textContent = this.particles?.value || 420;
    if ($('#out-facelight')) $('#out-facelight').textContent = Number(this.faceLight?.value || 0.85).toFixed(2);
    if ($('#out-exposure')) $('#out-exposure').textContent = Number(this.exposure?.value || 0.95).toFixed(2);
    [this.rate, this.pitch, this.quality, this.particles, this.faceLight, this.exposure].filter(Boolean).forEach(paintRange);
  }

  _syncVisibility() {
    const p = this.provider?.value;
    for (const field of $$('[data-when]')) {
      field.hidden = !field.dataset.when.split(' ').includes(p);
    }
    const tts = this.ttsProvider?.value || 'elevenlabs';
    for (const field of $$('[data-tts]')) {
      field.hidden = field.dataset.tts !== tts;
    }
  }

  _wire() {
    on($('#btn-settings'), 'click', () => this.open());
    for (const b of $$('[data-close-modal]')) {
      on(b, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      });
    }
    if (this.root) {
      on(this.root, 'click', (e) => {
        if (e.target === this.root || e.target.classList.contains('modal__scrim') || e.target.closest('[data-close-modal]') || !e.target.closest('.modal__panel')) {
          this.close();
        }
      });
    }
    on(document, 'keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.close(); });

    if (this.provider) on(this.provider, 'change', () => this._syncVisibility());
    if (this.ttsProvider) on(this.ttsProvider, 'change', () => this._syncVisibility());

    for (const r of [this.rate, this.pitch, this.quality, this.particles, this.faceLight, this.exposure].filter(Boolean)) {
      on(r, 'input', () => this._syncLabels());
    }

    // Live preview for lighting & exposure
    for (const r of [this.faceLight, this.exposure].filter(Boolean)) {
      on(r, 'input', () => this.onApply?.(
        { ...this.settings, faceLight: Number(this.faceLight.value), exposure: Number(this.exposure.value) },
        { livePreview: true }
      ));
    }

    on($('#set-save'), 'click', () => {
      const selectedProvider = this.provider?.value || 'gemini';
      Object.assign(this.settings, {
        provider: selectedProvider,
        apiKey: selectedProvider === 'openai' ? (this.key?.value.trim() || '') : '',
        model: this.model?.value.trim() || 'gemini-3.6-flash',
        ttsProvider: this.ttsProvider?.value || 'elevenlabs',
        elevenApiKey: (this.elevenKey?.value || '').trim(),
        elevenVoiceId: this.elevenVoice?.value || ELEVENLABS_VOICES[0].id,
        voiceURI: this.voice?.value || '',
        rate: Number(this.rate?.value || 1),
        pitch: Number(this.pitch?.value || 1),
        quality: Number(this.quality?.value || 3),
        particles: Number(this.particles?.value || 420),
        faceLight: Number(this.faceLight?.value || 0.85),
        exposure: Number(this.exposure?.value || 0.95),
      });
      saveSettings(this.settings);
      this.onApply?.(this.settings);
      this.close();
      toast('✓ Settings & AI configuration saved.');
    });

    on($('#set-test'), () => {
      this.onApply?.(
        {
          ...this.settings,
          ttsProvider: this.ttsProvider?.value || 'elevenlabs',
          elevenApiKey: (this.elevenKey?.value || '').trim(),
          elevenVoiceId: this.elevenVoice?.value || ELEVENLABS_VOICES[0].id,
          voiceURI: this.voice?.value || '',
          rate: Number(this.rate?.value || 1),
          pitch: Number(this.pitch?.value || 1),
        },
        { test: true }
      );
    });
  }

  setVoices(voices) {
    if (!this.voice) return;
    const current = this.settings.voiceURI;
    this.voice.innerHTML = '';
    this.voice.append(el('option', { value: '' }, 'Auto — best English voice'));
    for (const v of voices) {
      this.voice.append(el('option', { value: v.voiceURI }, `${v.name} · ${v.lang}`));
    }
    this.voice.value = current || '';
  }

  get isOpen() { return this.root.classList.contains('is-open'); }
  open() { this._fill(); this.root.classList.add('is-open'); }
  close() { this.root.classList.remove('is-open'); }
}
