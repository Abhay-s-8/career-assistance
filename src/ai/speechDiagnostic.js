/* ============================================================
   AURA / AKSHAY — Speech, Delivery & Articulation Diagnostics
   Analyzes candidate spoken (or transcribed) interview responses
   for verbal crutches (filler words), pacing (WPM), STAR method
   structuring, conciseness, and technical precision.
   ============================================================ */

/** Common verbal crutches / filler words and phrases */
const FILLER_PATTERNS = [
  { word: 'um', regex: /\b(um+)\b/gi },
  { word: 'uh', regex: /\b(uh+)\b/gi },
  { word: 'like', regex: /\b(like)\b/gi },
  { word: 'you know', regex: /\b(you know)\b/gi },
  { word: 'basically', regex: /\b(basically)\b/gi },
  { word: 'actually', regex: /\b(actually)\b/gi },
  { word: 'literally', regex: /\b(literally)\b/gi },
  { word: 'kind of', regex: /\b(kind of|kinda)\b/gi },
  { word: 'sort of', regex: /\b(sort of)\b/gi },
  { word: 'i mean', regex: /\b(i mean)\b/gi },
  { word: 'so yeah', regex: /\b(so yeah)\b/gi },
  { word: 'right?', regex: /\b(right\?)\b/gi }
];


const STAR_MARKERS = {
  situation: [
    'at my previous', 'at my current', 'in my last project', 'we were working on',
    'the problem was', 'the context was', 'the situation was', 'initially', 'at that time',
    'our team faced', 'the company needed', 'the client had'
  ],
  task: [
    'my goal was', 'my task was', 'my objective was', 'i was responsible for',
    'i was assigned to', 'the requirement was', 'we needed to ensure', 'what needed to be done'
  ],
  action: [
    'i decided to', 'i architected', 'i implemented', 'i designed', 'i led',
    'i optimized', 'i investigated', 'i spearheaded', 'i wrote', 'i deployed',
    'i configured', 'i refactored', 'i proposed', 'i benchmarked'
  ],
  result: [
    'as a result', 'the outcome was', 'we achieved', 'reduced', 'increased',
    'improved', 'saved', 'percent', '%', 'ms', 'seconds', 'latency',
    'revenue', 'million', 'throughput', 'successfully delivered'
  ]
};

/**
 * Analyzes candidate verbal/written response delivery.
 * @param {string} text - Candidate's verbal transcription or written response
 * @param {number} durationSeconds - Time spent answering in seconds
 * @returns {object} Speech diagnostic report
 */
export function analyzeSpeechDelivery(text = '', durationSeconds = 60) {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    return {
      wordCount: 0,
      wpm: 0,
      pacingVerdict: 'No Speech Detected',
      pacingScore: 0,
      fillerCount: 0,
      fillerRate: 0,
      fillersFound: [],
      starScore: 0,
      starBreakdown: { situation: false, task: false, action: false, result: false },
      quantifiableMetricsFound: [],
      concisenessScore: 0,
      concisenessVerdict: 'Incomplete',
      coachingFeedback: 'No verbal answer was submitted to analyze.'
    };
  }

  // 1. Word Count & Words Per Minute (WPM)
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const safeDurationMinutes = Math.max(0.15, (durationSeconds || 45) / 60);
  const wpm = Math.round(wordCount / safeDurationMinutes);

  let pacingVerdict = 'Optimal Pacing';
  let pacingScore = 10;
  if (wpm < 100) {
    pacingVerdict = 'Hesitant / Too Slow (<100 WPM)';
    pacingScore = 6;
  } else if (wpm >= 100 && wpm < 125) {
    pacingVerdict = 'Deliberate / Slightly Slow (100–125 WPM)';
    pacingScore = 8;
  } else if (wpm >= 125 && wpm <= 165) {
    pacingVerdict = 'Optimal Professional Cadence (125–165 WPM)';
    pacingScore = 10;
  } else if (wpm > 165 && wpm <= 190) {
    pacingVerdict = 'Brisk / Slightly Fast (165–190 WPM)';
    pacingScore = 8;
  } else {
    pacingVerdict = 'Rushed / Too Fast (>190 WPM)';
    pacingScore = 5;
  }

  // 2. Filler Word Detection
  const fillersFound = [];
  let totalFillers = 0;

  for (const { word, regex } of FILLER_PATTERNS) {
    const matches = cleaned.match(regex);
    if (matches && matches.length > 0) {
      fillersFound.push({ word, count: matches.length });
      totalFillers += matches.length;
    }
  }

  // Filler density: count per 100 words
  const fillerRate = Number(((totalFillers / Math.max(1, wordCount)) * 100).toFixed(1));
  let fillerScore = 10;
  if (fillerRate > 5) fillerScore = 5;
  else if (fillerRate > 3) fillerScore = 7;
  else if (fillerRate > 1) fillerScore = 8.5;

  // 3. STAR Method Structure Analysis
  const lower = cleaned.toLowerCase();
  const starBreakdown = {
    situation: STAR_MARKERS.situation.some((m) => lower.includes(m)),
    task: STAR_MARKERS.task.some((m) => lower.includes(m)),
    action: STAR_MARKERS.action.some((m) => lower.includes(m)),
    result: STAR_MARKERS.result.some((m) => lower.includes(m))
  };

  // Quantifiable metrics search (e.g. "30%", "200ms", "$50k", "3x")
  const metricRegex = /\b(\d+(?:\.\d+)?(?:%|ms|x|k|m|s|gb|tb)?|\$\d+)\b/gi;
  const rawMetrics = cleaned.match(metricRegex) || [];
  const quantifiableMetrics = Array.from(new Set(rawMetrics.filter((m) => /\d/.test(m)))).slice(0, 4);

  let starScore = 0;
  if (starBreakdown.situation) starScore += 2;
  if (starBreakdown.task) starScore += 2;
  if (starBreakdown.action) starScore += 3;
  if (starBreakdown.result) starScore += 3;
  if (quantifiableMetrics.length > 0) starScore = Math.min(10, starScore + 1);

  // 4. Conciseness vs. Rambling Quotient
  let concisenessScore = 9;
  let concisenessVerdict = 'Crisp & Direct';
  if (durationSeconds > 180 && wordCount < 120) {
    concisenessVerdict = 'Long Pauses / Stalling';
    concisenessScore = 5;
  } else if (durationSeconds > 180 && wordCount > 450) {
    concisenessVerdict = 'Rambling (>3 mins)';
    concisenessScore = 6;
  } else if (wordCount < 30) {
    concisenessVerdict = 'Too Brief / Underspecified';
    concisenessScore = 5;
  }

  // 5. Coaching Feedback Synthesis
  const coachingTips = [];
  if (totalFillers >= 4) {
    coachingTips.push(`Detected ${totalFillers} verbal crutches (mostly "${fillersFound[0]?.word}"). Practice silent micro-pauses instead of voicing filler sounds.`);
  } else {
    coachingTips.push('Clean vocabulary with minimal verbal filler crutches.');
  }

  if (pacingVerdict.includes('Fast')) {
    coachingTips.push('You spoke briskly—take a deep breath between conceptual points so the interviewer can absorb your architecture.');
  } else if (pacingVerdict.includes('Slow')) {
    coachingTips.push('Your delivery had hesitant pauses. Structure thoughts in bullet points before speaking.');
  } else {
    coachingTips.push('Excellent conversational cadence and tempo.');
  }

  if (!starBreakdown.result || quantifiableMetrics.length === 0) {
    coachingTips.push('Missing quantifiable impact: Always conclude with a measurable result (e.g., "reduced latency by 40%", "shipped 2 weeks early").');
  } else {
    coachingTips.push(`Strong outcome orientation—you backed up your answer with concrete metrics (${quantifiableMetrics.join(', ')}).`);
  }

  return {
    wordCount,
    durationSeconds,
    wpm,
    pacingVerdict,
    pacingScore,
    fillerCount: totalFillers,
    fillerRate,
    fillersFound,
    fillerScore,
    starScore,
    starBreakdown,
    quantifiableMetrics,
    concisenessScore,
    concisenessVerdict,
    overallDeliveryScore: Math.round((pacingScore * 0.3 + fillerScore * 0.3 + starScore * 0.4) * 10) / 10,
    coachingFeedback: coachingTips.join(' ')
  };
}
