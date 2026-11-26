// Estimated triangles: 108. Demo: scene.add(createRocks()).
import * as THREE from 'three';

export function createRocks(): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  geometry.computeBoundingBox();
  const base = geometry.boundingBox!.min.y;
  const colors = [0xcfc2a8, 0xe8dcc4, 0xb7ad9b];
  const shapes = [
    [-0.13, -0.04, 0.23, 0.17, 0.19, 0.3],
    [0.20, 0.08, 0.145, 0.105, 0.13, 0.9],
    [0.09, -0.21, 0.105, 0.075, 0.11, -0.5],
  ];

  shapes.forEach(([x, z, sx, sy, sz, angle], index) => {
    const material = new THREE.MeshStandardMaterial({
      color: colors[index], flatShading: true, roughness: 0.9, metalness: 0,
    });
    const rock = new THREE.Mesh(geometry, material);
    rock.position.set(x, -base * sy, z);
    rock.scale.set(sx, sy, sz);
    rock.rotation.y = angle;
    rock.castShadow = rock.receiveShadow = true;
    group.add(rock);
  });

  return group;
}
