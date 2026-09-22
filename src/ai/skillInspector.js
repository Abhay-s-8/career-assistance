/* ============================================================
   AURA — Deep Skill Inspector & Verification Engine
   Analyzes candidate profile on a per-skill basis:
   identifies exact evidence sentences, determines proficiency,
   classifies domain taxonomy, and checks interview verification.
   ============================================================ */

/** Domain taxonomy mapping for skills */
export const SKILL_DOMAINS = {
  ai_ml: { label: 'AI & Machine Learning', color: 'hsl(275 100% 70%)', bg: 'hsl(275 80% 60% / 0.15)' },
  languages: { label: 'Programming Languages', color: 'hsl(210 100% 70%)', bg: 'hsl(210 80% 60% / 0.15)' },
  frontend: { label: 'Frontend & UI Engineering', color: 'hsl(175 100% 65%)', bg: 'hsl(175 80% 50% / 0.15)' },
  backend: { label: 'Backend & Distributed Systems', color: 'hsl(145 90% 65%)', bg: 'hsl(145 80% 50% / 0.15)' },
  databases: { label: 'Databases & Storage', color: 'hsl(190 100% 65%)', bg: 'hsl(190 80% 50% / 0.15)' },
  cloud_devops: { label: 'Cloud, Systems & DevOps', color: 'hsl(38 100% 65%)', bg: 'hsl(38 80% 50% / 0.15)' },
  hardware_engineering: { label: 'Hardware, Embedded & VLSI', color: 'hsl(15 100% 68%)', bg: 'hsl(15 80% 50% / 0.15)' },
  design_creative: { label: 'Design & Creative Tools', color: 'hsl(330 95% 70%)', bg: 'hsl(330 80% 60% / 0.15)' },
  analysis_writing: { label: 'Analysis & Technical Writing', color: 'hsl(250 90% 75%)', bg: 'hsl(250 80% 60% / 0.15)' },
  practices: { label: 'Architecture & Practices', color: 'hsl(300 90% 70%)', bg: 'hsl(300 80% 60% / 0.15)' },
  spoken_languages: { label: 'Spoken Languages', color: 'hsl(160 90% 65%)', bg: 'hsl(160 80% 50% / 0.15)' },
  hobbies_interests: { label: 'Hobbies & Interests', color: 'hsl(45 100% 65%)', bg: 'hsl(45 80% 50% / 0.15)' }
};

/** High-demand skill metadata & benchmark information */
const SKILL_METADATA = {
  // Design & Creative Tools
  'Canva': {
    domain: 'design_creative',
    demand: 'High',
    typicalRoles: ['UI/UX Designer', 'Visual Content Creator', 'Marketing Designer', 'Product Designer'],
    interviewFocus: 'Visual hierarchy, typography, branding consistency, design templates, and rapid prototyping',
    sampleQuestion: 'How do you establish cohesive visual design systems, color harmonies, and responsive assets in Canva for digital platforms?'
  },
  'Figma': {
    domain: 'design_creative',
    demand: 'Top Tier',
    typicalRoles: ['Product Designer', 'UI/UX Specialist', 'Design System Lead', 'Frontend Engineer'],
    interviewFocus: 'Auto Layout, component variants, design tokens, interactive prototyping, developer handoff, and usability testing',
    sampleQuestion: 'How do you structure nested component variants and design tokens in Figma for seamless handoff to frontend React/CSS developers?'
  },
  'UI/UX Design': {
    domain: 'design_creative',
    demand: 'Very High',
    typicalRoles: ['Product Designer', 'UX Researcher', 'UI Engineer'],
    interviewFocus: 'User journey mapping, wireframing, heuristic evaluation, design thinking, and accessibility (WCAG)',
    sampleQuestion: 'Walk me through your design process from user research and wireframing to iterative prototype testing and final UI execution.'
  },
  'Adobe Creative Suite': {
    domain: 'design_creative',
    demand: 'High',
    typicalRoles: ['Visual Designer', 'Brand Artist', 'Digital Media Producer'],
    interviewFocus: 'Vector editing, raster manipulation, asset optimization, and digital illustration',
    sampleQuestion: 'How do you optimize raster and vector graphic assets for high-resolution web displays and fast load performance?'
  },

  // Hardware & Embedded Engineering
  'Verilog & HDL': {
    domain: 'hardware_engineering',
    demand: 'Very High',
    typicalRoles: ['VLSI Design Engineer', 'FPGA Developer', 'Digital Hardware Architect', 'ASIC Verification Engineer'],
    interviewFocus: 'Synchronous vs asynchronous logic, finite state machines (FSM), blocking vs non-blocking assignments, testbenches, timing closure',
    sampleQuestion: 'Explain the critical differences between blocking (=) and non-blocking (<=) assignments in Verilog and when each should be used in sequential vs combinational logic.'
  },
  'Verilog': {
    domain: 'hardware_engineering',
    demand: 'Very High',
    typicalRoles: ['VLSI Design Engineer', 'FPGA Developer', 'Digital Logic Engineer'],
    interviewFocus: 'RTL modeling, state machines, timing constraints, hardware synthesis, testbench verification',
    sampleQuestion: 'How do you design a Moore vs Mealy state machine in Verilog, and how do you write a testbench to simulate clock-driven state transitions?'
  },
  'MATLAB & Simulink': {
    domain: 'hardware_engineering',
    demand: 'High',
    typicalRoles: ['Algorithms Engineer', 'Control Systems Specialist', 'Signal Processing Engineer', 'Research Scientist'],
    interviewFocus: 'Matrix manipulation, algorithm prototyping, Simulink block modeling, digital signal processing, numerical optimization',
    sampleQuestion: 'How do you vectorize nested loops in MATLAB for high-performance matrix computations and numerical simulation?'
  },
  'MATLAB': {
    domain: 'hardware_engineering',
    demand: 'High',
    typicalRoles: ['Data Scientist', 'Robotics Engineer', 'Control Systems Engineer'],
    interviewFocus: 'Matrix decomposition, numerical analysis, data visualization, filtering, and algorithm development',
    sampleQuestion: 'Explain how matrix operations are optimized in MATLAB and how you design digital filters for signal processing.'
  },
  'Embedded Systems': {
    domain: 'hardware_engineering',
    demand: 'Very High',
    typicalRoles: ['Firmware Engineer', 'Embedded Software Engineer', 'IoT Systems Architect'],
    interviewFocus: 'Interrupt service routines (ISR), memory constraints, direct register manipulation, RTOS scheduling, serial protocols (I2C, SPI, UART)',
    sampleQuestion: 'How do you manage concurrent tasks and priority inversion in an RTOS-based embedded microcontroller system?'
  },
  'Microcontrollers': {
    domain: 'hardware_engineering',
    demand: 'High',
    typicalRoles: ['Hardware Engineer', 'Embedded Developer', 'Robotics Builder'],
    interviewFocus: 'ARM Cortex, ESP32, Arduino, timer interrupts, ADC/DAC conversions, GPIO configuration',
    sampleQuestion: 'How do you configure hardware timer interrupts and PWM outputs for precise motor control in microcontrollers?'
  },
  'FPGA & VLSI Design': {
    domain: 'hardware_engineering',
    demand: 'Top Tier',
    typicalRoles: ['VLSI Architect', 'FPGA Engineer', 'Silicon Design Specialist'],
    interviewFocus: 'Look-up tables (LUTs), clock domain crossing (CDC), static timing analysis (STA), synthesis tradeoffs',
    sampleQuestion: 'What techniques do you employ to prevent metastability during clock domain crossing (CDC) in FPGA designs?'
  },

  // Analysis & Writing
  'Technical Writing': {
    domain: 'analysis_writing',
    demand: 'Very High',
    typicalRoles: ['Technical Writer', 'Documentation Engineer', 'Developer Advocate', 'Product Manager'],
    interviewFocus: 'API documentation, architecture diagrams, user onboarding guides, developer tutorials, and clear information architecture',
    sampleQuestion: 'How do you break down complex technical architectures or API endpoints into clear, intuitive documentation for both beginner and senior engineers?'
  },
  'Research & Analytics': {
    domain: 'analysis_writing',
    demand: 'Very High',
    typicalRoles: ['Research Analyst', 'Data Scientist', 'Technical Researcher', 'Strategy Consultant'],
    interviewFocus: 'Hypothesis testing, literature synthesis, quantitative & qualitative analysis, feasibility studies, empirical benchmarking',
    sampleQuestion: 'Describe your methodology for conducting structured technical research and converting ambiguous problem spaces into actionable findings.'
  },
  'Research': {
    domain: 'analysis_writing',
    demand: 'High',
    typicalRoles: ['Research Analyst', 'Technical Researcher', 'Product Strategist'],
    interviewFocus: 'Literature review, experimental design, data collection, comparative benchmarking',
    sampleQuestion: 'How do you validate hypotheses and synthesize findings when researching emerging technical frameworks?'
  },

  // Spoken Languages
  'English': {
    domain: 'spoken_languages',
    demand: 'Essential',
    typicalRoles: ['Global Engineering Roles', 'Cross-Border Collaboration', 'Technical Leadership'],
    interviewFocus: 'Professional technical communication, stakeholder presentations, agile ceremonies, and documentation clarity',
    sampleQuestion: 'How do you articulate complex technical tradeoffs clearly to non-technical business stakeholders?'
  },
  'Hindi': {
    domain: 'spoken_languages',
    demand: 'High',
    typicalRoles: ['Multilingual Engineering Team Member', 'Regional Client Engagement'],
    interviewFocus: 'Fluent regional communication, team collaboration, and client relationship management',
    sampleQuestion: 'How does multilingual fluency help in cross-functional collaboration and distributed engineering teams?'
  },
  'Bengali': {
    domain: 'spoken_languages',
    demand: 'High',
    typicalRoles: ['Multilingual Professional', 'Regional Collaboration'],
    interviewFocus: 'Cross-cultural team communication, regional project coordination, and technical mentorship',
    sampleQuestion: 'How do you leverage regional language fluency to bridge communication across diverse teams?'
  },

  // Hobbies & Interests
  'Reading Historical Events': {
    domain: 'hobbies_interests',
    demand: 'Enriching',
    typicalRoles: ['Critical Thinker', 'Strategic Planner', 'Analytical Leader'],
    interviewFocus: 'Analytical reasoning, historical precedent analysis, long-term strategic perspective, and curiosity',
    sampleQuestion: 'How does studying historical events and decision-making frameworks influence your approach to modern problem-solving and leadership?'
  },
  'Listening to Music': {
    domain: 'hobbies_interests',
    demand: 'Creative',
    typicalRoles: ['Creative Technologist', 'Balanced Problem Solver'],
    interviewFocus: 'Focus, pattern recognition, creativity, mental stamina, and stress management',
    sampleQuestion: 'How do music appreciation and pattern recognition contribute to your focus and creative thinking during complex engineering tasks?'
  },
  'Playing Guitar': {
    domain: 'hobbies_interests',
    demand: 'Creative & Discipline',
    typicalRoles: ['Creative Technologist', 'Disciplined Builder'],
    interviewFocus: 'Rhythm, motor coordination, deliberate practice, continuous learning, and musical creativity',
    sampleQuestion: 'What parallels do you see between mastering an instrument like the guitar (practice, muscle memory, improvisation) and mastering code?'
  },

  // Programming Languages
  'JavaScript': {
    domain: 'languages',
    demand: 'Very High',
    typicalRoles: ['Full-Stack Engineer', 'Frontend Specialist', 'Node.js Developer'],
    interviewFocus: 'Event loop, closures, prototypical inheritance, async/await, memory management, ESNext specifications',
    sampleQuestion: 'How does the JavaScript event loop handle microtasks vs macrotasks during asynchronous execution?'
  },
  'TypeScript': {
    domain: 'languages',
    demand: 'Very High',
    typicalRoles: ['Senior Full-Stack Engineer', 'Frontend Architect', 'Backend Developer'],
    interviewFocus: 'Generics, utility types, conditional types, type narrowing, interfaces vs type aliases, ambient declarations',
    sampleQuestion: 'How would you implement a recursive type in TypeScript to deeply make all properties of an object readonly or optional?'
  },
  'Python': {
    domain: 'languages',
    demand: 'Very High',
    typicalRoles: ['AI/ML Engineer', 'Backend Developer', 'Data Platform Engineer'],
    interviewFocus: 'Data structures, generators, GIL, asyncio, memory profiling, metaprogramming, FastAPI/Django',
    sampleQuestion: 'Explain the Global Interpreter Lock (GIL) and how you architect CPU-bound vs I/O-bound concurrent systems in Python.'
  },
  'Go / Golang': {
    domain: 'languages',
    demand: 'High',
    typicalRoles: ['Distributed Systems Engineer', 'Cloud Backend Engineer', 'DevOps Specialist'],
    interviewFocus: 'Goroutines, channels, interface values, memory escape analysis, context propagation, synchronization primitives',
    sampleQuestion: 'How do Go channels prevent race conditions, and how would you implement a worker pool pattern with graceful shutdown?'
  },
  'Rust': {
    domain: 'languages',
    demand: 'Top Tier / Rising',
    typicalRoles: ['Systems Engineer', 'WebAssembly Developer', 'Infrastructure Engineer'],
    interviewFocus: 'Ownership, borrowing, lifetimes, pattern matching, fearless concurrency, unsafe blocks, trait systems',
    sampleQuestion: 'Explain how the Rust borrow checker prevents data races at compile-time without a garbage collector.'
  },
  'C++': {
    domain: 'languages',
    demand: 'High',
    typicalRoles: ['Core Systems Engineer', 'Graphics Programmer', 'Embedded Developer'],
    interviewFocus: 'RAII, smart pointers, move semantics, template metaprogramming, memory layouts, virtual tables',
    sampleQuestion: 'What are the performance differences between std::unique_ptr and std::shared_ptr, and when does move semantics avoid deep copies?'
  },
  'Java': {
    domain: 'languages',
    demand: 'Very High',
    typicalRoles: ['Enterprise Backend Architect', 'Android Engineer', 'Distributed Systems'],
    interviewFocus: 'JVM memory model (Heap/Stack/Metaspace), garbage collection algorithms (G1/ZGC), Spring Boot, multithreading',
    sampleQuestion: 'How do virtual threads in Java (Project Loom) differ from platform threads in high-throughput microservices?'
  },
  'SQL': {
    domain: 'languages',
    demand: 'Essential',
    typicalRoles: ['All Software Engineers', 'Data Engineers', 'Database Administrators'],
    interviewFocus: 'Complex analytical queries, window functions, indexing strategies (B-Tree/GIN), execution plan analysis (EXPLAIN ANALYZE)',
    sampleQuestion: 'How would you diagnose and resolve a slow query with multiple table joins in a high-volume relational database?'
  },

  // AI & ML
  'LLMs & Generative AI': {
    domain: 'ai_ml',
    demand: 'Top Tier',
    typicalRoles: ['Generative AI Engineer', 'AI Platform Architect', 'Applied AI Scientist'],
    interviewFocus: 'Transformer architectures, self-attention, context windows, tokenization, KV cache optimization, hallucinations mitigation',
    sampleQuestion: 'How does KV caching optimize autoregressive text generation in modern LLMs?'
  },
  'Google Gemini': {
    domain: 'ai_ml',
    demand: 'Top Tier',
    typicalRoles: ['Multimodal AI Engineer', 'AI Solutions Architect'],
    interviewFocus: 'Multimodal input processing (audio, image, video, code), structured output JSON schemas, function calling, Gemini Flash/Pro optimization',
    sampleQuestion: 'How do you leverage Gemini function calling to execute real-time deterministic tool workflows from natural language prompts?'
  },
  'PyTorch': {
    domain: 'ai_ml',
    demand: 'Very High',
    typicalRoles: ['Deep Learning Engineer', 'ML Research Scientist'],
    interviewFocus: 'Tensor autograd, custom nn.Module architectures, DataLoader multiprocessing, distributed training (DDP), CUDA memory management',
    sampleQuestion: 'Explain the backward pass in PyTorch and how computational graphs are dynamically constructed and freed during backpropagation.'
  },
  'RAG Architecture': {
    domain: 'ai_ml',
    demand: 'Top Tier',
    typicalRoles: ['AI Platform Engineer', 'Search & Information Retrieval Engineer'],
    interviewFocus: 'Document chunking, dense vs sparse retrieval, hybrid search, embedding models, cross-encoder reranking, context injection',
    sampleQuestion: 'How do you design a RAG retrieval pipeline that balances chunk overlap, semantic density, and reranking latency?'
  },

  // Frontend
  'React': {
    domain: 'frontend',
    demand: 'Very High',
    typicalRoles: ['Frontend Engineer', 'Full-Stack Developer', 'UI Lead'],
    interviewFocus: 'Reconciliation algorithm, virtual DOM, hooks internals, concurrent rendering, custom hooks, React Server Components',
    sampleQuestion: 'Explain how React’s Fiber architecture enables interruptible rendering and priority-based updates.'
  },
  'Next.js': {
    domain: 'frontend',
    demand: 'Very High',
    typicalRoles: ['Full-Stack React Engineer', 'Web Architect'],
    interviewFocus: 'App Router vs Pages Router, Server Components, Streaming SSR, Incremental Static Regeneration (ISR), Middleware',
    sampleQuestion: 'How do React Server Components (RSC) reduce client bundle size compared to traditional client-side rendering?'
  },
  'Three.js & WebGL': {
    domain: 'frontend',
    demand: 'Specialized / High',
    typicalRoles: ['3D Graphics Developer', 'Creative Technologist', 'Simulation Engineer'],
    interviewFocus: 'Scene graphs, cameras, lights, buffer geometries, custom GLSL vertex/fragment shaders, draw call batching, memory disposal',
    sampleQuestion: 'How do you optimize 60 FPS WebGL rendering performance in Three.js when rendering complex meshes with dynamic lighting?'
  },

  // Backend
  'Node.js': {
    domain: 'backend',
    demand: 'Very High',
    typicalRoles: ['Backend Engineer', 'Full-Stack Developer', 'API Architect'],
    interviewFocus: 'Event-driven non-blocking I/O, libuv thread pool, stream pipelines, worker threads, clustering',
    sampleQuestion: 'How does Node.js handle CPU-heavy computations without blocking the single-threaded event loop for incoming HTTP requests?'
  },
  'FastAPI': {
    domain: 'backend',
    demand: 'Very High',
    typicalRoles: ['Python Backend Engineer', 'AI Model Serving Developer'],
    interviewFocus: 'Asynchronous route handlers, Pydantic type validation, dependency injection, OpenAPI automated documentation',
    sampleQuestion: 'How does FastAPI use Pydantic models and Python type hints to enforce runtime request/response validation?'
  },
  'PostgreSQL': {
    domain: 'databases',
    demand: 'Very High',
    typicalRoles: ['Backend Engineer', 'Database Architect', 'Data Engineer'],
    interviewFocus: 'ACID transactions, MVCC, indexes (B-Tree, BRIN, GIN), partitioning, query plans',
    sampleQuestion: 'Explain how PostgreSQL MVCC handles concurrent read and write operations without table-level locking.'
  },
  'Docker & Containers': {
    domain: 'cloud_devops',
    demand: 'Very High',
    typicalRoles: ['All Software Engineers', 'DevOps Specialists'],
    interviewFocus: 'Multi-stage Dockerfiles, image layer caching, container security, network bridges, volume mounts',
    sampleQuestion: 'How do multi-stage Docker builds reduce container image size and eliminate build toolchains from production images?'
  },
  'Kubernetes (K8s)': {
    domain: 'cloud_devops',
    demand: 'Top Tier',
    typicalRoles: ['DevOps / SRE', 'Platform Engineer', 'Cloud Infrastructure Architect'],
    interviewFocus: 'Pods, Deployments, StatefulSets, Services, Ingress controllers, Horizontal Pod Autoscaling (HPA), Helm charts',
    sampleQuestion: 'How does Kubernetes manage rolling updates and health probes (liveness, readiness, startup) to ensure zero downtime?'
  },
  'System Design & High Scale': {
    domain: 'practices',
    demand: 'Top Tier / Essential',
    typicalRoles: ['Staff / Principal Engineer', 'Solutions Architect', 'Engineering Lead'],
    interviewFocus: 'High availability (99.99%), fault tolerance, database sharding, caching tiers, load balancing, CAP theorem, asynchronous message queues',
    sampleQuestion: 'Design a distributed rate-limiting and notification system capable of handling 50,000 requests per second with sub-50ms latency.'
  }
};

/**
 * Deeply inspects every extracted skill in the resume
 * @param {object} resume Parsed resume object
 * @returns {Array<object>} Array of inspected skill details
 */
export function inspectAllSkills(resume) {
  if (!resume) return [];

  const rawText = resume.rawText || '';
  const sentences = splitIntoSentences(rawText);
  const allSkills = [
    ...(resume.skills || []),
    ...(resume.spokenLanguages || []),
    ...(resume.hobbies || [])
  ].filter((v, i, a) => a.indexOf(v) === i);

  return allSkills.map((skill) => {
    return inspectSingleSkill(skill, sentences, rawText, resume);
  });
}

/**
 * Inspects a single skill with deep context analysis
 */
export function inspectSingleSkill(skill, sentences = [], rawText = '', resume = null) {
  const meta = SKILL_METADATA[skill] || inferSkillMetadata(skill);

  // Find sentences or bullet points where this skill (or its aliases) is mentioned
  const evidenceMatches = [];
  const searchTerms = [skill];
  
  // Compound terms check
  if (skill.includes('&') || skill.includes('/') || skill.includes('(')) {
    const parts = skill.split(/[/&()]/).map((p) => p.trim()).filter((p) => p.length >= 2);
    searchTerms.push(...parts);
  }

  for (const s of sentences) {
    let matched = false;
    for (const term of searchTerms) {
      const esc = escapeRegex(term);
      const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${esc}([^a-zA-Z0-9_#+]|$)`, 'i');
      if (regex.test(s) && s.length > 5 && s.length < 400) {
        matched = true;
        break;
      }
    }
    if (matched && !evidenceMatches.includes(s.trim())) {
      evidenceMatches.push(s.trim());
      if (evidenceMatches.length >= 4) break;
    }
  }

  // Determine proficiency tier
  const proficiency = determineProficiency(skill, evidenceMatches);

  const confidenceScore = evidenceMatches.length >= 2 ? 96 : evidenceMatches.length === 1 ? 88 : 78;

  return {
    name: skill,
    domain: meta.domain,
    domainInfo: SKILL_DOMAINS[meta.domain] || SKILL_DOMAINS.practices,
    demand: meta.demand,
    typicalRoles: meta.typicalRoles || ['Software Professional', 'Engineering Specialist'],
    interviewFocus: meta.interviewFocus || `Core principles, practical applications, and best practices involving ${skill}.`,
    sampleQuestion: meta.sampleQuestion || `Explain your experience with ${skill} and how you leverage it in practical projects.`,
    evidence: evidenceMatches,
    evidenceCount: evidenceMatches.length,
    proficiency,
    confidenceScore,
    verified: false,
    score: proficiency === 'Production Architect' ? 95 : proficiency === 'Advanced / Production' ? 90 : proficiency === 'Working Proficiency' ? 80 : 70
  };
}

/**
 * Determines skill proficiency from resume text and action verbs
 */
function determineProficiency(skill, evidenceList) {
  if (!evidenceList || !evidenceList.length) {
    return 'Foundational / Listed';
  }

  const combinedEvidence = evidenceList.join(' ').toLowerCase();

  const topIndicators = ['architected', 'spearheaded', 'principal', 'staff', 'lead', 'orchestrated', 'authored', 'scaled to'];
  if (topIndicators.some((k) => combinedEvidence.includes(k))) {
    return 'Production Architect';
  }

  const highIndicators = ['optimized', 'engineered', 'deployed', 'million', 'latency', 'benchmark', 'production', 'high-throughput', 'proficient in', 'expert in'];
  if (highIndicators.some((k) => combinedEvidence.includes(k))) {
    return 'Advanced / Production';
  }

  const midIndicators = ['developed', 'implemented', 'built', 'created', 'integrated', 'maintained', 'tested', 'configured', 'designed', 'good at', 'learning'];
  if (midIndicators.some((k) => combinedEvidence.includes(k))) {
    return 'Working Proficiency';
  }

  return 'Foundational / Listed';
}

/** Inferred metadata for skills not explicitly in the dictionary */
function inferSkillMetadata(skill) {
  const s = skill.toLowerCase();

  let domain = 'practices';
  if (/canva|figma|photoshop|illustrator|design|ui|ux|wirefram|visual/i.test(s)) domain = 'design_creative';
  else if (/verilog|vhdl|matlab|simulink|embedded|microcontroller|arduino|fpga|vlsi|pcb|cad|dsp/i.test(s)) domain = 'hardware_engineering';
  else if (/writing|research|documentation|analysis|analyst|product/i.test(s)) domain = 'analysis_writing';
  else if (/english|hindi|bengali|spanish|french|german|japanese|chinese|mandarin|arabic|russian|language/i.test(s)) domain = 'spoken_languages';
  else if (/music|guitar|reading|history|hobby|hobbies|chess|gaming|travel|sport|singing|photo/i.test(s)) domain = 'hobbies_interests';
  else if (/react|vue|angular|css|html|frontend|svelte|next|tailwind/i.test(s)) domain = 'frontend';
  else if (/python|java|c\+\+|rust|go|swift|kotlin|ruby|typescript|javascript|bash/i.test(s)) domain = 'languages';
  else if (/node|express|django|fastapi|backend|grpc|spring|graphql/i.test(s)) domain = 'backend';
  else if (/ai|ml|learning|gpt|model|llm|vision|nlp|torch|tensor|rag|vector|gemini|claude/i.test(s)) domain = 'ai_ml';
  else if (/aws|azure|gcp|cloud|docker|k8s|kubernetes|devops|ci\/cd|linux|terraform/i.test(s)) domain = 'cloud_devops';
  else if (/postgres|redis|mongo|database|kafka|rabbitmq|dynamo|elastic|cassandra|db/i.test(s)) domain = 'databases';

  return {
    domain,
    demand: 'High',
    typicalRoles: ['Software Professional', 'Engineering Specialist'],
    interviewFocus: `Fundamental concepts, practical implementation, and architecture involving ${skill}.`,
    sampleQuestion: `How have you applied ${skill} in your past projects, and what key techniques or workflows did you use?`
  };
}

/** Helper to cleanly split raw resume text into readable bullet points or sentences */
function splitIntoSentences(text) {
  return text
    .split(/[\n•\r|;]+/)
    .map((s) => s.replace(/^[-\s*•]+/, '').trim())
    .filter((s) => s.length >= 4);
}

function escapeRegex(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
