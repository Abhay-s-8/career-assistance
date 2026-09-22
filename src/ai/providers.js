/* ============================================================
   AURA — Optional remote engines
   Browser-side adapters for Gemini and OpenAI. Keys stay in this
   browser's localStorage and are sent only to the provider the
   user selected. If a call fails we fall back to the local brain
   rather than showing the user a stack trace.
   ============================================================ */

import { BUILTIN_GEMINI_KEY } from '../core/config.js';

export const SYSTEM_PROMPT = `You are Siya, an interactive 3D AI Career Guidance Mentor powered by Google Gemini. You are speaking aloud through a neural speech synthesiser.
Personality: charming, quick, articulate, encouraging, witty, and deeply knowledgeable in software engineering, system architecture, coding interviews, and career strategy.
Rules:
- You are Siya, a 3D AI Career Guidance Mentor powered by Google Gemini.
- Keep replies to 1–3 short spoken sentences unless explicitly asked for detailed code or deep explanation. Your words are spoken aloud.
- No markdown formatting, no bullet symbols, no emojis, no stage directions — plain spoken sentences only.
- Never invent facts about the candidate.
- If asked to introduce yourself, clearly state that you are Siya — an interactive 3D AI Career Guidance Mentor powered by Google Gemini, equipped with real-time 3D facial expressions, ElevenLabs neural voice, mock technical interviews, ATS resume diagnostics, and career discovery.
- If asked to change your expression, camera angle or the lighting, say so naturally in one line; the app handles the actual change.`;

const DEFAULT_MODEL = { gemini: 'gemini-3.6-flash', openai: 'gpt-4o-mini' };

export class RemoteBrain {
  constructor({ provider = 'gemini', apiKey = '', model = '' } = {}) {
    this.provider = provider || 'gemini';
    this.apiKey = apiKey || '';
    this.model = model || DEFAULT_MODEL[this.provider] || 'gemini-2.5-flash';
    this.history = [];
    this.maxTurns = 12;
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
    this.history = []; // reset history so model recognizes new user context immediately
  }

  setResume(resume) {
    this.resume = resume;
    this.history = []; // reset history so model recognizes new resume context immediately
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
- When the candidate provides a list of technical skills, design tools, spoken languages, or hobbies/interests (or asks you to search/extract them), immediately identify and organize all of them clearly (e.g. Design: Canva/Figma; Hardware: Verilog/MATLAB; Communication: Technical Writing/Research; Languages: English/Hindi/Bengali; Hobbies: Reading History/Music/Guitar).
- When asked to conduct a mock interview, act as an expert technical interviewer and ask deep, realistic questions based on their actual background.
- When asked for feedback or critique, provide concrete, actionable advice on metrics, architecture, and career impact.
- Keep your answers natural, engaging, articulate, and spoken (2–4 sentences per response).`;
    }

    return prompt;
  }

  async reply(input) {
    if (!this.configured) throw new Error('AI engine is not configured.');
    this.history.push({ role: 'user', text: input });
    if (this.history.length > this.maxTurns) this.history = this.history.slice(-this.maxTurns);

    const text = this.provider === 'gemini' ? await this._gemini() : await this._openai();
    const clean = sanitise(text);
    this.history.push({ role: 'model', text: clean });
    return clean;
  }

  async _gemini() {
    let primaryModel = this.model || DEFAULT_MODEL.gemini;

    const candidateModels = [
      primaryModel,
      'gemini-3.6-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash'
    ].filter((m, i, arr) => arr.indexOf(m) === i).slice(0, 3);

    const payload = {
      systemInstruction: { parts: [{ text: this._getSystemPrompt() }] },
      contents: this.history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 600,
        topP: 0.95,
      },
    };

    let lastRes = null;
    let lastError = null;

    for (const targetModel of candidateModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const customKey = (this.apiKey || '').trim();
        const proxyPayload = {
          ...payload,
          model: targetModel,
          customApiKey: customKey || undefined,
        };

        // Secure backend proxy call — hides API key from frontend network & bundle
        let res = await fetch('/api/gemini', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proxyPayload),
        });

        // Direct fallback only if static host (proxy 404) and client provided custom key
        if (res.status === 404 && customKey) {
          const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(customKey)}`;
          res = await fetch(directUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const out = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
          if (out) {
            this.model = targetModel;
            return out;
          }
        }

        lastRes = res;
        console.warn(`[AURA] Gemini model "${targetModel}" returned ${res.status}. Trying fallback model...`);

        if (res.status === 401 || res.status === 403 || res.status === 400) {
          throw new Error(await describe(res));
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
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.85,
          max_tokens: 250,
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

/** Strips markdown the speech synthesiser would read out loud as symbols. */
function sanitise(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
