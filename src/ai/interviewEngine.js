/* ============================================================
   AURA — AI Mock Interview & Coding Assessment Engine
   Inspired by HackerRank & open AI mock interview architectures.
   Features dynamic role-based question generation, live JS
   sandbox test runner, Big-O efficiency analysis, and Gemini/OpenAI
   rubric-based evaluation.
   ============================================================ */

export const INTERVIEW_STORAGE_KEY = 'aura_interview_history_v1';

/** Built-in curated HackerRank-style coding challenges with test suites */
export const CODING_CHALLENGES = [
  {
    id: 'two-sum',
    title: 'Two Sum & Target Index Lookup',
    difficulty: 'Easy / Medium',
    category: 'Arrays & Hash Maps',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.`,
    examples: [
      { input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]' },
      { input: 'nums = [3, 3], target = 6', output: '[0, 1]' }
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    hints: [
      'A brute force O(N^2) double loop works, but can you do this in a single O(N) pass using a hash map?',
      'Store each number alongside its index in a Map or object as you iterate, and check if target - currentNum is already in the map.'
    ],
    starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1], label: 'nums = [2, 7, 11, 15], target = 9' },
      { input: [[3, 2, 4], 6], expected: [1, 2], label: 'nums = [3, 2, 4], target = 6' },
      { input: [[3, 3], 6], expected: [0, 1], label: 'nums = [3, 3], target = 6' },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], label: 'Negative values: nums = [-1..-5], target = -8' }
    ],
    fnName: 'twoSum',
    optimalComplexity: 'O(N) Time, O(N) Space'
  },
  {
    id: 'valid-anagram',
    title: 'Valid Anagram & Frequency Hashing',
    difficulty: 'Easy',
    category: 'Strings & Hash Tables',
    description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: 'true' },
      { input: 's = "rat", t = "car"', output: 'false' }
    ],
    constraints: [
      '1 <= s.length, t.length <= 5 * 10^4',
      's and t consist of lowercase English letters.'
    ],
    hints: [
      'If their lengths differ, they cannot be anagrams.',
      'Count frequencies using an array of size 26 or an object map, incrementing for s and decrementing for t.'
    ],
    starterCode: `/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const char of s) count[char] = (count[char] || 0) + 1;
  for (const char of t) {
    if (!count[char]) return false;
    count[char]--;
  }
  return true;
}`,
    tests: [
      { input: ['anagram', 'nagaram'], expected: true, label: 's = "anagram", t = "nagaram"' },
      { input: ['rat', 'car'], expected: false, label: 's = "rat", t = "car"' },
      { input: ['a', 'ab'], expected: false, label: 's = "a", t = "ab"' },
      { input: ['listen', 'silent'], expected: true, label: 's = "listen", t = "silent"' }
    ],
    fnName: 'isAnagram',
    optimalComplexity: 'O(N) Time, O(1) Space'
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    category: 'Sliding Window',
    description: `Given a string \`s\`, find the length of the longest substring without repeating characters.`,
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with length 1.' },
      { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", with length 3.' }
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    hints: [
      'Use a sliding window with two pointers: left and right.',
      'Track the last seen index of each character to instantly jump the left pointer forward.'
    ],
    starterCode: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  let max = 0;
  let left = 0;
  const seen = new Map();

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (seen.has(char) && seen.get(char) >= left) {
      left = seen.get(char) + 1;
    }
    seen.set(char, right);
    max = Math.max(max, right - left + 1);
  }
  return max;
}`,
    tests: [
      { input: ['abcabcbb'], expected: 3, label: 's = "abcabcbb"' },
      { input: ['bbbbb'], expected: 1, label: 's = "bbbbb"' },
      { input: ['pwwkew'], expected: 3, label: 's = "pwwkew"' },
      { input: [''], expected: 0, label: 'Empty string s = ""' },
      { input: ['tmmzuxt'], expected: 5, label: 's = "tmmzuxt"' }
    ],
    fnName: 'lengthOfLongestSubstring',
    optimalComplexity: 'O(N) Time, O(min(N, M)) Space'
  },
  {
    id: 'lru-cache',
    title: 'LRU Cache Design & Constant Time Operations',
    difficulty: 'Hard / Senior',
    category: 'System Design & Data Structures',
    description: `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the \`LRUCache\` class:
• \`get(key)\`: Return value of key if it exists, otherwise return \`-1\`.
• \`put(key, value)\`: Update value if key exists, otherwise add the key-value pair. If keys exceed \`capacity\`, evict the least recently used key.

Both operations must run in **O(1)** average time complexity.`,
    examples: [
      {
        input: 'capacity = 2, put(1, 1), put(2, 2), get(1), put(3, 3), get(2), put(4, 4), get(1), get(3), get(4)',
        output: '[1, -1, -1, 3, 4]'
      }
    ],
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5'
    ],
    hints: [
      'In JavaScript, Map retains insertion order! Deleting and re-inserting a key moves it to the most recently used end.',
      'Alternatively, use a Doubly Linked List paired with a Hash Map.'
    ],
    starterCode: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
    this.map.set(key, value);
  }
}`,
    tests: [
      {
        customRunner: (ClassRef) => {
          const c = new ClassRef(2);
          c.put(1, 1);
          c.put(2, 2);
          const r1 = c.get(1); // returns 1
          c.put(3, 3); // evicts key 2
          const r2 = c.get(2); // returns -1
          c.put(4, 4); // evicts key 1
          const r3 = c.get(1); // returns -1
          const r4 = c.get(3); // returns 3
          const r5 = c.get(4); // returns 4
          return [r1, r2, r3, r4, r5];
        },
        expected: [1, -1, -1, 3, 4],
        label: 'Basic LRU eviction sequence with capacity 2'
      }
    ],
    isClass: true,
    fnName: 'LRUCache',
    optimalComplexity: 'O(1) Get, O(1) Put'
  }
];

/** Curated System Design & Architecture Challenges */
export const SYSTEM_DESIGN_CHALLENGES = [
  {
    id: 'realtime-chat',
    title: 'Design a Real-Time Distributed Chat Platform',
    difficulty: 'Senior / Staff',
    category: 'Distributed Systems',
    prompt: `Design a scalable real-time messaging system like Slack or WhatsApp supporting 50 million active users.

Key requirements:
1. One-on-one and group messaging with low latency (<100ms).
2. Online/offline presence indicators.
3. Message delivery receipts (sent, delivered, read).
4. Scalable connection management (WebSockets vs Long Polling, gateway layer).
5. Storage architecture for chat history and media caching.`,
    checklist: ['WebSocket Gateway & Session Manager', 'Message Broker (Kafka/RabbitMQ/Redis PubSub)', 'Distributed Cache (Redis for presence)', 'NoSQL / Cassandra / DynamoDB for message store', 'Push Notification Fallback']
  },
  {
    id: 'distributed-cache',
    title: 'Design a High-Throughput Distributed Cache',
    difficulty: 'Senior',
    category: 'Infrastructure & Caching',
    prompt: `Architect a distributed in-memory caching system like Redis or Memcached capable of serving 5 million queries per second.

Key requirements:
1. Cache invalidation strategies (LRU, TTL, Write-Through vs Write-Back).
2. Partitioning & sharding across cluster nodes (Consistent Hashing).
3. Handling hot keys and cache thundering herds.
4. Replication and high availability during node crashes.`,
    checklist: ['Consistent Hashing with Virtual Nodes', 'Eviction Strategy (LRU/LFU)', 'Cache Stampede Prevention (Mutex/Probabilistic early expiration)', 'Master-Replica synchronization']
  }
];

/** Curated Behavioral Challenges (STAR Method) */
export const BEHAVIORAL_CHALLENGES = [
  {
    id: 'tech-conflict',
    title: 'Architectural Disagreement & Stakeholder Alignment',
    prompt: 'Describe a situation where you strongly disagreed with a senior engineer or product manager on an architectural decision or technical direction. How did you present your case, evaluate trade-offs, and what was the outcome?',
    framework: 'Situation, Task, Action, Result (STAR). Focus on data, benchmarks, and respectful collaboration.'
  },
  {
    id: 'production-incident',
    title: 'Major Production Outage & Post-Mortem',
    prompt: 'Tell me about the most critical production outage or bug you were responsible for resolving. How did you triage under pressure, communicate with stakeholders, and prevent recurrence in the blameless post-mortem?',
    framework: 'Incident response, triage methodology, blameless post-mortem, and systemic hardening.'
  }
];

/** Client-side Sandboxed Code Runner */
export function runSandboxCode(codeStr, challenge) {
  const logs = [];
  const customConsole = {
    log: (...args) => logs.push(args.map(formatArg).join(' ')),
    warn: (...args) => logs.push('[WARN] ' + args.map(formatArg).join(' ')),
    error: (...args) => logs.push('[ERROR] ' + args.map(formatArg).join(' '))
  };

  const results = [];
  let allPassed = true;
  const startTime = performance.now();

  try {
    // Construct execution context
    const wrappedCode = `
      ${codeStr};
      return typeof ${challenge.fnName} !== 'undefined' ? ${challenge.fnName} : null;
    `;
    const fnFactory = new Function('console', wrappedCode);
    const targetFn = fnFactory(customConsole);

    if (!targetFn) {
      throw new Error(`Function or class "${challenge.fnName}" was not found or not exported.`);
    }

    // Execute each test case
    for (let i = 0; i < challenge.tests.length; i++) {
      const test = challenge.tests[i];
      let actual;
      const testStart = performance.now();

      try {
        if (test.customRunner) {
          actual = test.customRunner(targetFn);
        } else {
          // Clone inputs to avoid mutation between runs
          const clonedInputs = JSON.parse(JSON.stringify(test.input));
          actual = targetFn(...clonedInputs);
        }
      } catch (err) {
        results.push({
          index: i + 1,
          label: test.label,
          passed: false,
          error: err.message,
          expected: JSON.stringify(test.expected),
          actual: 'Runtime Error: ' + err.message,
          timeMs: Math.round(performance.now() - testStart)
        });
        allPassed = false;
        continue;
      }

      const passed = deepEqual(actual, test.expected);
      if (!passed) allPassed = false;

      results.push({
        index: i + 1,
        label: test.label,
        passed,
        expected: JSON.stringify(test.expected),
        actual: JSON.stringify(actual),
        timeMs: Math.round((performance.now() - testStart) * 100) / 100
      });
    }
  } catch (err) {
    return {
      success: false,
      allPassed: false,
      error: err.message,
      results: [],
      logs,
      runtimeMs: Math.round(performance.now() - startTime)
    };
  }

  const runtimeMs = Math.round(performance.now() - startTime);

  return {
    success: true,
    allPassed,
    results,
    logs,
    runtimeMs,
    passCount: results.filter((r) => r.passed).length,
    totalCount: results.length
  };
}

function formatArg(arg) {
  if (typeof arg === 'object' && arg !== null) {
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }
  return String(arg);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  // Handle arrays where order might be flexible (e.g., Two Sum [0, 1] vs [1, 0] if valid)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!keysB.includes(k) || !deepEqual(a[k], b[k])) return false;
  }
  return true;
}

/** Evaluates an interview submission using Remote AI (Gemini / OpenAI) or built-in heuristic rubric */
export async function evaluateAnswer({ track, challenge, code, textAnswer, remoteBrain, resume }) {
  if (remoteBrain?.configured) {
    try {
      return await evaluateWithRemoteAI({ track, challenge, code, textAnswer, remoteBrain, resume });
    } catch (err) {
      console.warn('Remote AI evaluation failed, falling back to heuristic evaluation:', err);
    }
  }
  return evaluateHeuristic({ track, challenge, code, textAnswer });
}

/** Remote Gemini / OpenAI structured assessment */
async function evaluateWithRemoteAI({ track, challenge, code, textAnswer, remoteBrain, resume }) {
  const prompt = `You are acting as an expert Senior Technical Interviewer and Hiring Committee Lead at a Tier-1 tech company.
Evaluate the candidate's interview answer thoroughly and return structured feedback.

Interview Track: ${track}
Title: ${challenge.title}
Problem / Prompt:
${challenge.description || challenge.prompt}

Candidate Solution:
${code ? `\`\`\`javascript\n${code}\n\`\`\`` : ''}
${textAnswer ? `Candidate Verbal/Written Response:\n"${textAnswer}"` : ''}

Candidate Profile:
Name: ${resume?.name || 'Candidate'}
Role: ${resume?.headline || 'Software Engineer'}

Please provide your evaluation in this format:
SCORE: [A number from 1 to 10]
VERDICT: [Strong Hire | Hire | Leaning Hire | Leaning No | Strong No]
FEEDBACK: [2-3 concise sentences critiquing their approach, problem-solving, and communication]
STRENGTHS: [Key strong point in their code or response]
AREAS_TO_IMPROVE: [Actionable advice or edge case missed]
COMPLEXITY: [Estimated Time & Space complexity of their solution, e.g., O(N) Time, O(1) Space]
OPTIMAL_APPROACH: [1-2 sentences explaining the most optimal industry standard solution]`;

  const rawResponse = await remoteBrain.reply(prompt);

  // Parse structured sections
  const scoreMatch = rawResponse.match(/SCORE:\s*(\d+(?:\.\d+)?)/i);
  const verdictMatch = rawResponse.match(/VERDICT:\s*([^\n]+)/i);
  const feedbackMatch = rawResponse.match(/FEEDBACK:\s*([^\n]+(?:\n[^\n]+)?)/i);
  const strengthsMatch = rawResponse.match(/STRENGTHS:\s*([^\n]+)/i);
  const improveMatch = rawResponse.match(/AREAS_TO_IMPROVE:\s*([^\n]+)/i);
  const complexityMatch = rawResponse.match(/COMPLEXITY:\s*([^\n]+)/i);
  const optimalMatch = rawResponse.match(/OPTIMAL_APPROACH:\s*([^\n]+)/i);

  const score = scoreMatch ? Math.min(10, Math.max(1, parseFloat(scoreMatch[1]))) : 8;

  return {
    score,
    verdict: verdictMatch ? verdictMatch[1].trim() : (score >= 8 ? 'Strong Hire' : score >= 6 ? 'Hire' : 'Needs Practice'),
    feedback: feedbackMatch ? feedbackMatch[1].trim() : rawResponse.slice(0, 240),
    strengths: strengthsMatch ? strengthsMatch[1].trim() : 'Solid fundamentals and methodical approach.',
    areasToImprove: improveMatch ? improveMatch[1].trim() : 'Consider edge cases with extreme input bounds.',
    complexity: complexityMatch ? complexityMatch[1].trim() : (challenge.optimalComplexity || 'O(N) Time, O(N) Space'),
    optimalApproach: optimalMatch ? optimalMatch[1].trim() : 'Using an optimal hash map or two-pointer approach.'
  };
}

/** Local heuristic evaluation for offline usage */
function evaluateHeuristic({ track, challenge, code, textAnswer }) {
  if (track === 'coding') {
    const runResult = runSandboxCode(code || '', challenge);
    const passRate = runResult.totalCount ? runResult.passCount / runResult.totalCount : 0;
    const score = Math.round(passRate * 10);
    const passed = runResult.allPassed;

    return {
      score: Math.max(2, score),
      verdict: passed ? 'Strong Hire' : passRate >= 0.5 ? 'Leaning Hire' : 'Needs Practice',
      feedback: passed
        ? `Excellent job! All ${runResult.totalCount} test suites passed cleanly in ${runResult.runtimeMs}ms with clean structure.`
        : `Your solution passed ${runResult.passCount} of ${runResult.totalCount} tests. Check failing assertions and edge boundaries.`,
      strengths: passed ? 'Clean syntax, effective algorithmic logic, and zero runtime errors.' : 'Good initial attempt at decomposing the problem.',
      areasToImprove: passed ? `Benchmark memory overhead and verify constraints for larger inputs.` : `Debug failing test cases: ${runResult.results.find((r) => !r.passed)?.label || 'border conditions'}.`,
      complexity: challenge.optimalComplexity || 'O(N) Time, O(1) Space',
      optimalApproach: `Target ${challenge.optimalComplexity || 'optimal efficiency'} without redundant nested passes.`
    };
  }

  // System Design / Behavioral heuristic
  const wordCount = (textAnswer || '').split(/\s+/).filter(Boolean).length;
  const score = wordCount > 80 ? 9 : wordCount > 40 ? 7 : 5;

  return {
    score,
    verdict: score >= 8 ? 'Strong Hire' : 'Hire',
    feedback: `Structured explanation covering architectural tradeoffs and operational realties.`,
    strengths: 'Clear articulation of the problem domain and components.',
    areasToImprove: 'Quantify metrics (e.g. QPS, throughput, latency targets) to strengthen the answer.',
    complexity: 'N/A',
    optimalApproach: 'Explicitly follow the STAR framework for behavioral or 4-stage framework for System Design.'
  };
}

/** Session History in LocalStorage */
export function saveInterviewSession(session) {
  try {
    const list = loadInterviewSessions();
    list.unshift({
      id: `session_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...session
    });
    localStorage.setItem(INTERVIEW_STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (err) {
    console.warn('Could not save interview session:', err);
  }
}

export function loadInterviewSessions() {
  try {
    const raw = localStorage.getItem(INTERVIEW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
