/* ============================================================
   AURA — Local conversational engine
   A small, entirely offline personality: intent matching with a
   weighted scorer, non-repeating response pools, deep skill analysis,
   and dynamic resume search so Siya responds accurately to any query.
   ============================================================ */

import { COMMAND_HELP } from './commands.js';
import { analyzeResume } from './resumeParser.js';

const pick = (arr, state, key) => {
  // Never repeat the previous line from the same pool.
  const last = state.last[key];
  const pool = arr.length > 1 && last !== undefined ? arr.filter((_, i) => i !== last) : arr;
  const choice = Math.floor(Math.random() * pool.length);
  const realIndex = arr.indexOf(pool[choice]);
  state.last[key] = realIndex;
  return pool[choice];
};

/** Each intent: keywords (weighted), optional regex, and a reply pool. */
const INTENTS = [
  {
    id: 'greet', w: 1.8,
    any: ['hello', 'hi', 'hey', 'heya', 'good morning', 'good afternoon', 'good evening', 'yo', 'greetings', 'howdy', 'namaste', 'hi siya', 'hello siya', 'hey siya', 'hi gesture', 'wave', 'wave hand', 'gesture', 'greeting gesture', 'wave at me', 'say hi', 'hi wave', 'gesture hi', 'greet', 'can you wave', 'wave hello'],
    replies: [
      "Hello! I'm Siya — your 3D AI Career Guidance Mentor. Great to see you! How can I help you today?",
      "Hey there! I'm Siya, ready for mock interviews, resume critiques, or technical discussions. What would you like to prepare for?",
      "Hi! I'm Siya. My 3D expressions and voice engine are ready. Ask me anything, or let's start a technical interview round!",
    ],
  },
  {
    id: 'howareyou', w: 2,
    any: ["how are you", "how're you", 'how you doing', 'how do you feel', 'you okay', "what's up", 'whats up', 'how are things'],
    replies: [
      "I'm doing wonderful, running smoothly at 60 frames a second! Ready to dive into coding problems, architecture reviews, or resume analysis. How are you doing?",
      "Feeling great and fully energized! The 3D stage is set and my voice pipeline is crisp. What shall we work on today?",
      "Excellent! Ready to help you prepare for technical interviews and accelerate your career.",
    ],
  },
  {
    id: 'name', w: 2.4,
    any: ['your name', 'who are you', 'what are you', 'who is siya', 'what is siya', 'introduce yourself', 'introduce', 'tell me about yourself', 'about yourself', 'who made you', 'start intro', 'start introduction'],
    replies: [
      "I'm Siya — your interactive 3D AI Career Guidance Mentor powered by Google Gemini. I specialize in conducting mock technical interviews, ATS resume diagnostics, and system design coaching.",
      "Hello! I am Siya: your 3D AI Career Guidance Mentor equipped with real-time facial expressions, neural voice synthesis, live coding challenges, and career discovery roadmaps.",
      "I'm Siya, your 3D procedural AI Career Guidance Mentor. I'm here to help you master technical interview rounds, analyze your resume, and level up your engineering career!",
    ],
  },
  {
    id: 'capability', w: 2.2,
    any: ['what can you do', 'help', 'commands', 'what do you do', 'abilities', 'features', 'how do i use'],
    replies: [() => `Quite a lot, actually. Try any of these — out loud or typed:\n\n• ${COMMAND_HELP.join('\n• ')}\n\nAnd the Face panel lets you push my expressions around by hand.`],
  },
  {
    id: 'howbuilt', w: 2,
    any: ['how do you work', 'how were you made', 'how are you built', 'what tech', 'which technology', 'three.js', 'threejs'],
    replies: [
      "Three.js for the stage, a procedural rig that moves my actual mesh vertices for the face, and the Web Speech API for the voice. No skeleton, no morph targets — just maths applied to geometry.",
      "My face has no bones. The rig finds my mouth, brows and eyelids by measuring the mesh, then displaces those vertices in real time. It's crude and it works beautifully.",
    ],
  },
  {
    id: 'coding_dsa', w: 2.5,
    any: ['dsa', 'data structures', 'algorithms', 'big o', 'leetcode', 'binary search', 'dynamic programming', 'two sum', 'hash map', 'time complexity'],
    replies: [
      "In technical interviews, time and space complexity are critical. Always aim for O(N) or O(log N) where possible, leveraging hash maps to trade space for linear time. Launch our Mock Interview Arena to practice live!",
      "For algorithmic problems, start by clarifying edge cases, state brute force O(N^2), then optimize with sliding windows, two pointers, or memoization. You can test your code in our Interview Arena.",
    ],
  },
  {
    id: 'system_design', w: 2.5,
    any: ['system design', 'architecture', 'scalability', 'microservices', 'distributed systems', 'load balancer', 'caching', 'redis', 'kafka'],
    replies: [
      "High-scale system design centers on decoupling and eliminating single points of failure. Use load balancers, write-through or cache-aside Redis layers, and asynchronous event streams with Kafka.",
      "When designing distributed systems, start with capacity estimations, define clear API contracts, discuss CAP theorem trade-offs, and establish idempotency for all mutating endpoints.",
    ],
  },
  {
    id: 'career_tips', w: 2.2,
    any: ['career advice', 'how to get hired', 'salary', 'negotiation', 'job search', 'promotion', 'interview tips'],
    replies: [
      "The highest-leverage interview technique is the STAR method with quantifiable business outcomes: quantify latency saved, revenue unlocked, or team velocity boosted. Also check our 8-Stage Career Discovery Studio!",
      "Focus on roles that align with high-demand tech stacks. Tailor your resume to the exact Job Description requirements using our targeted JD Mock Interview feature in the dock.",
    ],
  },
];

const FALLBACK = [
  "I'm processing that with my local career intelligence. You can ask me technical interview questions, architecture trade-offs, or have me critique your resume!",
  "That's a thoughtful question. I'm focusing our session on technical mock interviews, system design, and career discovery.",
  "Understood. Ask me anything about data structures, system design, coding challenges, or let me guide your technical interview round.",
];

const FOLLOWUP = [
  "Anything else?",
  "What next?",
  "Try 'cyberpunk' if you want the room to change mood.",
  "Ask me to smile — it's my one party trick.",
];

export class LocalBrain {
  constructor() {
    this.state = { last: {}, turns: 0, name: null };
    this.resume = null;
  }

  setUser(user) {
    this.user = user;
    if (user?.name) {
      this.state.name = user.firstName || user.name.split(' ')[0];
    }
  }

  setResume(resume) {
    this.resume = resume;
    if (resume?.name && resume.name !== 'Candidate') {
      this.state.name = resume.name.split(' ')[0];
    }
  }

  /** @returns {Promise<string>} */
  async reply(input) {
    const text = ' ' + String(input || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    this.state.turns++;

    // 1. Check if user pasted a skills list or asked to search/extract skills
    const isExplicitSkillsSnippet = /technical skills:|languages:|hobbies\s*:|skills and hobbies|good at canva|learning verilog/i.test(input);
    const isSkillSearchQuery = /(search( the)? skills|find skills|my skills|what are my skills|inspect skills|extract skills|skills list|check skills)/i.test(input);

    if (isExplicitSkillsSnippet || isSkillSearchQuery) {
      return this._handleSkillSearch(input, text);
    }

    // 2. Resume query handling
    const isResumeQuery = /resume|interview|mock interview|my experience|strengths|weaknesses|critique|skill gap|recommend roles|job matches/.test(text);
    if (isResumeQuery) {
      if (!this.resume) {
        return "You haven't uploaded a resume yet! Click the Resume button in the dock or the upload icon in the chat to drop your PDF or DOCX file, and I'll analyze it immediately.";
      }
      return this._handleResumeQuery(text);
    }

    // 3. Name remembering
    const nameMatch = /(?:my name is|i'm|i am|call me)\s+([a-z]{2,20})/.exec(text);
    if (nameMatch && !['not', 'very', 'so', 'just', 'really', 'fine', 'good', 'ok'].includes(nameMatch[1])) {
      this.state.name = nameMatch[1][0].toUpperCase() + nameMatch[1].slice(1);
      return `${this.state.name}. Noted, and I'll hold on to it for as long as this page is open.`;
    }

    // 4. Intent scoring
    let best = null, bestScore = 0;
    for (const intent of INTENTS) {
      let score = 0;
      for (const k of intent.any) {
        if (text.includes(' ' + k + ' ') || text.includes(' ' + k)) {
          score = Math.max(score, intent.w * (1 + k.length / 24));
        }
      }
      if (score > bestScore) { bestScore = score; best = intent; }
    }

    let out;
    if (best) {
      const r = pick(best.replies, this.state, best.id);
      out = typeof r === 'function' ? r() : r;
      if (this.state.name && Math.random() < 0.28 && !out.includes(this.state.name)) {
        out = out.replace(/\.$/, `, ${this.state.name}.`);
      }
    } else if (text.trim().endsWith('?') || /^\s*(what|who|why|how|when|where|is|are|can|do|does)\b/.test(text)) {
      out = pick(FALLBACK, this.state, 'fallback');
    } else {
      out = pick(FALLBACK, this.state, 'fallback');
      if (this.state.turns % 3 === 0) out += ' ' + pick(FOLLOWUP, this.state, 'followup');
    }

    await new Promise((r) => setTimeout(r, 260 + Math.random() * 380));
    return out;
  }

  _handleSkillSearch(rawInput, text) {
    // Parse the input dynamically or fall back to active resume
    const parsedFromInput = analyzeResume(rawInput, 'Input_Skills.txt');
    const resume = (parsedFromInput.skills?.length || parsedFromInput.spokenLanguages?.length || parsedFromInput.hobbies?.length)
      ? parsedFromInput
      : this.resume;

    if (!resume) {
      return "I searched your profile, but no skills or resume are loaded yet. You can paste your skills directly here (e.g., 'Technical Skills: Figma, Verilog, MATLAB') or drop your resume document to inspect!";
    }

    const name = this.state.name || resume.name || 'Candidate';
    const techSkills = resume.skills || [];
    const languages = resume.spokenLanguages || [];
    const hobbies = resume.hobbies || [];

    const parts = [];

    parts.push(`I have scanned and extracted your complete profile:`);

    if (techSkills.length) {
      parts.push(`• Technical & Creative Skills: ${techSkills.join(', ')}`);
    }

    if (languages.length) {
      parts.push(`• Spoken Languages: ${languages.join(', ')}`);
    }

    if (hobbies.length) {
      parts.push(`• Hobbies & Personal Interests: ${hobbies.join(', ')}`);
    }

    // Role synergy synthesis
    const hasDesign = techSkills.some((s) => /canva|figma|design/i.test(s));
    const hasHardware = techSkills.some((s) => /verilog|matlab|embedded|vlsi/i.test(s));
    const hasWriting = techSkills.some((s) => /writing|research/i.test(s));

    if (hasDesign && hasHardware && hasWriting) {
      parts.push(`\nCareer Insight: You have a rare and high-value hybrid profile bridging Digital Hardware (Verilog, MATLAB), UI/Visual Design (Canva, Figma), and Technical Communication (Research & Writing). This uniquely positions you for Hardware Product Management, Technical Research & Documentation, or Embedded Systems UX Design!`);
    } else if (hasHardware) {
      parts.push(`\nCareer Insight: Your foundation in Verilog and MATLAB makes you well-suited for VLSI Design, FPGA Development, and Signal Processing roles.`);
    }

    parts.push(`\nWould you like to practice a mock interview question on ${techSkills[0] || 'your core skills'}, or explore tailored career pathways?`);

    return parts.join('\n');
  }

  _handleResumeQuery(text) {
    const r = this.resume;
    const name = this.state.name || r.name || 'there';
    const topSkills = r.skills?.slice(0, 4).join(', ') || 'modern engineering';
    const firstSkill = r.skills?.[0] || 'your core stack';
    const secondSkill = r.skills?.[1] || 'system design';

    if (/interview|question|quiz|test me/.test(text)) {
      const questions = [
        `Let's begin the interview, ${name}. Given your track record with ${firstSkill} and ${secondSkill}, how do you approach diagnosing performance bottlenecks under heavy concurrent load?`,
        `Here is a behavioral scenario for you: Tell me about an ambitious project where you had to push forward with ${firstSkill} while navigating tight deadlines and legacy constraints.`,
        `Technical challenge: Walk me through how you would architect a fault-tolerant, low-latency system using ${topSkills}. What tradeoffs would you make?`,
        `Let's test deep system intuition: In your experience with ${firstSkill}, how do you ensure reliability and precision during complex project executions?`
      ];
      return pick(questions, this.state, 'res_interview');
    }

    if (/critique|review|improve|feedback|suggestions/.test(text)) {
      return `I've audited your profile, ${name}. Your profile stands out with an estimated ${r.atsScore}% ATS readiness and ${r.skills?.length || 0} recognized skills. My top suggestion: ensure every bullet point pairs technical tools like ${firstSkill} with hard quantifiable metrics, such as percentage gains in efficiency or latency.`;
    }

    if (/strength|skills|good at|tech stack|technologies/.test(text)) {
      return `Your strongest assets are your versatility across ${r.skills?.length || 0} skills, particularly ${topSkills}. You have a compelling profile for ${r.headline} positions.`;
    }

    if (/gap|missing|learn|next|senior|staff/.test(text)) {
      return `To advance from your current standing, focus on demonstrating high-level project architecture, cross-functional research, and mentorship alongside your strong proficiency in ${firstSkill}.`;
    }

    if (/role|jobs|apply|match/.test(text)) {
      return `Based on your skillset in ${topSkills}, your strongest target matches are ${r.headline}, Product Specialist, or Technical Systems Lead at modern engineering companies.`;
    }

    return `I have your active profile loaded, ${name}. You have ${r.skills?.length || 0} detected skills including ${topSkills}. Ask me to conduct a mock interview, critique your resume, or analyze your strengths!`;
  }
}
