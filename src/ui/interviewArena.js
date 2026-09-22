/* ============================================================
   AURA — AI Mock Interview & Coding Arena UI Controller
   Full HackerRank & Ai-mock-interview experience: live code
   editor, test suites, real-time avatar proctoring, hints,
   and comprehensive hiring scorecard.
   ============================================================ */

import { $, $$, el, on, toast } from './dom.js';
import {
  CODING_CHALLENGES,
  SYSTEM_DESIGN_CHALLENGES,
  BEHAVIORAL_CHALLENGES,
  runSandboxCode,
  evaluateAnswer,
  saveInterviewSession
} from '../ai/interviewEngine.js';
import {
  SAMPLE_JOB_POSTINGS,
  deconstructJobPosting,
  analyzeResumeVsJD,
  generateJDInterviewChallenges,
  generateJDFitReport
} from '../ai/jdInterviewEngine.js';
import { analyzeSpeechDelivery } from '../ai/speechDiagnostic.js';

export class InterviewArena {
  constructor({ speaker, lip, expressions, remoteBrain, resumeGetter, onResumeUpload, onSampleResume } = {}) {
    this.root = $('#interview-arena');
    this.speaker = speaker;
    this.lip = lip;
    this.expressions = expressions;
    this.remoteBrain = remoteBrain;
    this.getResume = resumeGetter || (() => null);
    this.onResumeUpload = onResumeUpload;
    this.onSampleResume = onSampleResume;

    this.state = 'config'; // 'config' | 'active' | 'evaluating' | 'report'
    this.track = 'coding'; // 'coding' | 'system' | 'behavioral' | 'resume' | 'jd'
    this.role = 'Full-Stack Engineer';
    this.seniority = 'Senior';
    this.questionCount = 3;

    // JD-specific state
    this.jdText = SAMPLE_JOB_POSTINGS[0].text;
    this.jdRole = SAMPLE_JOB_POSTINGS[0].role;
    this.jdCompany = SAMPLE_JOB_POSTINGS[0].company;
    this.jdDeconstruction = null;
    this.jdResumeDelta = null;
    this.jdFitReport = null;
    this.speechDiagnostics = [];
    this.questionStartTime = 0;

    this.webcamStream = null;
    this.cameraVerified = false;

    this.questions = [];
    this.currentIndex = 0;
    this.submissions = []; // { challenge, code, textAnswer, evaluation, testResult, speechDiagnostic }
    this.timerInterval = null;
    this.secondsElapsed = 0;

    this._wire();
  }

  get isOpen() {
    return this.root?.classList.contains('is-open');
  }

  _wire() {
    if (!this.root) return;
    on(this.root, 'click', (e) => {
      if (e.target.closest('.arena-close, .arena-work-close, .arena-report-close, #btn-close-report, #arena-cancel')) {
        e.preventDefault();
        e.stopPropagation();
        if (this.state === 'active') {
          if (confirm('Are you sure you want to exit this mock interview session?')) {
            this.close();
          }
        } else {
          this.close();
        }
        return;
      }
      if (e.target === this.root || !e.target.closest('.arena-modal, .arena-workspace, .arena-report-panel, .arena-evaluating-box')) {
        if (this.state === 'active') {
          if (confirm('Are you sure you want to exit this mock interview session?')) {
            this.close();
          }
        } else if (this.state !== 'evaluating') {
          this.close();
        }
      }
    });

    on(document, 'pointerdown', (e) => {
      if (!this.isOpen) return;
      if (e.target.closest('.arena-modal, .arena-workspace, .arena-report-panel, .arena-evaluating-box')) return;
      if (e.target.closest('#btn-interview')) return;
      if (this.state === 'evaluating') return;
      if (this.state === 'active') {
        if (confirm('Are you sure you want to exit this mock interview session?')) {
          this.close();
        }
      } else {
        this.close();
      }
    });

    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen && this.state !== 'evaluating') {
        if (this.state === 'active') {
          if (confirm('Are you sure you want to exit this mock interview session?')) {
            this.close();
          }
        } else {
          this.close();
        }
      }
    });
    this.render();
  }

  _saveCurrentDraft() {
    if (this.state !== 'active') return;
    const q = this.questions?.[this.currentIndex];
    if (!q) return;
    const codeEl = this.root?.querySelector('#code-editor');
    if (codeEl) q.draftCode = codeEl.value;
    const textEl = this.root?.querySelector('#text-answer');
    if (textEl) q.draftText = textEl.value;
  }

  async enableCamera(targetVideoEl = null) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast('Camera API is not supported in this browser environment.');
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      this.webcamStream = stream;
      this.cameraVerified = true;
      if (targetVideoEl) {
        targetVideoEl.srcObject = stream;
        targetVideoEl.play().catch(() => {});
      }
      toast('✓ Camera access verified successfully!');
      this._saveCurrentDraft();
      this.render();
      return true;
    } catch (err) {
      console.warn('Camera verification failed:', err);
      toast('Camera permission not granted. You can still proceed without camera.');
      this.cameraVerified = false;
      this._saveCurrentDraft();
      this.render();
      return false;
    }
  }

  stopCamera() {
    this._saveCurrentDraft();
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((t) => t.stop());
      this.webcamStream = null;
    }
    this.cameraVerified = false;
  }

  open(preConfig = {}) {
    const resume = this.getResume();
    if (preConfig.track) {
      this.track = preConfig.track;
    } else if (resume) {
      this.track = 'resume';
    }
    if (preConfig.role) this.role = preConfig.role;
    if (preConfig.jdText) this.jdText = preConfig.jdText;
    if (preConfig.jdRole) this.jdRole = preConfig.jdRole;
    if (preConfig.jdCompany) this.jdCompany = preConfig.jdCompany;
    this.state = 'config';
    this.root.classList.add('is-open');
    this.render();
  }

  close() {
    this.root.classList.remove('is-open');
    this._stopTimer();
    this.stopCamera();
    if (this.speaker?.speaking) this.speaker.cancel();
  }

  render() {
    if (!this.root) return;
    this.root.innerHTML = '';

    if (this.state === 'config') {
      this._renderConfigView();
    } else if (this.state === 'active') {
      this._renderActiveView();
    } else if (this.state === 'evaluating') {
      this._renderEvaluatingView();
    } else if (this.state === 'report') {
      this._renderReportView();
    }
  }

  /* ------------------------------------------------------------ SETUP VIEW */
  _renderResumeGate(resume) {
    if (resume) {
      const card = el('div', { class: 'arena-resume-gate is-verified glass' },
        el('div', { class: 'resume-gate-head' },
          el('span', { class: 'badge-step' }, '✓ STEP 1 VERIFIED'),
          el('b', {}, `Resume Loaded: ${resume.name}`),
          el('span', { class: 'pill pill--xs' }, `${resume.atsScore || 90}% ATS Match`)
        ),
        el('p', {}, `${resume.headline || 'Software Professional'} • ${resume.skills?.length || 0} skills detected (${resume.skills?.slice(0, 4).join(', ') || 'Full-stack'}). Questions will be tailored to your real projects and tech stack.`),
        el('div', { class: 'resume-gate-actions' },
          el('button', { class: 'pill pill--xs pill--secondary', type: 'button', id: 'arena-gate-change' }, 'Change Resume / Upload New'),
          el('span', { style: 'font-size: 11.5px; color: var(--ink-3);' }, 'Ready for interview questions!')
        )
      );

      on(card.querySelector('#arena-gate-change'), 'click', () => {
        const fi = $('#resume-file-input');
        if (fi) fi.click();
      });

      return card;
    }

    const card = el('div', { class: 'arena-resume-gate glass' },
      el('div', { class: 'resume-gate-head' },
        el('span', { class: 'badge-step' }, '📄 STEP 1: RESUME REQUIRED'),
        el('b', {}, 'Upload Your Resume First')
      ),
      el('p', {}, 'To generate realistic, role-specific questions about your actual architecture decisions, tech stack, and experience, Siya needs your resume before starting.'),
      el('div', { class: 'resume-gate-actions' },
        el('button', { class: 'pill pill--accent', type: 'button', id: 'arena-gate-browse' }, '📁 Browse Resume (PDF / DOCX / TXT)'),
        el('button', { class: 'pill pill--sample', type: 'button', id: 'arena-gate-sample' }, '⚡ Load Sample Resume (Abhay / AI Engineer)')
      )
    );

    on(card.querySelector('#arena-gate-browse'), 'click', () => {
      const fi = $('#resume-file-input');
      if (fi) fi.click();
    });

    on(card.querySelector('#arena-gate-sample'), 'click', () => {
      this.onSampleResume?.();
      this.track = 'resume';
      this.render();
    });

    return card;
  }

  _renderConfigView() {
    const resume = this.getResume();

    const panel = el('div', { class: 'arena-modal glass' },
      el('div', { class: 'arena-header' },
        el('div', { class: 'arena-header__title' },
          el('svg', { html: '<use href="#i-code"/>' }),
          el('h2', {}, 'AI Mock Interview & Assessment Arena')
        ),
        el('button', { class: 'icon-btn icon-btn--sm arena-close', type: 'button', title: 'Close dialog', 'aria-label': 'Close dialog' },
          el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
            el('path', { d: 'M18 6L6 18M6 6l12 12' })
          )
        )
      ),
      el('div', { class: 'arena-body' },
        el('p', { class: 'arena-desc' },
          'Practice realistic technical & coding rounds with AURA acting as your live avatar interviewer. Get real-time test verification, voice hints, and a full HackerRank-style scorecard.'
        ),

        // Step 1: Resume Upload Gate
        this._renderResumeGate(resume),

        // Track Selector
        el('div', { class: 'arena-field' },
          el('label', {}, 'Interview Track'),
          el('div', { class: 'arena-tracks' },
            this._createTrackOption('resume', '📄 Resume Project Probe', resume ? `Deep-dive tailored to ${resume.name}'s background` : 'Requires uploaded resume (or sample)'),
            this._createTrackOption('jd', '🎯 Tailored to Job Posting (JD)', 'Reverse-engineers employer JD into custom drills, attack points & speech diagnostics'),
            this._createTrackOption('coding', '💻 Coding & Algorithms', 'DSA challenges with live test runner & Big-O analysis'),
            this._createTrackOption('system', '🧠 System Design', 'High-scale distributed systems & architecture trade-offs'),
            this._createTrackOption('behavioral', '🗣️ Behavioral (STAR)', 'Leadership, conflict, and production incident scenarios')
          )
        ),

        // If JD track selected, render interactive JD ingestion & reverse-engineering card
        this.track === 'jd' ? this._renderJdInputSection() : null,

        // Role & Seniority
        el('div', { class: 'arena-field arena-field--split' },
          el('div', {},
            el('label', {}, 'Target Role'),
            el('select', { id: 'arena-role', class: 'arena-select' },
              el('option', { value: 'Full-Stack Engineer' }, 'Full-Stack Engineer'),
              el('option', { value: 'Frontend Specialist' }, 'Frontend Specialist (React/Three.js)'),
              el('option', { value: 'Backend / Systems Engineer' }, 'Backend / Systems Engineer'),
              el('option', { value: 'AI / Machine Learning Engineer' }, 'AI / Machine Learning Engineer'),
              el('option', { value: 'DevOps / Cloud Architect' }, 'DevOps / Cloud Architect')
            )
          ),
          el('div', {},
            el('label', {}, 'Seniority Level'),
            el('select', { id: 'arena-seniority', class: 'arena-select' },
              el('option', { value: 'Junior / Associate' }, 'Junior / Associate'),
              el('option', { value: 'Mid-Level' }, 'Mid-Level'),
              el('option', { value: 'Senior', selected: true }, 'Senior Engineer'),
              el('option', { value: 'Staff / Principal' }, 'Staff / Lead Architect')
            )
          )
        ),

        // Candidate Camera Verification Section
        el('div', { class: 'arena-field' },
          el('label', {}, 'Candidate Camera & Proctoring Verification'),
          this._renderCameraVerificationBox()
        ),

        // Length
        el('div', { class: 'arena-field' },
          el('label', {}, 'Interview Duration'),
          el('div', { class: 'arena-counts' },
            this._createCountOption(2, '⚡ Quick Drill (2 Challenges)'),
            this._createCountOption(3, '🎯 Standard Round (3 Challenges)', true),
            this._createCountOption(4, '🏆 Full Assessment (4 Challenges)')
          )
        ),

        // Actions
        el('div', { class: 'arena-actions' },
          el('button', { class: 'pill', type: 'button', id: 'arena-cancel' }, 'Cancel'),
          el('button', { class: 'pill pill--accent pill--glow', type: 'button', id: 'arena-start' }, '🚀 Enter Interview Arena')
        )
      )
    );

    on(panel, 'click', (e) => e.stopPropagation());
    on(panel.querySelector('.arena-close'), 'click', () => this.close());
    on(panel.querySelector('#arena-cancel'), 'click', () => this.close());
    on(panel.querySelector('#arena-start'), 'click', () => {
      if (!this.getResume() && this.track === 'resume') {
        toast('Please upload your resume first so Siya can generate personalized questions!');
        panel.querySelector('.arena-resume-gate')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      this.role = panel.querySelector('#arena-role').value;
      this.seniority = panel.querySelector('#arena-seniority').value;
      this._startInterview();
    });

    this.root.append(panel);
  }

  _createTrackOption(id, title, desc) {
    const isSelected = this.track === id;
    const item = el('div', { class: `arena-track-opt ${isSelected ? 'is-selected' : ''}` },
      el('b', {}, title),
      el('small', {}, desc)
    );
    on(item, 'click', () => {
      this.track = id;
      this.render();
    });
    return item;
  }

  _renderJdInputSection() {
    const resume = this.getResume();
    const deconstruction = deconstructJobPosting(this.jdText, this.jdRole, this.jdCompany);
    const resumeDelta = analyzeResumeVsJD(deconstruction, resume);

    const wrap = el('div', { class: 'arena-field jd-config-card glass' },
      el('div', { class: 'jd-config-head' },
        el('div', {},
          el('b', {}, '📋 Target Job Posting & Role Customization'),
          el('p', {}, 'Reverse-engineer target JD requirements, implied architecture challenges & speech delivery rubrics.')
        ),
        el('div', { class: 'jd-sample-pills' },
          ...SAMPLE_JOB_POSTINGS.map((s) => {
            const isCur = this.jdCompany === s.company;
            const btn = el('button', {
              class: `pill pill--xs ${isCur ? 'pill--accent' : ''}`,
              type: 'button'
            }, s.title);
            on(btn, 'click', () => {
              this.jdText = s.text;
              this.jdRole = s.role;
              this.jdCompany = s.company;
              this.render();
            });
            return btn;
          })
        )
      ),
      el('div', { class: 'jd-meta-row' },
        el('div', { class: 'jd-input-wrap' },
          el('label', {}, 'Target Role Title'),
          el('input', {
            type: 'text',
            class: 'arena-input',
            id: 'jd-role-input',
            value: this.jdRole || 'Senior Backend Engineer',
            placeholder: 'e.g. Senior Backend / Distributed Systems Engineer'
          })
        ),
        el('div', { class: 'jd-input-wrap' },
          el('label', {}, 'Target Company / Domain'),
          el('input', {
            type: 'text',
            class: 'arena-input',
            id: 'jd-company-input',
            value: this.jdCompany || 'FinTech / High Scale',
            placeholder: 'e.g. Stripe, Scale AI, or Enterprise'
          })
        )
      ),
      el('div', { class: 'jd-textarea-wrap' },
        el('label', {}, 'Paste Job Description (JD)'),
        el('textarea', {
          class: 'jd-textarea',
          id: 'jd-text-input',
          placeholder: 'Paste the requirements, responsibilities, and qualifications from LinkedIn, Greenhouse, or Lever…'
        }, this.jdText || '')
      ),
      // Live Deconstructed Attack Points Card
      el('div', { class: 'jd-preview-box' },
        el('div', { class: 'jd-preview-head' },
          el('span', { class: 'jd-preview-badge' }, '⚡ LIVE JD REVERSE-ENGINEERING'),
          el('span', {}, `${deconstruction.mustHaveTech.length} Core Tech Signals Detected`)
        ),
        el('div', { class: 'jd-preview-tags' },
          ...deconstruction.mustHaveTech.map((t) => el('span', { class: 'tag-skill' }, t))
        ),
        el('div', { class: 'jd-preview-vulnerabilities' },
          el('b', {}, '🎯 Expected Interview Attack Points:'),
          el('ul', {},
            ...deconstruction.vulnerabilityAttackPoints.slice(0, 3).map((v) => el('li', {}, v))
          )
        ),
        resumeDelta ? el('div', { class: 'jd-resume-match-pill' },
          `Candidate Resume Match: ${resumeDelta.matchScore}% (${resumeDelta.matchedKeywords.length} skills matched, ${resumeDelta.gapKeywords.length} gap areas flagged)`
        ) : null
      )
    );

    const roleInput = wrap.querySelector('#jd-role-input');
    const compInput = wrap.querySelector('#jd-company-input');
    const textInput = wrap.querySelector('#jd-text-input');

    if (roleInput) on(roleInput, 'input', (e) => { this.jdRole = e.target.value; });
    if (compInput) on(compInput, 'input', (e) => { this.jdCompany = e.target.value; });
    if (textInput) on(textInput, 'input', (e) => { this.jdText = e.target.value; });

    return wrap;
  }

  _createCountOption(count, label, def = false) {
    const isSelected = (this.questionCount === count) || (def && !this.questionCount);
    const item = el('button', { class: `pill pill--sm ${isSelected ? 'pill--accent' : ''}`, type: 'button' }, label);
    on(item, 'click', () => {
      this.questionCount = count;
      this.render();
    });
    return item;
  }

  _renderCameraVerificationBox() {
    const isVerified = !!this.webcamStream;

    if (isVerified) {
      const box = el('div', { class: 'arena-verify-card arena-verify-card--active' },
        el('div', { class: 'verify-video-frame' },
          el('video', {
            id: 'camera-verify-video',
            autoplay: true,
            playsinline: true,
            muted: true,
            class: 'verify-video'
          }),
          el('div', { class: 'verify-reticle', title: 'Position your face within the frame' }),
          el('div', { class: 'verify-badge verify-badge--live' }, '● CAMERA VERIFIED & LIVE')
        ),
        el('div', { class: 'verify-active-info' },
          el('div', {},
            el('b', {}, 'Candidate Presence Verified'),
            el('p', {}, 'Camera stream will be monitored alongside the coding arena and questions.')
          ),
          el('button', { class: 'pill pill--sm pill--danger', id: 'btn-disable-camera', type: 'button' }, 'Disable Camera')
        )
      );

      setTimeout(() => {
        const vid = box.querySelector('#camera-verify-video');
        if (vid && this.webcamStream) {
          vid.srcObject = this.webcamStream;
          vid.play().catch(() => {});
        }
      }, 30);

      on(box.querySelector('#btn-disable-camera'), 'click', () => {
        this.stopCamera();
        this.render();
      });

      return box;
    }

    const box = el('div', { class: 'arena-verify-card' },
      el('div', { class: 'verify-placeholder' },
        el('svg', { html: '<use href="#i-camera"/>' }),
        el('span', {}, 'No Video Feed')
      ),
      el('div', { class: 'verify-info' },
        el('b', {}, 'Candidate Camera Verification (HackerRank & HireVue style)'),
        el('p', {}, 'Grant camera access to test under proctored technical interview conditions with real-time candidate monitoring.'),
        el('div', { class: 'verify-actions' },
          el('button', { class: 'pill pill--accent', id: 'btn-enable-camera', type: 'button' }, '📷 Allow Camera & Verify'),
          el('small', { class: 'verify-opt-note' }, 'Optional: you can also proceed without camera')
        )
      )
    );

    on(box.querySelector('#btn-enable-camera'), 'click', async () => {
      await this.enableCamera();
    });

    return box;
  }

  /* ------------------------------------------------------------ START INTERVIEW */
  _startInterview() {
    this.submissions = [];
    this.currentIndex = 0;
    this.secondsElapsed = 0;
    this.questionStartTime = performance.now();

    // Pick questions based on track
    if (this.track === 'jd') {
      const resume = this.getResume();
      this.jdDeconstruction = deconstructJobPosting(this.jdText, this.jdRole, this.jdCompany);
      this.jdResumeDelta = analyzeResumeVsJD(this.jdDeconstruction, resume);
      this.questions = generateJDInterviewChallenges(this.jdDeconstruction, this.jdResumeDelta).slice(0, this.questionCount);
      this.speechDiagnostics = [];
    } else if (this.track === 'coding') {
      this.questions = CODING_CHALLENGES.slice(0, this.questionCount);
    } else if (this.track === 'system') {
      this.questions = SYSTEM_DESIGN_CHALLENGES.slice(0, this.questionCount);
    } else if (this.track === 'behavioral') {
      this.questions = BEHAVIORAL_CHALLENGES.slice(0, this.questionCount);
    } else {
      // Resume track
      const resume = this.getResume();
      const topSkill = resume?.skills?.[0] || 'JavaScript';
      const secSkill = resume?.skills?.[1] || 'Distributed Systems';
      this.questions = [
        {
          id: 'res-deep-1',
          title: `Architectural Deep-Dive: ${topSkill}`,
          category: 'Resume Portfolio',
          prompt: `In your resume, you highlighted deep experience with ${topSkill}. Can you walk me through the most technically challenging problem you solved using ${topSkill}, specifically detailing your architectural decisions and trade-offs?`,
          framework: 'Highlight scale, latency benchmarks, edge cases, and personal technical ownership.'
        },
        CODING_CHALLENGES[0],
        {
          id: 'res-deep-2',
          title: `Systems & Scaling: ${secSkill}`,
          category: 'System Design',
          prompt: `How did you handle fault-tolerance, monitoring, and zero-downtime deployments when implementing ${secSkill} in production? What would you do differently today?`,
          framework: 'Operational metrics, telemetry, rollback strategy, and retrospection.'
        }
      ].slice(0, this.questionCount);
    }

    this.state = 'active';
    this.render();
    this._startTimer();
    this._speakCurrentQuestion();
  }

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      const timerNode = $('#arena-timer');
      if (timerNode) {
        const mins = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
        const secs = String(this.secondsElapsed % 60).padStart(2, '0');
        timerNode.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  _speakCurrentQuestion() {
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const resume = this.getResume();
    const candidateName = resume?.name && resume.name !== 'Candidate' ? resume.name.split(' ')[0] : 'there';
    const intro = this.currentIndex === 0
      ? `Welcome to your interview round, ${candidateName}. Here is your first question: ${q.title}. ${q.description ? 'I have presented the problem and constraints on your screen. Take your time to write your solution.' : q.prompt}`
      : `Question ${this.currentIndex + 1} of ${this.questions.length}: ${q.title}. ${q.description ? 'I have presented the problem on your screen.' : q.prompt}`;

    if (this.speaker && !this.speaker.muted) {
      this.expressions?.set('thinking');
      this.speaker.speak(intro, this.lip).then(() => {
        this.expressions?.set('neutral');
      });
    }
  }

  /* ------------------------------------------------------------ ACTIVE QUESTION VIEW */
  _renderActiveView() {
    const q = this.questions[this.currentIndex];
    const isCoding = !!q.tests || this.track === 'coding';

    const view = el('div', { class: 'arena-workspace glass' },
      // Workspace Top Bar
      el('div', { class: 'arena-work-top' },
        el('div', { class: 'arena-work-info' },
          el('span', { class: 'arena-track-badge' }, this.track.toUpperCase()),
          el('span', { class: 'arena-step-badge' }, `Question ${this.currentIndex + 1} of ${this.questions.length}`),
          q.difficulty ? el('span', { class: 'arena-diff-badge' }, q.difficulty) : null
        ),
        el('div', { class: 'arena-work-meta' },
          this.webcamStream
            ? el('div', { class: 'arena-cam-badge arena-cam-badge--live', title: 'Candidate Camera Verified & Monitored' },
                el('span', { class: 'cam-dot' }),
                '● PROCTORED'
              )
            : el('button', { class: 'arena-cam-badge arena-cam-badge--off', id: 'btn-arena-cam-toggle', title: 'Verify camera access for proctoring', type: 'button' },
                el('svg', { html: '<use href="#i-camera"/>' }),
                'Verify Cam'
              ),
          el('span', { class: 'arena-timer', id: 'arena-timer' }, '00:00'),
          el('button', { class: 'icon-btn icon-btn--sm arena-work-close', title: 'Exit Interview', 'aria-label': 'Exit' },
            el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
              el('path', { d: 'M18 6L6 18M6 6l12 12' })
            )
          )
        )
      ),

      // Split Workspace (Problem on left, Code/Text on right)
      el('div', { class: 'arena-split' },
        // Left Column: Candidate Feed, Problem Statement & Hints
        el('div', { class: 'arena-problem-col' },
          this._renderCandidateFeed(),
          el('h3', { class: 'arena-problem-title' }, q.title),
          q.category ? el('div', { class: 'arena-category-pill' }, q.category) : null,
          el('div', { class: 'arena-problem-desc' }, q.description || q.prompt),

          // Examples (for coding)
          q.examples?.length ? el('div', { class: 'arena-examples' },
            el('h4', {}, 'Examples:'),
            ...q.examples.map((ex, i) => el('div', { class: 'arena-example-box' },
              el('b', {}, `Example ${i + 1}:`),
              el('div', {}, el('code', {}, `Input: ${ex.input}`)),
              el('div', {}, el('code', {}, `Output: ${ex.output}`)),
              ex.explanation ? el('small', {}, ex.explanation) : null
            ))
          ) : null,

          // Constraints
          q.constraints?.length ? el('div', { class: 'arena-constraints' },
            el('h4', {}, 'Constraints:'),
            el('ul', {}, ...q.constraints.map((c) => el('li', {}, el('code', {}, c))))
          ) : null,

          // Socratic Hint Button
          el('div', { class: 'arena-hint-box' },
            el('button', { class: 'pill pill--sm', id: 'btn-arena-hint', type: 'button' }, '💡 Ask AURA for a Hint'),
            el('p', { class: 'arena-hint-text', id: 'arena-hint-text', style: 'display:none' }, '')
          )
        ),

        // Right Column: Code Editor or Verbal/Text Answer Area
        el('div', { class: 'arena-answer-col' },
          isCoding ? this._renderCodeEditor(q) : this._renderTextAnswerArea(q)
        )
      )
    );

    on(view, 'click', (e) => e.stopPropagation());
    on(view.querySelector('.arena-work-close'), 'click', () => {
      if (confirm('Are you sure you want to end this mock interview session?')) {
        this.close();
      }
    });

    on(view.querySelector('#btn-arena-hint'), 'click', () => {
      this._giveHint(q);
    });

    const topCamBtn = view.querySelector('#btn-arena-cam-toggle');
    if (topCamBtn) {
      on(topCamBtn, 'click', async () => {
        await this.enableCamera();
      });
    }

    this.root.append(view);
  }

  _renderCandidateFeed() {
    const isLive = !!this.webcamStream;

    if (isLive) {
      const feed = el('div', { class: 'candidate-pip-card is-live' },
        el('div', { class: 'candidate-pip-frame' },
          el('video', {
            id: 'candidate-feed-video',
            autoplay: true,
            playsinline: true,
            muted: true,
            class: 'candidate-pip-video'
          }),
          el('div', { class: 'candidate-pip-reticle' }),
          el('div', { class: 'candidate-pip-overlay' },
            el('span', { class: 'pip-pulse-dot' }),
            el('span', { class: 'pip-text' }, 'CANDIDATE FEED • PROCTORED')
          ),
          el('button', {
            class: 'pip-cam-btn',
            id: 'btn-pip-stop-cam',
            title: 'Turn Off Camera Feed',
            type: 'button'
          },
            el('svg', { html: '<use href="#i-camera"/>' })
          )
        )
      );

      setTimeout(() => {
        const vid = feed.querySelector('#candidate-feed-video');
        if (vid && this.webcamStream) {
          vid.srcObject = this.webcamStream;
          vid.play().catch(() => {});
        }
      }, 35);

      on(feed.querySelector('#btn-pip-stop-cam'), 'click', () => {
        this.stopCamera();
        this.render();
      });

      return feed;
    }

    const feed = el('div', { class: 'candidate-pip-card is-idle' },
      el('div', { class: 'candidate-pip-unverified' },
        el('div', { class: 'pip-unverified-meta' },
          el('svg', { html: '<use href="#i-camera"/>' }),
          el('div', {},
            el('b', {}, 'Candidate Camera Verification'),
            el('p', {}, 'HackerRank & HireVue proctoring mode. Allow webcam to test under real interview conditions.')
          )
        ),
        el('button', { class: 'pill pill--sm pill--accent', id: 'btn-pip-allow-cam', type: 'button' }, '📷 Allow Camera')
      )
    );

    on(feed.querySelector('#btn-pip-allow-cam'), 'click', async () => {
      await this.enableCamera();
    });

    return feed;
  }

  _giveHint(challenge) {
    const hint = challenge.hints?.[0] || 'Focus on breaking down the inputs and considering whether an in-memory hash map can reduce nested loops.';
    const hintEl = $('#arena-hint-text');
    if (hintEl) {
      hintEl.textContent = `AURA: "${hint}"`;
      hintEl.style.display = 'block';
    }
    toast('AURA: ' + hint);
    if (this.speaker && !this.speaker.muted) {
      this.expressions?.set('thinking');
      this.speaker.speak(hint, this.lip).then(() => {
        this.expressions?.set('neutral');
      });
    }
  }

  _renderCodeEditor(challenge) {
    const initialCode = challenge.draftCode !== undefined ? challenge.draftCode : (challenge.starterCode || '// Write your solution here\n');

    const wrap = el('div', { class: 'code-workspace' },
      el('div', { class: 'code-toolbar' },
        el('div', { class: 'code-lang' }, 'JavaScript (Node / ES2024)'),
        el('div', { class: 'code-toolbar-actions' },
          el('button', { class: 'pill pill--sm', id: 'btn-reset-code', type: 'button' }, 'Reset Template'),
          el('button', { class: 'pill pill--accent pill--sm', id: 'btn-run-tests', type: 'button' }, '▶ Run Test Cases')
        )
      ),
      el('div', { class: 'code-editor-container' },
        el('div', { class: 'code-line-numbers', id: 'code-lines' }, '1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15'),
        el('textarea', {
          class: 'code-textarea',
          id: 'code-editor',
          spellcheck: 'false',
          autocomplete: 'off',
          autocapitalize: 'off'
        }, initialCode)
      ),
      // Test Results Drawer
      el('div', { class: 'test-runner-panel', id: 'test-runner-panel' },
        el('div', { class: 'test-panel-header' },
          el('span', { class: 'test-panel-title' }, 'Test Suite Results'),
          el('span', { class: 'test-panel-status', id: 'test-status' }, 'Ready to run tests')
        ),
        el('div', { class: 'test-results-list', id: 'test-results-list' },
          el('div', { class: 'test-case-empty' }, 'Click "Run Test Cases" to verify your solution against the assertion suites.')
        )
      ),
      // Bottom Navigation
      el('div', { class: 'code-bottom-actions' },
        el('button', { class: 'pill pill--accent pill--glow', id: 'btn-submit-solution', type: 'button' },
          this.currentIndex < this.questions.length - 1 ? 'Submit & Next Challenge →' : 'Submit & Finish Interview 🏁'
        )
      )
    );

    // Code editor tab key & line number handling
    const textarea = wrap.querySelector('#code-editor');
    const linesGutter = wrap.querySelector('#code-lines');

    const updateLines = () => {
      challenge.draftCode = textarea.value;
      const lineCount = (textarea.value.match(/\n/g) || []).length + 1;
      linesGutter.textContent = Array.from({ length: Math.max(15, lineCount) }, (_, i) => i + 1).join('\n');
    };

    on(textarea, 'input', updateLines);
    on(textarea, 'keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateLines();
      }
    });
    setTimeout(updateLines, 20);

    on(wrap.querySelector('#btn-reset-code'), 'click', () => {
      if (confirm('Reset editor to original boilerplate?')) {
        textarea.value = challenge.starterCode || '';
        challenge.draftCode = textarea.value;
        updateLines();
      }
    });

    on(wrap.querySelector('#btn-run-tests'), 'click', () => {
      this._executeTests(textarea.value, challenge);
    });

    on(wrap.querySelector('#btn-submit-solution'), 'click', () => {
      this._submitAnswer({ code: textarea.value, challenge });
    });

    return wrap;
  }

  _renderTextAnswerArea(challenge) {
    const initialText = challenge.draftText !== undefined ? challenge.draftText : '';

    const wrap = el('div', { class: 'text-workspace' },
      el('div', { class: 'code-toolbar' },
        el('div', { class: 'code-lang' }, 'Verbal / Architectural Response'),
        el('span', { class: 'arena-pill-hint' }, 'Voice or Typed Answer')
      ),
      el('textarea', {
        class: 'text-answer-input',
        id: 'text-answer',
        placeholder: 'Explain your architecture, tradeoffs, components, or STAR scenario response here. You can also use the microphone button in the main chat to speak your thoughts.'
      }, initialText),
      challenge.checklist?.length ? el('div', { class: 'architecture-checklist' },
        el('b', {}, 'Key architectural components to address:'),
        el('ul', {}, ...challenge.checklist.map((c) => el('li', {}, c)))
      ) : null,
      el('div', { class: 'code-bottom-actions' },
        el('button', { class: 'pill pill--accent pill--glow', id: 'btn-submit-text', type: 'button' },
          this.currentIndex < this.questions.length - 1 ? 'Submit & Next Question →' : 'Submit & Finish Round 🏁'
        )
      )
    );

    const textarea = wrap.querySelector('#text-answer');
    if (textarea) {
      on(textarea, 'input', () => {
        challenge.draftText = textarea.value;
      });
    }

    on(wrap.querySelector('#btn-submit-text'), 'click', () => {
      const val = wrap.querySelector('#text-answer').value;
      this._submitAnswer({ textAnswer: val, challenge });
    });

    return wrap;
  }

  _executeTests(code, challenge) {
    const statusEl = $('#test-status');
    const listEl = $('#test-results-list');
    if (!statusEl || !listEl) return;

    statusEl.innerHTML = 'Running…';
    const result = runSandboxCode(code, challenge);

    listEl.innerHTML = '';

    if (!result.success) {
      statusEl.innerHTML = `<span class="test-badge test-badge--err">Syntax / Runtime Error</span>`;
      listEl.append(el('div', { class: 'test-error-box' }, result.error || 'Execution failed'));
      this.expressions?.set('surprised');
      return;
    }

    if (result.allPassed) {
      statusEl.innerHTML = `<span class="test-badge test-badge--ok">✓ Passed ${result.passCount} / ${result.totalCount} Tests (${result.runtimeMs}ms)</span>`;
      this.expressions?.set('happy');
      toast('🎉 All test cases passed!');
    } else {
      statusEl.innerHTML = `<span class="test-badge test-badge--fail">${result.passCount} / ${result.totalCount} Tests Passed</span>`;
      this.expressions?.set('thinking');
    }

    for (const r of result.results) {
      const item = el('div', { class: `test-item ${r.passed ? 'test-item--pass' : 'test-item--fail'}` },
        el('div', { class: 'test-item-head' },
          el('b', {}, `Test ${r.index}: ${r.label}`),
          el('span', { class: `test-tag ${r.passed ? 'tag--ok' : 'tag--fail'}` }, r.passed ? 'Passed ✓' : 'Failed ✕')
        ),
        !r.passed ? el('div', { class: 'test-diff' },
          el('div', {}, el('span', { class: 'diff-label' }, 'Expected:'), el('code', {}, r.expected)),
          el('div', {}, el('span', { class: 'diff-label' }, 'Actual:'), el('code', {}, r.actual))
        ) : null
      );
      listEl.append(item);
    }
  }

  async _submitAnswer({ code, textAnswer, challenge }) {
    this.state = 'evaluating';
    this.render();

    if (this.speaker && !this.speaker.muted) {
      this.expressions?.set('thinking');
      this.speaker.speak('Thank you. Evaluating your solution and analyzing speech & technical delivery…', this.lip);
    }

    const durationSec = Math.max(1, Math.round((performance.now() - (this.questionStartTime || performance.now())) / 1000));
    const speechDiag = analyzeSpeechDelivery(textAnswer || (code ? `Code submission for ${challenge.title}` : ''), durationSec);
    this.speechDiagnostics.push(speechDiag);

    const testResult = code ? runSandboxCode(code, challenge) : null;
    const evaluation = await evaluateAnswer({
      track: this.track,
      challenge,
      code,
      textAnswer,
      remoteBrain: this.remoteBrain,
      resume: this.getResume()
    });

    this.submissions.push({
      challenge,
      code,
      textAnswer,
      testResult,
      evaluation,
      speechDiagnostic: speechDiag,
      durationSec
    });

    this.currentIndex++;
    if (this.currentIndex < this.questions.length) {
      this.questionStartTime = performance.now();
      this.state = 'active';
      this.render();
      this._speakCurrentQuestion();
    } else {
      this._completeInterview();
    }
  }

  /* ------------------------------------------------------------ EVALUATION LOADING */
  _renderEvaluatingView() {
    const view = el('div', { class: 'arena-evaluating glass' },
      el('div', { class: 'arena-evaluating-box' },
        el('div', { class: 'arena-eval-spinner' }),
        el('h3', {}, 'Evaluating Solution & Articulation…'),
        el('p', {}, 'AURA is analyzing algorithm efficiency, runtime complexities, verbal pacing, filler words, and STAR delivery.')
      )
    );
    on(view, 'click', (e) => e.stopPropagation());
    this.root.append(view);
  }

  /* ------------------------------------------------------------ FINAL REPORT */
  _completeInterview() {
    this._stopTimer();
    this.state = 'report';

    if (this.track === 'jd') {
      this.jdFitReport = generateJDFitReport(this.jdDeconstruction, this.jdResumeDelta, this.submissions, this.speechDiagnostics);
    }

    // Calculate aggregated scores
    const totalScore = this.submissions.reduce((acc, s) => acc + (s.evaluation?.score || 8), 0);
    const avgScore = Math.round((totalScore / (this.submissions.length * 10)) * 100);
    const verdict = this.jdFitReport ? this.jdFitReport.verdict : (avgScore >= 85 ? 'Strong Hire' : avgScore >= 70 ? 'Hire' : 'Needs Practice');

    const session = {
      track: this.track,
      role: this.role,
      seniority: this.seniority,
      score: avgScore,
      verdict,
      durationSeconds: this.secondsElapsed,
      questionCount: this.submissions.length,
      submissions: this.submissions,
      jdFitReport: this.jdFitReport
    };
    saveInterviewSession(session);

    this.render();

    const closingWords = this.track === 'jd'
      ? `Assessment complete! Based on your target job description at ${this.jdCompany || 'the employer'}, your role-fit probability is ${this.jdFitReport?.matchProbability || avgScore} percent with a verdict of ${verdict}. Here is your full diagnostic and 24-hour action cheat-sheet.`
      : `Interview complete! You achieved an overall score of ${avgScore} percent. Final verdict: ${verdict}. Here is your full performance evaluation report.`;

    if (this.speaker && !this.speaker.muted) {
      this.expressions?.set(avgScore >= 75 ? 'happy' : 'talking');
      this.speaker.speak(closingWords, this.lip).then(() => {
        this.expressions?.set('neutral');
      });
    }
  }

  _renderReportView() {
    const isJdTrack = this.track === 'jd' && this.jdFitReport;
    const jdReport = this.jdFitReport;

    const totalScore = this.submissions.reduce((acc, s) => acc + (s.evaluation?.score || 8), 0);
    const avgScore = Math.round((totalScore / (this.submissions.length * 10)) * 100);
    const displayScore = isJdTrack ? jdReport.matchProbability : avgScore;
    const verdict = isJdTrack ? jdReport.verdict : (avgScore >= 85 ? 'Strong Hire' : avgScore >= 70 ? 'Hire' : 'Needs Practice');
    const verdictClass = displayScore >= 80 ? 'verdict--strong' : displayScore >= 65 ? 'verdict--hire' : 'verdict--practice';

    const mins = Math.floor(this.secondsElapsed / 60);
    const secs = this.secondsElapsed % 60;

    const report = el('div', { class: 'arena-report-panel glass' },
      el('div', { class: 'arena-header' },
        el('div', { class: 'arena-header__title' },
          el('svg', { html: '<use href="#i-award"/>' }),
          el('h2', {}, isJdTrack ? `JD Role-Fit Scorecard — ${this.jdRole || 'Target Role'}` : 'Assessment Performance Scorecard')
        ),
        el('button', { class: 'icon-btn icon-btn--sm arena-report-close', type: 'button', title: 'Close Report', 'aria-label': 'Close' },
          el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
            el('path', { d: 'M18 6L6 18M6 6l12 12' })
          )
        )
      ),

      el('div', { class: 'arena-report-body' },
        // Summary Header Card
        el('div', { class: 'report-hero-card glass' },
          el('div', { class: 'hero-score-ring' },
            el('span', { class: 'hero-score-val' }, `${displayScore}%`),
            el('small', {}, isJdTrack ? 'JD ROLE FIT' : 'OVERALL SCORE')
          ),
          el('div', { class: 'hero-details' },
            el('div', { class: `hero-verdict-badge ${verdictClass}` }, `RECOMMENDATION: ${verdict.toUpperCase()}`),
            el('h3', { class: 'hero-role' }, isJdTrack ? `${this.jdRole} @ ${this.jdCompany}` : `${this.seniority} ${this.role}`),
            el('div', { class: 'hero-meta' },
              el('span', {}, `Track: ${this.track.toUpperCase()}`),
              el('span', {}, `Duration: ${mins}m ${secs}s`),
              el('span', {}, `Questions: ${this.submissions.length}`),
              isJdTrack ? el('span', {}, `Speech Score: ${jdReport.speechDelivery.overallScore}/100`) : null
            )
          )
        ),

        // Speech & Articulation Diagnostics Section (Always shown or highlighted for JD)
        this._renderSpeechDiagnosticsPanel(isJdTrack ? jdReport.speechDelivery : null),

        // Core Competency Meters (HackerRank Style)
        el('div', { class: 'competency-grid' },
          this._createMetricBar('Problem Solving & Logic', Math.min(100, Math.round(displayScore * 1.02))),
          this._createMetricBar('Algorithmic Efficiency (Big-O)', Math.min(100, Math.round(displayScore * 0.96))),
          this._createMetricBar('Code Quality & Robustness', Math.min(100, Math.round(displayScore * 0.98))),
          this._createMetricBar('Technical Articulation & Speech', Math.min(100, isJdTrack ? jdReport.speechDelivery.overallScore : Math.round(displayScore * 1.05)))
        ),

        // If JD Track: Render JD Competency Checklist & 24-Hour Cheat Sheet
        isJdTrack ? this._renderJdCheatSheetSection(jdReport) : null,

        // Per-Question Detailed Breakdown
        el('h4', { class: 'report-section-title' }, 'Challenge-by-Challenge Technical & Speech Breakdown'),
        el('div', { class: 'report-questions-list' },
          ...this.submissions.map((sub, idx) => {
            const ev = sub.evaluation;
            const sp = sub.speechDiagnostic;
            return el('div', { class: 'report-card glass' },
              el('div', { class: 'report-card-top' },
                el('div', {},
                  el('span', { class: 'report-card-num' }, `Question ${idx + 1}`),
                  el('h4', { class: 'report-card-title' }, sub.challenge.title)
                ),
                el('div', { class: 'report-card-score' }, `${ev.score || 8}/10 pts`)
              ),
              el('div', { class: 'report-card-meta' },
                el('span', { class: 'pill pill--sm' }, `Verdict: ${ev.verdict}`),
                ev.complexity ? el('span', { class: 'pill pill--sm' }, `Complexity: ${ev.complexity}`) : null,
                sub.testResult ? el('span', { class: 'pill pill--sm' }, `${sub.testResult.passCount}/${sub.testResult.totalCount} Tests Passed`) : null,
                sp ? el('span', { class: 'pill pill--sm pill--accent' }, `🎙️ ${sp.wpm} WPM (${sp.pacingRating}) • ${sp.fillerCount} fillers`) : null
              ),
              el('div', { class: 'report-feedback' },
                el('p', {}, el('b', {}, 'AI Technical Feedback: '), ev.feedback),
                el('p', {}, el('b', {}, 'Key Strengths: '), ev.strengths),
                el('p', {}, el('b', {}, 'Areas to Improve: '), ev.areasToImprove),
                ev.optimalApproach ? el('p', { class: 'report-optimal' }, el('b', {}, 'Optimal Industry Approach: '), ev.optimalApproach) : null,
                sp && sp.coachingTips?.length ? el('div', { class: 'speech-card-tips' },
                  el('b', {}, '🗣️ Speech & Articulation Delivery: '),
                  el('span', {}, sp.coachingTips[0])
                ) : null
              )
            );
          })
        ),

        // Footer Actions
        el('div', { class: 'arena-report-footer' },
          el('button', { class: 'pill', id: 'btn-retake-interview', type: 'button' }, '🔄 Practice Another Round'),
          el('button', { class: 'pill pill--accent', id: 'btn-close-report', type: 'button' }, 'Done & Return to Stage')
        )
      )
    );

    on(report, 'click', (e) => e.stopPropagation());
    on(report.querySelector('.arena-report-close'), 'click', () => this.close());
    on(report.querySelector('#btn-close-report'), 'click', () => this.close());
    on(report.querySelector('#btn-retake-interview'), 'click', () => {
      this.state = 'config';
      this.render();
    });

    this.root.append(report);
  }

  _renderSpeechDiagnosticsPanel(summary) {
    if (!summary && !this.speechDiagnostics.length) return null;

    // Calculate aggregated speech stats if summary not supplied directly
    const diags = this.speechDiagnostics;
    const avgWpm = summary?.avgWpm || Math.round(diags.reduce((a, d) => a + (d.wpm || 0), 0) / (diags.length || 1));
    const totalFillers = summary?.totalFillers ?? diags.reduce((a, d) => a + (d.fillerCount || 0), 0);
    const starScore = summary?.starMethodScore ?? Math.round(diags.reduce((a, d) => a + (d.starScore || 70), 0) / (diags.length || 1));
    const conciseness = summary?.concisenessScore ?? Math.round(diags.reduce((a, d) => a + (d.concisenessScore || 80), 0) / (diags.length || 1));
    const pacingRating = avgWpm > 175 ? 'Rushed' : avgWpm < 110 ? 'Slow / Halting' : 'Optimal Pace (120-160 WPM)';

    return el('div', { class: 'speech-diagnostic-card glass' },
      el('div', { class: 'speech-diag-head' },
        el('div', {},
          el('h4', { class: 'speech-diag-title' }, '🎙️ Speech & Articulation Diagnostics'),
          el('p', {}, 'Real-time cadence, verbal filler crutches, STAR behavioral structure, and delivery conciseness.')
        ),
        el('div', { class: `pacing-badge ${avgWpm >= 115 && avgWpm <= 165 ? 'pacing-badge--ok' : 'pacing-badge--warn'}` },
          `Pacing: ${pacingRating}`
        )
      ),
      el('div', { class: 'speech-diag-grid' },
        el('div', { class: 'speech-stat-box' },
          el('span', { class: 'speech-stat-val' }, `${avgWpm}`),
          el('small', {}, 'WORDS PER MINUTE (WPM)')
        ),
        el('div', { class: 'speech-stat-box' },
          el('span', { class: 'speech-stat-val' }, `${totalFillers}`),
          el('small', {}, 'FILLER WORDS DETECTED')
        ),
        el('div', { class: 'speech-stat-box' },
          el('span', { class: 'speech-stat-val' }, `${starScore}%`),
          el('small', {}, 'STAR STRUCTURE ADHERENCE')
        ),
        el('div', { class: 'speech-stat-box' },
          el('span', { class: 'speech-stat-val' }, `${conciseness}%`),
          el('small', {}, 'CONCISENESS RATING')
        )
      ),
      summary?.coachingActionPoints?.length ? el('div', { class: 'speech-action-points' },
        el('b', {}, '💡 Articulation & Delivery Coaching Points:'),
        el('ul', {}, ...summary.coachingActionPoints.map((tip) => el('li', {}, tip)))
      ) : null
    );
  }

  _renderJdCheatSheetSection(jdReport) {
    const cs = jdReport.cheatSheet;
    if (!cs) return null;

    return el('div', { class: 'jd-cheat-sheet glass' },
      el('div', { class: 'jd-cheat-head' },
        el('h4', {}, '⚡ 24-Hour Job Posting Action Cheat-Sheet'),
        el('p', {}, `High-yield interview preparation specifically for ${jdReport.targetCompany || 'the hiring team'}.`)
      ),
      el('div', { class: 'jd-cheat-grid' },
        el('div', { class: 'jd-cheat-col' },
          el('h5', {}, '⚠️ Vulnerability Gaps to Address'),
          el('ul', {}, ...cs.gapsToAddress.map((g) => el('li', {}, g)))
        ),
        el('div', { class: 'jd-cheat-col' },
          el('h5', {}, '🎯 Questions You WILL Be Asked'),
          el('ul', {}, ...cs.questionsYouWillBeAsked.map((q) => el('li', {}, q)))
        ),
        el('div', { class: 'jd-cheat-col' },
          el('h5', {}, '🗣️ Critical Delivery Adjustments'),
          el('ul', {}, ...cs.deliveryTweaks.map((d) => el('li', {}, d)))
        )
      )
    );
  }

  _createMetricBar(label, percent) {
    const clamped = Math.max(15, Math.min(100, percent));
    return el('div', { class: 'metric-item' },
      el('div', { class: 'metric-header' },
        el('span', { class: 'metric-label' }, label),
        el('span', { class: 'metric-val' }, `${clamped}%`)
      ),
      el('div', { class: 'metric-bar' },
        el('i', { style: `width: ${clamped}%` })
      )
    );
  }
}
