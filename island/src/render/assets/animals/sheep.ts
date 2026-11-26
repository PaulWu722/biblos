import * as THREE from 'three';
import { batchModel } from '../props/batchModel';
import { EdenPerch } from '../props/edenPerch';

export function createSheep(level: 1|2|3): { group: THREE.Group; animate(t: number): void } {
  const group = new EdenPerch(0.5, 0.52, 1.78, -0.37);
  const rig = new THREE.Group();
  group.add(rig);
  group.scale.setScalar(level === 1 ? 0.6 : level === 2 ? 0.85 : 1);
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
  const wool = material(0xfbf8f2);
  const shade = material(0xf4eee4);
  const gray = material(0x5a524a);
  const face = material(0xf1e6d4);
  const black = material(0x171512);
  const gold = material(0xe9c46a);

  function add(parent: THREE.Group, geometry: THREE.BufferGeometry, surface: THREE.Material,
    x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const fluff = new THREE.IcosahedronGeometry(1, 1);
  const tuft = new THREE.IcosahedronGeometry(1, 0);
  add(rig, fluff, wool, 0, 0.375, -0.065).scale.set(0.225, 0.208, 0.306);
  for (let ring = 0; ring < 4; ring++) {
    for (let tuftIndex = 0; tuftIndex < 7; tuftIndex++) {
      const angle = (tuftIndex + ring * 0.48) * Math.PI * 2 / 7;
      const endScale = ring === 0 || ring === 3 ? 0.75 : 1;
      const size = 0.083 + ((ring * 3 + tuftIndex) % 5) * 0.012;
      const puff = add(rig, tuft, tuftIndex % 3 === 0 ? shade : wool,
        Math.cos(angle) * 0.186 * endScale, 0.385 + Math.sin(angle) * 0.152 * endScale,
        -0.25 + ring * 0.121);
      puff.scale.set(size, size * 0.95, size * 1.12);
      puff.rotation.set(ring * 0.56, tuftIndex * 0.34, angle);
    }
  }
  add(rig, tuft, wool, 0, 0.391, -0.342).scale.set(0.078, 0.084, 0.091);

  const head = new THREE.Group();
  head.position.set(0, 0.412, 0.244);
  head.scale.setScalar(level === 1 ? 1.2 : 1);
  rig.add(head);
  add(head, new THREE.SphereGeometry(1, 8, 5), face, 0, 0, 0)
    .scale.set(0.111, 0.119, 0.115);
  add(head, tuft, wool, 0, 0.107, 0.005).scale.set(0.13, 0.084, 0.115);
  const eye = new THREE.SphereGeometry(0.017, 4, 3);
  for (const side of [-1, 1]) {
    const ear = add(head, tuft, face, side * 0.129, 0.044, -0.004);
    ear.scale.set(0.083, 0.031, 0.042);
    ear.rotation.z = -side * 0.25;
    add(head, eye, black, side * 0.056, 0.018, 0.099);
  }

  const legs: THREE.Group[] = [];
  const legGeometry = new THREE.CylinderGeometry(0.039, 0.032, 0.215, 5);
  for (const z of [-0.2, 0.12]) {
    for (const x of [-0.126, 0.126]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.215, z);
      rig.add(leg);
      add(leg, legGeometry, gray, 0, -0.1075, 0);
      legs.push(leg);
    }
  }

  const halo = level === 3
    ? add(head, new THREE.TorusGeometry(0.18, 0.009, 4, 24), gold, 0, 0.257, 0)
    : undefined;
  if (halo) {
    halo.rotation.order = 'YXZ';
    halo.rotation.x = -Math.PI / 2 + 0.12;
  }

  batchModel(group);
  return {
    group,
    animate(t: number): void {
      rig.position.y = 0.01 * (1 - Math.cos(t * 4));
      const stride = Math.sin(t * 2) * 0.035;
      legs.forEach((leg, index) => { leg.rotation.x = index === 0 || index === 3 ? stride : -stride; });
    },
  };
}
