import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch rigid parts together while leaving each animated group independently movable. */
export function batchModel(group: THREE.Group): void {
  for (const child of group.children) {
    if (child instanceof THREE.Group) batchModel(child);
  }
  for (const side of [THREE.FrontSide, THREE.DoubleSide]) {
    const sources = group.children.filter((child): child is THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> =>
      child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.material.side === side);
    if (sources.length < 2) continue;
    const parts = sources.map((part) => {
      part.updateMatrix();
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      geometry.applyMatrix4(part.matrix);
      geometry.deleteAttribute('uv');
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let index = 0; index < colors.length; index += 3) {
        part.material.color.toArray(colors, index);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geometry;
    });
    const geometry = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      side, vertexColors: true, flatShading: true, roughness: 0.9,
    }));
    mesh.castShadow = true;
    group.remove(...sources);
    group.add(mesh);
  }
}
