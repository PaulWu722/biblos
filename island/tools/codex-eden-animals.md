Work only inside this directory. Rewrite the 4 Eden animal files ONLY: `src/render/assets/animals/rabbit.ts`, `sheep.ts`, `deer.ts`, `dove.ts`. Do NOT touch any other file. Keep the exact same exports and signatures (`createRabbit(level: 1|2|3): { group: THREE.Group; animate(t: number): void }`, etc.), feet at y=0, facing +Z, level scales 0.6 / 0.85 / 1.0, Lv3 thin gold halo (#E9C46A torus) slowly rotating above the head, Lv2 accessories as before. Run `npx tsc --noEmit` at the end.

The user wants the animals to look like their reference art: cute, rounder, softer low-poly (still flatShading, MeshStandardMaterial roughness 0.9), less boxy. Use spheres/icosahedrons (detail 1) and tapered cylinders/capsules instead of plain boxes where possible.
- **Rabbit**: sitting pose like a figurine — round pear-shaped white body (#FFFFFF / soft shading #F2EEE8), round head, two tall ears with pale pink inner (#F2C4CC), small pink nose, tiny black eyes, round tail puff. Idle: gentle breathing bob and an occasional ear twitch; when moving, small hops.
- **Sheep**: very fluffy — body made of many clustered white icosahedrons (cream-white #FBF8F2) forming a round cloud, a round cream face (#F1E6D4) with small dark eyes and ears sticking sideways, short dark legs (#5A524A). Walk: legs ±20°, slight bob.
- **Deer**: slender — light tan body (#C99A6B) with white belly and a few white spots on the back, long thin legs with darker hooves, long neck, white muzzle, large ears, black nose, branching antlers (Lv2+), short white tail. Walk: legs ±20°.
- **Dove**: white (#FFFFFF), smooth teardrop body, broad feathered wings (2–3 overlapping flat tapered planes per wing) that flap, fan tail, small orange beak. It flies in a slow wide circle (~0.5 radius) about 1.6 units above its group origin with gentle up/down.
Budget: <= 700 triangles per animal at Lv3. State the estimate in each file header.

Report only: files rewritten and triangle estimates.
