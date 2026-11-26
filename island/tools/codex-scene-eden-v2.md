Work only inside this directory (Vite + TypeScript project, three@0.170 installed). TypeScript strict, no `any`, `import * as THREE from 'three'`.
Rewrite ONE file: `src/render/assets/island/edenIsland.ts`. You may also rewrite the prop files in `src/render/assets/props/` and add new prop files there (e.g. `pineTree.ts`, `roundTree.ts`, `agave.ts`). Do NOT touch any other file (not animals, not src/render/stage.ts, not src/ui). Run `npx tsc --noEmit` at the end and fix errors in your files.

## Goal
Remake the Eden scene so it matches the user's reference art: a rich, cozy, low-poly isometric floating island (think polished mobile puzzle game diorama). The current version is a flat 6x6 slab with a straight diagonal river and looks too empty and too flat.

## Required export (I integrate against this exactly)
```ts
export interface WalkPoint { x: number; y: number; z: number; }
export interface IslandScene { group: THREE.Group; walk: WalkPoint[]; radius: number; }
export function createEdenIsland(): IslandScene;
```
- `group`: the whole diorama (island + every prop), centered on the origin, top surfaces roughly y = 0.4–1.4.
- `walk`: centers of every tile an animal may stand on (grass or stone path tops; NOT water, NOT under trees/rocks/flowers). Exact `y` = that tile's top surface. At least 20 points spread over all terraces.
- `radius`: horizontal radius that encloses the island (camera uses it to fit the view).
- Remove the old `EDEN_TOP_Y` / `EDEN_HALF` exports.

## Reference description (follow closely)
Island footprint about 8 x 8 tiles, roughly square but with chipped, irregular edges (a few corner tiles missing / stepped).
- **Terraces**: 3 height levels. Back-left and back-right corners are raised plateaus (+1 level); the front is lower. Short block steps connect levels. Each terrace top is a thin bright sage-green grass layer (#A8C686 / lighter #BFD89A) over cream stone.
- **Stone paths**: cream/beige paved slabs (#E8DCC4, #F1E8D6) slightly raised, winding between terraces alongside the water.
- **Water**: a winding blue channel (#6FB7E8, lighter #9FD3F2 near edges) that starts at a small rectangular pond on the back-right raised plateau, drops via a tiny 2-step waterfall, meanders through the middle (around a small grass islet in the middle where an animal can stand), and exits at the front-left edge as a tall waterfall: stacked translucent light-blue boxes (opacity ~0.85) falling down the cliff face into a small block pool partway down. Water surfaces sit slightly below the grass tops with cream stone banks.
- **Cliffs / underside**: deep, chunky cliff under the whole island made of irregular stacked stone blocks — beige (#D9CDB4, #CFC2A8) near the top fading to warm grey (#A9A39A, #8F8A84) at the bottom, tapering inward in 3–4 stepped layers to a rough point. Blocks vary in size and protrude a little so the cliff looks hand-carved, not a flat wall.
- **Props** (all low-poly, flatShading):
  - 1 large broad-leaf tree at back-left: brown trunk with 2 branches, canopy of 3–4 big dodecahedron clusters in two greens (#A8C686, #C4DC9A).
  - 1 small round tree at back-center on the raised plateau.
  - 1 tall conifer at right: 4 stacked cones (#7FA36B / #6E9460), brown trunk.
  - 4–6 grey boulders (dodecahedron, #B9B4AC / #9E9890) scattered at edges and near the big tree.
  - 6–8 flower clusters: tiny 5-petal flowers in pink (#F2B8C6), white, pale yellow, with small leaves.
  - 6–8 spiky agave-like grass clumps (5–7 thin tapered blades fanning out, #8DB46C).
  Keep props off the walk points.
- Lighting/sky are handled by me; just use MeshStandardMaterial (roughness 0.9, metalness 0, flatShading true), castShadow/receiveShadow on meshes.

## Performance
Mobile target 60 fps. Total under ~9000 triangles. Share materials and geometries; merge static blocks where convenient (BufferGeometryUtils.mergeGeometries from 'three/examples/jsm/utils/BufferGeometryUtils.js' is fine) or use InstancedMesh for repeated blocks/flowers/grass. State the estimated triangle count in the file header comment.

When done, report only: files written, triangle estimate, number of walk points.
