/* ============================================================
   AURA — Resume Profile Drawer & Upload Controller
   Provides interactive drag-and-drop resume uploading,
   multi-category skill visualization, multi-factor ATS diagnostic,
   work experience timeline, and one-click career actions.
   ============================================================ */

import { $, $$, el, on, toast } from './dom.js';
import { inspectAllSkills, SKILL_DOMAINS } from '../ai/skillInspector.js';

export class ResumeDrawer {
  constructor({ onUpload, onSample, onClear, onPrompt, onCareerDiscovery, onLaunchInterview } = {}) {
    this.root = $('#resume-drawer');
    this.body = $('#resume-drawer-body');
    this.fileInput = $('#resume-file-input');
    this.btnUploadComposer = $('#btn-upload-resume');
    this.onUpload = onUpload;
    this.onSample = onSample;
    this.onClear = onClear;
    this.onPrompt = onPrompt;
    this.onCareerDiscovery = onCareerDiscovery;
    this.onLaunchInterview = onLaunchInterview;
    this.resume = null;
    this.activeSkillCategory = 'all';

    this._wire();
  }

  _wire() {
    // File inputs (both from composer and drawer)
    if (this.fileInput) {
      on(this.fileInput, 'change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this.onUpload?.(file);
          this.fileInput.value = '';
        }
      });
    }

    if (this.btnUploadComposer) {
      on(this.btnUploadComposer, 'click', () => {
        this.fileInput?.click();
      });
    }

    // Global drag-and-drop
    this._wireDragDrop();
  }

  _wireDragDrop() {
    const dropOverlay = $('#drop-overlay');

    const showOverlay = () => dropOverlay?.classList.add('is-active');
    const hideOverlay = () => dropOverlay?.classList.remove('is-active');

    let dragCounter = 0;

    on(window, 'dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      showOverlay();
    });

    on(window, 'dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        hideOverlay();
      }
    });

    on(window, 'dragover', (e) => {
      e.preventDefault();
    });

    on(window, 'drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      hideOverlay();

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['pdf', 'docx', 'txt', 'md', 'json', 'rtf'].includes(ext)) {
          this.onUpload?.(file);
        } else {
          toast('Please drop a PDF, DOCX, TXT, or Markdown document.');
        }
      }
    });
  }

  setResume(resume) {
    this.resume = resume;
    this.activeSkillCategory = 'all';
    this.render();
  }

  render() {
    if (!this.body) return;
    this.body.innerHTML = '';

    if (!this.resume) {
      this._renderEmptyState();
    } else {
      this._renderActiveState();
    }
  }

  _renderEmptyState() {
    const dropzone = el('div', { class: 'resume-dropzone' },
      el('div', { class: 'resume-dropzone__icon' },
        el('svg', { html: '<use href="#i-upload"/>' })),
      el('h3', { class: 'resume-dropzone__title' }, 'High-Precision Resume Scanner'),
      el('p', { class: 'resume-dropzone__sub' }, 'Drop your PDF, Word (.docx), or Markdown file to extract 350+ skills, analyze experience, and calculate ATS readiness.'),
      el('button', { class: 'pill pill--accent resume-dropzone__btn', type: 'button' }, 'Browse Files'),
      el('div', { class: 'resume-dropzone__or' }, el('span', {}, 'OR')),
      el('button', { class: 'pill pill--sample', type: 'button', id: 'btn-sample-resume' }, 'Load Senior AI Engineer Sample Resume')
    );

    on(dropzone.querySelector('.resume-dropzone__btn'), 'click', () => {
      this.fileInput?.click();
    });

    on(dropzone.querySelector('#btn-sample-resume'), 'click', () => {
      this.onSample?.();
    });

    this.body.append(dropzone);
  }

  _renderActiveState() {
    const r = this.resume;

    // Header Card
    const header = el('div', { class: 'resume-card glass' },
      el('div', { class: 'resume-card__top' },
        el('div', {},
          el('h3', { class: 'resume-card__name' }, r.name && r.name !== 'Candidate' ? r.name : 'Candidate Profile'),
          el('div', { class: 'resume-card__role' }, r.headline || 'Software Professional')),
        el('span', { class: `resume-card__badge ${r.atsScore >= 85 ? 'ats-badge--high' : 'ats-badge--med'}` }, `${r.atsScore || 90}% ATS Match`)),
      el('div', { class: 'resume-card__meta' },
        r.contact?.location ? el('span', { class: 'resume-meta-chip' }, `📍 ${r.contact.location}`) : null,
        r.contact?.email ? el('span', { class: 'resume-meta-chip' }, `✉ ${r.contact.email}`) : null,
        r.contact?.phone ? el('span', { class: 'resume-meta-chip' }, `☎ ${r.contact.phone}`) : null,
        r.contact?.linkedin ? el('a', { class: 'resume-meta-chip resume-meta-link', href: r.contact.linkedin, target: '_blank', rel: 'noopener noreferrer' }, '🔗 LinkedIn') : null,
        r.contact?.github ? el('a', { class: 'resume-meta-chip resume-meta-link', href: r.contact.github, target: '_blank', rel: 'noopener noreferrer' }, '🐙 GitHub') : null,
        r.estimatedYears ? el('span', { class: 'resume-meta-chip' }, `⏳ ${r.estimatedYears}`) : null,
        r.skills?.length ? el('span', { class: 'resume-meta-chip highlight-chip' }, `⚡ ${r.skills.length} Skills Detected`) : null
      )
    );

    // 8-Stage Career Discovery Highlight Banner
    const careerBanner = el('div', { class: 'career-discovery-banner glass' },
      el('div', { class: 'career-banner-meta' },
        el('div', { class: 'career-banner-badge' }, '🧭 8-STAGE PROFESSIONAL DISCOVERY'),
        el('h4', { class: 'career-banner-title' }, 'Uncover Multi-Pathway Career Options'),
        el('p', { class: 'career-banner-desc' }, 'Generate an adaptive career options report tailored to your verified technical skills and background.')
      ),
      el('button', { class: 'pill pill--accent pill--glow career-banner-btn', type: 'button', id: 'btn-start-discovery' }, 'Start Discovery →')
    );

    on(careerBanner.querySelector('#btn-start-discovery'), 'click', () => {
      this.onCareerDiscovery?.();
    });

    // Multi-Factor ATS Diagnostic Breakdown
    const atsSection = this._renderAtsDiagnostic(r);

    // Key Quantified Impact Bullets (if any)
    const metricsSection = this._renderMetricsSection(r);

    // Quick Action Prompt Grid
    const actionsSection = el('div', { class: 'resume-section' },
      el('h4', { class: 'resume-section__title' }, 'AI Career & Interview Actions'),
      el('div', { class: 'resume-actions-grid' },
        this._createActionBtn('🎯 Mock Interview', () => this.onLaunchInterview?.()),
        this._createActionBtn('🧭 Career Discovery', () => this.onCareerDiscovery?.()),
        this._createActionBtn('🔍 ATS Critique', `Analyze my resume ATS score (${r.atsScore}%) in detail. Give me 3 concrete suggestions to improve my keyword visibility and technical impact metrics.`),
        this._createActionBtn('⭐ Top Strengths', `Summarize my top 4 competitive strengths based on my detected technical skills: ${r.skills?.slice(0, 6).join(', ')}.`),
        this._createActionBtn('⚡ Fill Skill Gaps', `What senior or staff-level skill gaps should I focus on bridging next to level up my engineering career?`),
        this._createActionBtn('💼 Best Matching Roles', `What specific job titles, engineering tracks, and industries are the highest probability match for my resume background?`)
      )
    );

    // Categorized Skills Taxonomy Section
    const skillsSection = this._renderSkillsSection(r);

    // Languages & Hobbies Section (if any)
    const extraSection = this._renderLanguagesAndHobbiesSection(r);

    // Work Experience Timeline
    const experienceSection = this._renderExperienceSection(r);

    // Education Section
    const educationSection = this._renderEducationSection(r);

    // Summary Section
    const summarySection = el('div', { class: 'resume-section' },
      el('h4', { class: 'resume-section__title' }, 'Executive Summary Snippet'),
      el('p', { class: 'resume-summary-text' }, r.summarySnippet || r.rawText?.slice(0, 320) + '...')
    );

    // Footer Controls
    const footer = el('div', { class: 'resume-footer' },
      el('button', { class: 'pill pill--sm', type: 'button', id: 'btn-replace-resume' }, 'Replace Resume'),
      el('button', { class: 'pill pill--sm pill--danger', type: 'button', id: 'btn-clear-resume' }, 'Remove')
    );

    on(footer.querySelector('#btn-replace-resume'), 'click', () => {
      this.fileInput?.click();
    });

    on(footer.querySelector('#btn-clear-resume'), 'click', () => {
      this.onClear?.();
    });

    this.body.append(
      header,
      careerBanner,
      atsSection,
      metricsSection,
      actionsSection,
      skillsSection,
      extraSection,
      experienceSection,
      educationSection,
      summarySection,
      footer
    );
  }

  _renderAtsDiagnostic(r) {
    const breakdown = r.atsBreakdown || {};

    const factors = [
      { key: 'skillDepth', label: 'Technical Depth', current: breakdown.skillDepth?.score || 25, max: breakdown.skillDepth?.max || 30 },
      { key: 'quantifiableImpact', label: 'Quantifiable Metrics', current: breakdown.quantifiableImpact?.score || 16, max: breakdown.quantifiableImpact?.max || 20 },
      { key: 'structure', label: 'Structure & Sections', current: breakdown.structure?.score || 18, max: breakdown.structure?.max || 20 },
      { key: 'contact', label: 'Contact Completeness', current: breakdown.contact?.score || 14, max: breakdown.contact?.max || 15 },
      { key: 'actionVerbs', label: 'Action Verbs', current: breakdown.actionVerbs?.score || 13, max: breakdown.actionVerbs?.max || 15 }
    ];

    const section = el('div', { class: 'resume-section resume-ats-diagnostic glass' },
      el('div', { class: 'resume-section__header' },
        el('h4', { class: 'resume-section__title' }, '📊 ATS Readiness Diagnostic'),
        el('span', { class: 'ats-total-badge' }, `${r.atsScore || 90} / 100`)
      ),
      el('div', { class: 'ats-bars-grid' },
        ...factors.map((f) => {
          const pct = Math.round((f.current / f.max) * 100);
          return el('div', { class: 'ats-bar-row' },
            el('div', { class: 'ats-bar-label' },
              el('span', {}, f.label),
              el('b', {}, `${f.current}/${f.max}`)
            ),
            el('div', { class: 'ats-bar-track' },
              el('div', { class: 'ats-bar-fill', style: `width: ${pct}%` })
            )
          );
        })
      )
    );

    return section;
  }

  _renderMetricsSection(r) {
    if (!r.metrics || !r.metrics.length) return el('div');

    const topMetrics = r.metrics.slice(0, 4);

    return el('div', { class: 'resume-section' },
      el('div', { class: 'resume-section__header' },
        el('h4', { class: 'resume-section__title' }, '⚡ Quantifiable Impact Highlights'),
        el('span', { class: 'resume-section__count' }, `${r.metrics.length} detected`)
      ),
      el('div', { class: 'metrics-highlight-grid' },
        ...topMetrics.map((m) => {
          return el('div', { class: 'metric-badge-item' },
            el('span', { class: 'metric-number' }, m.metric),
            el('p', { class: 'metric-context' }, `“${m.context}”`)
          );
        })
      )
    );
  }

  _renderSkillsSection(r) {
    const byCategory = r.skillsByCategory || {};
    const categories = [
      { id: 'all', label: 'All', count: r.skills?.length || 0 },
      { id: 'ai_ml', label: 'AI & ML', count: byCategory.ai_ml?.length || 0 },
      { id: 'languages', label: 'Languages', count: byCategory.languages?.length || 0 },
      { id: 'frontend', label: 'Frontend', count: byCategory.frontend?.length || 0 },
      { id: 'backend', label: 'Backend', count: byCategory.backend?.length || 0 },
      { id: 'databases', label: 'Databases', count: byCategory.databases?.length || 0 },
      { id: 'cloud_devops', label: 'Cloud & DevOps', count: byCategory.cloud_devops?.length || 0 },
      { id: 'hardware_engineering', label: 'Hardware & VLSI', count: byCategory.hardware_engineering?.length || 0 },
      { id: 'design_creative', label: 'Design & Tools', count: byCategory.design_creative?.length || 0 },
      { id: 'analysis_writing', label: 'Analysis & Writing', count: byCategory.analysis_writing?.length || 0 },
      { id: 'practices', label: 'Practices', count: byCategory.practices?.length || 0 },
      { id: 'spoken_languages', label: 'Spoken Languages', count: (byCategory.spoken_languages?.length || r.spokenLanguages?.length || 0) },
      { id: 'hobbies_interests', label: 'Hobbies & Interests', count: (byCategory.hobbies_interests?.length || r.hobbies?.length || 0) }
    ].filter((c) => c.count > 0 || c.id === 'all');

    const container = el('div', { class: 'resume-section' },
      el('div', { class: 'resume-section__header' },
        el('h4', { class: 'resume-section__title' }, 'Extracted Skills & Competencies'),
        el('button', { class: 'pill pill--sm pill--accent', type: 'button', id: 'btn-inspect-all-skills' }, '🔍 Deep Inspector')
      ),
      el('div', { class: 'skill-category-tabs' },
        ...categories.map((c) => {
          const tab = el('button', {
            class: `skill-cat-tab ${this.activeSkillCategory === c.id ? 'is-active' : ''}`,
            type: 'button'
          }, `${c.label} (${c.count})`);

          on(tab, 'click', () => {
            this.activeSkillCategory = c.id;
            this._updateSkillPills(container);
          });
          return tab;
        })
      ),
      el('div', { class: 'resume-skills-cloud' })
    );

    this._updateSkillPills(container);

    on(container.querySelector('#btn-inspect-all-skills'), 'click', () => {
      this._showSkillInspectorModal();
    });

    return container;
  }

  _updateSkillPills(container) {
    const cloud = container.querySelector('.resume-skills-cloud');
    const tabs = container.querySelectorAll('.skill-cat-tab');
    if (!cloud) return;

    tabs.forEach((tab) => {
      const isCurrent = tab.textContent.toLowerCase().startsWith(this.activeSkillCategory.toLowerCase()) ||
        (this.activeSkillCategory === 'all' && tab.textContent.startsWith('All'));
      tab.classList.toggle('is-active', isCurrent);
    });

    cloud.innerHTML = '';

    let skillsToDisplay = [];
    if (this.activeSkillCategory === 'all') {
      skillsToDisplay = this.resume.skills || [];
    } else if (this.activeSkillCategory === 'spoken_languages') {
      skillsToDisplay = this.resume.spokenLanguages?.length ? this.resume.spokenLanguages : (this.resume.skillsByCategory?.spoken_languages || []);
    } else if (this.activeSkillCategory === 'hobbies_interests') {
      skillsToDisplay = this.resume.hobbies?.length ? this.resume.hobbies : (this.resume.skillsByCategory?.hobbies_interests || []);
    } else {
      skillsToDisplay = this.resume.skillsByCategory?.[this.activeSkillCategory] || [];
    }

    if (!skillsToDisplay.length) {
      cloud.append(el('p', { class: 'no-skills-msg' }, 'No skills detected in this category.'));
      return;
    }

    const domainInfo = SKILL_DOMAINS[this.activeSkillCategory] || SKILL_DOMAINS.practices;

    for (const skill of skillsToDisplay) {
      const pill = el('button', {
        class: 'skill-pill',
        type: 'button',
        title: `Click to inspect verified evidence & interview topics for ${skill}`
      }, skill);

      if (this.activeSkillCategory !== 'all') {
        pill.style.borderColor = domainInfo.color;
        pill.style.background = domainInfo.bg;
      }

      on(pill, 'click', () => {
        this._showSkillInspectorModal(skill);
      });

      cloud.append(pill);
    }
  }

  _renderLanguagesAndHobbiesSection(r) {
    const hasLanguages = r.spokenLanguages && r.spokenLanguages.length > 0;
    const hasHobbies = r.hobbies && r.hobbies.length > 0;

    if (!hasLanguages && !hasHobbies) return el('div');

    const sec = el('div', { class: 'resume-section' });

    if (hasLanguages) {
      sec.append(
        el('h4', { class: 'resume-section__title' }, '🌐 Spoken Languages'),
        el('div', { class: 'resume-skills-cloud', style: 'margin-bottom: 10px;' },
          ...r.spokenLanguages.map((lang) => {
            const p = el('span', { class: 'skill-pill highlight-chip' }, `🗣 ${lang}`);
            return p;
          })
        )
      );
    }

    if (hasHobbies) {
      sec.append(
        el('h4', { class: 'resume-section__title' }, '🎸 Hobbies & Interests'),
        el('div', { class: 'resume-skills-cloud' },
          ...r.hobbies.map((hobby) => {
            const p = el('span', { class: 'skill-pill' }, `✨ ${hobby}`);
            return p;
          })
        )
      );
    }

    return sec;
  }

  _renderExperienceSection(r) {
    if (!r.experience || !r.experience.length) return el('div');

    return el('div', { class: 'resume-section' },
      el('h4', { class: 'resume-section__title' }, 'Work Experience Timeline'),
      el('div', { class: 'experience-timeline' },
        ...r.experience.map((exp) => {
          return el('div', { class: 'experience-card glass' },
            el('div', { class: 'exp-card-head' },
              el('div', {},
                el('b', { class: 'exp-role' }, exp.role || 'Software Engineer'),
                exp.company ? el('span', { class: 'exp-company' }, ` • ${exp.company}`) : null
              ),
              exp.date ? el('span', { class: 'exp-date' }, exp.date) : null
            ),
            exp.bullets?.length
              ? el('ul', { class: 'exp-bullets' },
                  ...exp.bullets.slice(0, 3).map((b) => el('li', {}, b))
                )
              : null
          );
        })
      )
    );
  }

  _renderEducationSection(r) {
    if (!r.education || !r.education.length) return el('div');

    return el('div', { class: 'resume-section' },
      el('h4', { class: 'resume-section__title' }, 'Academic Credentials'),
      el('div', { class: 'education-grid' },
        ...r.education.map((edu) => {
          return el('div', { class: 'education-card glass' },
            el('b', { class: 'edu-degree' }, edu.degree || 'Degree Program'),
            edu.institution ? el('div', { class: 'edu-school' }, edu.institution) : null,
            edu.date ? el('span', { class: 'edu-date' }, edu.date) : null
          );
        })
      )
    );
  }

  _createActionBtn(label, target) {
    const btn = el('button', { class: 'resume-action-btn', type: 'button' }, label);
    on(btn, 'click', () => {
      if (typeof target === 'function') {
        target();
      } else {
        this.onPrompt?.(target);
      }
    });
    return btn;
  }

  _showSkillInspectorModal(activeSkillName = null) {
    const inspected = inspectAllSkills(this.resume);
    if (!inspected.length) {
      toast('No skills detected to inspect.');
      return;
    }

    let modal = $('#skill-inspector-modal');
    if (!modal) {
      modal = el('div', { id: 'skill-inspector-modal', class: 'career-modal-backdrop' });
      on(modal, 'click', (e) => {
        if (e.target === modal || !e.target.closest('.skill-inspector-panel')) {
          modal.classList.remove('is-open');
        }
      });
      on(document, 'keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
          modal.classList.remove('is-open');
        }
      });
      document.body.append(modal);
    }

    let activeSkill = inspected.find((s) => s.name.toLowerCase() === (activeSkillName || '').toLowerCase()) || inspected[0];
    let searchFilter = '';

    const renderInspector = () => {
      modal.innerHTML = '';

      const filteredList = inspected.filter((s) =>
        s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.domainInfo.label.toLowerCase().includes(searchFilter.toLowerCase())
      );

      const panel = el('div', { class: 'skill-inspector-panel glass' },
        el('div', { class: 'career-modal-head' },
          el('div', {},
            el('div', { class: 'career-report-badge' }, '✓ HIGH-PRECISION SKILL VERIFICATION'),
            el('h2', { class: 'career-modal-title' }, 'Skill Evidence & Interview Blueprint'),
            el('p', { class: 'career-modal-sub' }, `Inspecting all ${inspected.length} technical skills, tools & proficiencies extracted from ${this.resume.name}’s profile.`)
          ),
          el('button', { class: 'icon-btn icon-btn--sm inspector-close', type: 'button', title: 'Close', 'aria-label': 'Close' },
            el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
              el('path', { d: 'M18 6L6 18M6 6l12 12' })
            )
          )
        ),
        el('div', { class: 'inspector-split-layout' },
          // Left: Skills List with Search
          el('div', { class: 'inspector-skills-list-wrapper' },
            el('div', { class: 'inspector-search-box' },
              el('input', {
                type: 'text',
                class: 'inspector-search-input',
                placeholder: 'Filter skills, languages, tools...',
                value: searchFilter
              })
            ),
            el('div', { class: 'inspector-skills-list' },
              ...filteredList.map((item) => {
                const isSelected = item.name.toLowerCase() === activeSkill.name.toLowerCase();
                const row = el('div', {
                  class: `inspector-skill-row ${isSelected ? 'is-selected' : ''}`
                },
                  el('div', { class: 'row-main' },
                    el('b', {}, item.name),
                    el('span', { class: 'domain-tag', style: `color:${item.domainInfo.color}; background:${item.domainInfo.bg}` }, item.domainInfo.label)
                  ),
                  el('div', { class: 'row-sub' },
                    el('span', { class: `prof-badge prof-${item.proficiency.toLowerCase().replace(/[^a-z]/g, '')}` }, item.proficiency),
                    el('span', { class: 'evidence-badge' }, `${item.evidenceCount} context match${item.evidenceCount === 1 ? '' : 'es'}`)
                  )
                );
                on(row, 'click', () => {
                  activeSkill = item;
                  renderInspector();
                });
                return row;
              })
            )
          ),
          // Right: Active Skill Deep-Dive
          el('div', { class: 'inspector-detail-col glass' },
            el('div', { class: 'inspector-detail-head' },
              el('div', {},
                el('span', { class: 'domain-tag', style: `color:${activeSkill.domainInfo.color}; background:${activeSkill.domainInfo.bg}` }, activeSkill.domainInfo.label),
                el('h3', { class: 'detail-skill-name' }, activeSkill.name)
              ),
              el('div', { class: 'detail-demand-badge' }, `Market Demand: ${activeSkill.demand}`)
            ),
            el('div', { class: 'inspector-section' },
              el('h4', {}, 'Resume Context & Evidence Bullets'),
              activeSkill.evidence.length
                ? el('ul', { class: 'evidence-list' },
                    ...activeSkill.evidence.map((ev) => el('li', {}, `“${ev}”`))
                  )
                : el('p', { class: 'no-evidence-note' }, 'Detected in core technical skills inventory without explicit project bullet sentences.')
            ),
            el('div', { class: 'inspector-section' },
              el('h4', {}, 'Assessed Proficiency Tier'),
              el('div', { class: 'prof-banner' },
                el('div', { class: 'prof-banner-top' },
                  el('b', {}, activeSkill.proficiency),
                  el('span', { class: 'confidence-tag' }, `${activeSkill.confidenceScore}% Confidence`)
                ),
                el('p', {}, `Classified from active action verbs, system scale indicators, and quantified metrics in resume.`)
              )
            ),
            el('div', { class: 'inspector-section' },
              el('h4', {}, 'Target Engineering Roles'),
              el('div', { class: 'roles-pills' },
                ...activeSkill.typicalRoles.map((role) => el('span', { class: 'pill pill--sm' }, role))
              )
            ),
            el('div', { class: 'inspector-section' },
              el('h4', {}, 'Technical Interview Assessment Focus'),
              el('p', { class: 'focus-text' }, activeSkill.interviewFocus)
            ),
            activeSkill.sampleQuestion
              ? el('div', { class: 'inspector-section question-preview-box' },
                  el('h4', {}, 'Example Technical Interview Question'),
                  el('p', { class: 'sample-q-text' }, `“${activeSkill.sampleQuestion}”`)
                )
              : null,
            el('div', { class: 'inspector-actions' },
              el('button', { class: 'pill pill--accent pill--glow', id: 'btn-test-this-skill', type: 'button' },
                `🎯 Test ${activeSkill.name} in Mock Interview Arena`
              )
            )
          )
        )
      );

      const searchInput = panel.querySelector('.inspector-search-input');
      if (searchInput) {
        on(searchInput, 'input', (e) => {
          searchFilter = e.target.value;
          const newFiltered = inspected.filter((s) =>
            s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            s.domainInfo.label.toLowerCase().includes(searchFilter.toLowerCase())
          );
          if (newFiltered.length && !newFiltered.some((s) => s.name.toLowerCase() === activeSkill.name.toLowerCase())) {
            activeSkill = newFiltered[0];
          }
          renderInspector();
          const nextInput = panel.querySelector('.inspector-search-input');
          if (nextInput) {
            nextInput.focus();
            nextInput.setSelectionRange(searchFilter.length, searchFilter.length);
          }
        });
      }

      on(panel, 'click', (e) => e.stopPropagation());
      on(panel.querySelector('.inspector-close'), 'click', () => modal.classList.remove('is-open'));
      on(panel.querySelector('#btn-test-this-skill'), 'click', () => {
        modal.classList.remove('is-open');
        this.root?.classList.remove('is-open');
        this.onLaunchInterview?.({
          track: 'coding',
          role: `${activeSkill.name} Specialist`
        });
      });

      modal.append(panel);
    };

    renderInspector();
    modal.classList.add('is-open');
  }
}
