// Estimated triangles: 32. Demo: scene.add(createGrassTuft()).
import * as THREE from 'three';

export function createGrassTuft(): THREE.Group {
  const group = new THREE.Group();
  const surfaces = [0xa8c686, 0x7fa36b].map((color) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0 }));
  const blades = [
    [-0.062, 0, 0.23, 0.03, 0.35], [0.052, 0.027, 0.31, -0.19, -0.3],
    [0.013, -0.048, 0.265, -0.35, -0.07], [-0.025, 0.06, 0.18, 0.38, 0.09],
  ];

  blades.forEach(([x, z, length, rx, rz], index) => {
    const geometry = new THREE.ConeGeometry(0.032, length, 4);
    geometry.translate(0, length / 2, 0);
    geometry.rotateX(rx);
    geometry.rotateZ(rz);
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, surfaces[index % surfaces.length]);
    mesh.position.set(x, -geometry.boundingBox!.min.y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  });

  return group;
}
