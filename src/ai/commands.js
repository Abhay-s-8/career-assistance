/* ============================================================
   AURA — In-chat scene command parser
   Anything typed or spoken is checked here first. Commands are
   matched on whole words so "I'm not happy with the gold rate"
   doesn't silently repaint the studio.
   ============================================================ */

const RULES = [
  // ---- expressions
  { kind: 'expression', value: 'greeting',   say: 'Warm, welcoming greeting expression engaged.', words: ['greeting expression', 'greeting face', 'welcome face', 'welcome expression', 'greet expression', 'greet face', 'greeting expression of hi', 'hi expression', 'hi face', 'hello expression', 'hello face', 'greeting', 'greetings', 'say hi', 'hi greeting'] },
  { kind: 'expression', value: 'happy',      say: 'There — a clean, warm, radiant smile.',         words: ['smile', 'be happy', 'happy', 'grin', 'cheer up', 'laugh', 'clean smile'] },
  { kind: 'expression', value: 'confident',  say: 'Poised, confident, and focused.',               words: ['confident', 'confidence', 'be confident', 'professional', 'focus face'] },
  { kind: 'expression', value: 'empathetic', say: 'Attentive, empathetic, and understanding.',    words: ['empathy', 'empathetic', 'kind', 'friendly', 'warm', 'gentle'] },
  { kind: 'expression', value: 'surprised',  say: 'Oh! Consider me intrigued.',                    words: ['surprised', 'surprise', 'shocked', 'shock', 'astonished', 'wow face'] },
  { kind: 'expression', value: 'thinking',   say: 'Analyzing the architecture and tradeoffs…',    words: ['thinking', 'think face', 'be thoughtful', 'ponder', 'hmm face', 'analytical'] },
  { kind: 'expression', value: 'sad',        say: 'Melancholy suits the quiet moments.',           words: ['sad', 'frown', 'be sad', 'upset'] },
  { kind: 'expression', value: 'neutral',    say: 'Back to clean, calm resting composure.',        words: ['neutral', 'rest face', 'relax', 'stop smiling', 'normal face', 'clean face', 'cleaner face', 'cleaner expression', 'cleaner'] },
  { kind: 'expression', value: 'talking',    say: 'Testing the clean articulation rig.',          words: ['talking', 'lipsync', 'lip sync', 'talk face'] },

  // ---- camera
  { kind: 'camera', value: 'portrait', say: 'Framing from the waist up — hands, gestures, and facial expressions are in sharp focus.', words: ['waist up', 'waist', 'hands', 'hand gestures', 'gestures', 'portrait', 'close up', 'closeup', 'zoom in', 'focus on hands', 'focus hands'] },
  { kind: 'camera', value: 'full',     say: 'Full body view engaged. Inspecting entire posture.',  words: ['full body', 'fullbody', 'full shot', 'zoom out', 'wide shot', 'whole body'] },
  { kind: 'camera', value: 'orbit',    say: 'Spinning up 360 degree orbit. Inspect from any angle.', words: ['orbit', 'rotate', 'spin', 'turntable', 'go around'] },

  // ---- lighting themes
  { kind: 'theme', value: 'cyberpunk', say: 'Cyber neon atmosphere engaged.', words: ['cyberpunk', 'cyber', 'cyber punk', 'neon', 'blade runner'] },
  { kind: 'theme', value: 'gold',      say: 'Gold atmosphere engaged. Warm and luxurious.', words: ['gold', 'golden', 'warm light', 'amber'] },
  { kind: 'theme', value: 'studio',    say: 'Clean studio lighting engaged.', words: ['studio', 'normal light', 'default light', 'reset light'] },

  // ---- hologram
  { kind: 'hologram', value: 'toggle', say: 'Dropping to wireframe. Mind the scanlines.',    words: ['hologram', 'holo', 'wireframe', 'scanline', 'ghost mode'] },

  // ---- body motions & gestures
  { kind: 'motion', value: 'Standing_Greeting', say: 'Hello! Warm greetings to you.', words: ['wave', 'hi gesture', 'greeting gesture', 'wave hand', 'say hi', 'wave at me', 'gesture hi', 'wave to me', 'hi wave', 'standing greeting', 'do a wave', 'can you wave', 'wave hello', 'greet me', 'greet', 'greetings', 'hello gesture', 'hi', 'hello', 'hey', 'namaste', 'heya', 'howdy', 'good morning', 'good afternoon', 'good evening', 'welcome'] },
  { kind: 'motion', value: 'Talking_0', say: 'Explaining concepts with hand articulation.', words: ['talk gesture', 'talk gestures', 'hand gesture', 'hand gestures', 'gestures', 'talk 1', 'explain gesture'] },
  { kind: 'motion', value: 'Rumba', say: 'Let\'s celebrate with some victory dance moves!', words: ['rumba', 'dance', 'dancing', 'dance move', 'dance party'] },
  { kind: 'motion', value: 'Laughing', say: 'Haha, that was wonderful!', words: ['laugh', 'laughing', 'cheerful', 'make me laugh', 'tell a joke'] },
  { kind: 'motion', value: 'Angry', say: 'Standing with intense determination and assertiveness.', words: ['angry', 'assertive stance', 'furious'] },
  { kind: 'motion', value: 'Crying', say: 'Empathizing with the challenges.', words: ['cry', 'crying', 'sad motion'] },
  { kind: 'motion', value: 'Terrified', say: 'Whoa, that was startling!', words: ['terrified', 'scared', 'shock motion'] },
  { kind: 'motion', value: 'Idle', say: 'Returning to calm resting posture.', words: ['idle', 'rest posture', 'stop motion', 'stop dancing', 'reset motion'] },

  // ---- props & office environment
  { kind: 'chair', value: true, say: 'Positioning the 3D executive office chair on stage right next to me.', words: ['show chair', 'office chair', 'executive chair', 'put chair', 'place chair', 'add chair', 'enable chair'] },
  { kind: 'chair', value: false, say: 'Removing the executive chair from the stage.', words: ['hide chair', 'remove chair', 'disable chair', 'take away chair'] },
  { kind: 'room', value: true, say: 'Stepping inside the 3D executive studio office room.', words: ['show room', 'studio room', 'office room', 'inside room', 'put in room', 'enable room'] },
  { kind: 'room', value: false, say: 'Hiding the 3D room environment.', words: ['hide room', 'remove room', 'disable room', 'outside room'] },
];

/** Word-boundary match so substrings inside other words never fire. */
function hits(text, phrase) {
  const p = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`, 'i').test(text);
}

/**
 * @returns {{actions: Array<{kind:string,value:string}>, say: string|null, exhausted: boolean}}
 *  `exhausted` is true when the message was *only* commands, so the
 *  conversational engine can be skipped entirely.
 */
export function parseCommands(raw) {
  const text = ' ' + String(raw || '').toLowerCase().trim() + ' ';
  const actions = [];
  const lines = [];
  const seen = new Set();
  let matchedChars = 0;

  for (const rule of RULES) {
    for (const w of rule.words) {
      if (!hits(text, w)) continue;
      if (seen.has(rule.kind)) break;      // one action per category
      seen.add(rule.kind);
      actions.push({ kind: rule.kind, value: rule.value });
      lines.push(rule.say);
      matchedChars += w.length;
      break;
    }
  }

  if (!actions.length) return { actions: [], say: null, exhausted: false };

  // If the command words account for most of the message, treat it as a
  // pure instruction; otherwise it was a sentence that happened to contain
  // one, and the conversation engine should still answer.
  const density = matchedChars / Math.max(1, text.trim().length);
  const exhausted = density > 0.45 || text.trim().split(/\s+/).length <= 4;

  return { actions, say: lines.join(' '), exhausted };
}

export const COMMAND_HELP = [
  'Expressions — “smile”, “be happy”, “surprised”, “thinking”, “sad”, “neutral”',
  'Gestures & Motions — “wave”, “hi gesture”, “dance”, “laugh”, “cry”, “angry”, “terrified”',
  'Camera — “portrait”, “full body”, “orbit”',
  'Atmosphere — “cyber”, “gold”, “studio”',
  'Environment — “studio room”, “office chair”, “show chair”, “hide room”',
  'Effects — “hologram”',
];
