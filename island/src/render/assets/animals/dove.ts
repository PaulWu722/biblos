import * as THREE from 'three';
import { batchModel } from '../props/batchModel';
import { EdenPerch } from '../props/edenPerch';

export function createDove(level: 1|2|3): { group: THREE.Group; animate(t: number): void } {
  const group = new EdenPerch(0.1, 1.35, -4.7, -0.75);
  const rig = new THREE.Group();
  const scale = level === 1 ? 0.6 : level === 2 ? 0.85 : 1;
  group.add(rig);
  group.scale.setScalar(scale);
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
  const white = material(0xffffff);
  const orange = material(0xe79b4f);
  const featherWhite = material(0xffffff);
  const featherShade = material(0xf2eee8);
  featherWhite.side = featherShade.side = THREE.DoubleSide;
  const eyes = material(0x171512);
  const gold = material(0xe9c46a);

  function add(parent: THREE.Group, geometry: THREE.BufferGeometry, surface: THREE.Material,
    x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function feather(parent: THREE.Group, surface: THREE.Material,
    points: [number, number, number][]): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]);
    geometry.computeVertexNormals();
    add(parent, geometry, surface, 0, 0, 0);
  }

  const body = new THREE.SphereGeometry(1, 10, 6);
  const vertices = body.attributes.position!;
  for (let i = 0; i < vertices.count; i++) {
    const z = vertices.getZ(i);
    const taper = 0.83 + z * 0.25;
    vertices.setXYZ(i, vertices.getX(i) * taper, vertices.getY(i) * taper + z * 0.09, z);
  }
  body.computeVertexNormals();
  add(rig, body, white, 0, 0, 0).scale.set(0.155, 0.146, 0.225);
  for (const side of [-1, 0, 1]) {
    feather(rig, side === 0 ? featherWhite : featherShade, [
      [-0.035, -0.028, -0.151], [0.036, -0.028, -0.152],
      [side * 0.053 + 0.035, -0.009, -0.314],
      [side * 0.057, -0.004, -0.336], [side * 0.053 - 0.035, -0.009, -0.314],
    ]);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.085, 0.139);
  head.scale.setScalar(level === 1 ? 1.22 : 1);
  rig.add(head);
  add(head, new THREE.IcosahedronGeometry(0.087, 1), white, 0, 0, 0);
  add(head, new THREE.ConeGeometry(0.026, 0.067, 5), orange, 0, -0.013, 0.104)
    .rotation.x = Math.PI / 2;
  const eye = new THREE.SphereGeometry(0.014, 4, 3);
  const wings: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    add(head, eye, eyes, side * 0.061, 0.021, 0.054);
    const wing = new THREE.Group();
    wing.position.set(side * 0.083, 0.026, -0.018);
    rig.add(wing);
    wings.push(wing);
    feather(wing, featherShade, [
      [0, 0, 0.069], [side * 0.165, -0.007, 0.046], [side * 0.29, -0.02, -0.16],
      [side * 0.202, -0.024, -0.188], [0, -0.015, -0.114],
    ]);
    feather(wing, featherWhite, [
      [0, 0.016, 0.098], [side * 0.205, 0.018, 0.087], [side * 0.365, -0.015, -0.021],
      [side * 0.289, -0.016, -0.107], [0, 0.002, -0.073],
    ]);
    feather(wing, featherShade, [
      [side * 0.118, 0.012, 0.039], [side * 0.271, -0.007, 0.025],
      [side * 0.337, -0.017, -0.109], [side * 0.276, -0.018, -0.154],
      [side * 0.12, -0.007, -0.092],
    ]);
    for (let tip = 0; tip < 4; tip++) {
      const x = 0.18 + tip * 0.040;
      const z = -0.07 + tip * 0.046;
      feather(wing, tip % 2 ? featherWhite : featherShade, [
        [side * (x - 0.035), 0.010, z + 0.014],
        [side * (x + 0.027), 0.014, z + 0.048],
        [side * (x + 0.13), 0.010, z - 0.104],
        [side * (x + 0.064), -0.006, z - 0.078],
        [side * x, -0.004, z - 0.037],
      ]);
    }
    wing.rotation.z = side * 0.48;
  }

  const halo = level === 3
    ? add(head, new THREE.TorusGeometry(0.18, 0.009, 4, 24), gold, 0, 0.164, 0)
    : undefined;
  if (halo) {
    halo.rotation.order = 'YXZ';
    halo.rotation.x = -Math.PI / 2 + 0.12;
  }

  const radius = 0.30 / (1.5 * scale);
  const flightHeight = 2.5 / (1.5 * scale);
  rig.position.set(-radius, flightHeight, 0);

  batchModel(group);
  return {
    group,
    animate(t: number): void {
      const turn = t * 0.48;
      rig.position.set(-radius * Math.cos(turn), flightHeight + Math.sin(t * 2.2) * 0.06 / scale,
        radius * Math.sin(turn));
      rig.rotation.y = Math.sin(turn) * 0.30;
      const flap = 0.49 + Math.sin(t * 6) * 0.40;
      wings.forEach((wing, index) => { wing.rotation.z = (index === 0 ? -1 : 1) * flap; });
    },
  };
}
