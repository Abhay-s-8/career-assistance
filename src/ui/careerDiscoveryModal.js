/* ============================================================
   AURA — Career Discovery Studio Modal UI
   Interactive 8-Stage Adaptive Questionnaire & Multi-Pathway
   Career Discovery Report presenter.
   ============================================================ */

import { $, $$, el, on, toast } from './dom.js';
import {
  QUESTIONNAIRE_STAGES,
  generateCareerOptionsReport,
  saveCareerDiscoveryResults,
  loadCareerDiscoveryResults
} from '../ai/careerDiscoveryEngine.js';

export class CareerDiscoveryModal {
  constructor({ resumeGetter, onLaunchInterview, onOpen, onClose } = {}) {
    this.resumeGetter = resumeGetter;
    this.onLaunchInterview = onLaunchInterview;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.root = null;
    this.stageIndex = 0;
    this.answers = {};
    this.report = null;
    this.activePathwayTab = 0;

    // Load any saved responses/report from localStorage
    const saved = loadCareerDiscoveryResults();
    if (saved && saved.answers) {
      this.answers = saved.answers;
      if (saved.pathways) this.report = saved;
    }

    this._initModal();
  }

  _initModal() {
    this.root = el('div', { id: 'career-discovery-modal', class: 'career-modal-backdrop' });
    on(this.root, 'click', (e) => {
      if (e.target === this.root || !e.target.closest('.career-modal-panel, .career-report-panel')) {
        this.close();
      }
    });
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.root.classList.contains('is-open')) {
        this.close();
      }
    });
    document.body.append(this.root);
  }

  open(options = {}) {
    this.onOpen?.();
    if (options.viewReport && this.report) {
      this.renderReport();
    } else {
      this.stageIndex = 0;
      this.renderQuestionnaire();
    }
    this.root.classList.add('is-open');
  }

  close() {
    this.root.classList.remove('is-open');
    this.onClose?.();
  }

  /* ------------------------------------------------------------ QUESTIONNAIRE VIEW */
  renderQuestionnaire() {
    this.root.innerHTML = '';
    const stage = QUESTIONNAIRE_STAGES[this.stageIndex];
    const totalStages = QUESTIONNAIRE_STAGES.length;
    const progressPct = Math.round(((this.stageIndex + 1) / totalStages) * 100);

    const modal = el('div', { class: 'career-modal-panel glass' },
      // Header
      el('div', { class: 'career-modal-head' },
        el('div', { class: 'career-modal-head-left' },
          el('div', { class: 'career-modal-tag' }, `STAGE ${this.stageIndex + 1} OF ${totalStages}`),
          el('h2', { class: 'career-modal-title' }, stage.title),
          el('p', { class: 'career-modal-sub' }, stage.subtitle)
        ),
        el('button', { class: 'icon-btn icon-btn--sm career-modal-close', type: 'button', title: 'Close', 'aria-label': 'Close' },
          el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
            el('path', { d: 'M18 6L6 18M6 6l12 12' })
          )
        )
      ),

      // Progress Tracker
      el('div', { class: 'career-progress-wrap' },
        el('div', { class: 'career-progress-bar' },
          el('i', { style: `width: ${progressPct}%` })
        ),
        el('div', { class: 'career-progress-meta' },
          el('span', {}, `${progressPct}% Completed`),
          el('span', {}, `Stage ${this.stageIndex + 1} of ${totalStages}`)
        )
      ),

      // Body (Questions for current stage)
      el('div', { class: 'career-modal-body', id: 'career-modal-body' },
        ...this._renderStageQuestions(stage)
      ),

      // Footer Actions
      el('div', { class: 'career-modal-foot' },
        el('div', {},
          this.stageIndex > 0
            ? el('button', { class: 'pill', id: 'btn-prev-stage', type: 'button' }, '← Previous Stage')
            : el('button', { class: 'pill', id: 'btn-save-draft', type: 'button' }, 'Save Draft & Exit')
        ),
        el('div', { class: 'career-foot-right' },
          this.report ? el('button', { class: 'pill', id: 'btn-skip-report', type: 'button' }, 'View Saved Report') : null,
          el('button', { class: 'pill pill--accent pill--glow', id: 'btn-next-stage', type: 'button' },
            this.stageIndex < totalStages - 1 ? 'Next Stage →' : '🚀 Generate Career Options Report'
          )
        )
      )
    );

    // Wire events
    on(modal, 'click', (e) => e.stopPropagation());
    on(modal.querySelector('.career-modal-close'), 'click', () => this.close());

    const prevBtn = modal.querySelector('#btn-prev-stage');
    if (prevBtn) {
      on(prevBtn, 'click', () => {
        if (this.stageIndex > 0) {
          this.stageIndex--;
          this.renderQuestionnaire();
        }
      });
    }

    const draftBtn = modal.querySelector('#btn-save-draft');
    if (draftBtn) {
      on(draftBtn, 'click', () => {
        saveCareerDiscoveryResults({ answers: this.answers, pathways: this.report?.pathways });
        toast('Discovery draft saved.');
        this.close();
      });
    }

    const skipReportBtn = modal.querySelector('#btn-skip-report');
    if (skipReportBtn) {
      on(skipReportBtn, 'click', () => this.renderReport());
    }

    on(modal.querySelector('#btn-next-stage'), 'click', () => {
      this._handleNextStage();
    });

    this.root.append(modal);
  }

  _renderStageQuestions(stage) {
    const nodes = [];

    for (const q of stage.questions) {
      const isVisible = !q.condition || q.condition(this.answers);
      const qCard = el('div', {
        class: 'career-q-card',
        'data-qid': q.id,
        style: isVisible ? '' : 'display:none;'
      },
        el('h3', { class: 'career-q-title' }, q.title),
        q.helper ? el('p', { class: 'career-q-helper' }, q.helper) : null,
        this._renderQuestionWidget(q, stage)
      );

      // Follow-up question if applicable
      if (q.followUp) {
        const isFollowVisible = (!q.followUp.condition || q.followUp.condition(this.answers));
        const followCard = el('div', {
          class: 'career-followup-card',
          'data-followup-for': q.id,
          style: isFollowVisible ? '' : 'display:none;'
        },
          el('h4', { class: 'career-followup-title' }, `↳ ${q.followUp.title}`),
          this._renderQuestionWidget(q.followUp, stage)
        );
        qCard.append(followCard);
      }

      nodes.push(qCard);
    }

    return nodes;
  }

  _updateStageConditions(stage) {
    if (!this.root || !stage) return;
    for (const q of stage.questions) {
      if (q.condition) {
        const card = this.root.querySelector(`[data-qid="${q.id}"]`);
        if (card) {
          card.style.display = q.condition(this.answers) ? '' : 'none';
        }
      }
      if (q.followUp) {
        const followCard = this.root.querySelector(`[data-followup-for="${q.id}"]`);
        if (followCard) {
          followCard.style.display = (!q.followUp.condition || q.followUp.condition(this.answers)) ? '' : 'none';
        }
      }
    }
  }

  _renderQuestionWidget(q, stage) {
    const val = this.answers[q.id];

    // 1. Single-Select (Radio Pills)
    if (q.type === 'single-select') {
      const wrap = el('div', { class: 'career-opt-grid' });
      for (const opt of q.options) {
        const isSelected = val === opt;
        const btn = el('button', {
          class: `career-pill-opt ${isSelected ? 'is-selected' : ''}`,
          type: 'button'
        }, opt);
        on(btn, 'click', (e) => {
          e.preventDefault();
          this.answers[q.id] = opt;
          for (const s of wrap.querySelectorAll('.career-pill-opt')) {
            s.classList.remove('is-selected');
          }
          btn.classList.add('is-selected');
          this._updateStageConditions(stage);
        });
        wrap.append(btn);
      }
      return wrap;
    }

    // 2. Multi-Select & Multi-Select with Limit
    if (q.type === 'multi-select' || q.type === 'multi-select-limit') {
      const wrap = el('div', { class: 'career-chips-grid' });
      const currentArr = Array.isArray(val) ? val : [];

      for (const opt of q.options) {
        const isSelected = currentArr.includes(opt);
        const checkEl = el('span', { class: 'chip-check' }, isSelected ? '✓' : '+');
        const btn = el('button', {
          class: `career-chip-opt ${isSelected ? 'is-selected' : ''}`,
          type: 'button'
        },
          checkEl,
          el('span', {}, opt)
        );
        on(btn, 'click', (e) => {
          e.preventDefault();
          let arr = Array.isArray(this.answers[q.id]) ? [...this.answers[q.id]] : [];
          const exists = arr.includes(opt);
          if (exists) {
            arr = arr.filter((item) => item !== opt);
            btn.classList.remove('is-selected');
            checkEl.textContent = '+';
          } else {
            if (q.limit && arr.length >= q.limit) {
              toast(`Maximum ${q.limit} selections allowed for this question.`);
              return;
            }
            arr.push(opt);
            btn.classList.add('is-selected');
            checkEl.textContent = '✓';
          }
          this.answers[q.id] = arr;
          this._updateStageConditions(stage);
        });
        wrap.append(btn);
      }
      return wrap;
    }

    // 3. 1-to-5 Scale Slider
    if (q.type === 'scale') {
      const currentVal = val !== undefined ? Number(val) : 3;
      const wrap = el('div', { class: 'career-scale-wrap' },
        el('div', { class: 'career-scale-labels' },
          el('span', {}, q.labels[q.min] || `${q.min}`),
          el('span', { class: 'scale-cur-val' }, `Level ${currentVal}`),
          el('span', {}, q.labels[q.max] || `${q.max}`)
        ),
        el('input', {
          type: 'range',
          min: q.min,
          max: q.max,
          value: String(currentVal),
          class: 'career-scale-slider'
        })
      );
      const input = wrap.querySelector('input');
      on(input, 'input', (e) => {
        this.answers[q.id] = Number(e.target.value);
        wrap.querySelector('.scale-cur-val').textContent = `Level ${e.target.value}`;
      });
      return wrap;
    }

    // 4. Three Choices Question (Q25)
    if (q.type === 'three-choices') {
      const wrap = el('div', { class: 'career-three-choices-wrap' });
      for (const field of q.fields) {
        const fieldKey = `q25_${field.key}`;
        const row = el('div', { class: 'three-choice-row' },
          el('label', { class: 'three-choice-label' }, field.label),
          el('input', {
            type: 'text',
            class: 'three-choice-input',
            placeholder: field.placeholder,
            value: this.answers[fieldKey] || ''
          })
        );
        const input = row.querySelector('input');
        on(input, 'input', (e) => {
          this.answers[fieldKey] = e.target.value;
        });
        wrap.append(row);
      }
      return wrap;
    }

    // 5. Long Text / Textarea
    if (q.type === 'text-long') {
      const textarea = el('textarea', {
        class: 'career-textarea',
        placeholder: q.placeholder || 'Type your detailed answer here...'
      }, this.answers[q.id] || '');
      on(textarea, 'input', (e) => {
        this.answers[q.id] = e.target.value;
      });
      return textarea;
    }

    // 6. Short Text Input
    const input = el('input', {
      type: 'text',
      class: 'career-text-input',
      placeholder: q.placeholder || 'Your response...',
      value: this.answers[q.id] || ''
    });
    on(input, 'input', (e) => {
      this.answers[q.id] = e.target.value;
    });
    return input;
  }

  _handleNextStage() {
    if (this.stageIndex < QUESTIONNAIRE_STAGES.length - 1) {
      this.stageIndex++;
      this.renderQuestionnaire();
    } else {
      // Final stage completed -> Generate Career Options Report
      const resume = this.resumeGetter ? this.resumeGetter() : null;
      this.report = generateCareerOptionsReport(this.answers, resume);
      saveCareerDiscoveryResults(this.report);
      this.renderReport();
      toast('🎉 Multi-Pathway Career Discovery Report generated!');
    }
  }

  /* ------------------------------------------------------------ CAREER REPORT VIEW */
  renderReport() {
    if (!this.report) return;
    this.root.innerHTML = '';

    const rep = this.report;
    const ov = rep.profileOverview;
    const pathways = rep.pathways || [];
    const activePath = pathways[this.activePathwayTab] || pathways[0];

    const reportView = el('div', { class: 'career-report-panel glass' },
      // Report Header
      el('div', { class: 'career-modal-head' },
        el('div', {},
          el('div', { class: 'career-report-badge' }, '✓ MULTI-PATHWAY SYNTHESIS READY'),
          el('h2', { class: 'career-modal-title' }, 'Professional Career Discovery Report'),
          el('p', { class: 'career-modal-sub' }, `Comprehensive alignment analysis for ${ov.candidateName} across 5 distinct industry & academic pathways.`)
        ),
        el('button', { class: 'icon-btn icon-btn--sm career-modal-close', type: 'button', title: 'Close', 'aria-label': 'Close' },
          el('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', style: 'pointer-events: none;' },
            el('path', { d: 'M18 6L6 18M6 6l12 12' })
          )
        )
      ),

      el('div', { class: 'career-report-content' },
        // Candidate Synthesis Hero Card
        el('div', { class: 'career-hero-card glass' },
          el('div', { class: 'career-hero-profile' },
            el('h3', { class: 'hero-name' }, ov.candidateName),
            el('div', { class: 'hero-role-title' }, ov.currentRole),
            el('div', { class: 'hero-skills-summary' },
              el('span', { class: 'hero-tag' }, `⚡ ${ov.totalSkillsCount} Skills Extracted`),
              el('span', { class: 'hero-tag' }, `⏳ ${ov.commitmentHours}`),
              el('span', { class: 'hero-tag' }, `🎯 Primary: ${ov.primaryDirection}`)
            )
          ),
          el('div', { class: 'career-hero-stats' },
            el('div', { class: 'stat-box' },
              el('span', { class: 'stat-val' }, `${pathways[0]?.alignmentScore || 92}%`),
              el('small', {}, 'Top Pathway Match')
            ),
            el('div', { class: 'stat-box' },
              el('span', { class: 'stat-val' }, '5'),
              el('small', {}, 'Pathways Analyzed')
            )
          )
        ),

        // Unconventional / Hidden Aspirations Insight Box (if provided)
        ov.unconventionalAspiration && ov.unconventionalAspiration !== 'None stated' ? el('div', { class: 'career-curiosity-box' },
          el('b', {}, '✨ Unconventional / Exploratory Aspiration: '),
          el('span', {}, `"${ov.unconventionalAspiration}" — Evaluated alongside standard pathways so you do not prematurely count yourself out.`)
        ) : null,

        // Pathway Selection Tabs
        el('div', { class: 'career-pathway-tabs' },
          ...pathways.map((p, idx) => {
            const isActive = idx === this.activePathwayTab;
            const tabBtn = el('button', {
              class: `pathway-tab ${isActive ? 'is-active' : ''}`,
              type: 'button'
            },
              el('div', { class: 'tab-top' },
                el('span', { class: 'tab-cat' }, p.category),
                el('span', { class: 'tab-score' }, `${p.alignmentScore}%`)
              ),
              el('div', { class: 'tab-title' }, p.title)
            );
            on(tabBtn, 'click', () => {
              this.activePathwayTab = idx;
              this.renderReport();
            });
            return tabBtn;
          })
        ),

        // Active Pathway Deep-Dive Card
        this._renderActivePathwayCard(activePath),

        // Report Bottom Actions
        el('div', { class: 'career-report-actions' },
          el('button', { class: 'pill', id: 'btn-retake-quiz', type: 'button' }, '🔄 Update Questionnaire'),
          el('button', { class: 'pill', id: 'btn-export-report', type: 'button' }, '📥 Export Markdown Report'),
          el('button', { class: 'pill pill--accent pill--glow', id: 'btn-launch-path-interview', type: 'button' },
            `🎯 Practice Mock Interview for ${activePath.category}`
          )
        )
      )
    );

    // Wire events
    on(reportView, 'click', (e) => e.stopPropagation());
    on(reportView.querySelector('.career-modal-close'), 'click', () => this.close());

    on(reportView.querySelector('#btn-retake-quiz'), () => {
      this.stageIndex = 0;
      this.renderQuestionnaire();
    });

    on(reportView.querySelector('#btn-export-report'), () => {
      this._exportReportMarkdown(rep);
    });

    on(reportView.querySelector('#btn-launch-path-interview'), () => {
      this.close();
      const trackMapping = {
        'private_sector': 'coding',
        'core_engineering': 'coding',
        'public_sector': 'system',
        'higher_education': 'resume',
        'startup_venture': 'system'
      };
      this.onLaunchInterview?.({
        track: trackMapping[activePath.id] || 'coding',
        role: activePath.title
      });
    });

    this.root.append(reportView);
  }

  _renderActivePathwayCard(p) {
    return el('div', { class: 'pathway-card glass' },
      // Pathway Top Summary
      el('div', { class: 'pathway-top-bar' },
        el('div', {},
          el('div', { class: 'pathway-verdict-badge' }, p.fitVerdict.toUpperCase()),
          el('h3', { class: 'pathway-heading' }, p.title)
        ),
        el('div', { class: 'pathway-score-circle' },
          el('span', { class: 'pathway-score-num' }, `${p.alignmentScore}%`),
          el('small', {}, 'MATCH')
        )
      ),

      // 1. Why it aligns
      el('div', { class: 'pathway-section' },
        el('h4', { class: 'pathway-sec-title' }, 'Why This Pathway Aligns With Your Profile'),
        el('p', { class: 'pathway-sec-text' }, p.whyAligns)
      ),

      // 2. Skills & Skill Gaps Comparison Grid
      el('div', { class: 'pathway-skills-grid' },
        el('div', { class: 'pathway-box pathway-box--req' },
          el('h4', {}, 'Required Core Skills'),
          el('ul', {}, ...p.requiredSkills.map((s) => el('li', {}, s)))
        ),
        el('div', { class: 'pathway-box pathway-box--gap' },
          el('h4', {}, 'Target Skill Gaps to Bridge'),
          el('ul', {}, ...p.skillGaps.map((s) => el('li', {}, s)))
        )
      ),

      // 3. Entry Routes & Opportunities Grid
      el('div', { class: 'pathway-details-grid' },
        el('div', { class: 'detail-item' },
          el('b', {}, 'Typical Entry Routes:'),
          el('ul', {}, ...p.entryRoutes.map((r) => el('li', {}, r)))
        ),
        el('div', { class: 'detail-item' },
          el('b', {}, 'Relevant Exams & Certifications:'),
          el('ul', {}, ...p.examsCertifications.map((e) => el('li', {}, e)))
        ),
        el('div', { class: 'detail-item' },
          el('b', {}, 'Potential Employers / Institutions:'),
          el('ul', {}, ...p.opportunities.map((o) => el('li', {}, o)))
        ),
        el('div', { class: 'detail-item' },
          el('b', {}, 'Preparation Timeline & Effort:'),
          el('p', {}, p.timeline),
          el('small', { class: 'effort-tag' }, `Dedicated Bandwidth: ${p.weeklyEffort}`)
        )
      ),

      // 4. Concrete Next Actions
      el('div', { class: 'pathway-actions-box' },
        el('h4', { class: 'actions-box-title' }, 'Recommended Immediate Actions (Next 30 Days)'),
        el('ol', {}, ...p.nextActions.map((act) => el('li', {}, act)))
      ),

      // 5. Sources
      el('div', { class: 'pathway-sources' },
        el('span', {}, 'Authoritative Reference Sources: '),
        el('small', {}, p.sources.join(' • '))
      )
    );
  }

  _exportReportMarkdown(rep) {
    const ov = rep.profileOverview;
    let md = `# Professional Career Discovery Report — ${ov.candidateName}\n`;
    md += `Generated: ${new Date(rep.createdAt).toLocaleDateString()}\n\n`;
    md += `## Candidate Overview\n`;
    md += `- Current Role: ${ov.currentRole}\n`;
    md += `- Skills Extracted: ${ov.totalSkillsCount}\n`;
    md += `- Primary Stated Direction: ${ov.primaryDirection}\n`;
    md += `- Secondary Stated Direction: ${ov.secondaryDirection}\n`;
    md += `- Exploratory Direction: ${ov.exploratoryDirection}\n`;
    md += `- Weekly Bandwidth: ${ov.commitmentHours}\n\n`;

    md += `## Pathway Options Analysis\n\n`;
    for (const p of rep.pathways) {
      md += `### ${p.category}: ${p.title} (${p.alignmentScore}% Match)\n`;
      md += `**Verdict**: ${p.fitVerdict}\n\n`;
      md += `**Why It Aligns**: ${p.whyAligns}\n\n`;
      md += `**Required Skills**: ${p.requiredSkills.join(', ')}\n\n`;
      md += `**Skill Gaps**: ${p.skillGaps.join(', ')}\n\n`;
      md += `**Entry Routes**: ${p.entryRoutes.join('; ')}\n\n`;
      md += `**Exams/Certifications**: ${p.examsCertifications.join('; ')}\n\n`;
      md += `**Opportunities**: ${p.opportunities.join('; ')}\n\n`;
      md += `**Timeline**: ${p.timeline}\n\n`;
      md += `**Next Actions**:\n`;
      p.nextActions.forEach((act, idx) => {
        md += `${idx + 1}. ${act}\n`;
      });
      md += `\n---\n\n`;
    }

    // Copy to clipboard and trigger download
    navigator.clipboard.writeText(md).then(() => {
      toast('✓ Report copied to clipboard as Markdown!');
    }).catch(() => {});

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Career_Discovery_Report_${ov.candidateName.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
