// Estimated triangles: 680. Demo: scene.add(createFlowerCluster()).
import * as THREE from 'three';

export function createFlowerCluster(): THREE.Group {
  const group = new THREE.Group();
  const material = (color: number) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 });
  const green = material(0x7fa36b);
  const gold = material(0xe9c46a);
  const petals = [material(0xe6a6b7), material(0xffffff), material(0xf3e3a4)];
  const stem = new THREE.CylinderGeometry(0.009, 0.013, 1, 4);
  const petal = new THREE.CylinderGeometry(0.033, 0.033, 0.012, 5);
  const center = new THREE.CylinderGeometry(0.019, 0.019, 0.018, 5);

  function add(geometry: THREE.BufferGeometry, surface: THREE.Material,
    x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  const positions = [
    [-0.16, 0.21, 0.06], [0.13, 0.29, 0.08], [-0.06, 0.32, -0.11],
    [0.06, 0.16, 0.19], [0.16, 0.23, -0.12],
  ];
  positions.forEach(([x, height, z], index) => {
    add(stem, green, x, height / 2, z).scale.y = height;
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5 + index * 0.4;
      add(petal, petals[index % petals.length], x + Math.cos(angle) * 0.036,
        height, z + Math.sin(angle) * 0.036).rotation.y = -angle;
    }
    add(center, gold, x, height + 0.006, z);
  });

  return group;
}
