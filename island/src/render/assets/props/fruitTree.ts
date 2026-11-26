// Estimated triangles: 192. Demo: scene.add(createFruitTree()).
import * as THREE from 'three';

export function createFruitTree(): THREE.Group {
  const group = new THREE.Group();
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
  const wood = material(0xa47551);
  const sage = material(0xa8c686);
  const moss = material(0x7fa36b);
  const red = material(0xc95346);

  function add(geometry: THREE.BufferGeometry, surface: THREE.Material,
    x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  add(new THREE.CylinderGeometry(0.065, 0.115, 0.78, 8), wood, 0, 0.39, 0);
  const leaves = new THREE.IcosahedronGeometry(0.41, 0);
  add(leaves, sage, -0.24, 0.91, 0.03).scale.set(1.02, 0.83, 0.93);
  add(leaves, moss, 0.24, 0.97, 0.07).scale.set(0.94, 0.87, 0.98);
  add(leaves, sage, 0.025, 1.15, -0.15).scale.set(0.94, 1, 0.93);
  const fruit = new THREE.SphereGeometry(0.063, 5, 3);
  for (const [x, y, z] of [
    [-0.37, 0.81, 0.31], [-0.13, 0.94, 0.37], [0.24, 0.83, 0.41],
    [0.5, 1.04, 0.23], [0.04, 1.32, -0.45],
  ]) {
    add(fruit, red, x, y, z);
  }

  return group;
}
