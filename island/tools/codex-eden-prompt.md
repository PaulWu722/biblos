Work only inside this directory (the Vite+TypeScript project `island/`, three@0.170 and @types/three already installed). Write the files listed below, nothing else. TypeScript strict, no `any`, `import * as THREE from 'three'`. Do not touch other files. After writing, run `npx tsc --noEmit` and fix errors in YOUR files, then write a triangle count check: a script `tools/tri-count.ts` is NOT needed; just make sure the budgets hold by construction and state the estimated triangle count per asset in the file's header comment.

## Shared style prefix (applies to every asset)
Create a Three.js (r170) procedural low-poly asset as an ES module exporting a function that returns a THREE.Group.
Style: minimalist geometric isometric puzzle-game look. Use only primitive geometry (Box, Cylinder, Cone, Icosahedron/Dodecahedron detail 0-1, Sphere low segments), flatShading: true, MeshStandardMaterial roughness 0.9 metalness 0.
Palette: sage green #A8C686, moss #7FA36B, sand/stone #E8DCC4 #CFC2A8, water #6FB7E8, white #FFFFFF, soft gold halo #E9C46A, warm wood #A47551. No textures, no outlines.
Scale: 1 unit = 1 grid tile; keep the asset centered at origin, base at y=0. Max ~800 triangles per prop, ~400 per animal.
castShadow/receiveShadow on all meshes. Export name and a small demo comment.

## Animal shared spec (applies to the 4 animals)
Build the animal in 3 growth levels via a parameter level (1|2|3):
- Level 1 (幼崽): scale 0.6, bigger head ratio, no accessory.
- Level 2 (成長): scale 0.85, normal proportions, one small accessory as described.
- Level 3 (成熟): scale 1.0, accessory + thin floating gold torus halo (radius 0.18, tube 0.015) above head that slowly rotates.
Return { group, animate(t) } where animate does an idle bob and a simple walk cycle (legs rotate ±20°). Eyes are tiny black spheres, cute and simple.

## Export signatures (required, I integrate against these)
Props/island (return THREE.Group): 
- src/render/assets/island/edenIsland.ts : `export function createEdenIsland(): THREE.Group` (6x6 tiles, top surface of grass at y=0.5 roughly; document the exact top-surface height as `export const EDEN_TOP_Y`, and walkable half-extent as `export const EDEN_HALF = 3`)
- src/render/assets/props/fruitTree.ts : `export function createFruitTree(): THREE.Group`
- src/render/assets/props/flowers.ts : `export function createFlowerCluster(): THREE.Group`
- src/render/assets/props/rocks.ts : `export function createRocks(): THREE.Group`
- src/render/assets/props/grassTuft.ts : `export function createGrassTuft(): THREE.Group`
Animals (all in one convention):
- src/render/assets/animals/rabbit.ts : `export function createRabbit(level: 1|2|3): { group: THREE.Group; animate(t: number): void }`
- src/render/assets/animals/sheep.ts : `createSheep`, same signature
- src/render/assets/animals/deer.ts : `createDeer`, same signature
- src/render/assets/animals/dove.ts : `createDove`, same signature (dove flies; its body sits ~0.5 above y=0 with wings flapping inside animate)
Animals face +Z, feet at y=0 (scaled by level).

## Asset prompts (exact)
- 島嶼底座 (edenIsland.ts): Isometric floating island 6x6 tiles made of stacked stone blocks with uneven heights, grass top layer, a stepped channel river crossing diagonally ending in a small block waterfall off the edge, cliff underside tapering down in 3 layers.
- 生命樹/果樹 (fruitTree.ts): Low-poly fruit tree: cylinder trunk, 3 clustered icosahedron canopy blobs, 5 small red sphere fruits.
- 花叢 (flowers.ts): Cluster of 5 tiny flowers: thin cylinder stems, 5-petal flat discs in pink, white, pale yellow.
- 石塊 (rocks.ts): Set of 3 low-poly dodecahedron rocks of different sizes in stone grey.
- 小草 (grassTuft.ts): Grass tuft made of 4 thin tilted cones.
- 兔子 (rabbit.ts): Cute geometric rabbit: box body, sphere head, two tall flattened ellipsoid ears, white. Level 2 accessory: small flower crown.
- 羊 (sheep.ts): Cute geometric sheep: wool made of clustered white icosahedrons, dark grey box head and legs. Level 2: small bell on collar.
- 鹿 (deer.ts): Cute geometric deer: light brown box body, white spot discs, branching cylinder antlers (only level 2+). Level 2: flower on antler.
- 鴿子 (dove.ts): Cute geometric dove: white, ellipsoid body, flat triangular wings that flap, flies in slow circles. Level 2: olive branch in beak.
