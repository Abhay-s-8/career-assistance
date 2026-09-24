/* ============================================================
   AURA — Stage engine
   Renderer, three-point studio rig, reflective pedestal with
   counter-rotating tech rings, cyber-dust field, theme system.
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { THEMES, DEFAULT_THEME, DUST_COUNT_DEFAULT, FACE_LIGHT } from './config.js';
import { ChairProp } from './chairProp.js';
import { RoomProp } from './roomProp.js';

const QUALITY = {
  1: { dpr: 1.0, shadow: 0, shadowMap: 1024 },
  2: { dpr: 1.5, shadow: 1, shadowMap: 1536 },
  3: { dpr: 2.0, shadow: 1, shadowMap: 2048 },
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.themeName = DEFAULT_THEME;
    this.quality = 3;
    this._dustCount = DUST_COUNT_DEFAULT;

    this._initRenderer();
    this._initScene();
    this._initLights();
    this._initPedestal();
    this._initDust(this._dustCount);
    this.applyTheme(DEFAULT_THEME);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize, { passive: true });
    this._onResize();
  }

  /* ---------------------------------------------------------- renderer */
  _initRenderer() {
    const r = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = FACE_LIGHT.exposure;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 120);
    this.camera.position.set(0, 1.6, 0.72);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x060913, 3.5, 16);

    // Baked room environment gives the suit fabric and skin real
    // specular response without shipping an HDR file.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();

    this.avatarRoot = new THREE.Group();
    this.scene.add(this.avatarRoot);

    this.chair = new ChairProp(this.scene);
    this.room = new RoomProp(this.scene);
  }

  /* ---------------------------------------------------------- lighting */
  _initLights() {
    // KEY — front-left, soft PCF shadows.
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.4, 4.0, 3.0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 14;
    key.shadow.camera.left = -2.2;
    key.shadow.camera.right = 2.2;
    key.shadow.camera.top = 3.2;
    key.shadow.camera.bottom = -0.6;
    key.shadow.bias = -0.0009;
    key.shadow.normalBias = 0.022;
    key.shadow.radius = 3.5;
    this.keyLight = key;

    // FILL — cool, opposite side, no shadow.
    const fill = new THREE.DirectionalLight(0x7fb6ff, 1.0);
    fill.position.set(-3.2, 2.1, 1.6);
    this.fillLight = fill;

    // RIM — tight spot from behind for the edge highlight.
    const rim = new THREE.SpotLight(0xb98cff, 22, 12, Math.PI / 7, 0.55, 1.6);
    rim.position.set(-1.3, 3.1, -2.9);
    rim.target.position.set(0, 1.45, 0);
    this.rimLight = rim;

    // A second rim on the other shoulder keeps the silhouette readable
    // when the user orbits past 90°.
    const rim2 = new THREE.SpotLight(0x7fe9ff, 14, 12, Math.PI / 7.5, 0.6, 1.6);
    rim2.position.set(1.9, 2.7, -2.5);
    rim2.target.position.set(0, 1.45, 0);
    this.rimLight2 = rim2;

    this.ambient = new THREE.AmbientLight(0x4a5a86, 0.55);
    this.hemi = new THREE.HemisphereLight(0x6f8fd4, 0x0a0d18, 0.5);

    // Face light — a very soft bounce so the procedural facial
    // deformation stays legible in the portrait framing.
    this.faceLight = new THREE.PointLight(0xffffff, FACE_LIGHT.fill, FACE_LIGHT.fillRange, 2.0);
    this.faceLight.position.set(0, 1.62, 0.85);

    // Mouth fill — a small, tight light placed below the lip line once the
    // face has been measured. Without it the deforming lips fall into the
    // chin's shadow and all that careful rigging goes unseen.
    this.mouthLight = new THREE.PointLight(0xffe8de, FACE_LIGHT.mouth, FACE_LIGHT.mouthRange, 2.2);
    this.mouthLight.position.set(0, 1.58, 0.4);

    this.scene.add(key, key.target, fill, rim, rim.target, rim2, rim2.target,
      this.ambient, this.hemi, this.faceLight, this.mouthLight);
  }

  /* ---------------------------------------------------------- pedestal */
  _initPedestal() {
    const g = new THREE.Group();

    // Reflective disc.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.22, 0.07, 96, 1, false),
      new THREE.MeshStandardMaterial({ color: 0x0a0e1c, metalness: 1.0, roughness: 0.12, envMapIntensity: 1.2 })
    );
    disc.position.y = -0.035;
    disc.receiveShadow = true;
    this.disc = disc;

    // Inlaid bevel ring that catches the rim light.
    const bevel = new THREE.Mesh(
      new THREE.TorusGeometry(1.17, 0.018, 12, 128),
      new THREE.MeshStandardMaterial({ color: 0x7fe9ff, metalness: 0.9, roughness: 0.25, emissive: 0x7fe9ff, emissiveIntensity: 0.5 })
    );
    bevel.rotation.x = Math.PI / 2;
    bevel.position.y = 0.002;
    this.bevel = bevel;

    // Far ground plane so the fog has something to sit on.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({ color: 0x060810, metalness: 0.7, roughness: 0.55 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.075;
    ground.receiveShadow = true;
    this.ground = ground;

    // Concentric tech rings — alternating directions.
    this.rings = [];
    const specs = [
      { r: 0.62, seg: 24, gap: 0.55, w: 0.012, dir: 1,  speed: 0.22, op: 0.95 },
      { r: 0.82, seg: 44, gap: 0.35, w: 0.008, dir: -1, speed: 0.34, op: 0.75 },
      { r: 1.0,  seg: 12, gap: 0.68, w: 0.016, dir: 1,  speed: 0.15, op: 0.6 },
    ];
    for (const s of specs) {
      const ring = this._buildDashedRing(s);
      ring.userData.spec = s;
      g.add(ring);
      this.rings.push(ring);
    }

    // Soft glow pool under the feet.
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 64),
      new THREE.MeshBasicMaterial({
        color: 0x7fe9ff, transparent: true, opacity: 0.1,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.006;
    this.glowPool = glow;

    g.add(disc, bevel, ground, glow);
    this.pedestal = g;
    this.scene.add(g);
  }

  /** Builds a ring of separate arc segments — reads as a tech HUD, not a hoop. */
  _buildDashedRing({ r, seg, gap, w, op }) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x7fe9ff, transparent: true, opacity: op,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const arc = (Math.PI * 2) / seg;
    const geo = new THREE.RingGeometry(r - w, r + w, Math.max(6, Math.round(96 / seg)), 1, 0, arc * (1 - gap));
    for (let i = 0; i < seg; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -arc * i;
      group.add(m);
    }
    group.position.y = 0.012;
    group.userData.mat = mat;
    return group;
  }

  /* ---------------------------------------------------------- cyber dust */
  _initDust(count) {
    if (this.dust) {
      this.scene.remove(this.dust);
      this.dust.geometry.dispose();
      this.dust.material.dispose();
      this.dust = null;
    }
    this._dustCount = count;
    if (count <= 0) return;

    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3); // drift speed, phase, size
    for (let i = 0; i < count; i++) {
      // Weighted toward a column around the avatar rather than a cube.
      const a = Math.random() * Math.PI * 2;
      const rad = 0.25 + Math.pow(Math.random(), 0.65) * 2.1;
      pos[i * 3] = Math.cos(a) * rad;
      pos[i * 3 + 1] = Math.random() * 2.9 - 0.1;
      pos[i * 3 + 2] = Math.sin(a) * rad;
      seed[i * 3] = 0.03 + Math.random() * 0.09;
      seed[i * 3 + 1] = Math.random() * Math.PI * 2;
      seed[i * 3 + 2] = 0.4 + Math.random() * 1.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x9fd8ff) },
        uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float t = uTime * aSeed.x;
          // gentle vertical drift that wraps, plus a lazy orbital sway
          p.y = mod(p.y + t + aSeed.y * 0.3, 3.0) - 0.1;
          p.x += sin(uTime * 0.28 + aSeed.y) * 0.09;
          p.z += cos(uTime * 0.23 + aSeed.y * 1.7) * 0.09;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSeed.z * 3.2 * uPixelRatio * (1.9 / -mv.z);
          // fade at the top and bottom of the column, and with distance
          float edge = smoothstep(0.0, 0.5, p.y) * (1.0 - smoothstep(2.0, 2.9, p.y));
          vAlpha = edge * (0.28 + 0.4 * abs(sin(uTime * 0.7 + aSeed.y)));
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.05, d) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }`,
    });

    this.dust = new THREE.Points(geo, mat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  setDustCount(n) {
    this._initDust(Math.max(0, Math.round(n)));
    this.applyTheme(this.themeName);
  }

  /* ---------------------------------------------------------- themes */
  applyTheme(name) {
    const t = THEMES[name] || THEMES[DEFAULT_THEME];
    this.themeName = THEMES[name] ? name : DEFAULT_THEME;

    this.keyLight.color.setHex(t.key.color);
    this.keyLight.intensity = t.key.intensity;
    this.fillLight.color.setHex(t.fill.color);
    this.fillLight.intensity = t.fill.intensity;
    this.rimLight.color.setHex(t.rim.color);
    this.rimLight.intensity = t.rim.intensity;
    this.rimLight2.color.setHex(t.ringA);
    this.rimLight2.intensity = t.rim.intensity * 0.6;
    this.ambient.color.setHex(t.ambient.color);
    this.ambient.intensity = t.ambient.intensity;
    this.hemi.color.setHex(t.hemi.sky);
    this.hemi.groundColor.setHex(t.hemi.ground);
    this.hemi.intensity = t.hemi.intensity;
    this.faceLight.color.setHex(t.key.color);
    this.mouthLight.color.setHex(t.key.color);
    if (this.faceLightScale !== undefined) this.setFaceLight(this.faceLightScale);

    this.scene.background = null;
    this.scene.fog.color.setHex(t.bg);
    this.scene.fog.near = t.fog.near;
    this.scene.fog.far = t.fog.far;

    this.disc.material.color.setHex(t.floor);
    this.ground.material.color.setHex(t.bg);
    this.bevel.material.color.setHex(t.ringA);
    this.bevel.material.emissive.setHex(t.ringA);
    this.glowPool.material.color.setHex(t.ringA);

    this.rings.forEach((ring, i) => {
      ring.userData.mat.color.setHex(i % 2 === 0 ? t.ringA : t.ringB);
    });

    if (this.dust) this.dust.material.uniforms.uColor.value.setHex(t.dust);

    if (this.avatar) this.avatar.setEnvIntensity(t.env);
    if (this.chair) this.chair.setEnvIntensity(t.env);
    if (this.room) this.room.setEnvIntensity(t.env);
    if (this.hologramMat) this.hologramMat.uniforms.uColor.value.setHex(t.ringA);

    // Re-tint the whole interface from the same two hues.
    document.documentElement.dataset.theme = this.themeName;
    document.documentElement.style.setProperty('--hue-a', String(t.cssHueA));
    document.documentElement.style.setProperty('--hue-b', String(t.cssHueB));
    return this.themeName;
  }

  /** Tone-mapping exposure — the global brightness of the whole stage. */
  setExposure(v) { this.renderer.toneMappingExposure = v ?? FACE_LIGHT.exposure; }

  /** Scales both face lights together, 0…2. */
  setFaceLight(k) {
    this.faceLightScale = k;
    this.faceLight.intensity = FACE_LIGHT.fill * k;
    this.mouthLight.intensity = FACE_LIGHT.mouth * k;
  }

  /* ---------------------------------------------------------- quality */
  setQuality(level) {
    const q = QUALITY[level] || QUALITY[3];
    this.quality = level;
    this.renderer.setPixelRatio(Math.min(q.dpr, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = !!q.shadow;
    this.keyLight.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    if (this.keyLight.shadow.map) {
      this.keyLight.shadow.map.dispose();
      this.keyLight.shadow.map = null;
    }
    this.scene.traverse((o) => { if (o.isMesh && o.material) o.material.needsUpdate = true; });
    this._onResize();
  }

  /* ---------------------------------------------------------- resize */
  _onResize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const q = QUALITY[this.quality] || QUALITY[3];
    this.renderer.setPixelRatio(Math.min(q.dpr, window.devicePixelRatio || 1));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.dust) {
      this.dust.material.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    }
  }

  /* ---------------------------------------------------------- per-frame */
  update(dt, elapsed) {
    for (const ring of this.rings) {
      const s = ring.userData.spec;
      ring.rotation.y += s.dir * s.speed * dt;
      // Slow breathing on the ring brightness keeps the stage alive.
      ring.userData.mat.opacity = s.op * (0.72 + 0.28 * Math.sin(elapsed * 0.9 + s.r * 6));
    }
    this.glowPool.material.opacity = 0.08 + 0.05 * Math.sin(elapsed * 1.1);
    if (this.dust) this.dust.material.uniforms.uTime.value = elapsed;
    if (this.hologramMat) this.hologramMat.uniforms.uTime.value = elapsed;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------------------------------------------------- hologram */
  /**
   * Swaps the avatar's PBR material for a scanline/fresnel shader and
   * overlays a wireframe copy. Fully reversible.
   */
  setHologram(on, avatar) {
    if (!avatar || !avatar.mesh) return;
    const mesh = avatar.mesh;

    if (on && !this._holoOn) {
      const t = THEMES[this.themeName];
      this.hologramMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(t.ringA) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          varying vec3 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - world.xyz);
            gl_Position = projectionMatrix * viewMatrix * world;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          varying vec3 vWorld;
          void main() {
            float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 2.1);
            float scan = 0.5 + 0.5 * sin(vWorld.y * 190.0 - uTime * 5.0);
            float sweep = smoothstep(0.42, 0.0, abs(fract(vWorld.y * 0.42 - uTime * 0.2) - 0.5));
            float flick = 0.94 + 0.06 * sin(uTime * 41.0);
            float a = (0.1 + fres * 0.72) * (0.55 + 0.45 * scan) * flick + sweep * 0.3;
            gl_FragColor = vec4(uColor * (0.75 + fres * 1.4 + sweep), a);
          }`,
      });

      this._realMat = mesh.material;
      mesh.material = this.hologramMat;
      mesh.castShadow = false;

      this._wire = new THREE.Mesh(
        mesh.geometry,
        new THREE.MeshBasicMaterial({
          color: THEMES[this.themeName].ringB, wireframe: true,
          transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      mesh.add(this._wire);
      this._holoOn = true;
    } else if (!on && this._holoOn) {
      mesh.material = this._realMat;
      mesh.castShadow = true;
      if (this._wire) {
        mesh.remove(this._wire);
        this._wire.material.dispose();
        this._wire = null;
      }
      this.hologramMat?.dispose();
      this.hologramMat = null;
      this._holoOn = false;
    }
    return this._holoOn;
  }

  get hologramOn() { return !!this._holoOn; }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.chair?.dispose();
    this.room?.dispose();
    this.renderer.dispose();
  }
}
