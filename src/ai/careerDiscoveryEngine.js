/* ============================================================
   AURA — Professional Career Discovery Engine
   8-Stage Adaptive Questionnaire & Multi-Pathway Options Generator.
   Analyzes candidate resume + profile preferences to generate
   deep, defensible, actionable career discovery reports.
   ============================================================ */

export const CAREER_DISCOVERY_STORAGE_KEY = 'aura_career_discovery_v1';
import { auth } from '../core/auth.js';

/**
 * The 8 Stages of the Career Discovery Questionnaire
 */
export const QUESTIONNAIRE_STAGES = [
  {
    id: 1,
    title: 'Stage 1: Career Intent & Current Situation',
    subtitle: 'Establish your current baseline, objectives, and time horizon.',
    questions: [
      {
        id: 'q1',
        title: 'Q1. What is your current career objective?',
        type: 'multi-select',
        helper: 'Select all that apply to your current goals:',
        options: [
          'Private-sector employment',
          'Startup / entrepreneurship',
          'Government employment',
          'PSU employment',
          'Defence / armed forces',
          'Higher education',
          'Research / R&D',
          'Academia / teaching',
          'Freelancing / independent consulting',
          'Family business',
          'Undecided / exploring options'
        ]
      },
      {
        id: 'q2',
        title: 'Q2. How certain are you about your preferred career direction?',
        type: 'single-select',
        options: [
          'Very certain',
          'Fairly certain',
          'Exploring 2–3 options',
          'Completely undecided'
        ],
        followUp: {
          id: 'q2_followup',
          condition: (ans) => ans?.q2 === 'Exploring 2–3 options' || ans?.q2 === 'Completely undecided',
          title: 'Which career paths are you currently considering?',
          type: 'text',
          placeholder: 'e.g. AI Engineer vs Embedded Systems vs M.Tech'
        }
      },
      {
        id: 'q3',
        title: 'Q3. What is your preferred time horizon for becoming professionally established?',
        type: 'single-select',
        options: [
          'Within 6 months',
          'Within 1 year',
          'Within 2 years',
          'After graduation',
          'After postgraduate education',
          'No fixed timeline'
        ]
      }
    ]
  },
  {
    id: 2,
    title: 'Stage 2: Career Preferences (Degree ≠ Preference)',
    subtitle: 'Uncover the work you genuinely enjoy, beyond your degree curriculum.',
    questions: [
      {
        id: 'q4',
        title: 'Q4. Which type of work interests you most?',
        type: 'multi-select',
        helper: 'Select your top interest areas:',
        options: [
          'Software / IT',
          'Core engineering',
          'Electronics / Embedded',
          'VLSI / Semiconductor',
          'AI / ML / Data Science',
          'Cybersecurity',
          'Cloud / DevOps',
          'Product management',
          'Finance / FinTech',
          'Consulting',
          'Research / R&D',
          'Government administration',
          'Defence',
          'Teaching / Academia',
          'Entrepreneurship',
          'Design / Creative',
          'Operations / Management',
          'Other'
        ],
        followUp: {
          id: 'q4_followup',
          condition: (ans) => !!ans?.q4?.length,
          title: 'What specifically attracts you to these areas?',
          type: 'text',
          placeholder: 'e.g. Building high-impact systems, deep math/logic, solving real-world infrastructure problems...'
        }
      },
      {
        id: 'q5',
        title: 'Q5. Which activities do you enjoy most?',
        type: 'multi-select-limit',
        limit: 5,
        helper: 'Select up to 5 activities you find most fulfilling:',
        options: [
          'Programming',
          'Building hardware',
          'Designing systems',
          'Mathematical/problem solving',
          'Research',
          'Writing',
          'Public speaking',
          'Leadership',
          'Managing people',
          'Business development',
          'Designing products',
          'Teaching',
          'Data analysis',
          'Working with customers',
          'Working independently',
          'Working in teams'
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'Stage 3: Employment vs Entrepreneurship vs Higher Studies',
    subtitle: 'Determine your ideal operational environment and risk tolerance.',
    questions: [
      {
        id: 'q6',
        title: 'Q6. Which professional environment would you currently prefer?',
        type: 'single-select',
        options: [
          'Structured employment in an established organization',
          'High-growth startup environment',
          'Building my own company/business',
          'Government/PSU organization',
          'Research/academic institution',
          'Higher education before entering the workforce',
          'I am open to multiple options'
        ]
      },
      {
        id: 'q7',
        title: 'Q7. If entrepreneurship interests you, what is your current level of entrepreneurial intent?',
        type: 'single-select',
        options: [
          'I already have a business/startup',
          'I have a specific startup idea',
          'I have identified a problem but not a solution',
          'I am interested in entrepreneurship but have no idea yet',
          'I may consider entrepreneurship later',
          'Entrepreneurship is not currently a goal'
        ],
        followUp: {
          id: 'q7_followup',
          condition: (ans) => ans?.q7 && !ans.q7.includes('not currently a goal'),
          title: 'What type of venture would you prefer to build?',
          type: 'single-select',
          options: [
            'Technology product (SaaS/AI/Hardware)',
            'Service / Consulting business',
            'Social enterprise',
            'Family business expansion',
            'Other'
          ]
        }
      },
      {
        id: 'q8',
        title: 'Q8. If higher education interests you, what is your primary objective?',
        type: 'single-select',
        options: [
          'Specialization in a niche domain',
          'Deep research / academic inquiry',
          'Better career & placement opportunities',
          'International exposure & global relocation',
          'Academic career / professorship',
          'Transition into another technical field',
          'Preparation for a specific profession',
          'Not yet decided / not considering'
        ]
      }
    ]
  },
  {
    id: 4,
    title: 'Stage 4: Government / PSU / Defence Path',
    subtitle: 'Explore public-sector careers, competitive examinations, and eligibility.',
    questions: [
      {
        id: 'q9',
        title: 'Q9. Are you interested in public-sector career opportunities?',
        type: 'single-select',
        options: [
          'Yes',
          'No',
          'Maybe / want to understand options'
        ]
      },
      {
        id: 'q10',
        title: 'Q10. Which public sector categories interest you?',
        type: 'multi-select',
        condition: (ans) => ans?.q9 !== 'No',
        helper: 'Select public sector and government categories of interest:',
        options: [
          'UPSC / Civil Services',
          'GATE / PSU Technical Roles (ISRO, DRDO, BEL, BHEL, IOCL)',
          'SSC / Staff Selection Commission',
          'Banking / Financial Institutions (RBI, SBI, IBPS)',
          'Railways / RRB Technical',
          'State government engineering services',
          'Regulatory bodies (SEBI, TRAI)',
          'Government research organizations (CSIR, BARC, TIFR)',
          'Defence / Armed Forces (CDS, AFCAT, Technical Entry)',
          'Police / paramilitary',
          'Teaching / Government University',
          'Other'
        ]
      },
      {
        id: 'q11',
        title: 'Q11. For PSU / technical government roles, which type of work interests you?',
        type: 'multi-select',
        condition: (ans) => ans?.q9 !== 'No',
        options: [
          'Core technical engineering',
          'R&D and scientific development',
          'Operations and plant maintenance',
          'Project management & infrastructure',
          'Technical administration',
          'Field engineering'
        ]
      },
      {
        id: 'q12',
        title: 'Q12. Are you willing to prepare for competitive examinations (GATE, UPSC, etc.)?',
        type: 'single-select',
        condition: (ans) => ans?.q9 !== 'No',
        options: [
          'Yes, full-time commitment',
          'Yes, alongside college or current job',
          'Possibly, if high probability of success',
          'No, prefer direct recruitment / skill-based placement'
        ],
        followUp: {
          id: 'q12_followup',
          condition: (ans) => ans?.q12?.startsWith('Yes') || ans?.q12?.startsWith('Possibly'),
          title: 'What preparation period are you comfortable committing to?',
          type: 'single-select',
          options: ['<6 months', '6–12 months', '1–2 years', '2+ years']
        }
      }
    ]
  },
  {
    id: 5,
    title: 'Stage 5: Higher Education & Research',
    subtitle: 'Clarify master’s, doctoral, and international academic pathways.',
    questions: [
      {
        id: 'q13',
        title: 'Q13. Which educational pathway are you considering?',
        type: 'single-select',
        options: [
          'Master’s in India (M.Tech / ME / M.Sc)',
          'Master’s abroad (MS / MSc in US, Europe, etc.)',
          'MBA / Management degree',
          'PhD / Doctoral Research',
          'Professional certification / Executive postgrad',
          'Research fellowship (JRF / Scientist)',
          'None currently / Entering workforce directly'
        ]
      },
      {
        id: 'q14',
        title: 'Q14. If pursuing higher education, which specialization are you considering?',
        type: 'multi-select',
        condition: (ans) => ans?.q13 && !ans.q13.includes('None currently'),
        options: [
          'AI / Machine Learning',
          'VLSI & Microelectronics',
          'Embedded Systems & IoT',
          'Communications & Signal Processing',
          'Robotics & Autonomous Systems',
          'Cybersecurity & Cryptography',
          'Data Science & Analytics',
          'Computer Science & Systems',
          'Management & Business Analytics',
          'Quantitative Finance',
          'Other'
        ]
      },
      {
        id: 'q15',
        title: 'Q15. How interested are you in research-oriented work?',
        type: 'single-select',
        options: [
          'Strongly interested (want to publish papers & invent novel techniques)',
          'Moderately interested (enjoy applied research & experimentation)',
          'Neutral (open to it if practical)',
          'Not interested (prefer hands-on industry building & deployment)'
        ]
      }
    ]
  },
  {
    id: 6,
    title: 'Stage 6: Geographic & Work Preferences',
    subtitle: 'Map out location, mobility, and real-world logistical parameters.',
    questions: [
      {
        id: 'q16',
        title: 'Q16. Where are you willing to work / study?',
        type: 'multi-select',
        options: [
          'Within my home city',
          'Anywhere in India (Tier-1 tech hubs)',
          'Specific Indian cities (Bengaluru, Hyderabad, Pune, NCR)',
          'Abroad / International relocation',
          'Remote (Work from home)',
          'Hybrid (2-3 days office)',
          'Open to all options'
        ]
      },
      {
        id: 'q17',
        title: 'Q17. Which countries/regions would you consider for higher education or employment?',
        type: 'multi-select',
        options: [
          'India',
          'United States',
          'United Kingdom & European Union (Germany, Netherlands, Ireland)',
          'Canada',
          'Singapore',
          'Australia & New Zealand',
          'Middle East (Dubai, UAE, Saudi Arabia)',
          'Open to global opportunities'
        ]
      },
      {
        id: 'q18',
        title: 'Q18. Are there any geographic, family, financial, or logistical constraints to consider?',
        type: 'text',
        helper: 'Optional: share any personal constraints so recommendations remain realistic.',
        placeholder: 'e.g. Need to stay near family in Delhi, budget for overseas master’s is limited, educational loan repayment...'
      }
    ]
  },
  {
    id: 7,
    title: 'Stage 7: Risk, Compensation & Work Style',
    subtitle: 'Align your risk appetite, financial goals, and working temperament.',
    questions: [
      {
        id: 'q19',
        title: 'Q19. Which statement best describes your preferred career approach?',
        type: 'single-select',
        options: [
          'A. I prioritize stability and predictable career progression.',
          'B. I prioritize learning velocity and rapid career growth.',
          'C. I am willing to accept significant uncertainty for potentially higher upside.',
          'D. I prioritize meaningful public service and social impact.',
          'E. I prioritize intellectual autonomy and research-oriented work.',
          'F. I am still exploring and want to keep options open.'
        ]
      },
      {
        id: 'q20',
        title: 'Q20. How important is initial compensation when choosing a career?',
        type: 'scale',
        min: 1,
        max: 5,
        labels: {
          1: 'Not important (learning first)',
          3: 'Moderately important (fair market rate)',
          5: 'Extremely important (high package priority)'
        }
      },
      {
        id: 'q21',
        title: 'Q21. Which working style suits you best?',
        type: 'multi-select',
        options: [
          'Individual contributor (deep focus on technical tasks)',
          'Technical specialist (domain expert & problem solver)',
          'Team collaborator (pair programming, brainstorming)',
          'Team leader / Tech lead (guiding others & architectural direction)',
          'Manager (operations, timelines & people coordination)',
          'Entrepreneur (wearing multiple hats)',
          'Researcher (exploring uncharted questions)',
          'Teacher / mentor (sharing knowledge)'
        ]
      }
    ]
  },
  {
    id: 8,
    title: 'Stage 8: Commitment, Priorities & The Crucial Choice',
    subtitle: 'Quantify your preparation bandwidth and identify your top 3 directions.',
    questions: [
      {
        id: 'q22',
        title: 'Q22. How many hours per week can you realistically dedicate to career preparation?',
        type: 'single-select',
        options: [
          '<5 hours / week (minimal maintenance)',
          '5–10 hours / week (steady side progress)',
          '10–20 hours / week (serious dedicated prep)',
          '20–30 hours / week (intensive sprint)',
          '30+ hours / week (full-time immersion)'
        ]
      },
      {
        id: 'q23',
        title: 'Q23. What is your immediate priority right now?',
        type: 'multi-select',
        options: [
          'Build strong technical skills & portfolio',
          'Get a high-quality internship',
          'Secure placement / full-time job offer',
          'Prepare for competitive exams (GATE/UPSC)',
          'Build and launch a startup MVP',
          'Prepare GRE/GATE applications for higher education',
          'Publish research paper',
          'Optimize resume & LinkedIn presence',
          'Explore career options and find clarity'
        ]
      },
      {
        id: 'q24',
        title: 'Q24. What constraints should the AI consider while creating your roadmap?',
        type: 'multi-select',
        options: [
          'Time constraints (heavy college/work schedule)',
          'Budget / financial constraints',
          'Academic workload / semester exams',
          'Geographic / relocation restrictions',
          'Family responsibilities',
          'Limited access to specialized labs/resources',
          'Prior academic or employment gaps',
          'None — ready to sprint'
        ]
      },
      {
        id: 'q25',
        title: '🔥 Q25. If you had to choose three possible career directions today, what would they be?',
        type: 'three-choices',
        fields: [
          { key: 'primary', label: '1. Primary Choice', placeholder: 'e.g. AI / Machine Learning Systems Engineer' },
          { key: 'secondary', label: '2. Secondary Choice', placeholder: 'e.g. Embedded Systems / IoT in Core Tech or PSU' },
          { key: 'exploratory', label: '3. Exploratory Choice', placeholder: 'e.g. MS in US or Robotics Startup' }
        ]
      },
      {
        id: 'q26',
        title: 'Q26. Why did you choose these three?',
        type: 'text-long',
        placeholder: 'Explain the reasoning behind your choices (e.g., balance of technical excitement, compensation, family stability, or long-term vision)...'
      },
      {
        id: 'unconventional',
        title: '✨ Hidden Aspirations & Curiosity Check',
        type: 'text-long',
        helper: 'Is there any career option you have considered but rejected, or any path you are curious about but currently believe is unrealistic for you?',
        placeholder: 'Be completely honest — this helps the AI uncover high-potential paths you might be needlessly counting yourself out of.'
      }
    ]
  }
];

/**
 * Evaluates candidate resume and answers to synthesize a multi-pathway Career Options Report
 */
export function generateCareerOptionsReport(answers, resume) {
  const skills = resume?.skills || [];
  const rawText = resume?.rawText || '';

  // 1. Compute profile affinity scores for the 5 archetypal pathways
  const affinities = calculatePathAffinities(answers, resume);

  // 2. Build detailed pathway reviews
  const pathways = [
    buildPrivateSectorPathway(affinities.privateSector, answers, resume),
    buildCoreEngineeringPathway(affinities.coreHardware, answers, resume),
    buildPublicSectorPathway(affinities.publicSector, answers, resume),
    buildHigherEdPathway(affinities.higherEd, answers, resume),
    buildStartupPathway(affinities.startup, answers, resume)
  ].sort((a, b) => b.alignmentScore - a.alignmentScore);

  // 3. Profile synthesis overview
  const authUser = auth.getUser();
  const profileOverview = {
    candidateName: resume?.name || authUser?.name || 'Candidate',
    currentRole: resume?.headline || authUser?.targetRole || 'Engineer / Aspiring Professional',
    totalSkillsCount: skills.length,
    topSkills: skills.slice(0, 6),
    primaryDirection: answers?.q25_primary || 'Private-Sector Engineering',
    secondaryDirection: answers?.q25_secondary || 'Core Technical / PSU',
    exploratoryDirection: answers?.q25_exploratory || 'Higher Education / Venture',
    commitmentHours: answers?.q22 || '10–20 hours / week',
    careerPhilosophy: answers?.q19 || 'Learning velocity and rapid career growth',
    unconventionalAspiration: answers?.unconventional || 'None stated'
  };

  return {
    id: `career_report_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profileOverview,
    affinities,
    pathways,
    answers
  };
}

/**
 * Calculates quantitative alignment percentages across pathways
 */
function calculatePathAffinities(answers, resume) {
  const ansStr = JSON.stringify(answers).toLowerCase();
  const resStr = (resume?.rawText || '').toLowerCase();

  let pSec = 65;
  let cEng = 50;
  let pPub = 40;
  let hEd = 45;
  let sUp = 45;

  // Private sector indicators
  if (ansStr.includes('private-sector') || ansStr.includes('software') || ansStr.includes('ai / ml')) pSec += 20;
  if (ansStr.includes('high-growth') || ansStr.includes('structured employment')) pSec += 10;
  if (resStr.includes('react') || resStr.includes('node') || resStr.includes('python') || resStr.includes('aws')) pSec += 12;

  // Core engineering indicators
  if (ansStr.includes('core engineering') || ansStr.includes('electronics') || ansStr.includes('vlsi') || ansStr.includes('embedded') || ansStr.includes('hardware')) cEng += 35;
  if (resStr.includes('embedded') || resStr.includes('c++') || resStr.includes('verilog') || resStr.includes('iot')) cEng += 25;

  // Public sector indicators
  if (answers?.q9 === 'Yes') pPub += 30;
  if (answers?.q9?.includes('Maybe')) pPub += 15;
  if (ansStr.includes('psu') || ansStr.includes('government') || ansStr.includes('defence') || ansStr.includes('civil services')) pPub += 25;
  if (ansStr.includes('stability and predictable')) pPub += 18;

  // Higher ed indicators
  if (ansStr.includes('higher education') || ansStr.includes('master') || ansStr.includes('ms / msc') || ansStr.includes('phd') || ansStr.includes('research')) hEd += 30;
  if (ansStr.includes('strongly interested') || ansStr.includes('academic career')) hEd += 20;

  // Startup indicators
  if (ansStr.includes('startup') || ansStr.includes('entrepreneurship') || ansStr.includes('building my own')) sUp += 30;
  if (ansStr.includes('accept significant uncertainty')) sUp += 22;

  return {
    privateSector: Math.min(96, Math.max(35, pSec)),
    coreHardware: Math.min(94, Math.max(30, cEng)),
    publicSector: Math.min(95, Math.max(25, pPub)),
    higherEd: Math.min(92, Math.max(28, hEd)),
    startup: Math.min(94, Math.max(25, sUp))
  };
}

/** 1. Private Sector Tech Pathway */
function buildPrivateSectorPathway(score, answers, resume) {
  const candidateSkills = resume?.skills || [];
  const required = ['Data Structures & Algorithms', 'System Design (HLD & LLD)', 'Full-Stack or AI Frameworks', 'Cloud Infrastructure (AWS/GCP)', 'Production Git & CI/CD'];
  const gaps = required.filter((r) => !candidateSkills.some((s) => s.toLowerCase().includes(r.toLowerCase().slice(0, 5))));

  return {
    id: 'private_sector',
    category: 'Private Sector',
    title: 'Software & Generative AI Systems Engineering',
    alignmentScore: score,
    fitVerdict: score >= 80 ? 'Exceptional Profile Alignment' : score >= 65 ? 'Strong Potential Match' : 'Secondary Alternative',
    whyAligns: `Your background in modern software tools coupled with your stated desire for rapid career growth and high technical leverage makes modern tech enterprise and high-scale product engineering a prime fit.`,
    requiredSkills: required,
    skillGaps: gaps.length ? gaps : ['Advanced Distributed Caching (Redis/Kafka)', 'Concurrency Benchmarking'],
    entryRoutes: ['Direct Technical Campus / Lateral Placement', 'Referral-based applications through GitHub/Portfolio', 'HackerRank & LeetCode benchmark screenings'],
    qualifications: 'B.Tech / B.E. / M.Tech / MCA in Computer Science, Electrical, or related technical disciplines.',
    examsCertifications: ['AWS Certified Solutions Architect', 'Meta / Google Professional Developer Certifications', 'Open-source GitHub contributions'],
    opportunities: ['Tier-1 Tech Companies (Google, Microsoft, Amazon, Uber)', 'High-growth AI Startups', 'FinTech & Quant Firms (CRED, Razorpay, Goldman Sachs)'],
    timeline: '3 to 6 months of focused problem solving, system design drill, and mock interview verification.',
    weeklyEffort: answers?.q22 || '12–15 hours / week',
    nextActions: [
      'Take 3 curated algorithmic rounds in AURA Mock Interview Arena.',
      'Tailor resume bullets to quantify scalability (e.g. request throughput, latency reduction).',
      'Deploy an end-to-end full-stack or multimodal RAG project with live hosted demo.'
    ],
    sources: ['HackerRank Tech Hiring Benchmark', 'levels.fyi Compensation Index', 'High Scalability Architectural Case Studies']
  };
}

/** 2. Core Engineering & Embedded Systems Pathway */
function buildCoreEngineeringPathway(score, answers, resume) {
  return {
    id: 'core_engineering',
    category: 'Core Engineering',
    title: 'Embedded Systems, IoT & Semiconductor (VLSI)',
    alignmentScore: score,
    fitVerdict: score >= 75 ? 'Strong Technical Affinity' : score >= 55 ? 'Viable with Core Transition' : 'Requires Foundational Ramp',
    whyAligns: `Distinguishing actual hardware/firmware interest from a generic CS curriculum. Core engineering offers enduring technical moat, deep physics/electronics integration, and long-term stability.`,
    requiredSkills: ['Embedded C / Modern C++', 'RTOS (FreeRTOS / Zephyr)', 'Communication Protocols (I2C, SPI, UART, CAN)', 'Microcontroller Architecture (ARM Cortex, RISC-V)', 'Basic PCB & Digital Logic Design'],
    skillGaps: ['Hardware debugging with Oscilloscopes & Logic Analyzers', 'Device Drivers & BSP development'],
    entryRoutes: ['Core Engineering Campus Placements', 'Specialized CDAC / Embedded Fellowships', 'GATE Core Technical Paper'],
    qualifications: 'B.Tech in ECE, EEE, Instrumentation, Mechatronics, or Computer Engineering.',
    examsCertifications: ['Embedded Linux Certification', 'Cadence / Synopsys EDA Tool Proficiency', 'IEEE Technical Certifications'],
    opportunities: ['Qualcomm, Texas Instruments, Intel, AMD, Bosch, NXP Semiconductors, Ather Energy'],
    timeline: '6 to 9 months covering C++ systems, RTOS internals, and physical microcontroller projects.',
    weeklyEffort: answers?.q22 || '10–14 hours / week',
    nextActions: [
      'Build a tangible project on STM32 / ESP32 with FreeRTOS and wireless telemetry.',
      'Study static timing analysis, memory segmentation, and pointer-level hardware registers.',
      'Review core electronics principles (Op-Amps, ADC/DAC conversion, interrupt latency).'
    ],
    sources: ['IEEE Computer Society', 'Semiconductor Industry Association Roadmap', 'Embedded.com Technical Archives']
  };
}

/** 3. Public Sector / PSU Pathway */
function buildPublicSectorPathway(score, answers, resume) {
  return {
    id: 'public_sector',
    category: 'Public Sector & PSU',
    title: 'PSU Technical Officer & Scientific R&D Roles',
    alignmentScore: score,
    fitVerdict: score >= 70 ? 'High Public Sector Resonance' : score >= 50 ? 'Moderate Fit' : 'Selective Consideration',
    whyAligns: `Provides unrivaled career stability, sovereign national impact, state-of-the-art laboratory infrastructure, and comprehensive government benefits.`,
    requiredSkills: ['Comprehensive Undergraduate Engineering Fundamentals', 'Quantitative Aptitude & Engineering Mathematics', 'Domain Core Concepts (Signals, Networks, DBMS, Operating Systems)', 'Technical Interview Articulation'],
    skillGaps: ['Competitive Exam Speed & Accuracy under negative marking', 'Standardized syllabus coverage depth'],
    entryRoutes: ['GATE (Graduate Aptitude Test in Engineering)', 'Direct PSU Written Tests (BARC, ISRO, BEL, DRDO, C-DAC)', 'UPSC Engineering Services Exam (ESE)'],
    qualifications: 'First Class B.E. / B.Tech from recognized university with valid category eligibility.',
    examsCertifications: ['GATE Top 500 AIR', 'ISRO Centralised Recruitment (ICRB)', 'DRDO SET / RAC'],
    opportunities: ['ISRO, DRDO, BEL, BHEL, IOCL, ONGC, NTPC, PowerGrid, BARC, NIC (National Informatics Centre)'],
    timeline: '9 to 14 months of systematic syllabus revision and mock test series practice.',
    weeklyEffort: answers?.q22 || '15–20 hours / week',
    nextActions: [
      'Analyze the last 5 years of GATE / ISRO question papers in your engineering stream.',
      'Formulate a 4-stage subject revision calendar prioritizing high-weightage topics.',
      'Practice timed mock test series to maximize accuracy and minimize negative marking.'
    ],
    sources: ['UPSC & GATE Official Portals', 'Ministry of Heavy Industries PSU Recruitment Guidelines', 'National Informatics Centre Careers']
  };
}

/** 4. Higher Education & Research Pathway */
function buildHigherEdPathway(score, answers, resume) {
  return {
    id: 'higher_education',
    category: 'Higher Education & Research',
    title: 'Advanced Masters (M.Tech / MS) or PhD Specialization',
    alignmentScore: score,
    fitVerdict: score >= 70 ? 'Prime Academic & Research Trajectory' : score >= 50 ? 'Viable Specialization Option' : 'Selective Pathway',
    whyAligns: `Ideal if you wish to break past the undergraduate ceiling, access international labor markets, master specialized deep tech (AI/ML, Robotics, VLSI), or lead corporate R&D divisions.`,
    requiredSkills: ['Advanced Mathematical Rigor (Linear Algebra, Probability, Calculus)', 'Research Paper Writing & Literature Review', 'Domain Prototyping (Python/C++/MATLAB)', 'Academic Letters of Recommendation (LORs)'],
    skillGaps: ['Peer-reviewed publication record', 'Standardized test scores (GRE / TOEFL / GATE)'],
    entryRoutes: ['GATE score counseling (COAP/CCMT) for IITs/NITs/IISc', 'Fall/Spring Admissions to US/EU Universities via SOP & Academic Portfolio'],
    qualifications: 'B.Tech with strong GPA (typically >7.5/10 or >3.0/4.0), relevant research projects.',
    examsCertifications: ['GRE (320+ target)', 'TOEFL / IELTS', 'GATE (for top Indian institutes)'],
    opportunities: ['IISc Bangalore, IIT Bombay/Delhi/Madras, CMU, Stanford, TU Munich, ETH Zurich, NUS Singapore'],
    timeline: '8 to 12 months for exam preparation, SOP drafting, professor outreach, and applications.',
    weeklyEffort: answers?.q22 || '12–16 hours / week',
    nextActions: [
      'Draft your Statement of Purpose (SOP) connecting your undergraduate projects to your target research area.',
      'Connect with 3 professors whose recent papers align with your technical passions.',
      'Identify 2 reach, 3 target, and 2 safe graduate programs matching your financial budget.'
    ],
    sources: ['CSRankings.org (Computer Science Research Rankings)', 'DAAD Germany Higher Ed Portal', 'IIT GATE Joint Admissions Guide']
  };
}

/** 5. Technology Startup & Entrepreneurship Pathway */
function buildStartupPathway(score, answers, resume) {
  return {
    id: 'startup_venture',
    category: 'Startup & Entrepreneurship',
    title: 'Tech Founder / Early-Stage Venture Builder',
    alignmentScore: score,
    fitVerdict: score >= 70 ? 'Strong Entrepreneurial Spirit' : score >= 50 ? 'Incubator Candidate' : 'Long-Term Horizon',
    whyAligns: `You express willingness to embrace uncertainty, build 0-to-1 solutions, and take technical and business ownership.`,
    requiredSkills: ['Full-Stack Rapid MVP Prototyping', 'Customer Discovery & User Interviews', 'Product Architecture & Lean Deployment', 'Unit Economics & Pitch Articulation'],
    skillGaps: ['Go-To-Market (GTM) Strategy', 'Fundraising & Investor Diligence basics'],
    entryRoutes: ['Incubator / Accelerator Programs (Y Combinator, Antler, Techstars, IIT Incubators)', 'Angel/Seed syndicate funding', 'Bootstrapped profitable micro-SaaS'],
    qualifications: 'Demonstrated ability to ship functional products that real users utilize and pay for.',
    examsCertifications: ['No formal exams required; proven GitHub repo and live production traction'],
    opportunities: ['Venture-backed Tech Startups, Y Combinator batches, Government Innovation Grants (NIDHI, BIRAC)'],
    timeline: '3 to 6 months to validate problem statement, launch MVP, and secure initial 50 active users.',
    weeklyEffort: answers?.q22 || '20+ hours / week',
    nextActions: [
      'Conduct 15 structured problem-discovery interviews with potential target users before writing code.',
      'Build a barebones interactive prototype solving one concrete burning pain point.',
      'Apply to university or regional incubator grants for non-dilutive seed support.'
    ],
    sources: ['Y Combinator Startup School Library', 'Paul Graham Essays', 'Nasscom 10,000 Startups Initiative']
  };
}

/** Local storage persistence helpers */
export function saveCareerDiscoveryResults(results) {
  try {
    localStorage.setItem(CAREER_DISCOVERY_STORAGE_KEY, JSON.stringify(results));
  } catch (err) {
    console.warn('Failed to persist career discovery results:', err);
  }
}

export function loadCareerDiscoveryResults() {
  try {
    const raw = localStorage.getItem(CAREER_DISCOVERY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
