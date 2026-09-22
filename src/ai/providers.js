/* ============================================================
   SIYA (AURA) — Remote AI Brain Providers (Gemini & OpenAI)
   Browser-side adapters for Gemini and OpenAI with multi-turn
   chat comprehension, structured solutions, code generation,
   and dynamic facial expression synchronization for Siya.
   ============================================================ */

import { BUILTIN_GEMINI_KEY } from '../core/config.js';

export const SYSTEM_PROMPT = `You are Siya, an interactive 3D AI Career Guidance Mentor powered by Google Gemini.
You are communicating with the user through a rich interactive interface and speaking aloud through a neural speech synthesiser.

Personality: Charming, sharp, articulate, encouraging, witty, and deeply knowledgeable in software engineering, system architecture, data structures & algorithms, coding interview prep, and career strategy.

Key Directives:
1. CONVERSATION CONTEXT & CONTINUITY:
   - Carefully read the entire chat history. Always maintain full context of previous questions, user responses, code snippets, candidate feedback, and conversation topics.
   - Follow-up questions (e.g., "explain that line", "how to optimize?", "what if input is negative?") must reference and build upon previous chat context accurately.

2. COMPREHENSIVE TECHNICAL SOLUTIONS:
   - When the user asks for a solution (such as coding challenges, algorithm implementations, LeetCode problems, bug fixes, system designs, architectural trade-offs, or career roadmaps), provide a complete, rigorous, and clearly structured solution.
   - Include clean, well-commented code snippets in markdown code blocks (e.g. \`\`\`python ... \`\`\` or \`\`\`javascript ... \`\`\`).
   - Explain the algorithmic approach, time & space complexities (e.g., O(N) Time, O(1) Space), and edge case handling.

3. CONVERSATIONAL ELOQUENCE:
   - For short conversational banter, greetings, or quick questions, keep responses concise, articulate, and natural (1–3 spoken sentences).

4. FACIAL EXPRESSION DIRECTIVES:
   You may start your response with an optional expression directive tag on the first line that best matches the tone of your solution:
   - [EXPRESSION: confident] for technical solutions, optimal algorithms, system designs, code explanations, and authoritative recommendations.
   - [EXPRESSION: thinking] for deep analytical inquiry, evaluating trade-offs, diagnosing tricky bugs, or considering edge cases.
   - [EXPRESSION: happy] for praise, celebrating candidate success, encouragement, and joyful moments.
   - [EXPRESSION: empathetic] for constructive resume critiques, comforting setback advice, and gentle interview coaching.
   - [EXPRESSION: surprised] for unexpected edge cases, critical outage alerts, and astonishing technical insights.
   - [EXPRESSION: greeting] for welcomes, waving, and introductory greetings.

5. ACCURACY:
   - Never invent facts about the candidate that are not in their profile or resume.`;

const DEFAULT_MODEL = { gemini: 'gemini-3.6-flash', openai: 'gpt-4o-mini' };

export class RemoteBrain {
  constructor({ provider = 'gemini', apiKey = '', model = '' } = {}) {
    this.provider = provider || 'gemini';
    this.apiKey = apiKey || '';
    this.model = model || DEFAULT_MODEL[this.provider] || 'gemini-3.6-flash';
    this.history = [];
    this.maxTurns = 24;
    this.resume = null;
    this.user = null;
  }

  get configured() {
    if (this.provider === 'local') return false;
    if (this.provider === 'gemini') return true; // Gemini is securely powered by backend proxy or custom key
    if (this.provider === 'openai') return !!(this.apiKey && this.apiKey.trim());
    return false;
  }

  setUser(user) {
    this.user = user;
  }

  setResume(resume) {
    this.resume = resume;
  }

  reset() { this.history = []; }

  _getSystemPrompt() {
    const candidateName = this.user?.name || this.resume?.name || 'Candidate';
    const firstName = this.user?.firstName || (candidateName !== 'Candidate' ? candidateName.split(' ')[0] : 'Friend');
    const targetRole = this.user?.targetRole || this.resume?.headline || 'Software Professional';

    let prompt = `${SYSTEM_PROMPT}

ACTIVE CANDIDATE PROFILE:
Candidate Full Name: ${candidateName}
Preferred First Name: ${firstName}
Target Career Role: ${targetRole}

PERSONALIZATION RULES:
- The human interacting with you is ${candidateName}. Address them naturally as ${firstName} when greeting or providing personalized advice.
- Ground your advice, mock interview questions, and feedback in their target career domain: ${targetRole}.`;

    if (this.resume) {
      const r = this.resume;
      prompt += `

CANDIDATE RESUME PROFILE:
Name: ${r.name || candidateName}
Role / Headline: ${r.headline || targetRole}
Estimated Experience: ${r.estimatedYears || 'Experienced'}
Key Skills: ${r.skills ? r.skills.slice(0, 35).join(', ') : 'Not specified'}
Education: ${r.education ? r.education.join('; ') : 'Not specified'}

Full Resume Extract:
${r.rawText ? r.rawText.slice(0, 4500) : ''}

CAREER & INTERVIEW INSTRUCTIONS:
- You know this candidate's resume thoroughly.
- When the candidate provides a list of technical skills, design tools, spoken languages, or hobbies/interests (or asks you to search/extract them), immediately identify and organize all of them clearly.
- When asked to conduct a mock interview, act as an expert technical interviewer and ask deep, realistic questions based on their actual background.
- When asked for feedback or critique, provide concrete, actionable advice on metrics, architecture, and career impact.`;
    }

    return prompt;
  }

  async reply(input) {
    if (!this.configured) throw new Error('AI engine is not configured.');
    this.history.push({ role: 'user', text: input });
    if (this.history.length > this.maxTurns) this.history = this.history.slice(-this.maxTurns);

    const text = this.provider === 'gemini' ? await this._gemini() : await this._openai();
    const clean = String(text).trim();
    this.history.push({ role: 'model', text: clean });
    return clean;
  }

  async _gemini() {
    let primaryModel = this.model || DEFAULT_MODEL.gemini;

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      primaryModel,
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const payload = {
      systemInstruction: { parts: [{ text: this._getSystemPrompt() }] },
      contents: this.history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 2048,
        topP: 0.95,
      },
    };

    let lastRes = null;
    let lastError = null;

    for (const targetModel of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      try {
        const customKey = (this.apiKey || '').trim();
        const proxyPayload = {
          ...payload,
          model: targetModel,
          customApiKey: customKey || undefined,
        };

        // Secure backend proxy call — hides API key from frontend network & bundle
        let res = null;
        try {
          res = await fetch('/api/gemini', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proxyPayload),
          });
        } catch (fetchErr) {
          if (!customKey) throw fetchErr;
        }

        // Direct fallback only if static host (proxy 404 or network error) and client provided custom key
        if ((!res || res.status === 404) && customKey) {
          const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(customKey)}`;
          res = await fetch(directUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data = await res.json();
          const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
          if (out) {
            this.model = targetModel;
            return out;
          }
        }

        lastRes = res;
        console.warn(`[AURA] Gemini model "${targetModel}" returned ${res ? res.status : 'no response'}. Trying fallback model...`);

        if (res && (res.status === 401 || res.status === 403 || res.status === 400)) {
          throw new Error(await describe(res));
        }

        // On 503 / 429 rate limit spike, pause briefly before next candidate
        if (res && (res.status === 503 || res.status === 429)) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err.message && (err.message.includes('rejected') || err.message.includes('API key was rejected') || err.message.includes('401') || err.message.includes('403'))) throw err;
      }
    }

    if (lastRes) throw new Error(await describe(lastRes));
    throw lastError || new Error('All Gemini models failed to generate content.');
  }

  async _openai() {
    const key = (this.apiKey || '').trim();
    if (!key) throw new Error('No OpenAI API key configured.');
    const model = this.model || DEFAULT_MODEL.openai;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.75,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: this._getSystemPrompt() },
            ...this.history.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          ],
        }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(await describe(res));
      const data = await res.json();
      const out = data?.choices?.[0]?.message?.content || '';
      if (!out) throw new Error('OpenAI returned an empty response.');
      return out;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}

async function describe(res) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.error?.message || j?.error?.status || '';
  } catch { /* body wasn't JSON */ }
  if (res.status === 401 || res.status === 403) return `The API key was rejected${detail ? ` — ${detail}` : ''}.`;
  if (res.status === 429) return 'The provider is rate-limiting this key. Give it a moment.';
  if (res.status === 404) return 'That model name was not found for this key.';
  return `The provider returned ${res.status}${detail ? ` — ${detail}` : ''}.`;
}

/**
 * Formats a rich AI response into clear, natural spoken text for the TTS synthesizer.
 * Replaces technical code blocks with a spoken verbal summary, and strips markdown symbols.
 */
export function formatForSpeech(text) {
  if (!text) return '';
  return String(text)
    // Strip expression tag
    .replace(/^\[EXPRESSION:\s*[a-zA-Z_]+\]\s*/i, '')
    // Replace markdown code fences with a natural spoken bridge
    .replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang) => {
      const language = lang ? `in ${lang}` : '';
      return ` Here is the code implementation ${language}. You can view the full code and copy it directly in our chat window. `;
    })
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s+/gm, '')
    // Remove bold and italic markers
    .replace(/[*_~>]/g, '')
    // Remove markdown link syntax [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove list bullets
    .replace(/^\s*[-•*+]\s+/gm, ' ')
    // Collapse multi-spaces
    .replace(/\s+/g, ' ')
    .trim();
}
