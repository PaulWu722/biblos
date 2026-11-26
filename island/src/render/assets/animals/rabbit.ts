import * as THREE from 'three';
import { batchModel } from '../props/batchModel';
import { EdenPerch } from '../props/edenPerch';

export function createRabbit(level: 1|2|3): { group: THREE.Group; animate(t: number): void } {
  const group = new EdenPerch(-1.5, 1.395, 2, 0.97);
  const rig = new THREE.Group();
  group.add(rig);
  group.scale.setScalar(level === 1 ? 0.6 : level === 2 ? 0.85 : 1);
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
  const white = material(0xffffff);
  const ivory = material(0xf2eee8);
  const innerEar = material(0xf2c4cc);
  const eyes = material(0x171512);
  const pink = material(0xe6a6b7);
  const gold = material(0xe9c46a);

  function add(parent: THREE.Group, geometry: THREE.BufferGeometry, surface: THREE.Material,
    x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const rounded = new THREE.IcosahedronGeometry(1, 1);
  const oval = new THREE.SphereGeometry(1, 8, 6);
  const smallOval = new THREE.SphereGeometry(1, 5, 3);
  const body = add(rig, rounded, ivory, 0, 0.219, -0.035);
  body.scale.set(0.192, 0.219, 0.176);
  add(rig, oval, white, 0, 0.197, 0.064).scale.set(0.14, 0.169, 0.111);
  add(rig, rounded, white, 0, 0.15, -0.211).scale.setScalar(0.085);

  const head = new THREE.Group();
  head.position.set(0, 0.422, 0.075);
  head.scale.setScalar(level === 1 ? 1.19 : 1);
  rig.add(head);
  add(head, rounded, white, 0, 0, 0).scale.set(0.178, 0.161, 0.169);

  const ears: THREE.Group[] = [];
  const eye = new THREE.SphereGeometry(0.017, 4, 3);
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.082, 0.115, -0.02);
    ear.rotation.z = -side * 0.15;
    head.add(ear);
    ears.push(ear);
    add(ear, oval, white, 0, 0.127, 0).scale.set(0.051, 0.16, 0.043);
    add(ear, smallOval, innerEar, 0, 0.14, 0.032).scale.set(0.029, 0.117, 0.016);
    add(head, eye, eyes, side * 0.082, 0.019, 0.143);
    add(rig, smallOval, white, side * 0.121, 0.057, 0.086).scale.set(0.078, 0.057, 0.131);
    const forepaw = add(rig, smallOval, ivory, side * 0.067, 0.157, 0.152);
    forepaw.scale.set(0.041, 0.077, 0.047);
    forepaw.rotation.z = -side * 0.2;
  }
  add(head, new THREE.IcosahedronGeometry(0.023, 0), pink, 0, -0.025, 0.166)
    .scale.set(1.15, 0.72, 0.7);

  const halo = level === 3
    ? add(head, new THREE.TorusGeometry(0.18, 0.009, 4, 24), gold, 0, 0.465, 0)
    : undefined;
  if (halo) {
    halo.rotation.order = 'YXZ';
    halo.rotation.x = -Math.PI / 2 + 0.12;
  }

  const previousPosition = new THREE.Vector3();
  const position = new THREE.Vector3();
  let hasPosition = false;
  let hopStart: number | undefined;

  batchModel(group);
  return {
    group,
    animate(t: number): void {
      group.getWorldPosition(position);
      const moving = hasPosition && previousPosition.distanceToSquared(position) > 1e-8;
      previousPosition.copy(position);
      hasPosition = true;
      rig.position.y = 0.005 * (1 - Math.cos(t * 3));
      if (moving) {
        hopStart ??= t;
        rig.position.y += 0.065 * Math.abs(Math.sin((t - hopStart) * 8));
      } else {
        hopStart = undefined;
      }
      const twitch = Math.pow(Math.max(0, Math.cos(t * 1.23)), 32) * Math.sin(t * 25);
      ears[0]!.rotation.z = 0.15 + twitch * 0.17;
      ears[1]!.rotation.z = -0.15 - twitch * 0.08;
    },
  };
}
