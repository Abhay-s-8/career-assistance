/* ============================================================
   AURA — Avatar
   Loads a Ready Player Me GLB or custom model with full-body
   skeletal animations (AnimationMixer), 52 ARKit blendshapes,
   Ready Player Me visemes, and procedural vertex rigging fallback.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TARGET_HEIGHT, RIG, ANIMATIONS_URL, FALLBACK_MODEL_URL, GREETING_ANIM_URL, ARKIT_EXPRESSIONS, RPM_VISEMES, DEFAULT_DRESS_COLOR } from './config.js';
import { detectFace } from './faceAnatomy.js';

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
};
const bell = (d, r) => {
  const t = Math.min(1, Math.abs(d) / (r || 1e-6));
  return Math.cos(t * Math.PI * 0.5) ** 2;
};
const lipFall = (t) => (t >= 1 || t < 0 ? 0 : Math.cos(t * Math.PI * 0.5) ** 1.4);

const ALL_ARKIT_MORPHS = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight',
  'jawForward', 'jawLeft', 'jawRight', 'jawOpen',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthFunnel', 'mouthLeft', 'mouthRight', 'mouthLowerDownLeft', 'mouthLowerDownRight',
  'mouthPressLeft', 'mouthPressRight', 'mouthPucker', 'mouthRollLower', 'mouthRollUpper',
  'mouthShrugLower', 'mouthShrugUpper', 'mouthSmileLeft', 'mouthSmileRight',
  'mouthStretchLeft', 'mouthStretchRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
  'noseSneerLeft', 'noseSneerRight', 'tongueOut'
];

export class Avatar {
  constructor() {
    this.root = new THREE.Group();
    this.zones = {};
    this.morphs = null;
    this.morphMeshes = [];
    this.headBone = null;
    this.neckBone = null;
    this.mixer = null;
    this.actions = {};
    this.animations = [];
    this.currentAnimation = 'Idle';
    this._currentAction = null;
    this.ready = false;

    // Safe default facial landmarks
    this.face = {
      cx: 0,
      cz: 0,
      headCz: 0,
      crownY: 1.8,
      noseTipY: 1.58,
      noseBaseY: 1.54,
      chinY: 1.42,
      nasionY: 1.62,
      eyeY: 1.57,
      browY: 1.65,
      neckY: 1.35,
      faceUnit: 0.12,
      headHalfW: 0.09,
      headHalfD: 0.10,
      headBottomY: 1.35,
      seamY: 1.48,
      seamSlope: 0,
      mouthHalfW: 0.035,
      lipUpperH: 0.015,
      lipLowerH: 0.016,
      lipZ: 0.08,
      jawPivot: [0, 1.52, -0.05],
    };
    this.faceY = 1.57;
    this.mouthY = 1.48;
    this.jawPivotWorld = new THREE.Vector3(0, 1.52, -0.05);
    this.headPivotWorld = new THREE.Vector3(0, 1.42, 0);
    this._jawPivot = this.jawPivotWorld.clone();
    this._headPivot = this.headPivotWorld.clone();

    this.report = {
      vertices: 12000,
      driven: 12000,
      upperLip: 0,
      lowerLip: 0,
      corner: 0,
      jaw: 0,
      brow: 0,
      eye: 0,
      lipTris: 0,
      morphs: 0,
      animations: [],
      landmarks: {
        chin: 1.42, seam: 1.48, noseBase: 1.54, noseTip: 1.58,
        eye: 1.57, brow: 1.65, mouthHalfW: 0.035, lipH: 0.015,
      },
    };

    // Blink & wink state
    this.blink = false;
    this.winkLeft = false;
    this.winkRight = false;
    this._blinkTimer = null;
    this._initAutoBlink();

    // Scratch buffers
    this._euler = new THREE.Euler();
    this._vp = new THREE.Vector3();
    this._vn = new THREE.Vector3();
    this._qHead = Array.from({ length: 17 }, () => new THREE.Quaternion());
    this._qJaw = Array.from({ length: 17 }, () => new THREE.Quaternion());
  }

  /* ------------------------------------------------------------------ load */
  static async load(url, onProgress, animationsUrl = ANIMATIONS_URL) {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);

    let gltf;
    try {
      gltf = await new Promise((resolve, reject) => {
        loader.load(url, resolve, (e) => {
          if (e.lengthComputable && e.total) onProgress?.(e.loaded / e.total, e.loaded, e.total);
          else onProgress?.(-1, e.loaded, 0);
        }, reject);
      });
    } catch (err) {
      console.warn('Primary model load failed, trying fallback model URL:', err);
      if (FALLBACK_MODEL_URL && url !== FALLBACK_MODEL_URL) {
        gltf = await new Promise((resolve, reject) => {
          loader.load(FALLBACK_MODEL_URL, resolve, (e) => {
            if (e.lengthComputable && e.total) onProgress?.(e.loaded / e.total, e.loaded, e.total);
          }, reject);
        });
      } else {
        throw err;
      }
    }

    let animGltf = null;
    if (animationsUrl) {
      try {
        animGltf = await new Promise((resolve, reject) => {
          loader.load(animationsUrl, resolve, undefined, reject);
        });
      } catch (err) {
        console.warn('Animations GLB not loaded:', err);
      }
    }

    const allClips = [...(animGltf?.animations || gltf.animations || [])];

    // Load Standing Greeting FBX animation
    try {
      const fbxLoader = new FBXLoader();
      const greetingFbx = await new Promise((resolve, reject) => {
        fbxLoader.load(GREETING_ANIM_URL, resolve, undefined, reject);
      });
      if (greetingFbx && greetingFbx.animations && greetingFbx.animations.length > 0) {
        const origClip = greetingFbx.animations[0];
        const remappedTracks = [];
        for (const track of origClip.tracks) {
          const cleanName = track.name.replace(/^mixamorig:?/, '');
          
          const cloned = track.clone();
          cloned.name = cleanName;
          if (cloned.name.endsWith('.position')) {
            const vals = cloned.values;
            let maxVal = 0;
            for (let k = 0; k < vals.length; k++) maxVal = Math.max(maxVal, Math.abs(vals[k]));
            if (maxVal > 5.0) {
              for (let k = 0; k < vals.length; k++) vals[k] *= 0.01;
            }
          }
          remappedTracks.push(cloned);
        }
        const greetingClip = new THREE.AnimationClip('Standing_Greeting', origClip.duration, remappedTracks);
        const greetingClipAlias1 = new THREE.AnimationClip('Standing Greeting', origClip.duration, remappedTracks);
        const greetingClipAlias2 = new THREE.AnimationClip('Greeting', origClip.duration, remappedTracks);
        const greetingClipAlias3 = new THREE.AnimationClip('wave', origClip.duration, remappedTracks);
        const greetingClipAlias4 = new THREE.AnimationClip('Wave', origClip.duration, remappedTracks);
        const greetingClipAlias5 = new THREE.AnimationClip('hi', origClip.duration, remappedTracks);
        const greetingClipAlias6 = new THREE.AnimationClip('Hi', origClip.duration, remappedTracks);
        allClips.push(greetingClip, greetingClipAlias1, greetingClipAlias2, greetingClipAlias3, greetingClipAlias4, greetingClipAlias5, greetingClipAlias6);
      }
    } catch (err) {
      console.warn('[Avatar] Standing Greeting FBX load note:', err);
    }

    const avatar = new Avatar();
    avatar._build(gltf, allClips);
    return avatar;
  }

  _build(gltf, clips) {
    const model = gltf.scene || gltf.scenes[0];
    this.source = model;

    const meshes = [];
    const morphMeshes = [];
    let headBone = null;
    let neckBone = null;

    model.traverse((o) => {
      if (o.isBone) {
        const n = o.name.toLowerCase();
        if (!headBone && (n === 'head' || n.endsWith('_head') || n.includes('head'))) headBone = o;
        else if (!neckBone && (n === 'neck' || n.endsWith('_neck') || n.includes('neck'))) neckBone = o;
      }

      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;

      if (o.morphTargetDictionary && o.morphTargetInfluences) {
        morphMeshes.push(o);
      }

      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const isOutfit = /outfit|dress|top|bottom|shirt|suit|cloth|jacket|pant|skirt|coat|blazer|sweater|vest|tshirt/i.test(o.name)
        || mats.some((m) => m && /outfit|dress|top|bottom|shirt|suit|cloth|jacket|pant|skirt|coat|blazer|sweater|vest|tshirt/i.test(m.name || ''));
      
      const isSkinOrFace = /head|face|eye|hair|skin|body|teeth|mouth|tongue|cornea|brow/i.test(o.name)
        && !/outfit|dress|top|bottom/i.test(o.name);

      for (const m of mats) {
        if (!m) continue;
        if (m.emissive) {
          m.emissive.setRGB(0, 0, 0);
          m.emissiveIntensity = 0.0;
        }
        if (m.emissiveMap) {
          m.emissiveMap = null;
        }
        if (m.metalness !== undefined) {
          m.metalness = 0.05;
        }
        if (m.map) {
          m.map.colorSpace = THREE.SRGBColorSpace;
          m.map.needsUpdate = true;
        }
        if (m.roughness !== undefined) {
          m.roughness = 0.65;
        }
        if (m.envMapIntensity !== undefined) {
          m.envMapIntensity = 0.45;
        }

        // Apply executive Navy Blue to dress and outfit materials
        if (isOutfit && !isSkinOrFace && !/skin|hair|eye|head|face|teeth|mouth|tongue/i.test(m.name || '')) {
          if (m.color) {
            m.color.setHex(DEFAULT_DRESS_COLOR);
          }
          if (m.roughness !== undefined) {
            m.roughness = 0.72; // Crisp matte suit/dress fabric finish
          }
          if (m.metalness !== undefined) {
            m.metalness = 0.04;
          }
        }

        m.shadowSide = THREE.FrontSide;
        m.needsUpdate = true;
      }
      meshes.push(o);
    });

    if (!meshes.length) throw new Error('The GLTF contains no meshes.');

    const headMesh = meshes.find((m) =>
      m.name.toLowerCase().includes('head') ||
      m.name.toLowerCase().includes('face') ||
      m.name.toLowerCase().includes('eye')
    ) || meshes[0];

    this.mesh = headMesh;
    this.meshes = meshes;
    this.morphMeshes = morphMeshes;
    this.headBone = headBone;
    this.neckBone = neckBone;

    // Normalise scale and placement
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = TARGET_HEIGHT / (size.y || 1);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    model.updateMatrixWorld(true);

    this.root.add(model);
    this.bounds = new THREE.Box3().setFromObject(model);
    this.height = this.bounds.max.y - this.bounds.min.y;

    // Setup animations
    const animList = Array.isArray(clips) ? clips : (clips?.animations || gltf.animations || []);
    this._setupAnimations(model, animList);

    this.morphs = this._collectMorphs(meshes);

    try {
      this._segment();
    } catch (e) {
      console.warn('Procedural segmentation skipped or fallback used:', e);
    }
    this.ready = true;
  }

  /* ------------------------------------------------- skeletal animations */
  _setupAnimations(model, clips) {
    if (!clips || !clips.length) return;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    this.animations = [];

    for (const clip of clips) {
      // Ensure all position tracks are scaled to meters
      for (const track of clip.tracks) {
        if (track.name.endsWith('.position')) {
          let maxVal = 0;
          for (let k = 0; k < track.values.length; k++) {
            maxVal = Math.max(maxVal, Math.abs(track.values[k]));
          }
          if (maxVal > 5.0) {
            for (let k = 0; k < track.values.length; k++) {
              track.values[k] *= 0.01;
            }
          }
        }
      }
      const action = this.mixer.clipAction(clip);
      this.actions[clip.name] = action;
      this.animations.push(clip.name);
    }

    const defaultAnim = this.actions['Idle'] ? 'Idle' : clips[0].name;
    this.playAnimation(defaultAnim, 0);

    // Auto-transition when one-shot animations finish (e.g. Standing_Greeting / wave)
    this.mixer.addEventListener('finished', (e) => {
      if (this._currentAction === e.action) {
        const nextAnim = this.onOneShotFinished ? this.onOneShotFinished() : 'Idle';
        this.playAnimation(nextAnim || 'Idle', 0.6, true);
        this.onAnimationAutoTransition?.(nextAnim || 'Idle');
      }
    });
  }

  /**
   * Play skeletal animation with crossfade
   * @param {string} name e.g. 'Idle', 'Talking_0', 'Talking_1', 'Talking_2', 'Standing_Greeting', 'Laughing', 'Crying', 'Angry', 'Terrified', 'Rumba'
   * @param {number} fadeDuration in seconds
   * @param {boolean} loop
   */
  playAnimation(name, fadeDuration = 0.5, loop = true) {
    if (!this.mixer || !this.actions) return;
    const rawKey = String(name || '').trim();
    const cleanKey = rawKey.toLowerCase().replace(/[\s_-]+/g, '');
    let targetAction = this.actions[rawKey];
    if (!targetAction) {
      for (const [k, act] of Object.entries(this.actions)) {
        if (k.toLowerCase().replace(/[\s_-]+/g, '') === cleanKey) {
          targetAction = act;
          break;
        }
      }
    }
    if (!targetAction && (cleanKey.includes('greet') || cleanKey.includes('wave') || cleanKey === 'hi' || cleanKey.includes('higesture'))) {
      targetAction = this.actions['Standing_Greeting'] || this.actions['Standing Greeting'] || this.actions['Greeting'] || this.actions['wave'];
    }
    targetAction = targetAction || this.actions['Idle'] || Object.values(this.actions)[0];
    if (!targetAction) return;

    if (this._currentAction === targetAction && targetAction.isRunning()) {
      return;
    }

    const prevAction = this._currentAction;
    this._currentAction = targetAction;
    this.currentAnimation = rawKey;

    targetAction.reset();
    const isOneShot = !loop || /greet|wave|^hi$/i.test(rawKey) || /greet|wave|^hi$/i.test(cleanKey);
    if (isOneShot) {
      targetAction.setLoop(THREE.LoopOnce, 1);
      targetAction.clampWhenFinished = true;
    } else {
      targetAction.setLoop(THREE.LoopRepeat, Infinity);
      targetAction.clampWhenFinished = false;
    }

    if (prevAction && prevAction !== targetAction) {
      prevAction.fadeOut(fadeDuration);
    }
    targetAction.fadeIn(fadeDuration).play();
  }

  /* ------------------------------------------------- morph target lerping */
  lerpMorphTarget(targetName, value, speed = 0.2) {
    const tLower = targetName.toLowerCase();
    for (const mesh of this.morphMeshes) {
      const dict = mesh.morphTargetDictionary;
      if (!dict) continue;
      let idx = dict[targetName];
      if (idx === undefined) {
        for (const k of Object.keys(dict)) {
          if (k.toLowerCase() === tLower) {
            idx = dict[k];
            break;
          }
        }
      }
      if (idx !== undefined && mesh.morphTargetInfluences && mesh.morphTargetInfluences[idx] !== undefined) {
        mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
          mesh.morphTargetInfluences[idx],
          value,
          speed
        );
      }
    }
  }

  triggerWinkLeft(duration = 350) {
    this.winkLeft = true;
    setTimeout(() => { this.winkLeft = false; }, duration);
  }

  triggerWinkRight(duration = 350) {
    this.winkRight = true;
    setTimeout(() => { this.winkRight = false; }, duration);
  }

  _initAutoBlink() {
    const nextBlink = () => {
      this._blinkTimer = setTimeout(() => {
        this.blink = true;
        setTimeout(() => {
          this.blink = false;
          nextBlink();
        }, 180);
      }, THREE.MathUtils.randInt(2200, 5500));
    };
    nextBlink();
  }

  _collectMorphs(meshes) {
    const map = {};
    let found = 0;
    for (const m of meshes) {
      const dict = m.morphTargetDictionary;
      if (!dict) continue;
      for (const name of Object.keys(dict)) {
        (map[name.toLowerCase()] ||= []).push({ mesh: m, index: dict[name] });
        found++;
      }
    }
    return found ? map : null;
  }

  /* ------------------------------------------------- vertex segmentation */
  _segment() {
    const mesh = this.mesh;
    if (!mesh || !mesh.geometry) return;
    const geo = mesh.geometry;
    const posAttr = geo.attributes.position;
    if (!posAttr) return;
    const n = posAttr.count;

    mesh.updateMatrixWorld(true);
    const m4 = mesh.matrixWorld;
    const world = new Float32Array(n * 3);
    const wn = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    const nrm = geo.attributes.normal;
    const nMat = new THREE.Matrix3().getNormalMatrix(m4);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(posAttr, i).applyMatrix4(m4);
      world[i * 3] = v.x; world[i * 3 + 1] = v.y; world[i * 3 + 2] = v.z;
      if (nrm) {
        v.fromBufferAttribute(nrm, i).applyMatrix3(nMat).normalize();
        wn[i * 3] = v.x; wn[i * 3 + 1] = v.y; wn[i * 3 + 2] = v.z;
      }
    }

    // Measure the face
    try {
      const F = detectFace(world, wn, n, this.height);
      if (F && F.eyeY) {
        this.face = F;
        this.faceY = F.eyeY || 1.57;
        this.mouthY = F.seamY || 1.48;
      }
    } catch (e) {
      console.warn('detectFace fallback to defaults:', e);
    }

    const F = this.face;
    const U = F.lipUpperH || 0.015;
    const L = F.lipLowerH || 0.016;
    const M = F.mouthHalfW || 0.035;
    const { reach, span } = RIG;

    this.jawPivotWorld = new THREE.Vector3(...(F.jawPivot || [0, 1.52, -0.05]));
    this.headPivotWorld = new THREE.Vector3(F.cx || 0, (F.chinY || 1.42) - (F.faceUnit || 0.12) * 0.45, F.headCz || 0);
    this._jawPivot = this.jawPivotWorld.clone();
    this._headPivot = this.headPivotWorld.clone();
    mesh.worldToLocal(this._jawPivot);
    mesh.worldToLocal(this._headPivot);

    // If morph targets exist, Ready Player Me handles blendshapes natively on GPU
    if (this.morphMeshes.length > 0) {
      this.report = {
        vertices: n,
        driven: n,
        upperLip: 0,
        lowerLip: 0,
        corner: 0,
        jaw: 0,
        brow: 0,
        eye: 0,
        lipTris: 0,
        morphs: this.morphs ? Object.keys(this.morphs).length : 52,
        animations: this.animations,
        landmarks: {
          chin: F.chinY, seam: F.seamY, noseBase: F.noseBaseY, noseTip: F.noseTipY,
          eye: F.eyeY, brow: F.browY, mouthHalfW: M, lipH: U,
        },
      };
      return;
    }

    // Procedural weighted zones fallback for static meshes without morph targets
    const names = ['partUpper', 'partLower', 'bodyUpper', 'bodyLower',
      'corner', 'cheek', 'brow', 'browInner', 'eyelid', 'jaw', 'head'];
    const zi = {}, zw = {}, zs = {};
    for (const k of names) { zi[k] = []; zw[k] = []; zs[k] = []; }
    const push = (k, i, w, side) => {
      if (!(w > 0.004)) return;
      zi[k].push(i); zw[k].push(w); zs[k].push(side);
    };

    const pU = new Float32Array(n);
    const pL = new Float32Array(n);
    const seamOf = new Float32Array(n);

    const cheekY = F.seamY + (F.eyeY - F.seamY) * 0.45;
    const headLo = F.chinY - F.faceUnit * 0.70;
    const headHi = F.chinY + F.faceUnit * 0.05;
    const scanFrom = headLo - F.faceUnit * 0.3;

    for (let i = 0; i < n; i++) {
      const y = world[i * 3 + 1];
      if (y < scanFrom) continue;
      const x = world[i * 3], z = world[i * 3 + 2];
      const dx = x - F.cx;
      const side = dx >= 0 ? 1 : -1;
      const ax = Math.abs(dx);

      const headW = smoothstep(headLo, headHi, y)
        * (1 - smoothstep(F.headHalfW * 1.3, F.headHalfW * 1.9, ax));
      push('head', i, headW, side);
      if (headW <= 0.004) continue;

      const hzN = (z - F.headCz) / F.headHalfD;
      const front = smoothstep(RIG.frontBias, RIG.frontFull, hzN);

      const seamAt = F.seamY + F.seamSlope * dx;
      seamOf[i] = seamAt;
      const jawW = (1 - smoothstep(seamAt - L * 0.9, seamAt + U * 0.35, y))
        * smoothstep(F.chinY - F.faceUnit * 0.55, F.chinY - F.faceUnit * 0.12, y)
        * smoothstep(F.headCz - F.headHalfD * 1.05, F.headCz - F.headHalfD * 0.35, z);
      push('jaw', i, jawW, side);

      if (front <= 0.004) continue;

      const sx = ax / M;
      const dy = y - seamAt;
      const tight = 1 - smoothstep(span.tightIn, span.tightOut, sx);
      const soft = 1 - smoothstep(span.softIn, span.softOut, sx);

      const sxc = Math.min(1, sx);
      const ellipse = Math.sqrt(Math.max(0, 1 - sxc * sxc));
      const partProf = tight * ((1 - RIG.openEllipse) + RIG.openEllipse * ellipse);

      if (dy >= 0) {
        const w = lipFall(dy / (U * reach.partUpper)) * partProf * front;
        pU[i] = w;
        push('partUpper', i, w, side);
        push('bodyUpper', i, (1 - smoothstep(reach.bodyIn, reach.bodyOut, dy / U)) * soft * front, side);
      } else {
        const w = lipFall(-dy / (L * reach.partLower)) * partProf * front;
        pL[i] = w;
        push('partLower', i, w, side);
        push('bodyLower', i, (1 - smoothstep(reach.bodyIn, reach.bodyOut, -dy / L)) * soft * front, side);
      }

      push('corner', i,
        bell(sx - span.cornerPeak, span.cornerWidth)
        * (1 - smoothstep(1.1, 2.4, Math.abs(dy) / U)) * front, side);

      push('cheek', i,
        bell(y - cheekY, U * reach.cheek) * front
        * smoothstep(1.05, 2.0, sx) * (1 - smoothstep(3.0, 4.2, sx))
        * (1 - smoothstep(F.noseBaseY - U * 0.2, F.noseBaseY + U * 1.1, y)), side);

      const ex = ax / F.headHalfW;
      push('eyelid', i,
        bell(y - F.eyeY, U * reach.eyelid)
        * smoothstep(0.18, 0.32, ex) * (1 - smoothstep(0.62, 0.82, ex)) * front, side);

      const bw = bell(y - F.browY, U * reach.brow)
        * smoothstep(0.06, 0.2, ex) * (1 - smoothstep(0.7, 0.9, ex)) * front;
      push('brow', i, bw, side);
      push('browInner', i, bw * (1 - smoothstep(0.12, 0.46, ex)), side);
    }

    this.zones = {};
    for (const k of names) {
      this.zones[k] = {
        idx: new Int32Array(zi[k]),
        w: new Float32Array(zw[k]),
        side: new Float32Array(zs[k]),
      };
    }

    this._cutMouth(geo, world, pU, pL, seamOf, U, mesh);

    const seen = new Uint8Array(n);
    let count = 0;
    for (const k of names) {
      const idx = this.zones[k].idx;
      for (let j = 0; j < idx.length; j++) if (!seen[idx[j]]) { seen[idx[j]] = 1; count++; }
    }
    const affected = new Int32Array(count);
    let c = 0;
    for (let i = 0; i < n; i++) if (seen[i]) affected[c++] = i;
    this.affected = affected;

    const lipVert = new Uint8Array(n);
    for (const k of ['partUpper', 'partLower', 'bodyUpper', 'bodyLower', 'corner']) {
      const { idx, w } = this.zones[k];
      for (let j = 0; j < idx.length; j++) if (w[j] > 0.05) lipVert[idx[j]] = 1;
    }
    const index = geo.index;
    const lipTris = [];
    if (index) {
      const a = index.array;
      for (let t = 0; t < a.length; t += 3) {
        if (lipVert[a[t]] || lipVert[a[t + 1]] || lipVert[a[t + 2]]) lipTris.push(a[t], a[t + 1], a[t + 2]);
      }
    }
    this.lipTris = new Int32Array(lipTris);
    const touched = new Uint8Array(n);
    for (let t = 0; t < this.lipTris.length; t++) touched[this.lipTris[t]] = 1;
    const lv = [];
    for (let i = 0; i < n; i++) if (touched[i]) lv.push(i);
    this.lipNormalVerts = new Int32Array(lv);

    this.basePos = new Float32Array(posAttr.array);
    this.baseNormal = nrm ? new Float32Array(nrm.array) : null;
    this.disp = new Float32Array(n * 3);
    this.posAttr = posAttr;
    this.normalAttr = nrm || null;

    const s = new THREE.Vector3();
    mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
    this.invScale = 1 / (s.y || 1);

    this.report = {
      vertices: n,
      driven: affected.length,
      upperLip: this.zones.partUpper.idx.length,
      lowerLip: this.zones.partLower.idx.length,
      corner: this.zones.corner.idx.length,
      jaw: this.zones.jaw.idx.length,
      brow: this.zones.brow.idx.length,
      eye: this.zones.eyelid.idx.length,
      lipTris: this.lipTris.length / 3,
      morphs: this.morphs ? Object.keys(this.morphs).length : 0,
      animations: this.animations,
      landmarks: {
        chin: F.chinY, seam: F.seamY, noseBase: F.noseBaseY, noseTip: F.noseTipY,
        eye: F.eyeY, brow: F.browY, mouthHalfW: M, lipH: U,
      },
    };
  }

  _cutMouth(geo, world, pU, pL, seamOf, U, mesh) {
    this._cutCount = 0;
    this._weldCount = 0;
    const index = geo.index;
    if (!index) return;

    const a = index.array;
    const T = RIG.cutThreshold;
    const keep = [];
    const cutVerts = new Set();

    for (let t = 0; t < a.length; t += 3) {
      const i0 = a[t], i1 = a[t + 1], i2 = a[t + 2];
      const hasU = pU[i0] > T || pU[i1] > T || pU[i2] > T;
      const hasL = pL[i0] > T || pL[i1] > T || pL[i2] > T;
      if (hasU && hasL) {
        this._cutCount++;
        cutVerts.add(i0); cutVerts.add(i1); cutVerts.add(i2);
      } else {
        keep.push(i0, i1, i2);
      }
    }
    if (!this._cutCount) return;

    const Arr = a.constructor;
    geo.setIndex(new THREE.BufferAttribute(Arr.from(keep), 1));

    const posAttr = geo.attributes.position;
    const range = U * RIG.weldRange;
    const p = new THREE.Vector3();
    for (const i of cutVerts) {
      const dy = world[i * 3 + 1] - seamOf[i];
      if (Math.abs(dy) > range) continue;
      p.set(world[i * 3], seamOf[i], world[i * 3 + 2]);
      mesh.worldToLocal(p);
      posAttr.setXYZ(i, p.x, p.y, p.z);
      world[i * 3 + 1] = seamOf[i];
      this._weldCount++;
    }
    posAttr.needsUpdate = true;
  }

  setEnvIntensity(val) {
    for (const m of this.meshes || []) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) if (mat && mat.envMapIntensity !== undefined) mat.envMapIntensity = val;
    }
  }

  setOutfitColor(colorVal = DEFAULT_DRESS_COLOR) {
    const col = (colorVal instanceof THREE.Color) ? colorVal : new THREE.Color(colorVal);
    for (const o of this.meshes || []) {
      const isOutfit = /outfit|dress|top|bottom|shirt|suit|cloth|jacket|pant|skirt|coat|blazer|sweater|vest|tshirt/i.test(o.name)
        || (Array.isArray(o.material) ? o.material : [o.material]).some((m) => m && /outfit|dress|top|bottom|shirt|suit|cloth|jacket|pant|skirt|coat|blazer|sweater|vest|tshirt/i.test(m.name || ''));
      
      const isSkinOrFace = /head|face|eye|hair|skin|body|teeth|mouth|tongue|cornea|brow/i.test(o.name)
        && !/outfit|dress|top|bottom/i.test(o.name);

      if (isOutfit && !isSkinOrFace) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          if (!/skin|hair|eye|head|face|teeth|mouth|tongue/i.test(m.name || '')) {
            if (m.color) m.color.copy(col);
            m.needsUpdate = true;
          }
        }
      }
    }
  }

  /* --------------------------------------------------------- deformation & update */
  update(dt) {
    if (this.mixer) {
      this.mixer.update(dt);
    }

    if (this.morphMeshes.length) {
      const blinkVal = this.blink ? 1 : 0;
      this.lerpMorphTarget('eyeBlinkLeft', this.winkLeft ? 1 : blinkVal, 0.45);
      this.lerpMorphTarget('eyeBlinkRight', this.winkRight ? 1 : blinkVal, 0.45);
    }
  }

  deform(ch, expressionName = 'neutral') {
    if (!this.ready) return;

    if (this.morphMeshes.length) {
      this._driveArkitMorphs(ch, expressionName);

      // Only apply head bone orientation if an intentional manual slider or discovery mode offset is active,
      // avoiding fighting the Three.js AnimationMixer on normal skeletal playback frames.
      if (this.headBone) {
        const hasManualOrDiscovery = (
          (ch.headTurn && Math.abs(ch.headTurn) > 0.01) ||
          (ch.headNod && Math.abs(ch.headNod) > 0.01) ||
          (ch.headTilt && Math.abs(ch.headTilt) > 0.01)
        );
        if (hasManualOrDiscovery) {
          const tY = (ch.headTurn || 0) * 0.40;
          const tX = (ch.headNod || 0) * 0.25;
          const tZ = (ch.headTilt || 0) * 0.20;
          this.headBone.rotation.y = THREE.MathUtils.lerp(this.headBone.rotation.y, tY, 0.1);
          this.headBone.rotation.x = THREE.MathUtils.lerp(this.headBone.rotation.x, tX, 0.1);
          this.headBone.rotation.z = THREE.MathUtils.lerp(this.headBone.rotation.z, tZ, 0.1);
        }
      }
      return;
    }

    // Fallback for unskinned static meshes without morph targets
    if (this.affected && this.zones && this.posAttr) {
      this._deformProcedural(ch);
    }
  }

  _driveArkitMorphs(ch, expressionName) {
    const presetMapping = (expressionName && ARKIT_EXPRESSIONS[expressionName]) ? ARKIT_EXPRESSIONS[expressionName] : (ARKIT_EXPRESSIONS['default'] || {});
    
    // Compute targets starting with 0 for all ARKit morphs
    const targets = {};
    for (const key of ALL_ARKIT_MORPHS) {
      targets[key] = presetMapping[key] ?? 0;
    }

    // Apply active slider channels & overrides
    if (ch.jawOpen !== undefined) targets.jawOpen = Math.max(targets.jawOpen || 0, Math.max(0, ch.jawOpen));
    if (ch.smile !== undefined) {
      const s = ch.smile;
      if (s >= 0) {
        targets.mouthSmileLeft = Math.max(targets.mouthSmileLeft || 0, s);
        targets.mouthSmileRight = Math.max(targets.mouthSmileRight || 0, s);
      } else {
        targets.mouthFrownLeft = Math.max(targets.mouthFrownLeft || 0, -s);
        targets.mouthFrownRight = Math.max(targets.mouthFrownRight || 0, -s);
      }
    }
    if (ch.lipRound !== undefined) targets.mouthPucker = Math.max(targets.mouthPucker || 0, Math.max(0, ch.lipRound));
    if (ch.lipWide !== undefined) {
      targets.mouthStretchLeft = Math.max(targets.mouthStretchLeft || 0, Math.max(0, ch.lipWide));
      targets.mouthStretchRight = Math.max(targets.mouthStretchRight || 0, Math.max(0, ch.lipWide));
    }
    if (ch.lipPress !== undefined) {
      targets.mouthPressLeft = Math.max(targets.mouthPressLeft || 0, Math.max(0, ch.lipPress));
      targets.mouthPressRight = Math.max(targets.mouthPressRight || 0, Math.max(0, ch.lipPress));
    }
    if (ch.lipFunnel !== undefined) targets.mouthFunnel = Math.max(targets.mouthFunnel || 0, Math.max(0, ch.lipFunnel));

    if (ch.browRaise !== undefined) targets.browInnerUp = Math.max(targets.browInnerUp || 0, Math.max(0, ch.browRaise));
    if (ch.browFurrow !== undefined) {
      targets.browDownLeft = Math.max(targets.browDownLeft || 0, Math.max(0, ch.browFurrow));
      targets.browDownRight = Math.max(targets.browDownRight || 0, Math.max(0, ch.browFurrow));
    }
    if (ch.squint !== undefined) {
      targets.eyeSquintLeft = Math.max(targets.eyeSquintLeft || 0, Math.max(0, ch.squint));
      targets.eyeSquintRight = Math.max(targets.eyeSquintRight || 0, Math.max(0, ch.squint));
    }

    const isSpeaking = (ch.speechEnergy && ch.speechEnergy > 0.005) || (ch.activeViseme && ch.activeViseme !== 'rest');

    // Lerp all targets towards their computed values with adaptive speech responsiveness
    for (const key of ALL_ARKIT_MORPHS) {
      if (key === 'eyeBlinkLeft' || key === 'eyeBlinkRight') continue;
      const isMouth = key.startsWith('mouth') || key.startsWith('jaw');
      const lerpRate = isMouth && isSpeaking ? 0.42 : 0.28;
      this.lerpMorphTarget(key, targets[key], lerpRate);
    }

    const ALL_RPM_VISEME_NAMES = [
      'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_dd', 'viseme_kk',
      'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR', 'viseme_aa', 'viseme_E',
      'viseme_I', 'viseme_O', 'viseme_U'
    ];

    if (ch.activeViseme && ch.activeViseme !== 'rest' && ch.activeViseme !== 'viseme_sil') {
      const targetViseme = (RPM_VISEMES[ch.activeViseme] || ch.activeViseme).toLowerCase();
      for (const viseme of ALL_RPM_VISEME_NAMES) {
        if (viseme.toLowerCase() === targetViseme) {
          this.lerpMorphTarget(viseme, 0.85, 0.45);
        } else {
          this.lerpMorphTarget(viseme, 0.0, 0.35);
        }
      }
    } else {
      for (const viseme of ALL_RPM_VISEME_NAMES) {
        this.lerpMorphTarget(viseme, 0.0, 0.25);
      }
    }
  }

  _deformProcedural(ch) {
    const { basePos, baseNormal, disp, affected, zones } = this;
    if (!affected || !zones) return;
    const g = RIG.gain;
    const F = this.face || { lipUpperH: 0.015, mouthHalfW: 0.035 };
    const S = this.invScale || 1;
    const U = (F.lipUpperH || 0.015) * S;
    const M = (F.mouthHalfW || 0.035) * S;

    const pos = this.posAttr.array;
    const nor = this.normalAttr ? this.normalAttr.array : null;

    for (let k = 0; k < affected.length; k++) {
      const i3 = affected[k] * 3;
      disp[i3] = 0; disp[i3 + 1] = 0; disp[i3 + 2] = 0;
      pos[i3] = basePos[i3]; pos[i3 + 1] = basePos[i3 + 1]; pos[i3 + 2] = basePos[i3 + 2];
      if (nor && baseNormal) {
        nor[i3] = baseNormal[i3]; nor[i3 + 1] = baseNormal[i3 + 1]; nor[i3 + 2] = baseNormal[i3 + 2];
      }
    }

    const add = (zone, fx, fy, fz) => {
      const z = zones[zone];
      if (!z || !z.idx.length) return;
      const { idx, w, side } = z;
      const hx = fx !== 0, hy = fy !== 0, hz = fz !== 0;
      if (!hx && !hy && !hz) return;
      for (let j = 0; j < idx.length; j++) {
        const i3 = idx[j] * 3;
        const k = w[j];
        if (hx) disp[i3] += fx * k * side[j];
        if (hy) disp[i3 + 1] += fy * k;
        if (hz) disp[i3 + 2] += fz * k;
      }
    };

    const open = clamp01(ch.jawOpen);
    const smile = clamp(ch.smile, -1, 1);
    const round = clamp01(ch.lipRound);
    const wide = clamp01(ch.lipWide);
    const press = clamp01(ch.lipPress);
    const funnel = clamp01(ch.lipFunnel);

    add('partLower', 0, g.openLowerLip[1] * open * U, g.openLowerLip[2] * open * U);
    add('partUpper', 0, g.openUpperLip[1] * open * U, g.openUpperLip[2] * open * U);
    add('corner', -g.openCornerIn * open * M, 0, 0);

    add('corner', g.smileCorner[0] * smile * M, g.smileCorner[1] * smile * U,
      g.smileCorner[2] * Math.abs(smile) * U);
    add('bodyUpper', 0, g.smileUpper[1] * smile * U, 0);
    add('bodyLower', 0, g.smileLower[1] * smile * U, 0);
    const sPos = Math.max(0, smile);
    add('cheek', 0, g.smileCheek[1] * sPos * U, g.smileCheek[2] * sPos * U);

    add('corner', g.roundCorner[0] * round * M, 0, g.roundCorner[2] * round * U);
    add('bodyUpper', 0, g.roundUpper[1] * round * U, g.roundUpper[2] * round * U);
    add('bodyLower', 0, g.roundLower[1] * round * U, g.roundLower[2] * round * U);

    add('corner', g.wideCorner[0] * wide * M, g.wideCorner[1] * wide * U, g.wideCorner[2] * wide * U);
    add('bodyUpper', 0, g.wideUpper[1] * wide * U, 0);
    add('bodyLower', 0, g.wideLower[1] * wide * U, 0);

    add('partUpper', 0, g.pressUpper[1] * press * U, g.pressUpper[2] * press * U);
    add('partLower', 0, g.pressLower[1] * press * U, g.pressLower[2] * press * U);

    add('partLower', 0, g.funnelLower[1] * funnel * U, g.funnelLower[2] * funnel * U);

    add('brow', 0, g.browRaise[1] * clamp(ch.browRaise, -1, 1) * U, 0);
    const furrow = clamp01(ch.browFurrow);
    add('browInner', g.browFurrow[0] * furrow * U, g.browFurrow[1] * furrow * U, g.browFurrow[2] * furrow * U);
    add('eyelid', 0, -g.blink[1] * clamp(ch.squint, -1, 1) * U, 0);

    for (let k = 0; k < affected.length; k++) {
      const i3 = affected[k] * 3;
      pos[i3] += disp[i3]; pos[i3 + 1] += disp[i3 + 1]; pos[i3 + 2] += disp[i3 + 2];
    }

    if (this._jawPivot && this._headPivot) {
      this.jawAngle = open * RIG.jawAngle;
      this._rotate('jaw', this._jawPivot, this.jawAngle, 0, 0, this._qJaw);

      const A = RIG.headAngle;
      this.headEuler = [-(ch.headNod || 0) * A, (ch.headTurn || 0) * A, -(ch.headTilt || 0) * A];
      this._rotate('head', this._headPivot, this.headEuler[0], this.headEuler[1], this.headEuler[2], this._qHead);
    }

    if (nor && this.lipTris?.length) this._rebuildLipNormals();

    this.posAttr.needsUpdate = true;
    if (this.normalAttr) this.normalAttr.needsUpdate = true;
  }

  _rotate(zoneName, pivot, ax, ay, az, buckets) {
    if (Math.abs(ax) < 1e-5 && Math.abs(ay) < 1e-5 && Math.abs(az) < 1e-5) return;
    const z = this.zones?.[zoneName];
    if (!z || !z.idx.length) return;

    const BUCKETS = 16;
    const e = this._euler;
    for (let b = 0; b <= BUCKETS; b++) {
      const k = b / BUCKETS;
      e.set(ax * k, ay * k, az * k, 'YXZ');
      buckets[b].setFromEuler(e);
    }

    const pos = this.posAttr.array;
    const nor = this.normalAttr ? this.normalAttr.array : null;
    const { idx, w } = z;
    const vp = this._vp, vn = this._vn;

    for (let j = 0; j < idx.length; j++) {
      const b = Math.round(Math.min(1, w[j]) * BUCKETS);
      if (b === 0) continue;
      const q = buckets[b];
      const i3 = idx[j] * 3;

      vp.set(pos[i3] - pivot.x, pos[i3 + 1] - pivot.y, pos[i3 + 2] - pivot.z).applyQuaternion(q);
      pos[i3] = vp.x + pivot.x;
      pos[i3 + 1] = vp.y + pivot.y;
      pos[i3 + 2] = vp.z + pivot.z;

      if (nor) {
        vn.set(nor[i3], nor[i3 + 1], nor[i3 + 2]).applyQuaternion(q);
        nor[i3] = vn.x; nor[i3 + 1] = vn.y; nor[i3 + 2] = vn.z;
      }
    }
  }

  _rebuildLipNormals() {
    const tris = this.lipTris;
    if (!tris || !tris.length) return;
    const pos = this.posAttr.array;
    const nor = this.normalAttr.array;
    const verts = this.lipNormalVerts;

    for (let j = 0; j < verts.length; j++) {
      const i3 = verts[j] * 3;
      nor[i3] = 0; nor[i3 + 1] = 0; nor[i3 + 2] = 0;
    }

    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
      const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
      const e1x = pos[b] - ax, e1y = pos[b + 1] - ay, e1z = pos[b + 2] - az;
      const e2x = pos[c] - ax, e2y = pos[c + 1] - ay, e2z = pos[c + 2] - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      nor[a] += nx; nor[a + 1] += ny; nor[a + 2] += nz;
      nor[b] += nx; nor[b + 1] += ny; nor[b + 2] += nz;
      nor[c] += nx; nor[c + 1] += ny; nor[c + 2] += nz;
    }

    for (let j = 0; j < verts.length; j++) {
      const i3 = verts[j] * 3;
      const x = nor[i3], y = nor[i3 + 1], z = nor[i3 + 2];
      const len = Math.hypot(x, y, z);
      if (len > 1e-9) { nor[i3] = x / len; nor[i3 + 1] = y / len; nor[i3 + 2] = z / len; }
      else if (this.baseNormal) {
        nor[i3] = this.baseNormal[i3]; nor[i3 + 1] = this.baseNormal[i3 + 1]; nor[i3 + 2] = this.baseNormal[i3 + 2];
      }
    }
  }
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x || 0));
const clamp01 = (x) => Math.min(1, Math.max(0, x || 0));
