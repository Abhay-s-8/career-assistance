# AURA — 3D AI Companion

A production-ready, interactive 3D AI chatbot. A GLTF avatar stands on a
reflective pedestal under a three-point studio rig, talks back with real
speech, and moves its **actual mesh vertices** to form expressions and
articulate words — on a model with no skeleton and no morph targets.

Built with HTML, vanilla CSS, vanilla JavaScript, [Three.js](https://threejs.org) and [Vite](https://vite.dev). No UI framework, no icon library, no CSS framework.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # → dist/
npm run preview    # serve the production build
```

Use **Chrome or Edge** for the full experience — Safari and Firefox render
everything and speak, but only Chromium browsers implement `SpeechRecognition`
for voice input.

---

## What's in here

```
public/models/avatar.glb      the character (22 MB, streamed with real progress)
index.html                    DOM shell + inline SVG icon sprite
src/
  main.js                     boot sequence, frame loop, conversation pipeline
  core/
    config.js                 every tunable — presets, themes, rig gains
    stage.js                  renderer, lighting, pedestal, rings, dust, themes, hologram
    avatar.js                 GLTF load, normalisation, vertex segmentation, deformation
    cameraRig.js              OrbitControls + tweened, auto-calibrated presets
    expressions.js            blending, idle life, blink, breathing
    lipsync.js                procedural syllable engine
  audio/
    stt.js                    SpeechRecognition + AnalyserNode meter
    tts.js                    speechSynthesis + word-boundary lip driving
  ai/
    commands.js               in-chat scene command parser
    localBrain.js             offline conversational engine
    providers.js              optional Gemini / OpenAI adapters
  ui/                         shell, chat, expression drawer, voice HUD, settings
  styles/                     design tokens + application CSS
```

---

## The facial rig

The supplied model is a single static mesh: **168,450 vertices, one primitive,
no skin, no bones, no morph targets, and a mouth fused shut.** So the rig
builds itself at load — and it builds itself by *measuring* the head, because
proportion rules break on stylised characters.

### Landmarks are measured, not assumed

A rig that places the mouth at "a quarter of the head height above the chin"
lands on the nose the moment a character has hair, because the crown is no
longer the top of the skull. Every landmark here comes from a feature the
geometry actually has:

| landmark | how it is found | this model | measured |
|---|---|---|---|
| nose tip | frontmost vertex of the upper body | 1.6184 | 1.6184 |
| nose base | steepest depth gradient below it | 1.6071 | 1.6075 |
| chin | largest depth drop where the face falls to the neck | 1.5434 | 1.5445 |
| nasion / eye line | **first** local depth minimum above the nose | 1.6596 | 1.6612 |
| **lip seam** | band of maximum `|normal.y|` — the fold's own normals | 1.5949 | ~1.592 |
| mouth width | where the crease signal decays into plain cheek | 30 mm | ~27 mm |

Every one lands within 1–4 mm of the positions measured off rendered
orthographic views of the mesh. The lip seam is fitted as a **sloped line**
across nine columns, not a single height, so this character's slight smirk
(5.3 mm of tilt corner to corner) is tracked rather than averaged away.

### The lips carry two weight fields

This is what makes a mouth open instead of a face slide around.

**The parting field** peaks *at the lip seam* and falls to zero at each lip's
outer border. It drives only the separation, so the motion is largest exactly
where the lips meet. It is also tapered elliptically across the mouth, so the
opening is widest at the centre and sealed at the corners, like a real one.

**The body field** is flat across the whole lip and then feathers out into the
philtrum, the chin and the cheeks. It drives the bulk shapes — an "O", a
press, a smile — which would otherwise crease sharply at the lip border.

### The mouth is cut open

A fused mesh has lips but no mouth. At load the rig finds the triangles that
bridge the two lips and **removes them** (61 on this model), then **welds** the
vertices left on the cut border onto the seam line (66 of them, moving at most
1 cm) so a closed mouth shows no gap at all.

Behind the new opening sits the interior the model never had: a dark unlit
dome, a tongue, and two rows of teeth built as a **curved dental arch** — a
flat slab of teeth punches straight through the cheeks at the mouth corners,
because the face curves away and the slab does not. The upper arch hangs off
the skull; the lower arch and the tongue swing with the jaw.

### The jaw rotates, it does not slide

Translating a chin downward looks like putty. The mandible here rotates about
a hinge placed near the ear canal, well behind and above the teeth, so the
chin swings down *and back* along a real arc. The seam is the boundary: tissue
above it hangs off the skull, tissue below it off the jaw, blended smoothly
across the lower lip.

The rotation is rigid, so its normals rotate with it. The lips deform
non-rigidly, so **their** normals are rebuilt every frame, area-weighted, over
the few thousand triangles around the mouth — without that an open mouth reads
as a flat smear.

### Channels

`jawOpen`, `smile`, `lipRound`, `lipWide`, `lipPress`, `lipFunnel`,
`browRaise`, `browFurrow`, `squint`, `headTilt`, `headNod` — each blends at
its own rate (lips snap, jaws swing, heads drift). Every one is a live slider
in the **Face** drawer, and every displacement is expressed as a multiple of
the *measured* lip height, so the rig rescales itself for any model.

Layered on top, always running: breathing that moves the chest and jaw,
irregular blinking in bursts rather than on a metronome, slow head drift, and
a brow lift that tracks how loudly you are speaking into the mic.

### Lip sync

Speech is a blend of **thirteen visemes**, not one "open" value. The word
currently being spoken — reported by the speech synthesiser's `boundary` event
— is broken into a short queue of mouth shapes which the mouth walks through
at syllable rate, with a low-amplitude wave on the jaw so held shapes still
breathe. Digraphs are handled (`oo`, `ee`, `ou`, `ch`, `sh`, `th`, `ph`), long
words are reduced to their five most mouth-shaping positions, and closures
(`m`, `b`, `p`) hold the lips shut for a beat so they register as closures.

## Voice

**Input** — the mic button asks for `getUserMedia`, then runs
`SpeechRecognition` with `continuous` and `interimResults` on. The HUD banner
shows your words as you say them, and the waveform bars are driven by a real
`AnalyserNode` (RMS from the time domain, log-spaced bars over the speech
band) — not a decorative animation. Speech auto-confirms after ~1.4 s of
silence, or immediately on **Done**.

**Output** — `speechSynthesis` with the best available English voice. Long
replies are split on sentence boundaries so they survive Chrome's utterance
watchdog, and every word boundary feeds the lip engine in real time.

---

## Motion and lighting

**Nothing rotates on its own.** Every self-starting movement lives in the
`IDLE` block of `src/core/config.js`, and all of it is off by default:

| | default | what it was |
|---|---|---|
| `autoRotateOrbit` — camera spin in the Orbit preset | `false` | spinning |
| `bodySway` — slow yaw/roll of the whole body | `0` | 0.022 rad |
| `headDrift` — idle head turn / tilt / nod | `0` | on |
| `cameraDrift` — portrait parallax wander | `0` | on |

The avatar now turns only when you drag it, or when an expression or a command
asks it to. Blinking and a 3 mm vertical breath stay on — neither is rotation,
and without them the model reads as a statue. Turn any of it back on by
raising the number; `headDrift: 1` restores the old amount.

The pedestal's tech rings still counter-rotate. They're stage dressing rather
than the character, but if you want them still, set their `speed` to `0` in
`_initPedestal()` in `src/core/stage.js`.

**Face lighting is dialled back.** The two fills aimed at the face were
washing it out. They now live in `FACE_LIGHT` in the same config file:

- front fill `1.5 → 0.42`, mouth fill `0.85 → 0.30`
- key light down ~19% across all four themes
- exposure `1.06 → 0.96`

Settings has live **Face light** and **Exposure** sliders — they apply as you
drag, before you save, so you can dial it against the real render.

---

## Talking to it

Type or say any of these and the scene responds:

| | |
|---|---|
| **Expressions** | smile · be happy · surprised · thinking · sad · neutral |
| **Camera** | portrait · full body · orbit |
| **Atmosphere** | studio · cyberpunk · gold · matrix |
| **Effects** | hologram |

Commands are matched on whole words, and only fire as *commands* when they
dominate the message — "I'm not happy with the gold rate" won't repaint the
studio.

A theme moves two HSL hues that the entire interface derives from, so the
lights, pedestal rings, dust, fog **and every panel, slider and button**
re-tint together.

### Keyboard

`1` `2` `3` cameras · `F` face drawer · `C` chat · `H` hologram · `M` mic · `Esc` stop

---

## Conversational engine

**Local (default, offline).** Weighted intent matching with non-repeating
response pools and a scrap of short-term memory. Handles greetings, questions
about itself, jokes, the time, and every scene command. No key, no network.

**Remote (optional).** Settings → pick Gemini or OpenAI and paste a key. It is
stored in this browser's `localStorage`, sent only to the provider you chose,
and never leaves the page otherwise. Scene commands stay local either way, and
if a remote call fails the local engine answers instead of showing you an
error.

---

## Camera

Presets are authored against a 1.8-unit avatar and then **auto-calibrated** to
the model that actually loaded: the rig measures the eye line and shifts the
framing to match, so `portrait` lands on the face of any character you drop in,
not on the height the numbers were written for. Full OrbitControls with
damping underneath — drag to inspect from any angle; any manual input cancels
an in-flight preset tween so the camera never fights your hand.

---

## Performance

- Only 12.3% of the mesh is ever written per frame; the rest never moves.
- No allocation in the deform loop — scratch vectors, quaternions and typed
  arrays are all pre-built.
- Three quality tiers (pixel ratio + shadow map size), and the app **drops a
  tier automatically** if it measures sustained sub-26 fps.
- Cyber dust is a single `Points` draw call; drift, sway and fade all happen in
  the vertex shader.

---

## Swapping the avatar

Drop any `.glb` or `.gltf` into `public/models/`, point `MODEL_URL` in
`src/core/config.js` at it, and reload. Scale normalisation, head detection,
landmark derivation, zone segmentation and camera calibration all re-run
against the new geometry. Draco and Meshopt compressed models are handled.

If the proportions of a stylised character throw the landmarks off, every
number is in the `RIG` block of `src/core/config.js` — `chinLift`, the
`landmarks` fractions, the zone `radii`, `frontBias` and the displacement
`gain`s.

---

## Browser support

| | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| 3D stage, rig, expressions | ✅ | ✅ | ✅ |
| Text to speech | ✅ | ✅ | ✅ |
| Voice input | ✅ | ❌ | ❌ |

`backdrop-filter` needs Safari 14+. WebGL 2 is required.
