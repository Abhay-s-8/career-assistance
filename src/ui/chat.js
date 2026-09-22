/* ============================================================
   AURA — Chat transcript
   ============================================================ */

import { $, el } from './dom.js';

export class ChatView {
  constructor() {
    this.list = $('#messages');
    this._typing = null;
  }

  _scroll() {
    // rAF so the node is laid out before we measure.
    requestAnimationFrame(() => { this.list.scrollTop = this.list.scrollHeight; });
  }

  add(role, text, authorName, meta = {}) {
    const node = el('div', { class: `msg msg--${role}` });
    if (role === 'user' && authorName) {
      const head = el('div', { class: 'msg--user-head' },
        el('i', { class: 'msg--user-dot' }),
        document.createTextNode(authorName)
      );
      node.append(head);
    } else if (role === 'bot') {
      const providerLabel = meta.provider || 'Google Gemini';
      const head = el('div', { class: 'msg--bot-head' },
        el('i', { class: 'msg--bot-dot' }),
        document.createTextNode(`Siya · ${providerLabel}`)
      );
      node.append(head);
    }
    const body = el('div', { class: 'msg__text' });
    body.textContent = text;
    node.append(body);
    this.list.append(node);
    this._scroll();
    return node;
  }

  /** System line, e.g. "Expression → happy". */
  system(label, value) {
    const node = el('div', { class: 'msg msg--sys' });
    node.append(document.createTextNode(label + ' '));
    node.append(el('b', {}, value));
    this.list.append(node);
    this._scroll();
    return node;
  }

  /** Flagship self-introduction card for Siya rendered on start or introduce commands */
  addSiyaIntroductionCard({ user, onAction, onSpeakIntro, onVoice, onFaceDrawer, onResumeDrawer, onInterview } = {}) {
    const firstName = user?.firstName || (user?.name ? user.name.split(' ')[0] : null);
    const titleText = firstName
      ? `Welcome back, ${firstName}! I'm Siya.`
      : "Hi! I'm Siya — Your 3D AI Career Guidance Mentor";

    const bioText = firstName
      ? `I'm ready to conduct mock technical interviews, review your resume with ATS scoring, or explore system architecture. What would you like to prepare for today?`
      : `I'm an interactive 3D AI career guidance mentor powered by Google Gemini, real-time facial expressions, and neural speech. I specialize in coaching engineers through mock interviews, analyzing resumes, and guiding tech career growth.`;

    const node = el('div', { class: 'msg msg--bot msg--intro-card glass' },
      el('div', { class: 'msg--bot-head' },
        el('i', { class: 'msg--bot-dot' }),
        document.createTextNode('Siya · Google Gemini 2.5 Flash')
      ),
      el('div', { class: 'intro-card-header' },
        el('div', { class: 'intro-card-badge' },
          el('span', { class: 'intro-dot' }),
          document.createTextNode('3D AI CAREER GUIDANCE MENTOR · ACTIVE')
        ),
        el('div', { class: 'intro-card-tag' }, 'Real-time 3D Avatar')
      ),
      el('h3', { class: 'intro-card-title' }, titleText),
      el('p', { class: 'intro-card-bio' }, bioText),
      el('div', { class: 'intro-features-grid' },
        el('div', { class: 'intro-feature-item' },
          el('span', { class: 'intro-feature-icon' }, '🎯'),
          el('div', { class: 'intro-feature-text' },
            el('span', { class: 'intro-feature-name' }, 'AI Mock Interviews'),
            el('span', { class: 'intro-feature-desc' }, 'Live coding arena & feedback')
          )
        ),
        el('div', { class: 'intro-feature-item' },
          el('span', { class: 'intro-feature-icon' }, '📄'),
          el('div', { class: 'intro-feature-text' },
            el('span', { class: 'intro-feature-name' }, 'Resume Intelligence'),
            el('span', { class: 'intro-feature-desc' }, 'ATS score & skill gap audit')
          )
        ),
        el('div', { class: 'intro-feature-item' },
          el('span', { class: 'intro-feature-icon' }, '🧭'),
          el('div', { class: 'intro-feature-text' },
            el('span', { class: 'intro-feature-name' }, 'Career Discovery'),
            el('span', { class: 'intro-feature-desc' }, 'Salary benchmarks & roadmaps')
          )
        ),
        el('div', { class: 'intro-feature-item' },
          el('span', { class: 'intro-feature-icon' }, '🎙️'),
          el('div', { class: 'intro-feature-text' },
            el('span', { class: 'intro-feature-name' }, 'Voice & 3D Expressions'),
            el('span', { class: 'intro-feature-desc' }, 'Lip sync & emotive gestures')
          )
        )
      ),
      el('div', { class: 'intro-card-actions' },
        el('button', { class: 'chipbtn chipbtn--intro chipbtn--intro-accent', type: 'button', id: 'intro-btn-interview' }, '🎯 Start Mock Interview'),
        el('button', { class: 'chipbtn chipbtn--intro', type: 'button', id: 'intro-btn-resume' }, '📄 Upload Resume'),
        el('button', { class: 'chipbtn chipbtn--intro', type: 'button', id: 'intro-btn-discovery' }, '🧭 Career Discovery'),
        el('button', { class: 'chipbtn chipbtn--intro', type: 'button', id: 'intro-btn-voice' }, '🎙️ Voice Chat'),
        el('button', { class: 'chipbtn chipbtn--intro chipbtn--intro-audio', type: 'button', id: 'intro-btn-speak' }, '🔊 Hear Voice')
      )
    );

    node.querySelector('#intro-btn-interview')?.addEventListener('click', () => {
      if (onInterview) onInterview();
      else onAction?.('start mock interview');
    });
    node.querySelector('#intro-btn-resume')?.addEventListener('click', () => {
      if (onResumeDrawer) onResumeDrawer();
      else onAction?.('critique resume');
    });
    node.querySelector('#intro-btn-discovery')?.addEventListener('click', () => {
      onAction?.('career discovery');
    });
    node.querySelector('#intro-btn-voice')?.addEventListener('click', () => {
      onVoice?.();
    });
    node.querySelector('#intro-btn-speak')?.addEventListener('click', () => {
      onSpeakIntro?.();
    });

    this.list.append(node);
    this._scroll();
    return node;
  }

  addAkshayIntroductionCard(args) {
    return this.addSiyaIntroductionCard(args);
  }

  /** Renders an interactive welcome card when a user signs in or registers */
  addAuthAnnouncement(user, onAction) {
    const node = el('div', { class: 'msg msg--resume-card glass' },
      el('div', { class: 'resume-card-badge' }, '✦ PROFILE PERSONALIZED'),
      el('div', { class: 'resume-card-title' }, `Welcome, ${user.name}!`),
      el('div', { class: 'resume-card-sub' }, `${user.targetRole || 'Software Professional'} • Personalized AI Session Active`),
      el('div', { class: 'resume-card-actions' },
        el('button', { class: 'chipbtn chipbtn--action', type: 'button' }, '🎯 Start Mock Interview'),
        el('button', { class: 'chipbtn chipbtn--action', type: 'button' }, '🧭 Career Discovery'),
        el('button', { class: 'chipbtn chipbtn--action', type: 'button' }, '📄 Upload Resume')
      )
    );

    const buttons = node.querySelectorAll('.chipbtn--action');
    const prompts = {
      '🎯 Start Mock Interview': 'start mock interview',
      '🧭 Career Discovery': 'career discovery',
      '📄 Upload Resume': 'critique resume'
    };

    for (const b of buttons) {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const label = b.textContent.trim();
        onAction?.(prompts[label] || label);
      });
    }

    this.list.append(node);
    this._scroll();
    return node;
  }

  /** Prompts user to upload resume first before asking interview questions */
  addUploadResumePrompt({ onBrowse, onSample, onDrawer, onSkip } = {}) {
    const node = el('div', { class: 'msg msg--resume-card msg--resume-gate glass' },
      el('div', { class: 'resume-card-badge resume-card-badge--gate' }, '📄 STEP 1: UPLOAD RESUME FIRST'),
      el('div', { class: 'resume-card-title' }, 'Upload Your Resume to Begin'),
      el('div', { class: 'resume-card-sub' }, 'To ask realistic questions tailored to your actual skills, projects, and architecture experience, Siya needs your resume first.'),
      el('div', { class: 'resume-card-actions resume-gate-actions' },
        el('button', { class: 'chipbtn chipbtn--action chipbtn--primary', type: 'button', id: 'gate-btn-browse' }, '📁 Browse Resume (PDF / DOCX / TXT)'),
        el('button', { class: 'chipbtn chipbtn--action', type: 'button', id: 'gate-btn-sample' }, '⚡ Use Sample Resume (Abhay)'),
        el('button', { class: 'chipbtn chipbtn--action', type: 'button', id: 'gate-btn-drawer' }, '📂 Open Resume Drawer')
      ),
      el('div', { class: 'resume-gate-footnote' },
        el('span', {}, '💡 Drag & drop your resume file anywhere on screen'),
        onSkip ? el('button', { class: 'link-btn', type: 'button', id: 'gate-btn-skip' }, 'Skip to generic algorithmic questions →') : null
      )
    );

    node.querySelector('#gate-btn-browse')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onBrowse?.(); });
    node.querySelector('#gate-btn-sample')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onSample?.(); });
    node.querySelector('#gate-btn-drawer')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onDrawer?.(); });
    node.querySelector('#gate-btn-skip')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onSkip?.(); });

    this.list.append(node);
    this._scroll();
    return node;
  }

  /** Renders a rich interview question card in chat */
  addInterviewQuestionCard({ questionNumber = 1, totalQuestions = 3, title, prompt, framework, onVoice, onArena, onChatAnswer } = {}) {
    const node = el('div', { class: 'msg msg--interview-question glass' },
      el('div', { class: 'interview-q-header' },
        el('span', { class: 'interview-q-badge' }, `🎯 QUESTION ${questionNumber} OF ${totalQuestions}`),
        el('span', { class: 'interview-q-topic' }, title || 'Technical Question')
      ),
      el('div', { class: 'interview-q-prompt' }, prompt),
      framework ? el('div', { class: 'interview-q-hint' }, `💡 What the interviewer is evaluating: ${framework}`) : null,
      el('div', { class: 'interview-q-actions' },
        el('button', { class: 'chipbtn chipbtn--action chipbtn--voice', type: 'button', id: 'q-btn-voice' }, '🎙️ Answer by Voice'),
        el('button', { class: 'chipbtn chipbtn--action chipbtn--accent', type: 'button', id: 'q-btn-arena' }, '💻 Code & Interview Arena')
      )
    );

    node.querySelector('#q-btn-voice')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onVoice?.(); });
    node.querySelector('#q-btn-arena')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onArena?.(); });

    this.list.append(node);
    this._scroll();
    return node;
  }

  /** Renders an interactive card when a resume is loaded */
  addResumeAnnouncement(resume, onAction) {
    const node = el('div', { class: 'msg msg--resume-card glass' },
      el('div', { class: 'resume-card-badge' }, '✓ RESUME ANALYZED'),
      el('div', { class: 'resume-card-title' }, resume.name),
      el('div', { class: 'resume-card-sub' }, `${resume.headline || 'Software Professional'} • ${resume.skills?.length || 0} skills detected`),
      el('div', { class: 'resume-card-actions' },
        el('button', { class: 'chipbtn chipbtn--action chipbtn--primary', type: 'button' }, '🎯 Start Interview'),
        el('button', { class: 'chipbtn chipbtn--action', type: 'button' }, '🔍 Critique Resume'),
        el('button', { class: 'chipbtn chipbtn--action', type: 'button' }, '⭐ Top Strengths'),
        el('button', { class: 'chipbtn chipbtn--action', type: 'button' }, '⚡ Skill Gaps')
      )
    );

    const buttons = node.querySelectorAll('.chipbtn--action');
    const prompts = {
      '🎯 Start Interview': `Conduct a technical mock interview for me based on my resume. Ask me your first question.`,
      '🔍 Critique Resume': `Please give me a thorough, constructive critique of my resume with 3 specific suggestions.`,
      '⭐ Top Strengths': `What are my biggest technical and career strengths based on my resume?`,
      '⚡ Skill Gaps': `What skills or architectural experiences should I develop next for senior/staff roles?`,
    };

    for (const b of buttons) {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const label = b.textContent.trim();
        onAction?.(prompts[label] || label);
      });
    }

    this.list.append(node);
    this._scroll();
    return node;
  }

  /** Flagship personalized welcome card rendered immediately after signup + resume submission */
  addRegistrationWelcomeCard({ user, resume, onAction, onInterview, onAtsCritique, onJdPractice, onDiscovery, onVoice } = {}) {
    const firstName = user?.firstName || (user?.name ? user.name.split(' ')[0] : null) || (resume?.name && resume.name !== 'Candidate' ? resume.name.split(' ')[0] : 'Candidate');
    const fullName = user?.name || resume?.name || firstName;
    const targetRole = user?.targetRole || resume?.headline || 'Software Professional';
    const skillCount = resume?.skills?.length || 0;
    const topSkills = resume?.skills?.slice(0, 5) || ['Full-Stack Development', 'System Design'];
    const atsScore = resume?.atsScore || 85;

    const node = el('div', { class: 'msg msg--bot msg--welcome-card glass' },
      el('div', { class: 'msg--bot-head' },
        el('i', { class: 'msg--bot-dot' }),
        document.createTextNode('Siya · 3D AI Career Guidance Mentor')
      ),
      el('div', { class: 'welcome-card-header' },
        el('div', { class: 'welcome-card-badge' },
          el('span', { class: 'welcome-card-dot' }),
          document.createTextNode('✦ CANDIDATE ONBOARDING COMPLETE')
        ),
        el('span', { class: 'welcome-card-score-pill' }, `ATS Score: ${atsScore}/100`)
      ),
      el('h3', { class: 'welcome-card-title' }, `Welcome, ${fullName}!`),
      el('p', { class: 'welcome-card-sub' },
        `Your personalized AI companion is ready for `,
        el('b', {}, targetRole),
        `. I detected `,
        el('b', {}, `${skillCount} skills`),
        ` from your personal resume.`
      ),
      el('div', { class: 'welcome-skills-cloud' },
        topSkills.map((sk) => el('span', { class: 'welcome-skill-tag' }, `✓ ${sk}`))
      ),
      el('div', { class: 'welcome-card-prompt' }, '💬 What would you like to prepare for or explore first?'),
      el('div', { class: 'welcome-card-actions' },
        el('button', { class: 'chipbtn chipbtn--welcome chipbtn--primary', type: 'button', id: 'wb-btn-interview' },
          el('span', { class: 'chipbtn-icon' }, '🎯'),
          el('span', { class: 'chipbtn-text' },
            el('b', {}, 'Start Tailored Mock Interview'),
            el('small', {}, `Personalized round for ${targetRole}`)
          )
        ),
        el('button', { class: 'chipbtn chipbtn--welcome', type: 'button', id: 'wb-btn-critique' },
          el('span', { class: 'chipbtn-icon' }, '📊'),
          el('span', { class: 'chipbtn-text' },
            el('b', {}, 'ATS Score & Skill Diagnostics'),
            el('small', {}, 'Review top strengths & detailed critique')
          )
        ),
        el('button', { class: 'chipbtn chipbtn--welcome', type: 'button', id: 'wb-btn-jd' },
          el('span', { class: 'chipbtn-icon' }, '💼'),
          el('span', { class: 'chipbtn-text' },
            el('b', {}, 'Job Description Practice Arena'),
            el('small', {}, 'Paste a job description for targeted questions')
          )
        ),
        el('button', { class: 'chipbtn chipbtn--welcome', type: 'button', id: 'wb-btn-discovery' },
          el('span', { class: 'chipbtn-icon' }, '🧭'),
          el('span', { class: 'chipbtn-text' },
            el('b', {}, 'Career Discovery & Roadmaps'),
            el('small', {}, 'Level progression and salary benchmarks')
          )
        ),
        el('button', { class: 'chipbtn chipbtn--welcome chipbtn--voice-action', type: 'button', id: 'wb-btn-voice' },
          el('span', { class: 'chipbtn-icon' }, '🎙️'),
          el('span', { class: 'chipbtn-text' },
            el('b', {}, 'Speak Aloud with Siya (Voice)'),
            el('small', {}, 'Live 3D conversational voice session')
          )
        )
      )
    );

    node.querySelector('#wb-btn-interview')?.addEventListener('click', () => {
      if (onInterview) onInterview();
      else onAction?.('start mock interview');
    });
    node.querySelector('#wb-btn-critique')?.addEventListener('click', () => {
      if (onAtsCritique) onAtsCritique();
      else onAction?.('critique resume');
    });
    node.querySelector('#wb-btn-jd')?.addEventListener('click', () => {
      if (onJdPractice) onJdPractice();
      else onAction?.('job description interview');
    });
    node.querySelector('#wb-btn-discovery')?.addEventListener('click', () => {
      if (onDiscovery) onDiscovery();
      else onAction?.('career discovery');
    });
    node.querySelector('#wb-btn-voice')?.addEventListener('click', () => {
      if (onVoice) onVoice();
    });

    this.list.append(node);
    this._scroll();
    return node;
  }

  typing(on) {
    if (on) {
      if (this._typing) return;
      this._typing = el('div', { class: 'msg msg--bot' },
        el('span', { class: 'msg__typing', html: '<i></i><i></i><i></i>' }));
      this.list.append(this._typing);
      this._scroll();
    } else {
      this._typing?.remove();
      this._typing = null;
    }
  }

  clear() { this.list.innerHTML = ''; this._typing = null; }
}
