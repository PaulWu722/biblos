// Terrain and foliage are batched by geometry and surface type.
import * as THREE from 'three';

export interface WalkPoint { x: number; y: number; z: number; }
export interface IslandScene { group: THREE.Group; walk: WalkPoint[]; radius: number; }

const heights = [0.06, 0.52, 0.92, 1.35];
const levels = [
  '.3322222.',
  '223322222',
  '223322222',
  '322111222',
  '232111222',
  '233111222',
  '233111222',
  '112111111',
  '.1111001.',
];
const surface = [
  '.gARPPFA.',
  'FgtgWWPgR',
  'ggFPWWPgF',
  'TPPgWPPgN',
  'RRgWWWPgF',
  'FFPWWgWPP',
  'gPPWggWPP',
  'RAPWWWWPA',
  '.FgPWWPP.',
];

const grass = [0xa9c97a, 0xbcd68e, 0xb2cd81];
const cream = [0xd6c9ae, 0xc9bca4, 0xe0d2b9];
const paving = [0xe9ddc6, 0xf0e4cd, 0xe1d4ba];
const blue = [0x4fa8e0, 0x61b4e7];
const paleBlue = 0x8ccbf0;
const foam = 0xf0faff;
const wood = 0x9d6c4b;
const leaf = 0x8db46c;

const coordinate = (index: number): number => index - 4;
const variation = (x: number, z: number, salt = 0): number => {
  const value = Math.sin(x * 91.7 + z * 47.3 + salt * 13.1) * 43758.5453;
  return value - Math.floor(value);
};

function terrainTop(x: number, z: number): number {
  return heights[Number(levels[z][x])];
}

function waterTop(z: number): number {
  if (z <= 2) return 0.76;
  if (z === 8) return -0.04;
  return 0.36;
}

export function createEdenIsland(): IslandScene {
  const group = new THREE.Group();
  group.name = 'Eden';
  const walk: WalkPoint[] = [];
  const planting: { x: number; z: number; clearance: number }[] = [];
  const solid = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, flatShading: true });
  const grassMaterial = solid.clone();
  grassMaterial.vertexColors = true;
  const fallingWater = new THREE.MeshStandardMaterial({
    roughness: 0.9, metalness: 0, flatShading: true, transparent: true, opacity: 0.85, depthWrite: false,
  });
  const cube = new THREE.BoxGeometry();
  const facets = new THREE.IcosahedronGeometry(1, 1);
  const tapered = new THREE.CylinderGeometry(0.65, 1, 1, 6);
  const conifer = new THREE.ConeGeometry(1, 1, 8);
  const blade = new THREE.ConeGeometry(1, 1, 3);
  const stem = new THREE.CylinderGeometry(1, 1, 1, 3, 1, true);
  const disk = new THREE.OctahedronGeometry(1);
  const petalGeometry = new THREE.CircleGeometry(1, 4).rotateX(-Math.PI / 2);
  const rock = new THREE.IcosahedronGeometry(1);
  const ripple = petalGeometry;
  const waterfallBox = cube.clone();
  // The fixed camera only sees the tops and sides of the terrain blocks.
  const faces = cube.index!.array;
  cube.setIndex([...faces.slice(0, 18), ...faces.slice(24)]);
  cube.clearGroups();
  const turf = cube.clone();
  const normals = turf.getAttribute('normal');
  const turfColors = new Float32Array(normals.count * 3);
  for (let vertex = 0; vertex < normals.count; vertex++) {
    turfColors.fill(normals.getY(vertex) > 0 ? 1 : 0.72, vertex * 3, vertex * 3 + 3);
  }
  turf.setAttribute('color', new THREE.BufferAttribute(turfColors, 3));
  const cleft = cube.clone();
  const corners = cleft.getAttribute('position');
  for (let index = 0; index < corners.count; index++) {
    const x = corners.getX(index), y = corners.getY(index), z = corners.getZ(index);
    if (y < 0) corners.setXYZ(index, x * 0.86 + z * 0.062, y + (x + z) * 0.17, z * 0.88);
  }
  cleft.computeVertexNormals();
  const batches = new Map<THREE.BufferGeometry, { matrix: THREE.Matrix4; color: THREE.Color }[]>();
  const pose = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);

  function place(geometry: THREE.BufferGeometry, color: number,
    x: number, y: number, z: number, sx: number, sy: number, sz: number,
    rx = 0, ry = 0, rz = 0): void {
    pose.position.set(x, y, z);
    pose.scale.set(sx, sy, sz);
    pose.rotation.set(rx, ry, rz);
    pose.updateMatrix();
    const instances = batches.get(geometry) ?? [];
    if (!batches.has(geometry)) batches.set(geometry, instances);
    instances.push({ matrix: pose.matrix.clone(), color: new THREE.Color(color) });
  }

  function block(x: number, z: number, bottom: number, top: number,
    width: number, depth: number, color: number, geometry = cube): void {
    place(geometry, color, x, (bottom + top) / 2, z, width, top - bottom, depth);
  }

  function branch(base: THREE.Vector3, tip: THREE.Vector3, radius: number): void {
    const direction = tip.clone().sub(base);
    const center = base.clone().lerp(tip, 0.5);
    const rotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()),
    );
    place(tapered, wood, center.x, center.y, center.z, radius, direction.length(), radius,
      rotation.x, rotation.y, rotation.z);
  }

  function plant(kind: string, x: number, y: number, z: number, seed: number): void {
    const clearance = { T: 0.34, t: 0.23, N: 0.28, R: 0.49, A: 0.36, F: 0.25 }[kind];
    if (clearance !== undefined) planting.push({ x, z, clearance });
    switch (kind) {
      case 'T':
        branch(new THREE.Vector3(x, y, z), new THREE.Vector3(x + 0.06, y + 1.58, z), 0.19);
        for (const side of [-1, 1]) {
          branch(new THREE.Vector3(x, y + 0.67, z),
            new THREE.Vector3(x + side * 0.65, y + 1.69, z - side * 0.45), 0.105);
          place(facets, side < 0 ? 0xb6ce82 : 0xadc77c, x + side * 0.74, y + 2.10, z - side * 0.48,
            0.76, 0.79, 0.74, 0.25, side * 0.5);
        }
        place(facets, 0xc4d991, x - 0.03, y + 2.72, z - 0.18, 0.98, 1.11, 0.98, 0.17, 0.56);
        break;
      case 't':
        place(tapered, wood, x, y + 0.27, z, 0.096, 0.54, 0.096);
        place(facets, 0xb0ca7c, x, y + 0.81, z, 0.55, 0.58, 0.54, 0.17, 0.4);
        break;
      case 'N':
        place(tapered, wood, x, y + 0.63, z, 0.15, 1.26, 0.15);
        for (let tier = 0; tier < 4; tier++) {
          const width = 0.87 - tier * 0.16;
          place(conifer, [0x799d71, 0x88a774, 0x9db67d, 0xaac181][tier],
            x, y + 1.08 + tier * 0.65, z, width, 1.43 - tier * 0.10, width, 0, 0.22);
        }
        break;
      case 'R':
        place(rock, seed > 0.5 ? 0xb5b6af : 0x999c95, x, y + 0.13, z,
          0.35 + seed * 0.14, 0.31 + seed * 0.12, 0.32, 0.14, seed, 0.12);
        break;
      case 'A':
        for (let i = 0; i < 7; i++) {
          const angle = seed + i * Math.PI * 2 / 7;
          const length = 0.49 + (i % 3) * 0.117;
          const tilt = 0.43 + (i % 3) * 0.23;
          const radial = Math.sin(tilt) * length / 2;
          place(blade, i % 3 === 0 ? 0xa8c686 : leaf,
            x + Math.sin(angle) * radial, y + Math.cos(tilt) * length / 2, z + Math.cos(angle) * radial,
            0.106, length, 0.052, tilt, angle);
        }
        break;
      case 'F':
        for (let i = 0; i < 3; i++) {
          const angle = seed + i * Math.PI * 2 / 3;
          const fx = x + Math.cos(angle) * 0.14;
          const fz = z + Math.sin(angle) * 0.14;
          const height = 0.20 + i * 0.070;
          place(stem, leaf, fx, y + height / 2, fz, 0.012, height, 0.012);
          place(blade, 0x7fa36b, fx + 0.028, y + height * 0.40, fz,
            0.034, 0.11, 0.016, 0, angle, -0.94);
          const petal = [0xf2b8c6, 0xfffaf2, 0xeab1be][i];
          for (let j = 0; j < 5; j++) {
            const turn = angle + j * Math.PI * 2 / 5;
            place(petalGeometry, petal, fx + Math.cos(turn) * 0.052, y + height, fz + Math.sin(turn) * 0.052,
              0.071, 0.027, 0.051, 0, -turn);
          }
          place(disk, 0xe4b75d, fx, y + height + 0.009, fz, 0.019, 0.017, 0.019);
        }
        break;
    }
  }

  function stoneCourse(x: number, z: number, bottom: number, top: number,
    scale: number, colors: number[], salt: number, taper: number): void {
    for (const dx of [-0.25, 0.25]) {
      for (const dz of [-0.25, 0.25]) {
        const seed = variation(x + dx, z + dz, salt);
        const edgeX = x + dx;
        const edgeZ = z + dz;
        const push = (seed - 0.5) * taper;
        const seam = (seed - 0.5) * Math.min(0.31, Math.max(0, top - bottom) * 0.52);
        block(edgeX * (scale + push), edgeZ * (scale + push),
          bottom - seam, top, scale * (0.51 + seed * 0.17), scale * (0.68 - seed * 0.17),
          colors[Math.floor(seed * colors.length)], seed < 0.48 && taper > 0 ? cleft : cube);
      }
    }
  }

  for (let row = 0; row < levels.length; row++) {
    for (let col = 0; col < levels[row].length; col++) {
      const kind = surface[row][col];
      if (kind === '.') continue;
      const x = coordinate(col);
      const z = coordinate(row);
      const seed = variation(col, row);
      const shade = Math.floor(seed * 6) % 3;
      const y = terrainTop(col, row);
      if (kind === 'W') {
        const top = waterTop(row);
        block(x, z, -0.48, top - 0.11, 1, 1, cream[shade]);
        block(x, z, top - 0.12, top, 1, 1, blue[row === 8 ? 1 : 0]);
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const bank = surface[row + dz]?.[col + dx];
          if (!bank || bank === '.' || bank === 'W') continue;
          block(x + dx * 0.465, z + dz * 0.465, top - 0.01, top + 0.001,
            dx === 0 ? 0.86 : 0.07, dz === 0 ? 0.86 : 0.07, paleBlue);
        }
        for (let patch = 0; patch < 4; patch++) {
          const px = variation(col, row, patch + 1) - 0.5;
          const pz = variation(row, col, patch + 7) - 0.5;
          place(ripple, [0x66b4e0, 0x74bce7, 0x62b0db, 0x7cc4eb][patch],
            x + px * 0.69, top + 0.002 + patch * 0.001, z + pz * 0.69,
            0.15 + 0.15 * seed, 1, 0.055 + patch * 0.015, 0, patch * 0.71);
        }
        if (surface[row + 1]?.[col] === 'W' && waterTop(row + 1) < top) {
          cascade(x, z + 0.5, top, waterTop(row + 1), 0.94, seed);
        }
        continue;
      }

      const seam = Math.min(y - 0.19, y * 0.44 + (seed - 0.5) * 0.18);
      const exposed = [[1, 0], [0, 1]].some(([dx, dz]) => {
        const neighbor = surface[row + dz]?.[col + dx];
        return !neighbor || neighbor === '.';
      });
      if (exposed) {
        stoneCourse(x, z, -0.49, seam + 0.12, 0.987, [0xc9c0ab, 0xd9cbb3, 0xbcb6a4], 4, 0.028);
        stoneCourse(x, z, seam, y - 0.13, 1, cream, 8, 0.017);
      } else {
        block(x, z, -0.49, y - 0.13, 1, 1, cream[shade]);
      }
      block(x, z, y - 0.15, y, 1, 1, kind === 'P' ? paving[shade] : grass[shade],
        kind === 'P' ? cube : turf);
      if (kind === 'P') {
        const pathTop = y + 0.045;
        block(x, z, y, pathTop, 0.974, 0.974, paving[shade]);
        walk.push({ x, y: pathTop, z });
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (surface[row + dz]?.[col + dx] !== 'P') continue;
          const rise = terrainTop(col + dx, row + dz) - y;
          if (rise <= 0) continue;
          for (let step = 1; step <= 2; step++) {
            block(x + dx * (0.135 + step * 0.145), z + dz * (0.135 + step * 0.145),
              pathTop, pathTop + rise * step / 3, dx === 0 ? 0.72 : 0.15,
              dz === 0 ? 0.72 : 0.15, paving[(shade + step) % 3]);
          }
        }
      } else if (kind === 'g') {
        walk.push({ x, y, z });
      } else {
        plant(kind, x, y, z, seed + 0.2);
      }
    }
  }

  for (const [col, row, dx, dz, kind] of [
    [1, 1, -0.27, 0.36, 'F'], [2, 1, 0.10, -0.24, 'A'],
    [1, 4, 0.36, 0.25, 'F'], [0, 4, 0.30, -0.27, 'R'],
    [0, 5, 0.06, 0.33, 'F'], [0, 6, 0.17, 0.13, 'F'],
    [1, 7, 0.34, -0.26, 'R'], [2, 8, 0.14, -0.13, 'A'],
    [8, 5, 0.25, 0.29, 'F'], [7, 4, 0.29, -0.27, 'F'],
    [5, 6, 0.30, 0.27, 'F'], [7, 2, 0.39, 0.34, 'R'],
    [8, 3, -0.18, 0.30, 'F'], [8, 4, 0.14, 0.31, 'F'],
    [7, 7, 0.32, 0.25, 'R'], [8, 7, 0.28, -0.29, 'R'],
    [0, 5, -0.22, -0.28, 'A'], [0, 6, -0.25, -0.26, 'A'], [0, 4, -0.17, 0.19, 'F'],
    [0, 2, -0.10, 0.28, 'R'], [1, 3, -0.29, -0.27, 'R'], [2, 4, 0.23, -0.30, 'F'], [2, 4, 0.16, 0.28, 'A'],
    [1, 5, 0.28, -0.23, 'F'], [1, 5, -0.27, 0.23, 'F'], [1, 8, 0.19, -0.19, 'A'],
    [2, 0, 0.29, -0.23, 'F'], [3, 1, -0.26, 0.23, 'F'], [3, 1, 0.27, -0.25, 'R'],
    [2, 2, 0.16, -0.24, 'A'], [7, 2, -0.2, -0.18, 'A'], [8, 1, 0.18, 0.24, 'F'],
    [8, 3, 0.23, -0.23, 'A'], [8, 4, -0.19, -0.24, 'F'], [8, 6, 0.23, 0.27, 'A'],
    [8, 7, 0.26, 0.29, 'F'], [7, 4, 0.23, 0.27, 'A'], [4, 6, -0.29, 0.27, 'F'],
  ] as const) {
    plant(kind, coordinate(col) + dx, terrainTop(col, row), coordinate(row) + dz, variation(col, row));
  }

  const strata = [
    { scale: 0.98, top: -0.40, bottom: -1.65, colors: [0xc9bca4, 0xd6c9ae, 0xbdb3a0] },
    { scale: 0.91, top: -1.51, bottom: -3.18, colors: [0xaaa398, 0xbcb3a4, 0xa39d94] },
    { scale: 0.78, top: -3.04, bottom: -4.68, colors: [0x8e8a86, 0x9f9a91, 0x807f7c] },
    { scale: 0.62, top: -4.54, bottom: -5.95, colors: [0x696d70, 0x797b7b, 0x636970] },
  ];
  for (const { scale, top, bottom, colors } of strata) {
    block(0, 0, bottom, top, 7.25 * scale, 7.25 * scale, colors[1]);
    for (let row = 0; row < levels.length; row++) {
      for (let col = 0; col < levels[row].length; col++) {
        if (levels[row][col] === '.' || (row > 0 && row < 8 && col > 0 && col < 8)) continue;
        const x = coordinate(col), z = coordinate(row);
        const seed = variation(col, row, scale);
        if ((row >= 7 || col >= 7) && (scale < 0.9 || seed < 0.68)) {
          stoneCourse(x, z, bottom - 0.35 * seed, top + 0.16 * seed, scale, colors, 20 + scale, 0.059);
        } else {
          const offset = scale + (seed - 0.76) * 0.10;
          block(x * offset, z * offset, bottom - 0.25 * seed, top + 0.15 * seed,
            scale * 1.08, scale * 1.09, colors[2], cleft);
        }
        if (scale < 0.9 && seed > 0.52) {
          block(x * (scale + 0.07), z * (scale + 0.07), bottom - 0.24 * seed,
            bottom + 0.32, 0.32 + seed * 0.2, 0.44, colors[1], cleft);
        }
      }
    }
  }

  function cascade(x: number, z: number, top: number, bottom: number, width: number, seed: number): void {
    block(x, z - 0.033, top - 0.11, top + 0.012, width, 0.21, paleBlue, waterfallBox);
    for (let ribbon = 0; ribbon < 4; ribbon++) {
      const px = x + width * ((ribbon + 0.5) / 4 - 0.5);
      const pz = z + 0.043 + (ribbon % 2) * 0.02;
      block(px, pz, bottom, top + (ribbon % 2) * 0.015,
        width * 0.251, 0.12, [0x95d0ef, 0x73b9e2, 0xaddcf5, 0x75c2ec][ribbon], waterfallBox);
      if (ribbon % 2 === 0) {
        block(px - width * 0.06, pz + 0.066, bottom + (top - bottom) * (0.38 + seed * 0.22),
          top - 0.045, width * 0.038, 0.014, foam);
      }
      place(ripple, foam, px, bottom + 0.016, pz + 0.12, width * 0.17, 1, 0.16, 0, ribbon * 0.69);
    }
  }

  // The lower pool sits on a shelf cut into the visible +Z face.
  block(0.50, 4.12, -3.18, -2.62, 2.22, 1.40, cream[1]);
  block(0.50, 4.45, -2.62, -2.50, 1.82, 0.74, blue[1]);
  for (const side of [-1, 1]) {
    block(0.50 + side, 4.30, -2.64, -2.35, 0.25, 1.06, cream[2]);
    block(0.50 + side * 0.73, 4.83, -2.64, -2.39, 0.45, 0.19, cream[0]);
  }
  cascade(0.50, 4.50, -0.04, -2.50, 1.32, 0.31);
  cascade(0.36, 4.84, -2.50, -3.62, 0.74, 0.56);
  block(0.36, 4.82, -3.77, -3.62, 0.92, 0.31, paleBlue);

  let radius = 0;
  for (const [geometry, instances] of batches) {
    const material = geometry === waterfallBox ? fallingWater : geometry === turf ? grassMaterial : solid;
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
    geometry.computeBoundingBox();
    const bounds = new THREE.Box3();
    instances.forEach(({ matrix, color }, index) => {
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color);
      bounds.copy(geometry.boundingBox!).applyMatrix4(matrix);
      radius = Math.max(radius, Math.hypot(
        Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
        Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)),
      ));
    });
    mesh.castShadow = geometry !== waterfallBox && geometry !== ripple;
    mesh.receiveShadow = geometry !== waterfallBox;
    group.add(mesh);
  }

  const clearWalk = walk.filter(({ x, z }) => planting.every((prop) =>
    Math.hypot(x - prop.x, z - prop.z) > prop.clearance + 0.12));
  return { group, walk: clearWalk, radius };
}
