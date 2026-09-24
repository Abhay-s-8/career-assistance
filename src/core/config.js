/* ============================================================
   AURA — central configuration
   One place for every tunable so the rest of the codebase stays
   free of magic numbers.
   ============================================================ */

export const MODEL_URL = `${import.meta.env?.BASE_URL || '/'}models/64f1a714fe61576b46f27ca2.glb`;
export const FALLBACK_MODEL_URL = `${import.meta.env?.BASE_URL || '/'}models/avatar.glb`;
export const ANIMATIONS_URL = `${import.meta.env?.BASE_URL || '/'}models/animations.glb`;
export const GREETING_ANIM_URL = `${import.meta.env?.BASE_URL || '/'}animations/Standing Greeting.fbx`;
export const DEFAULT_DRESS_COLOR = 0x112750; // Executive Navy Blue

/** Supported full-body skeletal animations */
export const ANIMATIONS = [
  { name: 'Idle', label: '🧘 Idle Composure', desc: 'Calm breathing posture' },
  { name: 'Standing_Greeting', label: '👋 Standing Greeting', desc: 'Warm welcoming introduction gesture' },
  { name: 'Talking_0', label: '🗣️ Talk Gestures 1', desc: 'Engaged explanatory hand gestures' },
  { name: 'Talking_1', label: '🗣️ Talk Gestures 2', desc: 'Confident articulation posture' },
  { name: 'Talking_2', label: '🗣️ Talk Gestures 3', desc: 'Dynamic engineering storytelling' },
  { name: 'Laughing', label: '😂 Cheerful Laugh', desc: 'Delighted celebratory reaction' },
  { name: 'Crying', label: '😭 Emotional Reaction', desc: 'Empathetic sorrow' },
  { name: 'Angry', label: '😡 Assertive Stance', desc: 'Intense determination' },
  { name: 'Terrified', label: '😱 Shocked / Surprised', desc: 'Startled reaction' },
  { name: 'Rumba', label: '💃 Rumba Dance', desc: 'Victory celebration moves' },
];

/** Ready Player Me & ARKit Facial Blendshapes dictionary map */
export const ARKIT_EXPRESSIONS = {
  default: {},
  neutral: {},
  greeting: {
    browInnerUp: 0.28,
    eyeSquintLeft: 0.22,
    eyeSquintRight: 0.22,
    mouthSmileLeft: 0.65,
    mouthSmileRight: 0.65,
    mouthPressLeft: 0.15,
    mouthPressRight: 0.15,
    jawOpen: 0.06,
  },
  smile: {
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.17,
    noseSneerRight: 0.14,
    mouthPressLeft: 0.35,
    mouthPressRight: 0.35,
    mouthSmileLeft: 0.55,
    mouthSmileRight: 0.55,
  },
  happy: {
    browInnerUp: 0.28,
    eyeSquintLeft: 0.5,
    eyeSquintRight: 0.5,
    mouthSmileLeft: 0.75,
    mouthSmileRight: 0.75,
    mouthPressLeft: 0.2,
    mouthPressRight: 0.2,
    jawOpen: 0.08,
  },
  confident: {
    browInnerUp: 0.12,
    eyeSquintLeft: 0.2,
    eyeSquintRight: 0.2,
    mouthSmileLeft: 0.35,
    mouthSmileRight: 0.35,
    mouthDimpleLeft: 0.2,
    mouthDimpleRight: 0.2,
  },
  thinking: {
    browInnerUp: 0.35,
    browDownLeft: 0.25,
    eyeLookUpLeft: 0.4,
    eyeLookUpRight: 0.4,
    eyeSquintLeft: 0.3,
    eyeSquintRight: 0.3,
    mouthPucker: 0.2,
    mouthPressLeft: 0.2,
    mouthPressRight: 0.2,
  },
  funnyFace: {
    jawLeft: 0.63,
    mouthPucker: 0.53,
    noseSneerLeft: 1,
    noseSneerRight: 0.39,
    mouthLeft: 1,
    eyeLookUpLeft: 1,
    eyeLookUpRight: 1,
    cheekPuff: 0.99,
    mouthDimpleLeft: 0.41,
    mouthRollLower: 0.32,
    mouthSmileLeft: 0.35,
    mouthSmileRight: 0.35,
  },
  sad: {
    mouthFrownLeft: 0.9,
    mouthFrownRight: 0.9,
    mouthShrugLower: 0.78,
    browInnerUp: 0.65,
    eyeSquintLeft: 0.5,
    eyeSquintRight: 0.5,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 0.4,
  },
  surprised: {
    eyeWideLeft: 0.7,
    eyeWideRight: 0.7,
    jawOpen: 0.42,
    mouthFunnel: 0.8,
    browInnerUp: 0.95,
  },
  angry: {
    browDownLeft: 0.95,
    browDownRight: 0.95,
    eyeSquintLeft: 0.8,
    eyeSquintRight: 0.8,
    jawForward: 0.6,
    jawLeft: 0.3,
    mouthShrugLower: 0.6,
    noseSneerLeft: 0.8,
    noseSneerRight: 0.6,
    cheekSquintLeft: 0.8,
    cheekSquintRight: 0.8,
    mouthDimpleRight: 0.5,
  },
  crazy: {
    browInnerUp: 0.9,
    jawForward: 0.8,
    noseSneerLeft: 0.57,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39,
    eyeLookUpRight: 0.4,
    eyeLookInLeft: 0.8,
    eyeLookInRight: 0.8,
    jawOpen: 0.7,
    mouthDimpleLeft: 0.7,
    mouthDimpleRight: 0.7,
    mouthStretchLeft: 0.28,
    mouthStretchRight: 0.29,
    mouthSmileLeft: 0.55,
    mouthSmileRight: 0.38,
    tongueOut: 0.95,
  },
  empathetic: {
    browInnerUp: 0.32,
    mouthSmileLeft: 0.3,
    mouthSmileRight: 0.3,
    eyeSquintLeft: 0.2,
    eyeSquintRight: 0.2,
  },
  talking: {
    mouthSmileLeft: 0.25,
    mouthSmileRight: 0.25,
    browInnerUp: 0.15,
    jawOpen: 0.15,
  },
};

/** Ready Player Me Phoneme / Viseme Map */
export const RPM_VISEMES = {
  // Rhubarb single letters
  A: 'viseme_PP',
  B: 'viseme_kk',
  C: 'viseme_I',
  D: 'viseme_AA',
  E: 'viseme_O',
  F: 'viseme_U',
  G: 'viseme_FF',
  H: 'viseme_TH',
  X: 'viseme_sil',

  // Viseme codes
  AA: 'viseme_aa',
  EE: 'viseme_E',
  IH: 'viseme_I',
  OH: 'viseme_O',
  OO: 'viseme_U',
  UH: 'viseme_aa',
  MBP: 'viseme_PP',
  FV: 'viseme_FF',
  TH: 'viseme_TH',
  SS: 'viseme_SS',
  CH: 'viseme_CH',
  KG: 'viseme_kk',

  // Direct viseme keys
  viseme_sil: 'viseme_sil',
  viseme_PP: 'viseme_PP',
  viseme_FF: 'viseme_FF',
  viseme_TH: 'viseme_TH',
  viseme_dd: 'viseme_dd',
  viseme_kk: 'viseme_kk',
  viseme_CH: 'viseme_CH',
  viseme_SS: 'viseme_SS',
  viseme_nn: 'viseme_nn',
  viseme_RR: 'viseme_RR',
  viseme_aa: 'viseme_aa',
  viseme_E: 'viseme_E',
  viseme_I: 'viseme_I',
  viseme_O: 'viseme_O',
  viseme_U: 'viseme_U',
  rest: 'viseme_sil',
};

/** Every avatar is normalised to this height (world units ≈ metres). */
export const TARGET_HEIGHT = 1.8;

/* ------------------------------------------------------------
   IDLE MOTION & LIFE
   Natural reactive micro-movements, breathing, eye contact,
   and speech emphasis.
   ------------------------------------------------------------ */
export const IDLE = {
  /** The Orbit preset spins the camera by itself. */
  autoRotateOrbit: true,
  /** Slow yaw / roll sway of the whole body, in radians (disabled to prevent floating). */
  bodySway: 0,
  /** Body yaw when discovery mode is active (~12.6 degrees towards right). */
  discoveryBodyYaw: 0.22,
  /** Head turn when discovery mode is active (~6 degrees towards right). */
  discoveryHeadTurn: 0.46,
  /** Idle head turn / tilt / nod drift (disabled so skeletal clips control natural head motion without sudden shakes). */
  headDrift: 0,
  /** Camera parallax drift in the portrait framing (disabled to prevent camera wobble/floating). */
  cameraDrift: 0,
  /** Vertical breathing of the body (disabled to prevent floating motion). */
  breathRise: 0,
  /** Jaw movement from breathing, as a fraction of jawOpen. */
  breathJaw: 0.008,
  /** Blinking for natural lifelike reaction. */
  blink: true,
  /** Head movement while speaking (disabled so skeletal talking clips drive natural hand & head articulation). */
  speechMotion: 0,
};

/* ------------------------------------------------------------
   CAMERA PRESETS
   Authored against a 1.8-unit avatar whose feet rest on y = 0.
   At load time `CameraRig.calibrate()` shifts them by the
   difference between this reference eye line and the one the
   anatomy detector measured, so the framing lands on the real
   face of whatever model is dropped in.
   ------------------------------------------------------------ */
export const PORTRAIT_REFERENCE_FACE_Y = 1.57;

export const CAMERA_PRESETS = {
  portrait: {
    label: 'Waist Up',
    pos: [0, 1.35, 1.88],
    lookAt: [0, 1.32, 0], // Focused on Siya's upper body & face
    fov: 32,
    minDistance: 0.45,
    maxDistance: 3.5,
    autoRotate: false,
  },
  discovery: {
    label: 'Discovery View',
    pos: [0.34, 1.54, 1.30],
    lookAt: [0.34, 1.52, 0], // Perfectly framed face in the visible open viewport
    fov: 30,
    minDistance: 0.45,
    maxDistance: 3.5,
    autoRotate: false,
  },
  full: {
    label: 'Full Body',
    pos: [0, 1.15, 3.8],
    lookAt: [0, 0.95, 0], // Focused on Siya and the studio environment
    fov: 35,
    minDistance: 0.8,
    maxDistance: 8,
    autoRotate: false,
  },
  orbit: {
    label: 'Orbit',
    pos: [1.85, 1.38, 2.10],
    lookAt: [0, 1.25, 0], // Centered directly on Siya as revolving anchor
    fov: 34,
    minDistance: 0.6,
    maxDistance: 8,
    autoRotate: true,
  },
};

/* ------------------------------------------------------------
   LIGHTING / ATMOSPHERE THEMES
   ------------------------------------------------------------ */
export const THEMES = {
  studio: {
    label: 'Studio',
    key: { color: 0xffffff, intensity: 2.35 },
    fill: { color: 0x8fc8ff, intensity: 1.25 },
    rim: { color: 0xc4a3ff, intensity: 26 },
    ambient: { color: 0x5a6c98, intensity: 0.65 },
    hemi: { sky: 0x82a5f5, ground: 0x0a0e1c, intensity: 0.58 },
    bg: 0x060913,
    fog: { color: 0x060913, near: 3.5, far: 16 },
    ringA: 0x38bdf8, ringB: 0xa855f7, dust: 0xbfe4ff, floor: 0x0c1222,
    env: 0.85, cssHueA: 198, cssHueB: 268,
  },
  cyberpunk: {
    label: 'Cyber',
    key: { color: 0xff5fae, intensity: 2.2 },
    fill: { color: 0x00e5ff, intensity: 1.85 },
    rim: { color: 0x00fff0, intensity: 30 },
    ambient: { color: 0x3a1050, intensity: 0.75 },
    hemi: { sky: 0xff2e88, ground: 0x04121c, intensity: 0.4 },
    bg: 0x07030f,
    fog: { color: 0x0b0418, near: 2.8, far: 13 },
    ringA: 0xff2e88, ringB: 0x00e5ff, dust: 0xff7ac2, floor: 0x120522,
    env: 0.85, cssHueA: 328, cssHueB: 190,
  },
  gold: {
    label: 'Gold',
    key: { color: 0xffd9a0, intensity: 2.6 },
    fill: { color: 0xff9a4d, intensity: 1.05 },
    rim: { color: 0xffe9b8, intensity: 24 },
    ambient: { color: 0x54341a, intensity: 0.6 },
    hemi: { sky: 0xffc46b, ground: 0x140c04, intensity: 0.45 },
    bg: 0x0d0803,
    fog: { color: 0x120b04, near: 3.2, far: 15 },
    ringA: 0xffcf6b, ringB: 0xff8a3d, dust: 0xffd9a0, floor: 0x1a1006,
    env: 0.95, cssHueA: 38, cssHueB: 22,
  },
};


/* ------------------------------------------------------------
   FACE LIGHTING
   The two small lights aimed at the face, separate from the
   three-point stage rig. Lower these if the face reads blown
   out; the stage keeps its own contrast either way.
   ------------------------------------------------------------ */
export const FACE_LIGHT = {
  /** Soft front fill on the whole face. */
  fill: 0.18,
  fillRange: 2.4,
  /** Tight fill under the lip line so the mouth rig stays readable. */
  mouth: 0.12,
  mouthRange: 0.42,
  /** Global tone-mapping exposure. */
  exposure: 0.92,
};

export const DEFAULT_THEME = 'studio';

/* ------------------------------------------------------------
   FACIAL RIG

   Landmarks are MEASURED by src/core/faceAnatomy.js, not assumed
   from proportions. What lives here is only how far each zone
   reaches and how hard it pulls.

   All displacements are expressed as multiples of the lip height
   `U` (the seam-to-nose-base distance the detector measured), so
   the rig scales with the model instead of with world units.
   ------------------------------------------------------------ */
export const RIG = {
  /** Zone reach, in multiples of the measured lip height. */
  reach: {
    partUpper: 1.0,     // seam → nose base; peaks AT the seam so the lips part
    partLower: 1.05,    // seam → bottom of the lower lip
    bodyIn: 0.85,       // bulk lip motion is flat out to here...
    bodyOut: 2.0,       // ...then feathers into the surrounding skin by here
    cheek: 3.0,
    eyelid: 1.5,
    brow: 1.5,
  },
  /** Horizontal reach as a multiple of the measured mouth half-width. */
  span: {
    tightIn: 0.86,      // parting weight: flat to here...
    tightOut: 1.16,     // ...zero by here
    softIn: 0.95,       // bulk weight: flat to here...
    softOut: 1.9,       // ...feathered into the cheek by here
    cornerPeak: 1.0,
    cornerWidth: 0.75,
  },
  /**
   * How elliptical the opening is. 0 = the mouth opens as a uniform slot,
   * 1 = it opens only at the centre. Real mouths are close to the latter.
   */
  openEllipse: 0.9,
  /** Only vertices this far forward of the head centre deform. */
  frontBias: 0.1,
  frontFull: 0.62,

  /** Triangles bridging the two lips are cut above this parting weight... */
  cutThreshold: 0.3,
  /** ...and the cut's border vertices are welded onto the seam within this
      many lip-heights, so a closed mouth shows no gap. */
  weldRange: 0.85,

  /** Jaw rotation at jawOpen = 1, in radians (~9.7°). */
  jawAngle: 0.17,
  /** Head tilt / nod / turn at |1|, in radians. */
  headAngle: 0.22,

  /**
   * Displacements at channel value 1, in multiples of the lip height U.
   * The first component of the mouth gains is × the mouth half-width
   * instead, and is mirrored about the face's centre line.
   * Verified by rendering the deformed mesh at each extreme.
   */
  gain: {
    // jaw opening — the jaw rotation does most of the work; these are the
    // soft-tissue corrections on top of it
    openLowerLip: [0, -0.22, -0.12],
    openUpperLip: [0, 0.06, -0.08],
    openCornerIn: 0.05,

    // smile / frown: corners travel up and softly out along the cheek plane
    smileCorner: [0.14, 0.42, -0.10],
    smileUpper: [0, 0.09, 0],
    smileLower: [0, 0.12, 0],
    smileCheek: [0, 0.24, 0.10],

    // round / pucker → "O": smooth cylindrical convergence
    roundCorner: [-0.18, 0, 0.22],
    roundUpper: [0, -0.14, 0.26],
    roundLower: [0, 0.12, 0.26],

    // widen → "EE": clean horizontal corners
    wideCorner: [0.14, 0.07, -0.05],
    wideUpper: [0, 0.06, 0],
    wideLower: [0, -0.05, 0],

    // press → "M / B / P": gentle lip contact
    pressUpper: [0, -0.12, 0.04],
    pressLower: [0, 0.14, 0.04],

    // funnel → "F / V", lower lip tucks under the upper teeth
    funnelLower: [0, 0.24, -0.18],

    // upper face: smooth brows and natural eyelid range
    browRaise: [0, 0.48, 0],
    browFurrow: [-0.22, -0.18, 0.10],
    blink: [0, 0.56, 0],
  },
};

/* ------------------------------------------------------------
   EXPRESSION PRESETS
   Harmonious, clean, anatomical presets without polygon strain
   ------------------------------------------------------------ */
export const EXPRESSIONS = {
  neutral:   { jawOpen: 0.00, smile: 0.04, lipRound: 0.00, lipWide: 0.00, lipPress: 0.00, lipFunnel: 0, browRaise: 0.02, browFurrow: 0.00, squint: 0.02, headTilt: 0.00, headNod: 0.00, headTurn: 0.00 },
  greeting:  { jawOpen: 0.04, smile: 0.55, lipRound: 0.00, lipWide: 0.12, lipPress: 0.00, lipFunnel: 0, browRaise: 0.20, browFurrow: 0.00, squint: 0.14, headTilt: 0.03, headNod: 0.02, headTurn: 0.00 },
  happy:     { jawOpen: 0.06, smile: 0.60, lipRound: 0.00, lipWide: 0.14, lipPress: 0.00, lipFunnel: 0, browRaise: 0.16, browFurrow: 0.00, squint: 0.18, headTilt: 0.03, headNod: 0.02, headTurn: 0.00 },
  smile:     { jawOpen: 0.02, smile: 0.44, lipRound: 0.00, lipWide: 0.08, lipPress: 0.00, lipFunnel: 0, browRaise: 0.10, browFurrow: 0.00, squint: 0.10, headTilt: 0.02, headNod: 0.01, headTurn: 0.00 },
  confident: { jawOpen: 0.02, smile: 0.22, lipRound: 0.00, lipWide: 0.06, lipPress: 0.00, lipFunnel: 0, browRaise: 0.10, browFurrow: 0.00, squint: 0.08, headTilt: -0.02, headNod: 0.03, headTurn: 0.00 },
  thinking:  { jawOpen: 0.01, smile: 0.02, lipRound: 0.12, lipWide: 0.00, lipPress: 0.08, lipFunnel: 0, browRaise: 0.24, browFurrow: 0.20, squint: 0.12, headTilt: 0.06, headNod: 0.04, headTurn: 0.00 },
  surprised: { jawOpen: 0.28, smile: 0.00, lipRound: 0.32, lipWide: 0.00, lipPress: 0.00, lipFunnel: 0, browRaise: 0.42, browFurrow: 0.00, squint: -0.14, headTilt: 0.00, headNod: -0.02, headTurn: 0.00 },
  empathetic:{ jawOpen: 0.01, smile: 0.18, lipRound: 0.00, lipWide: 0.04, lipPress: 0.00, lipFunnel: 0, browRaise: 0.18, browFurrow: 0.05, squint: 0.09, headTilt: 0.04, headNod: 0.02, headTurn: 0.00 },
  sad:       { jawOpen: 0.01, smile: -0.28, lipRound: 0.06, lipWide: 0.00, lipPress: 0.06, lipFunnel: 0, browRaise: 0.18, browFurrow: 0.20, squint: 0.08, headTilt: -0.03, headNod: 0.04, headTurn: 0.00 },
  talking:   { jawOpen: 0.16, smile: 0.16, lipRound: 0.05, lipWide: 0.10, lipPress: 0.00, lipFunnel: 0, browRaise: 0.08, browFurrow: 0.00, squint: 0.04, headTilt: 0.01, headNod: 0.02, headTurn: 0.00 },
  funnyFace: { jawOpen: 0.10, smile: 0.35, lipRound: 0.30, lipWide: 0.10, lipPress: 0.00, lipFunnel: 0.2, browRaise: 0.30, browFurrow: 0.10, squint: 0.25, headTilt: 0.12, headNod: -0.04, headTurn: 0.08 },
  angry:     { jawOpen: 0.04, smile: -0.25, lipRound: 0.00, lipWide: 0.12, lipPress: 0.20, lipFunnel: 0, browRaise: -0.30, browFurrow: 0.65, squint: 0.35, headTilt: -0.04, headNod: 0.06, headTurn: 0.00 },
  crazy:     { jawOpen: 0.30, smile: 0.45, lipRound: 0.10, lipWide: 0.30, lipPress: 0.00, lipFunnel: 0, browRaise: 0.45, browFurrow: 0.00, squint: -0.10, headTilt: 0.15, headNod: -0.06, headTurn: -0.08 },
};

/** Sliders exposed in the expression editor drawer. */
export const SLIDERS = [
  { key: 'jawOpen',    name: 'Jaw Open',    min: 0,  max: 1, sub: 'Mandible rotates about the jaw hinge' },
  { key: 'smile',      name: 'Smile',       min: -1, max: 1, sub: 'Corners up-and-out, or down' },
  { key: 'lipRound',   name: 'Lip Round',   min: 0,  max: 1, sub: 'Corners in, lips forward — the “O”' },
  { key: 'lipWide',    name: 'Lip Widen',   min: 0,  max: 1, sub: 'Corners out, thin slit — the “EE”' },
  { key: 'lipPress',   name: 'Lip Press',   min: 0,  max: 1, sub: 'Lips squash together — “M / B / P”' },
  { key: 'lipFunnel',  name: 'Lip Tuck',    min: 0,  max: 1, sub: 'Lower lip under the teeth — “F / V”' },
  { key: 'browRaise',  name: 'Brow Raise',  min: -1, max: 1, sub: 'Inner + outer brow lift' },
  { key: 'browFurrow', name: 'Brow Furrow', min: 0,  max: 1, sub: 'Inner brows pinch together' },
  { key: 'squint',     name: 'Eye Squint',  min: -1, max: 1, sub: 'Narrow or widen the eyes' },
  { key: 'headTilt',   name: 'Head Tilt',   min: -1, max: 1, sub: 'Roll the head sideways' },
  { key: 'headNod',    name: 'Head Nod',    min: -1, max: 1, sub: 'Pitch the head up / down' },
  { key: 'headTurn',   name: 'Head Turn',   min: -1, max: 1, sub: 'Turn face left or right' },
];

/* ------------------------------------------------------------
   LIP SYNC
   Speech is articulated as a blend of visemes rather than a
   single "open" scalar, so "oh" is round, "ee" is wide, and a
   "p" actually closes the lips.
   ------------------------------------------------------------ */
export const VISEMES = {
  //            jaw   smile round  wide  press funnel
  rest:    { jawOpen: 0.00, smile: 0.04, lipRound: 0.00, lipWide: 0.00, lipPress: 0.00, lipFunnel: 0 },
  AA:      { jawOpen: 0.58, smile: 0.10, lipRound: 0.04, lipWide: 0.18, lipPress: 0,    lipFunnel: 0 }, // father, hat
  EE:      { jawOpen: 0.14, smile: 0.26, lipRound: 0.00, lipWide: 0.55, lipPress: 0,    lipFunnel: 0 }, // see, it
  IH:      { jawOpen: 0.24, smile: 0.14, lipRound: 0.02, lipWide: 0.35, lipPress: 0,    lipFunnel: 0 }, // sit
  OH:      { jawOpen: 0.42, smile: 0.00, lipRound: 0.52, lipWide: 0,    lipPress: 0,    lipFunnel: 0 }, // go, or
  OO:      { jawOpen: 0.20, smile: 0.00, lipRound: 0.62, lipWide: 0,    lipPress: 0,    lipFunnel: 0 }, // food, you
  UH:      { jawOpen: 0.30, smile: 0.05, lipRound: 0.16, lipWide: 0.12, lipPress: 0,    lipFunnel: 0 }, // up, the
  MBP:     { jawOpen: 0.00, smile: 0.04, lipRound: 0.06, lipWide: 0.04, lipPress: 0.65, lipFunnel: 0 }, // m, b, p
  FV:      { jawOpen: 0.10, smile: 0.04, lipRound: 0.04, lipWide: 0.20, lipPress: 0.08, lipFunnel: 0.65 }, // f, v
  TH:      { jawOpen: 0.20, smile: 0.04, lipRound: 0.00, lipWide: 0.32, lipPress: 0,    lipFunnel: 0.15 }, // th, l, n, d, t
  SS:      { jawOpen: 0.10, smile: 0.10, lipRound: 0.04, lipWide: 0.48, lipPress: 0.10, lipFunnel: 0 }, // s, z
  CH:      { jawOpen: 0.22, smile: 0.00, lipRound: 0.44, lipWide: 0,    lipPress: 0,    lipFunnel: 0.10 }, // sh, ch, j
  KG:      { jawOpen: 0.28, smile: 0.05, lipRound: 0.06, lipWide: 0.22, lipPress: 0,    lipFunnel: 0 }, // k, g, r, w
};

/** Letter → viseme. Crude, but the eye reads shape, not phonetics. */
export const LETTER_VISEME = {
  a: 'AA', e: 'EE', i: 'IH', o: 'OH', u: 'OO', y: 'IH',
  m: 'MBP', b: 'MBP', p: 'MBP',
  f: 'FV', v: 'FV',
  t: 'TH', d: 'TH', n: 'TH', l: 'TH', h: 'TH',
  s: 'SS', z: 'SS', c: 'SS', x: 'SS',
  j: 'CH', g: 'KG', k: 'KG', q: 'KG', r: 'KG', w: 'KG',
};

export const LIPSYNC = {
  /** Syllables per second while speaking at rate 1.0. */
  syllableHz: 4.4,
  /** Envelope rise / fall, per second. */
  attack: 15,
  release: 8,
  /** How fast the mouth moves between visemes, per second. */
  visemeRate: 19,
  /** Amount of the syllable wave mixed into the jaw, 0…1. */
  waveDepth: 0.55,
  /** A closed viseme holds this long before the next opens, seconds. */
  closureHold: 0.055,
};

export const DUST_COUNT_DEFAULT = 0;

export const STORAGE_KEY = 'aura.settings.v1';

export const BUILTIN_GEMINI_KEY = '';

export const BUILTIN_ELEVENLABS_KEY = '';

export const ELEVENLABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel — Executive & Articulate (Default)', desc: 'Calm, authoritative, professional interviewer' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella — Expressive & Engaging', desc: 'Dynamic, warm, conversational' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica — Technical Architect', desc: 'Crisp, modern, authoritative' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda — Senior Mentor', desc: 'Thoughtful, warm, supportive' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily — Clear & Polished', desc: 'Direct, clear, concise' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura — Corporate Strategist', desc: 'Poised, professional' },
];

