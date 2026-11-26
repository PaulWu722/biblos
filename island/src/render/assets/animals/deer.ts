import * as THREE from 'three';
import { batchModel } from '../props/batchModel';
import { EdenPerch } from '../props/edenPerch';

export function createDeer(level: 1|2|3): { group: THREE.Group; animate(t: number): void } {
  const group = new EdenPerch(2.9, 0.965, 1.1, -0.41);
  const rig = new THREE.Group();
  group.add(rig);
  group.scale.setScalar(level === 1 ? 0.6 : level === 2 ? 0.85 : 1);
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
  const brown = material(0xc99a6b);
  const tan = material(0xe8dcc4);
  const white = material(0xffffff);
  const wood = material(0xa47551);
  const dark = material(0x29201e);
  const gold = material(0xe9c46a);

  function add(parent: THREE.Group, geometry: THREE.BufferGeometry, surface: THREE.Material,
    x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const oval = new THREE.SphereGeometry(1, 6, 4);
  add(rig, new THREE.SphereGeometry(1, 8, 6), brown, 0, 0.431, -0.061)
    .scale.set(0.128, 0.113, 0.278);
  add(rig, oval, white, 0, 0.372, -0.037).scale.set(0.106, 0.069, 0.195);
  add(rig, new THREE.CylinderGeometry(0.055, 0.085, 0.284, 7), brown, 0, 0.544, 0.154)
    .rotation.x = 0.27;
  const tail = add(rig, new THREE.IcosahedronGeometry(1, 0), white, 0, 0.46, -0.326);
  tail.scale.set(0.044, 0.062, 0.035);
  tail.rotation.x = -0.52;

  const spot = new THREE.SphereGeometry(1, 4, 2);
  for (const side of [-1, 1]) {
    for (const [x, y, z] of [[0.075, 0.500, -0.205], [0.092, 0.503, -0.115], [0.105, 0.490, -0.045], [0.110, 0.451, -0.165], [0.120, 0.455, -0.085]]) {
      const mark = add(rig, spot, white, side * x, y, z);
      mark.scale.set(0.017, 0.010, 0.020);
      mark.rotation.z = -side * 0.68;
    }
  }

  const head = new THREE.Group();
  head.position.set(0, 0.692, 0.192);
  head.scale.setScalar(level === 1 ? 1.2 : 1);
  rig.add(head);
  add(head, oval, brown, 0, 0, 0).scale.set(0.091, 0.087, 0.116);
  add(head, oval, white, 0, -0.031, 0.08).scale.set(0.06, 0.042, 0.07);
  add(head, new THREE.IcosahedronGeometry(0.032, 0), dark, 0, -0.02, 0.141)
    .scale.set(1, 0.66, 0.58);
  const eye = new THREE.SphereGeometry(0.015, 4, 3);
  const ear = new THREE.IcosahedronGeometry(1, 0);
  for (const side of [-1, 1]) {
    const outerEar = add(head, ear, brown, side * 0.102, 0.057, -0.029);
    outerEar.scale.set(0.04, 0.085, 0.025);
    outerEar.rotation.z = -side * 0.9;
    const innerEar = add(head, ear, tan, side * 0.109, 0.062, -0.012);
    innerEar.scale.set(0.024, 0.065, 0.011);
    innerEar.rotation.z = outerEar.rotation.z;
    add(head, eye, dark, side * 0.066, 0.02, 0.069);
  }

  const legs: THREE.Group[] = [];
  const legGeometry = new THREE.CylinderGeometry(0.031, 0.014, 0.333, 4);
  const hoof = new THREE.CylinderGeometry(0.016, 0.023, 0.049, 4);
  for (const z of [-0.222, 0.106]) {
    for (const x of [-0.083, 0.083]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.38, z);
      rig.add(leg);
      add(leg, legGeometry, brown, 0, -0.1665, 0);
      add(leg, hoof, dark, 0, -0.3555, 0);
      legs.push(leg);
    }
  }

  if (level >= 2) {
    function tine(side: number, start: [number, number, number],
      end: [number, number, number], radius: number): void {
      const a = new THREE.Vector3(side * start[0], start[1], start[2]);
      const b = new THREE.Vector3(side * end[0], end[1], end[2]);
      const axis = b.clone().sub(a);
      const midpoint = a.lerp(b, 0.5);
      const mesh = add(head, new THREE.CylinderGeometry(radius * 0.6, radius, axis.length(), 3),
        wood, midpoint.x, midpoint.y, midpoint.z);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    }
    for (const side of [-1, 1]) {
      tine(side, [0.051, 0.064, -0.036], [0.10, 0.207, -0.067], 0.017);
      tine(side, [0.10, 0.207, -0.067], [0.126, 0.282, -0.083], 0.013);
      tine(side, [0.086, 0.167, -0.058], [0.151, 0.222, -0.034], 0.011);
    }

  }

  const halo = level === 3
    ? add(head, new THREE.TorusGeometry(0.18, 0.009, 4, 24), gold, 0, 0.356, -0.043)
    : undefined;
  if (halo) {
    halo.rotation.order = 'YXZ';
    halo.rotation.x = -Math.PI / 2 + 0.12;
  }

  batchModel(group);
  return {
    group,
    animate(t: number): void {
      rig.position.y = 0.012 * (1 - Math.cos(t * 4));
      const stride = Math.sin(t * 2) * 0.035;
      legs.forEach((leg, index) => { leg.rotation.x = index === 0 || index === 3 ? stride : -stride; });
    },
  };
}
