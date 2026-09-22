/* ============================================================
   AURA — Mouth cavity
   A fused character mesh is a closed shell: it has lips, but no
   inside. Once the seam is cut the lips can part, and without
   this you would be looking through the head.

   So we build the missing interior — a dark dome, two rows of
   teeth and a tongue — and sit it just behind the lip plane.
   When the model already has built-in teeth (like Ready Player Me),
   this cleanly defers to the avatar's native meshes.
   ============================================================ */

import * as THREE from 'three';

export class MouthCavity {
  /** @param {import('./avatar.js').Avatar} avatar */
  constructor(avatar) {
    this.avatar = avatar;
    this.group = new THREE.Group();
    this._euler = new THREE.Euler();

    if (!avatar) return;

    // If avatar already has native teeth mesh or ARKit morph meshes, use built-in cavity
    const hasNativeTeeth = avatar.meshes?.some((m) => m.name.toLowerCase().includes('teeth'))
      || (avatar.morphMeshes && avatar.morphMeshes.length > 0);

    if (hasNativeTeeth) {
      avatar.root?.add(this.group);
      return;
    }

    const F = avatar.face || {
      cx: 0, seamY: 1.48, lipZ: 0.08, lipUpperH: 0.015, mouthHalfW: 0.035,
    };
    const U = F.lipUpperH || 0.015;
    const M = F.mouthHalfW || 0.035;
    const Z = F.lipZ || 0.08;

    this.headPivot = (avatar.headPivotWorld || new THREE.Vector3(0, 1.42, 0)).clone();
    this.jawPivot = (avatar.jawPivotWorld || new THREE.Vector3(0, 1.52, -0.05)).clone();

    // Everything hangs off the head pivot so head tilt / nod carries it.
    this.group.position.copy(this.headPivot);

    const skull = new THREE.Group();
    const jaw = new THREE.Group();
    jaw.position.copy(this.jawPivot).sub(this.headPivot);
    this.jaw = jaw;
    this.group.add(skull, jaw);

    const at = (mesh, x, y, z, origin) => {
      mesh.position.set(x, y, z).sub(origin);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      return mesh;
    };

    const voidMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x1a0509, side: THREE.BackSide, fog: false })
    );
    voidMesh.scale.set(M * 1.3, U * 2.2, U * 3.0);
    at(voidMesh, F.cx, F.seamY - U * 0.5, Z - U * 4.2, this.headPivot);
    skull.add(voidMesh);
    this.void = voidMesh;

    const enamel = new THREE.MeshStandardMaterial({
      color: 0xf2ece4, roughness: 0.34, metalness: 0.0, envMapIntensity: 0.5,
    });
    const upper = new THREE.Mesh(
      archGeometry(M * 0.78, U * 1.9, U * 0.4, U * 0.55), enamel
    );
    at(upper, F.cx, F.seamY + U * 0.42, Z - U * 1.15 - U * 1.9, this.headPivot);
    skull.add(upper);
    this.upperTeeth = upper;

    const lower = new THREE.Mesh(
      archGeometry(M * 0.72, U * 1.75, U * 0.34, U * 0.5), enamel.clone()
    );
    lower.material.color.setHex(0xe8e0d6);
    at(lower, F.cx, F.seamY - U * 0.5, Z - U * 1.3 - U * 1.75, this.jawPivot);
    jaw.add(lower);
    this.lowerTeeth = lower;

    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x8c3341, roughness: 0.55, envMapIntensity: 0.4 })
    );
    tongue.scale.set(M * 0.7, U * 0.35, U * 1.2);
    at(tongue, F.cx, F.seamY - U * 1.15, Z - U * 3.2, this.jawPivot);
    jaw.add(tongue);
    this.tongue = tongue;

    for (const m of [voidMesh, upper, lower, tongue]) {
      m.frustumCulled = false;
      m.renderOrder = -1;
    }

    avatar.root?.add(this.group);
  }

  update() {
    if (!this.jaw) return;
    const a = this.avatar;
    const h = a?.headEuler;
    if (h) {
      this._euler.set(h[0], h[1], h[2], 'YXZ');
      this.group.quaternion.setFromEuler(this._euler);
    }
    this.jaw.rotation.x = a?.jawAngle || 0;
  }

  setVisible(v) { this.group.visible = v; }

  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose(); }
    });
    this.group.removeFromParent();
  }
}

function archGeometry(halfWidth, depth, height, thickness, segments = 18, sweep = 1.32) {
  const pos = [];
  const idx = [];
  const ring = [];
  for (let i = 0; i <= segments; i++) {
    const a = -sweep + (2 * sweep * i) / segments;
    const sx = Math.sin(a) / Math.sin(sweep);
    const cz = (Math.cos(a) - Math.cos(sweep)) / (1 - Math.cos(sweep));
    const xo = halfWidth * sx;
    const zo = depth * cz;
    const xi = (halfWidth - thickness) * sx;
    const zi = (depth - thickness) * cz;
    ring.push([
      [xo, height, zo], [xo, -height, zo], [xi, -height, zi], [xi, height, zi],
    ]);
  }
  for (let i = 0; i < ring.length; i++) for (const p of ring[i]) pos.push(p[0], p[1], p[2]);
  const V = (i, k) => i * 4 + k;
  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      idx.push(V(i, k), V(i + 1, k), V(i, k2));
      idx.push(V(i, k2), V(i + 1, k), V(i + 1, k2));
    }
  }
  for (const i of [0, segments]) {
    const f = i === 0 ? [V(i, 0), V(i, 1), V(i, 2), V(i, 3)] : [V(i, 3), V(i, 2), V(i, 1), V(i, 0)];
    idx.push(f[0], f[1], f[2], f[0], f[2], f[3]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
