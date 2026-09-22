/* ============================================================
   AURA — App chrome
   Drawers, dock, scene toolbar, fullscreen, status chip and the
   keyboard shortcuts that tie them together.
   ============================================================ */

import { $, $$, on, toast } from './dom.js';

const STATE_LABEL = { idle: 'Idle', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' };

export class Shell {
  constructor(handlers = {}) {
    this.h = handlers;
    this.chip = $('#state-chip');
    this.chipLabel = $('#state-label');
    this._wireDrawers();
    this._wireToolbar();
    this._wireFullscreen();
    this._wireKeys();
  }

  /* --------------------------------------------------------- drawers */
  _wireDrawers() {
    this.drawers = { face: $('#face-drawer'), chat: $('#chat-drawer'), resume: $('#resume-drawer') };
    this.dockBtns = { face: $('#btn-face'), chat: $('#btn-chat'), resume: $('#btn-resume'), interview: $('#btn-interview'), career: $('#btn-career') };

    for (const [name, btn] of Object.entries(this.dockBtns)) {
      if (btn) {
        if (name === 'interview') {
          on(btn, 'click', () => this.h.onInterview?.());
        } else if (name === 'career') {
          on(btn, 'click', () => this.h.onCareerDiscovery?.());
        } else {
          on(btn, 'click', () => this.toggleDrawer(name));
        }
      }
    }
    for (const btn of $$('.drawer__close')) {
      on(btn, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = btn.dataset.close;
        const name = target === 'face-drawer' ? 'face' : target === 'resume-drawer' ? 'resume' : 'chat';
        this.closeDrawer(name);
      });
    }

    // Close any open side drawer when clicking anywhere outside of it
    on(document, 'pointerdown', (e) => {
      const openKey = Object.keys(this.drawers).find((k) => this.isOpen(k));
      if (!openKey) return;

      const openDrawerEl = this.drawers[openKey];
      // If clicked inside the currently open drawer, keep it open
      if (openDrawerEl && openDrawerEl.contains(e.target)) return;

      // If clicked on dock buttons, let dock handlers manage toggling
      if (e.target.closest('.dock')) return;

      // If clicked on modals / full overlays, let modal handlers manage themselves
      if (e.target.closest('.modal, .career-modal-backdrop, .interview-arena, .drawer--profile, #profile-backdrop')) return;

      // If clicked on topbar buttons that open modals (like settings, auth, profile)
      if (e.target.closest('#btn-settings, #btn-topbar-signin, #btn-topbar-signup, #btn-topbar-user, #model-chip')) return;

      // Otherwise, close the active drawer
      this.closeDrawer(openKey);
    });
  }

  openDrawer(name) {
    for (const [k, node] of Object.entries(this.drawers)) {
      const open = k === name;
      node.classList.toggle('is-open', open);
      this.dockBtns[k].classList.toggle('is-active', open);
    }
    if (name === 'chat') setTimeout(() => $('#input')?.focus(), 240);
    this.h.onDrawer?.(name);
  }

  closeDrawer(name) {
    this.drawers[name]?.classList.remove('is-open');
    this.dockBtns[name]?.classList.remove('is-active');
    this.h.onDrawer?.(null);
  }

  toggleDrawer(name) {
    if (this.drawers[name].classList.contains('is-open')) this.closeDrawer(name);
    else this.openDrawer(name);
  }

  isOpen(name) { return this.drawers[name]?.classList.contains('is-open'); }

  /* --------------------------------------------------------- toolbar */
  _wireToolbar() {
    for (const btn of $$('#seg-camera .seg__btn')) {
      on(btn, 'click', () => this.h.onCamera?.(btn.dataset.cam));
    }
    for (const btn of $$('#seg-theme .swatch')) {
      on(btn, 'click', () => this.h.onTheme?.(btn.dataset.theme));
    }
    on($('#tgl-hologram'), 'change', (e) => this.h.onHologram?.(e.target.checked));
    const chairSwitch = $('#tgl-chair');
    if (chairSwitch) on(chairSwitch, 'change', (e) => this.h.onChair?.(e.target.checked));
    const roomSwitch = $('#tgl-room');
    if (roomSwitch) on(roomSwitch, 'change', (e) => this.h.onRoom?.(e.target.checked));
  }

  markCamera(name) {
    for (const btn of $$('#seg-camera .seg__btn')) btn.classList.toggle('is-active', btn.dataset.cam === name);
  }

  markTheme(name) {
    for (const btn of $$('#seg-theme .swatch')) btn.classList.toggle('is-active', btn.dataset.theme === name);
  }

  markHologram(on_) { if ($('#tgl-hologram')) $('#tgl-hologram').checked = !!on_; }

  markChair(on_) { if ($('#tgl-chair')) $('#tgl-chair').checked = !!on_; }

  markRoom(on_) { if ($('#tgl-room')) $('#tgl-room').checked = !!on_; }

  /* ------------------------------------------------------ fullscreen */
  _wireFullscreen() {
    const btn = $('#btn-fullscreen');
    const paint = () => {
      const fs = !!document.fullscreenElement;
      btn.querySelector('use').setAttribute('href', fs ? '#i-collapse' : '#i-expand');
      btn.title = fs ? 'Exit fullscreen' : 'Fullscreen';
    };
    on(btn, 'click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } catch { toast('This browser refused fullscreen.'); }
    });
    on(document, 'fullscreenchange', paint);
    paint();
  }

  /* -------------------------------------------------------- shortcuts */
  _wireKeys() {
    on(document, 'keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if (e.key === 'Escape') { this.h.onEscape?.(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case '1': this.h.onCamera?.('portrait'); break;
        case '2': this.h.onCamera?.('full'); break;
        case '3': this.h.onCamera?.('orbit'); break;
        case 'f': this.toggleDrawer('face'); break;
        case 'c': this.toggleDrawer('chat'); break;
        case 'r': this.toggleDrawer('resume'); break;
        case 'i': this.h.onInterview?.(); break;
        case 'h': { const t = $('#tgl-hologram'); t.checked = !t.checked; this.h.onHologram?.(t.checked); break; }
        case 'm': this.h.onMic?.(); break;
        default: break;
      }
    });
  }

  markResumeActive(hasResume) {
    this.dockBtns?.resume?.classList.toggle('has-profile', !!hasResume);
  }

  /* ------------------------------------------------------------ state */
  setState(state) {
    this.chip.dataset.state = state;
    this.chipLabel.textContent = STATE_LABEL[state] || 'Idle';
  }
}
