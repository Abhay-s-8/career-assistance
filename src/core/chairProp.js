/* ============================================================
   AURA — Executive Chair Prop
   Loads and manages the 3D executive office chair model beside Siya,
   with PBR materials, shadows, Stitch theme tinting, and positioning.
   ============================================================ */

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export class ChairProp {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'prop_executive_chair';
    this.mesh = null;
    this.loaded = false;
    this.visible = true;

    // Default executive placement beside Siya behind sofa with generous clearance
    this.defaultTransform = {
      x: -0.82,
      y: 0.002,
      z: 0.25,
      rotationY: 0.38, // angled ~22° towards center stage
      scale: 0.0107,   // ~1.355m height (aligned with Siya's neck level)
    };

    this.scene.add(this.root);
  }

  async load(modelPath = '/models/chair/10239_Office_Chair_v1_L3.obj', texturePath = '/models/chair/10239_Office_Chair_v1_Diffuse.jpg') {
    try {
      const texLoader = new THREE.TextureLoader();
      const texture = await new Promise((resolve) => {
        texLoader.load(
          texturePath,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.flipY = true;
            resolve(t);
          },
          undefined,
          (err) => {
            console.warn('Chair texture load failed, using procedural fallback material:', err);
            resolve(null);
          }
        );
      });

      const objLoader = new OBJLoader();
      const obj = await new Promise((resolve, reject) => {
        objLoader.load(modelPath, resolve, undefined, reject);
      });

      // 3ds Max Wavefront OBJ export has Z-up; rotate X by -90 deg
      obj.rotation.x = -Math.PI / 2;

      // Compute bounding box
      const tempGroup = new THREE.Group();
      tempGroup.add(obj);
      tempGroup.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(tempGroup);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Upgrade materials to Stitch PBR Standard Material
      const chairMat = new THREE.MeshStandardMaterial({
        map: texture || null,
        color: texture ? 0xffffff : 0x22283a,
        roughness: 0.58,
        metalness: 0.25,
        envMapIntensity: 0.85,
        shadowSide: THREE.FrontSide,
      });

      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = chairMat;
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        }
      });

      // Wrap in inner group to center pivot at base
      const innerGroup = new THREE.Group();
      // Center X and Z, ground Y to 0
      obj.position.set(-center.x, -box.min.y, -center.z);
      innerGroup.add(obj);

      // Apply default scale and transform
      const s = this.defaultTransform.scale;
      innerGroup.scale.set(s, s, s);

      this.root.position.set(this.defaultTransform.x, this.defaultTransform.y, this.defaultTransform.z);
      this.root.rotation.y = this.defaultTransform.rotationY;
      this.root.add(innerGroup);

      this.mesh = innerGroup;
      this.material = chairMat;
      this.loaded = true;
      this.setVisible(this.visible);

      return this;
    } catch (err) {
      console.warn('Failed to load chair prop:', err);
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

  setScale(s) {
    if (s !== undefined && this.mesh) {
      this.mesh.scale.set(s, s, s);
    }
  }

  setEnvIntensity(val) {
    if (this.material && this.material.envMapIntensity !== undefined) {
      this.material.envMapIntensity = val;
    }
  }

  dispose() {
    if (this.material) {
      if (this.material.map) this.material.map.dispose();
      this.material.dispose();
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
