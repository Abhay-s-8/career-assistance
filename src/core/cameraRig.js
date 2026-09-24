/* ============================================================
   AURA — Camera rig
   OrbitControls with damping for free 360° inspection, plus
   tweened presets that are auto-calibrated to the loaded model.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA_PRESETS, PORTRAIT_REFERENCE_FACE_Y, IDLE } from './config.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.presets = structuredClone(CAMERA_PRESETS);
    this.current = 'portrait';
    this._tween = null;

    const c = new OrbitControls(camera, domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.055;
    c.rotateSpeed = 0.62;
    c.panSpeed = 0.55;
    c.zoomSpeed = 0.75;
    c.enablePan = true;
    c.screenSpacePanning = true;
    c.minPolarAngle = 0.15;
    c.maxPolarAngle = Math.PI * 0.86;
    c.autoRotateSpeed = 1.35;
    this.controls = c;

    // Any manual interaction cancels an in-flight preset tween so the
    // camera never fights the user's hand.
    const cancel = () => { this._tween = null; };
    domElement.addEventListener('pointerdown', cancel);
    domElement.addEventListener('wheel', cancel, { passive: true });

    this.apply('portrait', true);
  }

  /**
   * Shifts every preset vertically so the framing lands accurately on
   * Siya's real anatomy (waist, hands, chest, and face in sharp focus).
   */
  calibrate(faceY) {
    if (!Number.isFinite(faceY)) return;
    this.faceY = faceY;
    const d = faceY - PORTRAIT_REFERENCE_FACE_Y;
    for (const k of Object.keys(this.presets)) {
      const p = this.presets[k];
      if (k === 'portrait') {
        p.pos[1] = (faceY - 0.20) + 0.02;
        p.lookAt[1] = faceY - 0.25; // Focused from waist up on Siya's upper body and gestures
      } else if (k === 'discovery') {
        p.pos[0] = 0.34; // Perfectly positioned in the visible open area, clear of left/right panels
        p.lookAt[0] = 0.34;
        p.pos[1] = faceY - 0.03; // Eye level camera height
        p.lookAt[1] = faceY - 0.05; // Focused directly on Siya's face and expressions
        p.pos[2] = 1.30; // Clean portrait face framing
        p.fov = 30;
      } else if (k === 'orbit') {
        p.pos[1] = faceY - 0.18;
        p.lookAt[1] = faceY - 0.28; // Centered precisely on Siya as revolving axis
      } else {
        p.pos[1] = 1.05 + d * 0.3;
        p.lookAt[1] = 0.92 + d * 0.3;
      }
    }
    this.apply(this.current, true);
  }

  apply(name, instant = false) {
    const p = this.presets[name];
    if (!p) return this.current;
    this.current = name;

    const toPos = new THREE.Vector3(...p.pos);
    const toTgt = new THREE.Vector3(...p.lookAt);

    this.controls.minDistance = p.minDistance;
    this.controls.maxDistance = p.maxDistance;
    this.controls.autoRotate = !!p.autoRotate;
    this.controls.autoRotateSpeed = 1.35;

    if (instant) {
      this.camera.position.copy(toPos);
      this.controls.target.copy(toTgt);
      this.camera.fov = p.fov;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      this._tween = null;
      return name;
    }

    this._tween = {
      t: 0,
      dur: 1.05,
      fromPos: this.camera.position.clone(),
      toPos,
      fromTgt: this.controls.target.clone(),
      toTgt,
      fromFov: this.camera.fov,
      toFov: p.fov,
    };
    return name;
  }

  update(dt) {
    const tw = this._tween;
    if (tw) {
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = easeInOut(tw.t);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.controls.target.lerpVectors(tw.fromTgt, tw.toTgt, k);
      const fov = tw.fromFov + (tw.toFov - tw.fromFov) * k;
      if (Math.abs(fov - this.camera.fov) > 0.001) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
      }
      if (tw.t >= 1) this._tween = null;
    }
    this.controls.update();
  }

  /**
   * Optional parallax drift. Off by default (IDLE.cameraDrift = 0): a camera
   * that moves on its own fights the user's hand and reads as a wobble.
   */
  breathe(elapsed, amount = 1) {
    const k = IDLE.cameraDrift * amount;
    if (!k || this._tween || this.controls.autoRotate) return;
    this.camera.position.x += Math.sin(elapsed * 0.31) * k;
    this.camera.position.y += Math.sin(elapsed * 0.24 + 1.3) * k * 0.7;
  }

  dispose() { this.controls.dispose(); }
}
