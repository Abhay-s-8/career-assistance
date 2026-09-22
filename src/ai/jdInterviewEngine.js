/* ============================================================
   AURA / AKSHAY — Job Description (JD) Deconstruction &
   Tailored Interview Simulation Engine
   Reverse-engineers employer job postings to extract core stack,
   implied domain challenges, resume vulnerability attack points,
   and generates role-bespoke interview rounds.
   ============================================================ */

/** Built-in high demand sample JDs for one-click testing */
export const SAMPLE_JOB_POSTINGS = [
  {
    id: 'stripe-backend',
    title: 'Stripe — Senior Backend (Payments)',
    role: 'Senior Backend Engineer — Payments Infrastructure',
    company: 'Stripe',
    text: `Role: Senior Backend Engineer (Payments & Distributed Systems)
Company: Stripe (Core Infrastructure)
Location: Remote / Hybrid

About the Role:
We are looking for a Senior Backend Engineer to architect and scale our core transactional payment ledgers processing $100M+ in daily transaction volume with five-nines (99.999%) availability.

Requirements & Tech Stack:
• 4+ years of backend engineering experience with Go, Python, or Java.
• Deep expertise in relational databases (PostgreSQL/MySQL), transaction isolation levels (ACID), and query optimization.
• Proven hands-on experience designing high-throughput, idempotent RESTful and gRPC APIs.
• Strong familiarity with distributed asynchronous streaming architectures using Kafka, RabbitMQ, or AWS SQS.
• Solid understanding of distributed locking (Redis/Redlock), circuit breakers, caching, and rate limiting.
• Experience managing production outages, blameless post-mortems, and collaborating with cross-functional financial compliance teams.`
  },
  {
    id: 'scaleai-platform',
    title: 'Scale AI — AI Systems & RAG Platform',
    role: 'AI / ML Platform & Inference Systems Engineer',
    company: 'Scale AI',
    text: `Role: AI Systems & Platform Engineer
Company: Scale AI
Location: San Francisco, CA / Remote

About the Role:
Join the team powering generative AI infrastructure for enterprise LLMs. You will design, build, and optimize low-latency model evaluation, embedding search, and inference pipelines handling 25M daily requests.

Requirements & Tech Stack:
• 3+ years experience with Python, PyTorch, FastAPI, and asynchronous backend systems.
• Proven track record building production RAG (Retrieval-Augmented Generation) systems with Vector Databases (Pinecone, ChromaDB, Milvus).
• Strong knowledge of LLM token economics, prompt engineering frameworks (LangChain, LlamaIndex), and fine-tuning (LoRA).
• Hands-on experience with Docker, Kubernetes, and GPU orchestration.
• Passion for low-latency latency optimization, model caching, and hallucination benchmarking.`
  },
  {
    id: 'creative-fullstack',
    title: 'Nova Studios — Staff Full-Stack & WebGL',
    role: 'Staff Full-Stack & 3D WebGL Creative Engineer',
    company: 'Nova Digital Studios',
    text: `Role: Staff Full-Stack & Interactive 3D WebGL Engineer
Company: Nova Digital Studios
Location: New York, NY / Remote

About the Role:
We are creating next-generation interactive 3D web experiences and real-time avatars. We need a creative full-stack engineer who bridges WebGL graphics, procedural rendering, and resilient cloud backends.

Requirements & Tech Stack:
• 4+ years of TypeScript, React, Next.js, and Three.js / WebGL / GLSL shaders.
• Deep mastery of client-side performance, 60fps frame budgeting, memory leak profiling, and Web Audio APIs.
• Experience with Node.js, WebSockets, and real-time bidirectional streaming.
• Strong eye for modern UI aesthetics: glassmorphism, responsive micro-animations, and clean typography.`
  }
];

/** Core dictionary for JD technology extraction */
const TECH_DICTIONARY = [
  'Go', 'Python', 'Java', 'TypeScript', 'JavaScript', 'C++', 'Rust', 'C#',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB',
  'Kafka', 'RabbitMQ', 'AWS SQS', 'FastAPI', 'Express', 'Node.js', 'Next.js', 'React',
  'Three.js', 'WebGL', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'LLMs', 'RAG', 'Vector Databases', 'Pinecone', 'ChromaDB', 'PyTorch', 'LangChain',
  'Microservices', 'GraphQL', 'gRPC', 'CI/CD', 'Distributed Systems', 'System Design'
];

/**
 * Deconstructs any pasted Job Description into structured requirements.
 */
export function deconstructJobPosting(jdText = '', customRole = '', customCompany = '') {
  const text = (jdText || '').trim();
  const lower = text.toLowerCase();

  // Role detection
  let roleTitle = customRole || '';
  if (!roleTitle) {
    const roleMatch = text.match(/(?:role|position|title):\s*([^\n]+)/i);
    if (roleMatch) roleTitle = roleMatch[1].trim();
    else if (/backend/i.test(text)) roleTitle = 'Senior Backend Engineer';
    else if (/machine learning|ai|llm/i.test(text)) roleTitle = 'AI / ML Platform Engineer';
    else if (/frontend|webgl|react/i.test(text)) roleTitle = 'Full-Stack & Frontend Engineer';
    else roleTitle = 'Software Engineer';
  }

  // Company detection
  let companyName = customCompany || '';
  if (!companyName) {
    const compMatch = text.match(/(?:company|at):\s*([^\n]+)/i);
    if (compMatch) companyName = compMatch[1].trim();
    else companyName = 'Target Tech Employer';
  }

  // Seniority detection
  let seniority = 'Senior';
  if (/junior|associate|entry level|0-2 years|new grad/i.test(text)) seniority = 'Junior';
  else if (/mid-level|2-4 years/i.test(text)) seniority = 'Mid-Level';
  else if (/staff|principal|lead|director/i.test(text)) seniority = 'Staff / Principal';

  // Extract required skills
  const requiredSkills = [];
  for (const tech of TECH_DICTIONARY) {
    const esc = tech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${esc}([^a-zA-Z0-9_#+]|$)`, 'i');
    if (regex.test(text) || lower.includes(tech.toLowerCase())) {
      requiredSkills.push(tech);
    }
  }

  // Fallback defaults
  if (!requiredSkills.length) {
    requiredSkills.push('Distributed Systems', 'PostgreSQL', 'APIs', 'System Design');
  }

  // Determine domain & implied challenge
  let domainCategory = 'Distributed Systems & Cloud';
  let impliedChallenge = 'High-throughput scaling, concurrency, and fault tolerance.';

  if (/payment|transaction|ledger|fintech|checkout|banking/i.test(lower)) {
    domainCategory = 'FinTech & Transactional Infrastructure';
    impliedChallenge = 'Idempotency, ACID isolation, zero double-spending, and financial auditability.';
  } else if (/llm|rag|vector|generative ai|embedding|pytorch|inference/i.test(lower)) {
    domainCategory = 'Generative AI & Inference Systems';
    impliedChallenge = 'Sub-second vector retrieval, prompt context window limits, and inference cost optimization.';
  } else if (/three\.js|webgl|shader|3d|canvas|animation|graphics/i.test(lower)) {
    domainCategory = 'Interactive 3D & Creative Engineering';
    impliedChallenge = '60fps frame budgeting, draw call batching, memory leak profiling, and WebGL asset loading.';
  } else if (/devops|kubernetes|terraform|ci\/cd|observability/i.test(lower)) {
    domainCategory = 'Cloud Infrastructure & SRE';
    impliedChallenge = 'Zero-downtime canary deployments, distributed tracing, and autoscaling policies.';
  }

  const vulnerabilityAttackPoints = [
    `Deep-dive into ${requiredSkills[0] || 'Core Architecture'} scale bottlenecks and latency trade-offs.`,
    `Explain exact consistency & failover mechanisms for ${requiredSkills[1] || 'Primary Datastore'} under network partitions.`,
    `Handling production incident alerts, blameless post-mortems, and telemetry for ${companyName} services.`
  ];

  return {
    roleTitle,
    role: roleTitle,
    companyName,
    company: companyName,
    seniority,
    requiredSkills,
    mustHaveTech: requiredSkills,
    domainCategory,
    impliedChallenge,
    vulnerabilityAttackPoints,
    rawText: text
  };
}

/**
 * Compares candidate's parsed Resume against the deconstructed JD.
 * Accepts either (resume, jd) or (jd, resume).
 */
export function analyzeResumeVsJD(arg1, arg2) {
  // Normalize parameters
  const isArg1JD = arg1 && (arg1.requiredSkills || arg1.mustHaveTech || arg1.roleTitle);
  const jd = isArg1JD ? arg1 : (arg2 || {});
  const resume = isArg1JD ? arg2 : arg1;

  const reqSkills = jd.requiredSkills || jd.mustHaveTech || ['Distributed Systems', 'PostgreSQL', 'APIs'];
  const resumeSkills = (resume?.skills || []).map((s) => String(s).toLowerCase());
  const matchedSkills = [];
  const missingSkills = [];

  for (const req of reqSkills) {
    const isMatched = resumeSkills.some((rs) => rs.includes(req.toLowerCase()) || req.toLowerCase().includes(rs));
    if (isMatched) matchedSkills.push(req);
    else missingSkills.push(req);
  }

  const baseRatio = reqSkills.length > 0 ? (matchedSkills.length / reqSkills.length) : 0.7;
  const matchPercentage = resume ? Math.max(45, Math.min(96, Math.round(baseRatio * 100))) : 75;

  // Identify Vulnerability Attack Points (The "Trap" Questions)
  const vulnerabilities = [];
  const gapList = missingSkills.length ? missingSkills : reqSkills.slice(1, 3);
  for (const missing of gapList.slice(0, 3)) {
    vulnerabilities.push({
      skill: missing,
      reason: `The job description explicitly emphasizes "${missing}", which will be probed deeply in technical rounds.`,
      interviewerProbe: `Our production stack relies heavily on ${missing}. How would you architect around its core trade-offs given your background?`
    });
  }

  return {
    matchPercentage,
    matchScore: matchPercentage,
    matchedSkills: matchedSkills.length ? matchedSkills : (resume ? ['Architecture', 'Problem Solving'] : reqSkills.slice(0, 2)),
    matchedKeywords: matchedSkills.length ? matchedSkills : (resume ? ['Architecture', 'Problem Solving'] : reqSkills.slice(0, 2)),
    missingSkills,
    gapKeywords: missingSkills,
    vulnerabilities
  };
}

/**
 * Generates tailored interview challenges based on the JD & resume gaps.
 */
export function generateJDInterviewChallenges(jd, resumeDelta, count = 3) {
  const challenges = [];
  const delta = resumeDelta || analyzeResumeVsJD(jd, null);

  // Challenge 1: Hard-Tech Live Coding Drill (derived from primary stack)
  challenges.push({
    id: 'jd-code-drill',
    track: 'coding',
    title: `${jd.roleTitle || 'Backend'} Stack Drill: Idempotent Key Window Validator`,
    difficulty: jd.seniority === 'Staff / Principal' ? 'Hard' : 'Medium',
    category: `${jd.domainCategory || 'Core Systems'} • Live Coding`,
    description: `[TAILORED TO JD: ${jd.companyName || 'Target Employer'} - ${jd.roleTitle || 'Engineering'}]
The job posting emphasizes building resilient, high-throughput APIs handling ${jd.impliedChallenge || 'concurrency & fault tolerance'}.

Implement an in-memory **Idempotency Window Validator** function \`validateIdempotency(requests, ttlMs)\`.
Given a stream of requests \`[ { id: string, timestamp: number } ]\` and a time-to-live window \`ttlMs\`:
1. If a request ID is seen for the first time, record it and return \`true\` (ALLOW).
2. If the same request ID is re-submitted within \`ttlMs\` of its last accepted timestamp, reject it and return \`false\` (DUPLICATE).
3. If the request ID is re-submitted after \`ttlMs\` has elapsed, allow it and refresh its timestamp.`,
    examples: [
      { input: 'requests = [{id: "txn-1", timestamp: 100}, {id: "txn-1", timestamp: 150}], ttlMs = 100', output: '[true, false]', explanation: 'Second request was within 50ms (less than 100ms TTL).' },
      { input: 'requests = [{id: "txn-2", timestamp: 100}, {id: "txn-2", timestamp: 250}], ttlMs = 100', output: '[true, true]', explanation: 'Second request was after 150ms (greater than 100ms TTL).' }
    ],
    constraints: [
      '1 <= requests.length <= 10^5',
      'Timestamps are non-decreasing.'
    ],
    hints: [
      'Maintain a Map of ID to last seen timestamp.',
      'Check if (currentTimestamp - lastSeenTimestamp) < ttlMs.'
    ],
    starterCode: `/**
 * Validates request idempotency against a sliding TTL window.
 * @param {Array<{id: string, timestamp: number}>} requests
 * @param {number} ttlMs
 * @return {boolean[]} Array of allow/duplicate booleans
 */
function validateIdempotency(requests, ttlMs) {
  const lastSeen = new Map();
  const results = [];

  for (const req of requests) {
    if (lastSeen.has(req.id)) {
      const prevTime = lastSeen.get(req.id);
      if (req.timestamp - prevTime < ttlMs) {
        results.push(false);
        continue;
      }
    }
    lastSeen.set(req.id, req.timestamp);
    results.push(true);
  }

  return results;
}`,
    tests: [
      {
        input: [
          [{ id: 'a', timestamp: 10 }, { id: 'a', timestamp: 50 }, { id: 'a', timestamp: 120 }],
          100
        ],
        expected: [true, false, true],
        label: 'Single ID sliding window expiration'
      },
      {
        input: [
          [{ id: 'req-1', timestamp: 100 }, { id: 'req-2', timestamp: 110 }, { id: 'req-1', timestamp: 150 }],
          200
        ],
        expected: [true, true, false],
        label: 'Multiple concurrent IDs with duplicate detection'
      }
    ],
    fnName: 'validateIdempotency',
    optimalComplexity: 'O(N) Time, O(U) Space where U is unique IDs'
  });

  // Challenge 2: Domain System Design Scenario (derived from JD domain)
  challenges.push({
    id: 'jd-domain-design',
    track: 'system',
    title: `Architecture Round: ${jd.domainCategory || 'High Scale'} Challenge`,
    difficulty: `${jd.seniority || 'Senior'} Level`,
    category: `${jd.companyName || 'Target Domain'} Problem Domain`,
    prompt: `[TAILORED TO JD DOMAIN: ${jd.companyName || 'Employer'}]
Your team is building the core platform specified in the posting:
"${(jd.rawText || '').slice(0, 220)}..."

Key Challenge: ${jd.impliedChallenge || 'High-throughput scaling, idempotency, and fault tolerance'}

Please design the end-to-end architecture addressing:
1. High-availability ingestion layer with zero double-processing.
2. Data storage strategy (Relational vs. Distributed Cache/Key-Value) and transaction isolation.
3. How you handle failure recovery and network partitions between microservices.
4. Latency and caching strategy for high-load peaks.`,
    checklist: [
      'Idempotent API Gateway & Distributed Locking',
      'Database Isolation Level (Serializable vs Repeatable Read)',
      'Asynchronous Event Streaming (Kafka/SQS) with Consumer Offset Commit',
      'Dead-Letter Queue (DLQ) & Circuit Breakers'
    ]
  });

  // Challenge 3: Role-Specific Behavioral Probe (STAR Method)
  const vuln = delta.vulnerabilities?.[0];
  const probeTopic = vuln ? vuln.skill : (jd.requiredSkills?.[0] || 'System Architecture');

  challenges.push({
    id: 'jd-star-behavioral',
    track: 'behavioral',
    title: `Role Alignment & Execution: ${probeTopic} Under Pressure`,
    difficulty: 'Behavioral & Leadership',
    category: 'STAR Method Competency',
    prompt: `[TAILORED TO JD REQUIREMENTS: ${jd.companyName || 'Target Employer'}]
The job description highlights autonomy, ownership, and deep technical decision-making in ${probeTopic}.

"Describe a complex technical initiative where you had to adopt or architect around ${probeTopic} with tight deadlines. What was the situation, what trade-offs did you personally evaluate, what specific actions did you lead, and what was the quantifiable business or system outcome?"`,
    framework: 'STAR: Situation (20s), Task (20s), Action (60s - focus on "I", not "we"), Result (20s - include metrics/percentages).'
  });

  return challenges.slice(0, count);
}

/**
 * Generates the complete JD-Fit Evaluation Report & 24-Hour Cheat Sheet.
 * Accepts flexible parameter order: (jd, resumeDelta, submissions, speechStats) or (submissions, jd, resumeDelta, speechStats).
 */
export function generateJDFitReport(arg1, arg2, arg3, arg4) {
  let jd, resumeDelta, submissions, speechStats;

  if (Array.isArray(arg1)) {
    submissions = arg1;
    jd = arg2 || {};
    resumeDelta = arg3 || {};
    speechStats = arg4 || [];
  } else {
    jd = arg1 || {};
    resumeDelta = arg2 || {};
    submissions = Array.isArray(arg3) ? arg3 : [];
    speechStats = Array.isArray(arg4) ? arg4 : [];
  }

  const delta = resumeDelta.matchPercentage !== undefined ? resumeDelta : analyzeResumeVsJD(jd, null);

  // Compute overall performance
  let totalScore = 0;
  let count = 0;
  for (const s of submissions) {
    if (s.evaluation?.score) {
      totalScore += s.evaluation.score;
      count++;
    }
  }
  const avgTechnicalScore = count > 0 ? (totalScore / count) * 10 : 80;

  // Weighted Role-Fit Probability: 50% technical performance + 30% resume match + 20% speech delivery
  const avgDeliveryScore = speechStats.length > 0
    ? (speechStats.reduce((acc, sp) => acc + (sp.overallDeliveryScore || sp.overallScore || 8), 0) / speechStats.length) * 10
    : 84;

  const roleFitProbability = Math.round(avgTechnicalScore * 0.5 + delta.matchPercentage * 0.3 + avgDeliveryScore * 0.2);

  // Fit verdict
  let fitVerdict = 'STRONG HIRE';
  if (roleFitProbability >= 85) fitVerdict = 'STRONG HIRE — High JD Alignment';
  else if (roleFitProbability >= 72) fitVerdict = 'HIRE — Ready with Targeted Revision';
  else if (roleFitProbability >= 60) fitVerdict = 'LEANING HIRE — Technical Gaps to Bridge';
  else fitVerdict = 'NEEDS REVISION — Vulnerability Gaps Exposed';

  const reqSkills = jd.requiredSkills || jd.mustHaveTech || ['Distributed Systems', 'PostgreSQL', 'APIs'];

  // Competency breakdown against JD requirements
  const competencies = reqSkills.map((skill, idx) => {
    const isMatched = delta.matchedSkills ? delta.matchedSkills.includes(skill) : true;
    const score = isMatched ? Math.min(98, 80 + (idx % 3) * 6) : Math.max(50, 60 - idx * 4);
    return {
      skill,
      score,
      status: isMatched ? 'Demonstrated' : 'Gap Identified',
      notes: isMatched
        ? `Validated in technical drills and resume evidence.`
        : `Flagged as attack point in interview; revise before employer screen.`
    };
  });

  // 24-Hour Job Posting Action Cheat-Sheet
  const gapsToAddress = delta.missingSkills && delta.missingSkills.length > 0
    ? delta.missingSkills.map((m) => `Deep-dive into ${m} concurrency, locking, and failure recovery modes before employer screen.`)
    : [
        `Review internal architecture decisions and latency benchmarks for ${reqSkills[0] || 'primary systems'}.`,
        `Practice articulating trade-offs between relational consistency (ACID) and distributed caching.`
      ];

  const questionsYouWillBeAsked = [
    `"How does your architecture handle idempotent requests and prevent duplicate processing in high-volume windows?"`,
    `"Can you walk through a high-severity production outage you resolved in ${jd.companyName || 'your past role'} and your post-mortem takeaways?"`,
    `"What are the concrete scalability limits of your chosen datastore and how would you shard it?"`
  ];

  const deliveryTweaks = [
    `Lead with concrete business impact and quantifiable throughput numbers in the first 20 seconds.`,
    `Eliminate passive phrasing: say "I designed and implemented", not "we ended up doing".`,
    `Structure behavioral answers strictly around the STAR framework (Situation, Task, Action, Result).`
  ];

  const cheatSheet = {
    gapsToAddress,
    questionsYouWillBeAsked,
    deliveryTweaks
  };

  const avgWpm = speechStats.length > 0 ? Math.round(speechStats.reduce((a, s) => a + (s.wpm || 140), 0) / speechStats.length) : 138;
  const totalFillers = speechStats.reduce((a, s) => a + (s.fillerCount || 0), 0);

  const speechDelivery = {
    overallScore: Math.round(avgDeliveryScore),
    avgWpm,
    totalFillers,
    starMethodScore: 88,
    concisenessScore: 84,
    coachingActionPoints: [
      `Maintain optimal pacing of 130-155 WPM during architectural trade-off discussions.`,
      `Pause for 1-2 seconds after challenging questions instead of using verbal filler sounds.`
    ]
  };

  return {
    matchProbability: roleFitProbability,
    roleFitProbability,
    verdict: fitVerdict,
    fitVerdict,
    roleTitle: jd.roleTitle || 'Senior Engineer',
    role: jd.roleTitle || 'Senior Engineer',
    companyName: jd.companyName || 'Target Employer',
    company: jd.companyName || 'Target Employer',
    targetCompany: jd.companyName || 'Target Employer',
    domainCategory: jd.domainCategory || 'Distributed Systems',
    competencies,
    speechDelivery,
    speechDiagnostics: speechStats,
    cheatSheet,
    resumeDelta: delta,
    submissions
  };
}
