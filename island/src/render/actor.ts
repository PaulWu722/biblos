import * as THREE from 'three';
import { createRabbit } from './assets/animals/rabbit';
import { createSheep } from './assets/animals/sheep';
import { createDeer } from './assets/animals/deer';
import { createDove } from './assets/animals/dove';
import type { WalkPoint } from './assets/island/edenIsland';

type Factory = (level: 1 | 2 | 3) => { group: THREE.Group; animate(t: number): void };
const FACTORIES: Record<string, Factory> = { rabbit: createRabbit, sheep: createSheep, deer: createDeer, dove: createDove };

export interface Actor { root: THREE.Object3D; level: 1 | 2 | 3; update(dt: number, t: number): void; }

/** Placeholder box for species whose Codex model is not in yet. */
function placeholder(level: 1 | 2 | 3) {
  const group = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0xcfc2a8, flatShading: true }));
  m.position.y = 0.15; m.castShadow = true; group.add(m);
  group.scale.setScalar(level === 1 ? 0.6 : level === 2 ? 0.85 : 1);
  return { group, animate: () => {} };
}

/** Wandering animal: walks between the island's walk points, idles, repeats. */
export function createActor(speciesId: string, level: 1 | 2 | 3, walk: WalkPoint[]): Actor {
  const model = (FACTORIES[speciesId] ?? placeholder)(level);
  const root = new THREE.Group();
  root.add(model.group);
  root.scale.setScalar(1.5); // the richer island reads better with bigger animals, as in the reference art
  const randomCell = () => { const p = walk[Math.floor(Math.random() * walk.length)]!; return new THREE.Vector3(p.x, p.y, p.z); };
  root.position.copy(randomCell());
  let target = root.position.clone(), idle = Math.random() * 2;
  return {
    root, level,
    update(dt, t) {
      model.animate(t);
      if (idle > 0) { idle -= dt; if (idle <= 0) target = randomCell(); return; }
      const d = target.clone().sub(root.position);
      const dist = d.length();
      if (dist < 0.05) { idle = 1.5 + Math.random() * 3; return; }
      root.rotation.y = Math.atan2(d.x, d.z);
      // shortcut: walks in a straight line (height eased along the way), may cut across water or props; upgrade to tile pathfinding if it looks wrong.
      root.position.addScaledVector(d.normalize(), Math.min(dist, 0.6 * dt));
    },
  };
}
