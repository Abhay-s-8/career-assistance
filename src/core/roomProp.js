/* ============================================================
   AURA — Executive 3D Room Prop
   Loads, centers, and renders the 3D executive studio & tech office
   room environment with curated architectural PBR materials, custom
   element colors (white walls, smoked oak parquet, walnut desk,
   brass tables, colorful books, acoustic art, and glowing LED lamps).
   ============================================================ */

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

function generatePlanarUVs(geometry) {
  if (!geometry) return;
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const sizeX = (bb.max.x - bb.min.x) || 1;
  const sizeY = (bb.max.y - bb.min.y) || 1;
  const pos = geometry.attributes.position;
  if (!pos) return;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uvs[i * 2] = (x - bb.min.x) / sizeX;
    uvs[i * 2 + 1] = (y - bb.min.y) / sizeY;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.uvsNeedUpdate = true;
}

function createTVScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep obsidian gradient with tech ambiance
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 512);
  bgGrad.addColorStop(0, '#040711');
  bgGrad.addColorStop(0.5, '#0a1426');
  bgGrad.addColorStop(1, '#050914');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle studio grid overlay
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 40; x < 1024; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 40; y < 512; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  // Glowing ambient horizontal light streak
  const streak = ctx.createLinearGradient(0, 256, 1024, 256);
  streak.addColorStop(0, 'rgba(56, 189, 248, 0)');
  streak.addColorStop(0.25, 'rgba(56, 189, 248, 0.18)');
  streak.addColorStop(0.5, 'rgba(168, 85, 247, 0.28)');
  streak.addColorStop(0.75, 'rgba(56, 189, 248, 0.18)');
  streak.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = streak;
  ctx.fillRect(0, 240, 1024, 32);

  // Top header branding
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('✦ SIYA 3D AI STUDIO', 48, 68);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('EXECUTIVE NEURAL SUITE · 4K OLED HDR DISPLAY', 48, 96);

  // Audio spectrum visualizer bars in center
  const barCount = 28;
  const barWidth = 14;
  const gap = 8;
  const startX = (1024 - (barCount * (barWidth + gap))) / 2;
  const heights = [20, 35, 50, 75, 100, 125, 90, 65, 115, 145, 95, 80, 135, 155, 130, 100, 120, 85, 110, 140, 75, 55, 90, 70, 50, 38, 28, 18];

  for (let i = 0; i < barCount; i++) {
    const h = heights[i % heights.length];
    const x = startX + i * (barWidth + gap);
    const y = 310 - h;
    const barGrad = ctx.createLinearGradient(0, y, 0, 310);
    barGrad.addColorStop(0, '#38bdf8');
    barGrad.addColorStop(1, 'rgba(168, 85, 247, 0.65)');
    ctx.fillStyle = barGrad;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, h, 4);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, barWidth, h);
    }
  }

  // Status bottom line
  ctx.fillStyle = '#38bdf8';
  ctx.font = '13px monospace';
  ctx.fillText('● SYSTEM ONLINE · DUAL HI-FI MONITORS SYNCHRONIZED', 48, 455);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.fillText('HIGH-FIDELITY SPATIAL ACOUSTICS', 710, 455);

  // Sleek TV bezel / frame border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1010, 498);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class RoomProp {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'prop_executive_room';
    this.mesh = null;
    this.loaded = false;
    this.visible = true;

    // Align room so Siya and the executive chair are positioned behind the sofa set
    this.defaultTransform = {
      x: -1.40,
      y: -0.949, // aligns room floor top (0.949m) precisely with stage ground (y:0)
      z: -2.25,
      rotationY: 0,
      scale: 1.0,
    };

    this.scene.add(this.root);
  }

  async load(modelPath = '/models/room/house.obj') {
    try {
      const objLoader = new OBJLoader();
      const obj = await new Promise((resolve, reject) => {
        objLoader.load(modelPath, resolve, undefined, reject);
      });

      /* -------------------------------------------------- PBR Material Palette */
      // 1. Architectural Gallery White Walls
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.82,
        metalness: 0.02,
        envMapIntensity: 0.55,
        shadowSide: THREE.FrontSide,
      });

      // 2. Smoked Oak Hardwood Parquet Floor
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x2c221a,
        roughness: 0.32,
        metalness: 0.15,
        envMapIntensity: 1.25,
        shadowSide: THREE.FrontSide,
      });

      // 3. Woven Area Rug
      const rugMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.94,
        metalness: 0.02,
        shadowSide: THREE.FrontSide,
      });

      // 4. Executive Walnut Desk
      const deskMat = new THREE.MeshStandardMaterial({
        color: 0x221a14,
        roughness: 0.46,
        metalness: 0.18,
        envMapIntensity: 0.95,
        shadowSide: THREE.FrontSide,
      });

      // 5. Timber Desk Drawers
      const drawerMat = new THREE.MeshStandardMaterial({
        color: 0x382b22,
        roughness: 0.48,
        metalness: 0.15,
        shadowSide: THREE.FrontSide,
      });

      // 6. Long Wall Credenza & Cabinetry
      const credenzaMat = new THREE.MeshStandardMaterial({
        color: 0x2a2018,
        roughness: 0.50,
        metalness: 0.14,
        envMapIntensity: 0.85,
        shadowSide: THREE.FrontSide,
      });

      // 7. Brushed Brass & Gold Table Base
      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.28,
        metalness: 0.92,
        envMapIntensity: 1.45,
        shadowSide: THREE.FrontSide,
      });

      // 8. Smoked Obsidian Glass Table Top
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        transparent: true,
        opacity: 0.65,
        roughness: 0.12,
        metalness: 0.88,
        envMapIntensity: 1.6,
      });

      // 9. Brushed Titanium & Chrome Hardware
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.25,
        metalness: 0.92,
        envMapIntensity: 1.35,
      });

      // 10. Floor Lamp Warm Radiance
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfde68a,
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.1,
      });

      // 11. Tech Cyan LED Accent Ring
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.95,
        roughness: 0.15,
        metalness: 0.1,
      });

      // 12. Studio Hi-Fi Speakers (Matched Pair: Left & Right flanking the TV)
      const speakerMat = new THREE.MeshStandardMaterial({
        color: 0x0a0e17,
        roughness: 0.32,
        metalness: 0.72,
        envMapIntensity: 1.4,
        shadowSide: THREE.FrontSide,
      });

      // 13. 4K OLED Smart TV Screen Display
      const tvScreenTexture = createTVScreenTexture();
      const tvScreenMat = new THREE.MeshStandardMaterial({
        map: tvScreenTexture,
        color: 0xffffff,
        emissive: 0x0c1524,
        emissiveIntensity: 0.85,
        roughness: 0.12,
        metalness: 0.85,
        envMapIntensity: 1.8,
        shadowSide: THREE.FrontSide,
      });

      // 14. Gallery Wall Frames
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.38,
        metalness: 0.75,
      });

      // 15. Colorful Shelf Library Books
      const bookColors = [0x1e3a8a, 0x991b1b, 0x065f46, 0xd97706, 0x6b21a8, 0x0f766e, 0x831843];
      const bookMaterials = bookColors.map(c => new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.72,
        metalness: 0.05,
      }));

      // 16. Acoustic Panels & Decorative Ceramic Items
      const acousticMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92, metalness: 0.05 });
      const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.08 });
      const fabricMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, metalness: 0.02 });

      this.wallMat = wallMat;
      this.tvScreenMat = tvScreenMat;
      this.speakerMat = speakerMat;
      this.materials = [
        wallMat, floorMat, rugMat, deskMat, drawerMat, credenzaMat,
        brassMat, glassMat, chromeMat, lampMat, ledMat, speakerMat, tvScreenMat,
        frameMat, acousticMat, ceramicMat, fabricMat, ...bookMaterials
      ];

      /* -------------------------------------------------- Mesh Traversal & Mapping */
      let bookIdx = 0;
      obj.traverse((child) => {
        if (!child.isMesh) return;
        child.receiveShadow = true;
        child.castShadow = true;
        child.frustumCulled = false;

        const n = child.name.toLowerCase();

        // 1. Floor area rug
        if (n.includes('plane.001')) {
          child.material = rugMat;
        }
        // 2. Wall-mounted OLED TV / Display Screen (Plane)
        else if (n === 'plane' || n.startsWith('plane')) {
          generatePlanarUVs(child.geometry);
          child.material = tvScreenMat;
        }
        // 3. Studio Hi-Fi Speakers (Left & Right flanking the TV: Cube.030_Cube.031 & Cube.042_Cube.032)
        else if (n === 'cube.030_cube.031' || n === 'cube.042_cube.032') {
          child.material = speakerMat;
        }
        // 4. Floor Parquet
        else if (n.includes('cube.003_cube.004') || n.includes('floor')) {
          child.material = floorMat;
        }
        // 5. Lighting & Lamps
        else if (n.includes('circle.004') || n.includes('circle.005') || n.includes('lamp') || n.includes('light')) {
          child.material = lampMat;
        } else if (n.includes('circle.003') || n.includes('led')) {
          child.material = ledMat;
        }
        // 6. Round table & glass
        else if (n.includes('circle.002') || n.includes('glass')) {
          child.material = glassMat;
        } else if (n.includes('circle.001') || n === 'circle' || n.startsWith('circle')) {
          child.material = brassMat;
        } else if (n.startsWith('cube.006') || n.startsWith('cube.007') || n.startsWith('cube.008') ||
                   n.startsWith('cube.009') || n.startsWith('cube.010') || n.startsWith('cube.011') || n.startsWith('cube.012') || n.startsWith('cube.013')) {
          child.material = brassMat;
        }
        // 7. Desks, seating, and cabinetry
        else if (n.includes('cube.014_cube.005') || n.includes('desk') || n.includes('table')) {
          child.material = deskMat;
        } else if (n.includes('cube.015') || n.includes('cube.016') || n.includes('cube.017') || n.includes('cube.018')) {
          child.material = drawerMat;
        } else if (n.includes('cube.005_cube.002') || n.includes('credenza') || n.includes('shelf') || n.includes('cube.031_cube.015')) {
          child.material = credenzaMat;
        }
        // 8. Books on shelves
        else if (n.startsWith('cube.033') || n.startsWith('cube.034') || n.startsWith('cube.035') ||
                   n.startsWith('cube.036') || n.startsWith('cube.037') || n.startsWith('cube.038') || n.startsWith('cube.039')) {
          child.material = bookMaterials[bookIdx % bookMaterials.length];
          bookIdx++;
        }
        // 9. Wall gallery frames (Cube.019 through Cube.029)
        else if (n.startsWith('cube.019') || n.startsWith('cube.020') || n.startsWith('cube.021') ||
                   n.startsWith('cube.022') || n.startsWith('cube.023') || n.startsWith('cube.024') ||
                   n.startsWith('cube.025') || n.startsWith('cube.026') || n.startsWith('cube.027') ||
                   n.startsWith('cube.028') || n.startsWith('cube.029')) {
          child.material = frameMat;
        }
        // 10. Wall acoustic felt panel & decorative ceramics
        else if (n.includes('cube.041')) {
          child.material = acousticMat;
        } else if (n.includes('cube.040')) {
          child.material = ceramicMat;
        }
        // 11. Walls & structure
        else {
          child.material = wallMat;
        }
      });

      const s = this.defaultTransform.scale;
      obj.scale.set(s, s, s);
      this.root.position.set(this.defaultTransform.x, this.defaultTransform.y, this.defaultTransform.z);
      this.root.rotation.y = this.defaultTransform.rotationY;
      this.root.add(obj);

      this.mesh = obj;
      this.loaded = true;
      this.setVisible(this.visible);

      return this;
    } catch (err) {
      console.warn('Failed to load room prop:', err);
      return null;
    }
  }

  setVisible(visible) {
    this.visible = !!visible;
    this.root.visible = this.visible;
  }

  toggle() {
    this.setVisible(!this.visible);
    return this.visible;
  }

  setPosition(x, y, z) {
    if (x !== undefined) this.root.position.x = x;
    if (y !== undefined) this.root.position.y = y;
    if (z !== undefined) this.root.position.z = z;
  }

  setRotation(rotY) {
    if (rotY !== undefined) this.root.rotation.y = rotY;
  }

  setWallColor(colorHex) {
    if (this.wallMat) {
      this.wallMat.color.set(colorHex);
      this.wallMat.needsUpdate = true;
    }
  }

  setEnvIntensity(val) {
    for (const mat of this.materials || []) {
      if (mat && mat.envMapIntensity !== undefined) {
        mat.envMapIntensity = val;
      }
    }
  }

  dispose() {
    for (const mat of this.materials || []) {
      mat.dispose();
    }
    if (this.mesh) {
      this.mesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      this.root.remove(this.mesh);
    }
    this.scene.remove(this.root);
  }
}
