/* ============================================================
   AURA / AKSHAY — Auth Modal & Profile Management UI
   Sleek glassmorphic sign-in, account registration, and personalized
   profile dialog with 1-click demo evaluation.
   ============================================================ */

import { $, $$, on, el, toast } from './dom.js';
import { auth } from '../core/auth.js';
import { parseResumeFile, getSampleResume, loadSavedResume } from '../ai/resumeParser.js';

export class AuthModal {
  constructor({ onAuthSuccess, onSignOut, onProfileUpdated } = {}) {
    this.onAuthSuccess = onAuthSuccess;
    this.onSignOut = onSignOut;
    this.onProfileUpdated = onProfileUpdated;
    this.root = null;
    this.profileDrawer = null;
    this.currentTab = 'signup'; // default to signup so new visitors can personalize immediately
    this.signupResume = null;

    this._buildModal();
    this._buildProfileDrawer();
    this._wireGlobalEvents();
  }

  _buildModal() {
    this.root = el('div', { id: 'auth-modal', class: 'modal auth-modal' },
      el('div', { class: 'modal__backdrop', 'data-close-auth': '1' }),
      el('div', { class: 'modal__box glass auth-card' },
        el('button', { class: 'modal__close', 'data-close-auth': '1', title: 'Close dialog', 'aria-label': 'Close dialog' },
          el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
            el('path', { d: 'M18 6L6 18M6 6l12 12' })
          )
        ),
        el('div', { class: 'auth-header', id: 'auth-modal-header' },
          el('div', { class: 'auth-badge', id: 'auth-modal-badge' }, '✦ NEW CANDIDATE REGISTRATION'),
          el('h2', { class: 'auth-title', id: 'auth-modal-title' }, 'Create Your Account'),
          el('p', { class: 'auth-sub', id: 'auth-modal-sub' }, 'Attach your resume to get tailored mock interviews, ATS resume diagnostics, and a personalized career roadmap.')
        ),
        el('div', { class: 'auth-tabs' },
          el('button', { class: 'auth-tab-btn is-active', id: 'tab-btn-signup', type: 'button' }, 'Create Account'),
          el('button', { class: 'auth-tab-btn', id: 'tab-btn-signin', type: 'button' }, 'Sign In')
        ),

        // SIGN UP PANEL
        el('div', { class: 'auth-panel is-active', id: 'panel-signup' },
          el('form', { class: 'auth-form', id: 'form-signup' },
            // Step 1: Upload Personal Resume (Compulsory)
            el('div', { class: 'field auth-resume-field' },
              el('label', { class: 'auth-field-label-compulsory' },
                el('span', {}, '1. Upload Personal Resume *'),
                el('span', { class: 'auth-required-tag' }, '★ COMPULSORY')
              ),
              el('div', { class: 'auth-resume-uploader', id: 'signup-resume-box' },
                el('input', { type: 'file', id: 'signup-resume-file', accept: '.pdf,.docx,.txt,.md,.json,.rtf', style: 'display:none' }),
                el('div', { class: 'auth-resume-info' },
                  el('span', { class: 'auth-resume-icon', id: 'signup-resume-icon' }, '📄'),
                  el('div', { class: 'auth-resume-text' },
                    el('b', { id: 'signup-resume-title' }, 'Upload Your Personal Resume (PDF, DOCX, TXT) *'),
                    el('p', { id: 'signup-resume-sub' }, 'Mandatory for registration: Siya parses your background, extracted skills, and experience to generate personalized mock questions and voice conversations.')
                  )
                ),
                el('div', { class: 'auth-resume-actions' },
                  el('button', { class: 'pill pill--xs pill--accent', type: 'button', id: 'btn-signup-browse-resume' }, '📁 Browse & Upload Resume *'),
                  el('button', { class: 'pill pill--xs pill--subtle', type: 'button', id: 'btn-signup-clear-resume', style: 'display:none;' }, '✕ Remove / Change File')
                )
              ),
              el('p', { class: 'field__hint', id: 'signup-resume-hint' }, '💡 Your resume directly personalizes Siya’s speech tone, role questions, and ATS evaluation.')
            ),

            el('div', { class: 'auth-fields-divider' }, el('span', {}, '2. Confirm Your Profile Details')),

            el('div', { class: 'field' },
              el('label', { for: 'reg-name' }, 'Your Full Name / Preferred Name *'),
              el('input', {
                id: 'reg-name',
                type: 'text',
                placeholder: 'e.g. Abhay Kumar',
                required: 'true',
                autocomplete: 'name'
              }),
              el('p', { class: 'field__hint' }, '💡 Siya will speak to you and address you directly by this name.')
            ),
            el('div', { class: 'field' },
              el('label', { for: 'reg-role' }, 'Target Role or Specialty'),
              el('input', {
                id: 'reg-role',
                type: 'text',
                placeholder: 'e.g. Staff Full-Stack Engineer / AI Engineer / Student',
                autocomplete: 'organization-title'
              }),
              el('p', { class: 'field__hint' }, 'Mock interviews and questions will automatically match this domain.')
            ),
            el('div', { class: 'field' },
              el('label', { for: 'reg-email' }, 'Email Address *'),
              el('input', {
                id: 'reg-email',
                type: 'email',
                placeholder: 'name@example.com',
                required: 'true',
                autocomplete: 'email'
              })
            ),
            el('div', { class: 'field' },
              el('label', { for: 'reg-pass' }, 'Password *'),
              el('input', {
                id: 'reg-pass',
                type: 'password',
                placeholder: 'At least 4 characters',
                required: 'true',
                autocomplete: 'new-password'
              })
            ),
            el('div', { class: 'auth-error', id: 'signup-error', hidden: 'true' }),
            el('button', { class: 'auth-submit-btn', type: 'submit' }, 'Create Account & Personalize Siya →'),
            el('p', { class: 'auth-switch-prompt' },
              'Already have an account? ',
              el('button', { type: 'button', class: 'auth-switch-link', id: 'link-goto-signin' }, 'Sign in here →')
            )
          )
        ),

        // SIGN IN PANEL
        el('div', { class: 'auth-panel', id: 'panel-signin', hidden: 'true' },
          el('form', { class: 'auth-form', id: 'form-signin' },
            el('div', { class: 'field' },
              el('label', { for: 'login-email' }, 'Email Address *'),
              el('input', {
                id: 'login-email',
                type: 'email',
                placeholder: 'name@example.com',
                required: 'true',
                autocomplete: 'email'
              })
            ),
            el('div', { class: 'field' },
              el('label', { for: 'login-pass' }, 'Password *'),
              el('input', {
                id: 'login-pass',
                type: 'password',
                placeholder: 'Your password',
                required: 'true',
                autocomplete: 'current-password'
              })
            ),
            el('div', { class: 'auth-error', id: 'signin-error', hidden: 'true' }),
            el('button', { class: 'auth-submit-btn', type: 'submit' }, 'Sign In →'),
            el('p', { class: 'auth-switch-prompt' },
              'New candidate? ',
              el('button', { type: 'button', class: 'auth-switch-link', id: 'link-goto-signup' }, 'Create an account with resume →')
            )
          )
        ),

        // DEMO / GUEST SHORTCUT
        el('div', { class: 'auth-demo-wrap' },
          el('div', { class: 'auth-divider' }, el('span', {}, 'OR')),
          el('button', { class: 'auth-demo-btn', id: 'btn-auth-demo', type: 'button' },
            '⚡ Instant 1-Click Demo Profile (Abhay)'
          )
        )
      )
    );

    document.body.append(this.root);
    this._wireModalEvents();
  }

  _applyResumeToSignup(resume, fileName) {
    const box = $('#signup-resume-box', this.root);
    if (box) box.classList.add('is-attached');
    const icon = $('#signup-resume-icon', this.root);
    if (icon) icon.textContent = '✓';
    const title = $('#signup-resume-title', this.root);
    if (title) title.textContent = `✓ Personal Resume Attached: ${resume.name || fileName}`;
    const sub = $('#signup-resume-sub', this.root);
    if (sub) {
      const topSkills = resume.skills?.slice(0, 3).join(', ') || 'Engineering';
      sub.textContent = `${resume.headline || 'Profile'} • ${resume.skills?.length || 0} skills detected (${topSkills})`;
    }
    const browseBtn = $('#btn-signup-browse-resume', this.root);
    if (browseBtn) browseBtn.textContent = '🔄 Replace Resume File';
    const clearBtn = $('#btn-signup-clear-resume', this.root);
    if (clearBtn) clearBtn.style.display = 'inline-flex';

    const form = $('#form-signup', this.root);
    if (form) {
      if (resume.name && resume.name !== 'Candidate') {
        const nameInput = $('#reg-name', form);
        if (nameInput) nameInput.value = resume.name;
      }
      if (resume.headline) {
        const roleInput = $('#reg-role', form);
        if (roleInput) roleInput.value = resume.headline;
      }
      if (resume.contact?.email) {
        const emailInput = $('#reg-email', form);
        if (emailInput) emailInput.value = resume.contact.email;
      }
    }
    const err = $('#signup-error', this.root);
    if (err) err.hidden = true;
  }

  _clearSignupResume() {
    this.signupResume = null;
    const fileInput = $('#signup-resume-file', this.root);
    if (fileInput) fileInput.value = '';
    const box = $('#signup-resume-box', this.root);
    if (box) box.classList.remove('is-attached');
    const icon = $('#signup-resume-icon', this.root);
    if (icon) icon.textContent = '📄';
    const title = $('#signup-resume-title', this.root);
    if (title) title.textContent = 'Upload Your Personal Resume (PDF, DOCX, TXT) *';
    const sub = $('#signup-resume-sub', this.root);
    if (sub) sub.textContent = 'Mandatory for registration: Siya parses your background, extracted skills, and experience to generate personalized mock questions and voice conversations.';
    const browseBtn = $('#btn-signup-browse-resume', this.root);
    if (browseBtn) browseBtn.textContent = '📁 Browse & Upload Resume *';
    const clearBtn = $('#btn-signup-clear-resume', this.root);
    if (clearBtn) clearBtn.style.display = 'none';
  }

  _buildProfileDrawer() {
    this.profileBackdrop = el('div', { id: 'profile-backdrop', class: 'profile-backdrop', 'data-close-profile': '1' });
    document.body.append(this.profileBackdrop);

    this.profileDrawer = el('div', { id: 'profile-drawer', class: 'drawer drawer--profile glass' },
      el('div', { class: 'drawer__head' },
        el('div', { class: 'drawer__title-wrap' },
          el('div', { class: 'profile-head-badge' }, 'USER PROFILE'),
          el('h3', { class: 'drawer__title', id: 'profile-title-name' }, 'Personal Profile')
        ),
        el('button', { class: 'drawer__close', 'data-close-profile': '1', title: 'Close Profile', type: 'button' },
          el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
            el('path', { d: 'M18 6L6 18M6 6l12 12' })
          )
        )
      ),
      el('div', { class: 'drawer__body' },
        el('div', { class: 'profile-card glass' },
          el('div', { class: 'profile-avatar-large', id: 'profile-avatar-icon' }, 'AK'),
          el('div', { class: 'profile-meta' },
            el('h4', { class: 'profile-name-text', id: 'prof-card-name' }, 'User Name'),
            el('p', { class: 'profile-role-text', id: 'prof-card-role' }, 'Software Professional'),
            el('p', { class: 'profile-email-text mono', id: 'prof-card-email' }, 'user@example.com')
          )
        ),
        el('form', { class: 'profile-edit-form', id: 'form-profile-edit' },
          el('h5', { class: 'profile-section-title' }, 'Personalization Settings'),
          el('div', { class: 'field' },
            el('label', { for: 'edit-name' }, 'Display / Spoken Name'),
            el('input', { id: 'edit-name', type: 'text', required: 'true' }),
            el('p', { class: 'field__hint' }, 'How Siya should address you verbally.')
          ),
          el('div', { class: 'field' },
            el('label', { for: 'edit-role' }, 'Target Role'),
            el('input', { id: 'edit-role', type: 'text', placeholder: 'e.g. Lead Backend Engineer' })
          ),
          el('button', { class: 'btn btn--prime', type: 'submit' }, 'Save Profile & Refresh Siya')
        ),
        el('div', { class: 'profile-actions', style: 'display: flex; flex-direction: column; gap: 8px;' },
          el('button', { class: 'btn btn--prime', id: 'btn-switch-account', type: 'button', style: 'width: 100%;' }, '+ Sign Up Another Candidate / Switch'),
          el('button', { class: 'btn btn--secondary', 'data-close-profile': '1', type: 'button', style: 'width: 100%;' }, '✕ Close Profile'),
          el('button', { class: 'btn btn--danger', id: 'btn-sign-out', type: 'button' }, 'Sign Out of Account')
        )
      )
    );

    document.body.append(this.profileDrawer);
    this._wireProfileEvents();
  }

  _wireModalEvents() {
    const tabSignup = $('#tab-btn-signup', this.root);
    const tabSignin = $('#tab-btn-signin', this.root);
    const panelSignup = $('#panel-signup', this.root);
    const panelSignin = $('#panel-signin', this.root);
    const formSignup = $('#form-signup', this.root);
    const formSignin = $('#form-signin', this.root);
    const errSignup = $('#signup-error', this.root);
    const errSignin = $('#signin-error', this.root);

    this.switchTab = (tab) => {
      this.currentTab = tab;
      const isSignup = tab === 'signup';
      tabSignup?.classList.toggle('is-active', isSignup);
      tabSignin?.classList.toggle('is-active', !isSignup);

      if (panelSignup) {
        panelSignup.hidden = !isSignup;
        panelSignup.classList.toggle('is-active', isSignup);
        panelSignup.style.display = isSignup ? 'block' : 'none';
      }
      if (panelSignin) {
        panelSignin.hidden = isSignup;
        panelSignin.classList.toggle('is-active', !isSignup);
        panelSignin.style.display = !isSignup ? 'block' : 'none';
      }
      if (formSignup) formSignup.hidden = !isSignup;
      if (formSignin) formSignin.hidden = isSignup;

      if (errSignup) errSignup.hidden = true;
      if (errSignin) errSignin.hidden = true;
      this._updateHeader(tab);

      setTimeout(() => {
        const input = isSignup ? $('#reg-name', this.root) : $('#login-email', this.root);
        input?.focus();
      }, 60);
    };

    on(tabSignup, 'click', () => this.switchTab('signup'));
    on(tabSignin, 'click', () => this.switchTab('signin'));

    // In-form switch links
    const linkGotoSignin = $('#link-goto-signin', this.root);
    if (linkGotoSignin) {
      on(linkGotoSignin, 'click', () => this.switchTab('signin'));
    }
    const linkGotoSignup = $('#link-goto-signup', this.root);
    if (linkGotoSignup) {
      on(linkGotoSignup, 'click', () => this.switchTab('signup'));
    }

    // Resume browse & upload trigger
    const browseResumeBtn = $('#btn-signup-browse-resume', this.root);
    const resumeFileInput = $('#signup-resume-file', this.root);
    const resumeBox = $('#signup-resume-box', this.root);

    if (browseResumeBtn && resumeFileInput) {
      on(browseResumeBtn, 'click', (e) => {
        e.stopPropagation();
        resumeFileInput.click();
      });
      on(resumeFileInput, 'change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const title = $('#signup-resume-title', this.root);
        if (title) title.textContent = `Parsing ${file.name}…`;
        try {
          const parsed = await parseResumeFile(file);
          this.signupResume = parsed;
          this._applyResumeToSignup(parsed, file.name);
          toast(`✓ Personal resume loaded for ${parsed.name || file.name}`);
        } catch (err) {
          console.error(err);
          toast(err.message || 'Could not parse resume.');
          this._clearSignupResume();
        }
      });
    }

    // Drag & Drop Resume Upload Support
    if (resumeBox) {
      on(resumeBox, 'click', (e) => {
        if (e.target.closest('#btn-signup-clear-resume')) return;
        resumeFileInput?.click();
      });
      on(resumeBox, 'dragover', (e) => {
        e.preventDefault();
        resumeBox.classList.add('is-dragover');
      });
      on(resumeBox, 'dragleave', () => {
        resumeBox.classList.remove('is-dragover');
      });
      on(resumeBox, 'drop', async (e) => {
        e.preventDefault();
        resumeBox.classList.remove('is-dragover');
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const title = $('#signup-resume-title', this.root);
        if (title) title.textContent = `Parsing ${file.name}…`;
        try {
          const parsed = await parseResumeFile(file);
          this.signupResume = parsed;
          this._applyResumeToSignup(parsed, file.name);
          toast(`✓ Personal resume loaded for ${parsed.name || file.name}`);
        } catch (err) {
          console.error(err);
          toast(err.message || 'Could not parse resume.');
          this._clearSignupResume();
        }
      });
    }

    // Clear / Replace Resume Trigger
    const clearResumeBtn = $('#btn-signup-clear-resume', this.root);
    if (clearResumeBtn) {
      on(clearResumeBtn, 'click', (e) => {
        e.stopPropagation();
        this._clearSignupResume();
        toast('Personal resume removed. Please upload your resume.');
      });
    }

    // Close buttons & Backdrop click dismiss
    for (const b of $$('[data-close-auth]', this.root)) {
      on(b, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      });
    }
    on(this.root, 'click', (e) => {
      if (e.target === this.root || e.target.classList.contains('modal__backdrop') || e.target.closest('[data-close-auth]') || !e.target.closest('.modal__box')) {
        this.close();
      }
    });

    // Sign Up submit — STRICTLY COMPULSORY RESUME VALIDATION
    on(formSignup, 'submit', async (e) => {
      e.preventDefault();
      errSignup.hidden = true;

      // REQUIRE PERSONAL RESUME FIRST
      if (!this.signupResume) {
        errSignup.innerHTML = `<span>⚠️ <b>Resume Upload Compulsory:</b> Uploading your personal resume is mandatory during registration so Siya can calibrate questions and personalize your mock interviews.</span>`;
        errSignup.hidden = false;
        if (resumeBox) {
          resumeBox.classList.add('shake-pulse');
          resumeBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => resumeBox.classList.remove('shake-pulse'), 800);
        }
        return;
      }

      const submitBtn = formSignup.querySelector('.auth-submit-btn');
      const originalText = submitBtn?.textContent || 'Create Account & Personalize Siya →';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Personalizing Siya…';
        }

        const name = $('#reg-name', formSignup).value;
        const targetRole = $('#reg-role', formSignup).value;
        const email = $('#reg-email', formSignup).value;
        const password = $('#reg-pass', formSignup).value;

        const user = await auth.signUp({ name, email, password, targetRole });
        toast(`✓ Welcome, ${user.firstName}! Your account & resume have been verified.`);
        this.close();
        this.onAuthSuccess?.(user, 'signup', this.signupResume);
      } catch (err) {
        errSignup.textContent = err.message;
        errSignup.hidden = false;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });

    // Sign In submit
    on(formSignin, 'submit', async (e) => {
      e.preventDefault();
      errSignin.hidden = true;
      try {
        const email = $('#login-email', formSignin).value;
        const password = $('#login-pass', formSignin).value;

        const user = await auth.signIn({ email, password });
        toast(`✓ Welcome back, ${user.firstName}!`);
        this.close();
        this.onAuthSuccess?.(user, 'signin');
      } catch (err) {
        errSignin.textContent = err.message;
        errSignin.hidden = false;
      }
    });

    // 1-Click Demo
    const demoBtn = $('#btn-auth-demo', this.root);
    on(demoBtn, 'click', () => {
      const user = auth.signInAsDemo('Abhay');
      const sample = getSampleResume();
      toast(`✓ Signed in as ${user.name} with sample resume! Siya is personalized.`);
      this.close();
      this.onAuthSuccess?.(user, 'demo', sample);
    });
  }

  _wireProfileEvents() {
    if (this.profileBackdrop) {
      on(this.profileBackdrop, 'click', () => this.closeProfile());
    }

    for (const b of $$('[data-close-profile]', this.profileDrawer)) {
      on(b, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeProfile();
      });
    }

    const form = $('#form-profile-edit', this.profileDrawer);
    on(form, 'submit', async (e) => {
      e.preventDefault();
      try {
        const name = $('#edit-name', form).value;
        const targetRole = $('#edit-role', form).value;
        const updated = await auth.updateProfile({ name, targetRole });
        toast('✓ Profile updated and synchronized with Siya.');
        this.updateProfileView(updated);
        this.onProfileUpdated?.(updated);
      } catch (err) {
        toast(err.message || 'Could not update profile.');
      }
    });

    const signOutBtn = $('#btn-sign-out', this.profileDrawer);
    on(signOutBtn, 'click', () => {
      auth.signOut();
      this.closeProfile();
      this._clearSignupResume();
      toast('Signed out. Siya has returned to guest mode.');
      this.onSignOut?.();
    });

    const switchBtn = $('#btn-switch-account', this.profileDrawer);
    if (switchBtn) {
      on(switchBtn, 'click', () => {
        auth.signOut();
        this.closeProfile();
        this._clearSignupResume();
        this.onSignOut?.();
        this.open('signup', true);
      });
    }
  }

  _wireGlobalEvents() {
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.isOpen) this.close();
        if (this.isProfileOpen) this.closeProfile();
      }
    });

    on(document, 'pointerdown', (e) => {
      if (this.isProfileOpen) {
        if (!this.profileDrawer.contains(e.target) && !e.target.closest('#btn-topbar-user, #btn-switch-account, #profile-backdrop')) {
          this.closeProfile();
        }
      }
    });
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  get isProfileOpen() {
    return this.profileDrawer.classList.contains('is-open');
  }

  toggleProfile() {
    if (this.isProfileOpen) {
      this.closeProfile();
    } else {
      this.openProfile();
    }
  }

  open(tab = 'signup', force = false) {
    const user = auth.getUser();
    if (user && !force && tab !== 'signup') {
      this.openProfile();
      return;
    }

    if (this.isProfileOpen) {
      this.closeProfile();
    }

    this.switchTab?.(tab);
    this.root.classList.add('is-open');
    setTimeout(() => {
      const input = tab === 'signup' ? $('#reg-name', this.root) : $('#login-email', this.root);
      input?.focus();
    }, 150);
  }

  _updateHeader(tab) {
    const badge = $('#auth-modal-badge', this.root);
    const title = $('#auth-modal-title', this.root);
    const sub = $('#auth-modal-sub', this.root);
    if (!badge || !title || !sub) return;

    if (tab === 'signup') {
      badge.textContent = '✦ NEW CANDIDATE REGISTRATION';
      title.textContent = 'Create Your Account';
      sub.textContent = 'Attach your resume to get tailored mock interviews, ATS resume diagnostics, and a personalized career roadmap.';
    } else {
      badge.textContent = '✦ WELCOME BACK';
      title.textContent = 'Sign In to Your Account';
      sub.textContent = 'Access your saved resume, interview history, skill radar, and personalized AI interviewer.';
    }
  }

  close() {
    this.root.classList.remove('is-open');
  }

  openProfile() {
    const user = auth.getUser();
    if (!user) {
      this.open('signin');
      return;
    }
    this.updateProfileView(user);
    this.profileDrawer.classList.add('is-open');
    this.profileBackdrop?.classList.add('is-open');
  }

  closeProfile() {
    this.profileDrawer.classList.remove('is-open');
    this.profileBackdrop?.classList.remove('is-open');
  }

  updateProfileView(user) {
    if (!user) return;
    $('#profile-title-name', this.profileDrawer).textContent = user.name;
    $('#prof-card-name', this.profileDrawer).textContent = user.name;
    $('#prof-card-role', this.profileDrawer).textContent = user.targetRole || 'Software Professional';
    $('#prof-card-email', this.profileDrawer).textContent = user.email || 'guest@example.com';
    $('#profile-avatar-icon', this.profileDrawer).textContent = auth.getInitials();

    $('#edit-name', this.profileDrawer).value = user.name || '';
    $('#edit-role', this.profileDrawer).value = user.targetRole || '';
  }
}
