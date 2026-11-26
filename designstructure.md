# 信息島 — Master Brief for Claude

You (Claude) are the lead engineer for "信息島 (Message Island)". You write and run ALL game code yourself. Whenever a 3D asset, texture, or scene model is needed, you delegate it to Codex as a subtask (see §4). UI text is Traditional Chinese.

## 1. Project overview
A mobile-first reading game. The user reads devotional articles ("信息"), answers questions, and earns animal eggs that hatch onto an island.

- After each article the user answers **2 multiple-choice questions** (no retry; show the correct answer and its scripture reference).
- **3 completed articles = 1 egg.** There is **no daily limit**: the user may catch up and read any number of articles at any time. Each article counts only once.
- **Egg tier** is decided by correct answers out of the 6 questions in that batch:
  - 0–2 correct: 普通蛋 (normal)
  - 3–4 correct: 稀有蛋 (rare)
  - 5 correct: 珍貴蛋 (precious)
  - 6 correct: 傳說蛋 (legendary, guarantees the current scene's signature animal)
- **Daily reset at 05:00 Taiwan time (Asia/Taipei, UTC+8).** This resets only the daily stats such as「今日閱讀 x/3」. Missing a day has no penalty; the user simply earns no egg for that day.
- **Points:** each article read gives **10 XP**, and each correct answer gives **+10 XP**. XP goes to up to 3 "companion" animals chosen by the user.
- **Each animal has exactly 3 levels:**
  - Lv1 幼崽 (0 XP)
  - Lv2 成長 (100 XP)
  - Lv3 成熟 (250 XP, gold halo)

  Starting XP by egg: normal 0, rare 30, precious 60, legendary 100.
- **6 biblical scenes**, unlocked in this order:

  | # | Scene | Capacity |
  |---|---|---|
  | 1 | 伊甸園 | 6 |
  | 2 | 挪亞方舟 | 10 |
  | 3 | 曠野與西奈山 | 15 |
  | 4 | 伯利恆的野地 | 20 |
  | 5 | 加利利海 | 25 |
  | 6 | 新耶路撒冷 | 30 |

  When the current scene is full of animals, the next scene unlocks. All animals move there with a transition, and old scenes remain viewable as「回憶島」.
- **Animals carry over across scenes (cumulative pool):**
  - When the player upgrades to a new scene, every existing animal moves there.
  - Each animal keeps its level and XP, and continues to grow on the new scene.
  - Eggs hatched on the new scene give that scene's brand-new species, so the collection keeps growing and never resets.
  - Earlier species can still appear as duplicates from normal or rare eggs. This is optional, with a weight of 20%.
  - Capacity counts all animals the player owns, both carried-over and new ones.
- **Collection (圖鑑):** 24 species × 3 level looks. When all animals of a scene reach Lv3, that scene's golden variant unlocks.
- **Anti-cheat:** a minimum reading time (default 90 s), and the article must be scrolled to the bottom. Time while the tab is hidden does not count.
- Put every number above in `config/rules.ts` as the single source of truth.

## 2. Architecture (4 layers)
1. **Game logic (`src/core/`)**
   - Pure rules only, with no DOM and no Three.js.
   - Every rule has Vitest unit tests: tiers, XP thresholds, capacity and unlock, no double-counting, the 05:00 reset, and schema migration.
   - A single reducer `gameEngine.dispatch(action)` returns the new state plus typed events: `EGG_EARNED`, `EGG_HATCHED`, `LEVEL_UP`, `SCENE_FULL`, `SCENE_UNLOCKED`, `GOLDEN_UNLOCKED`.
   - Use a seedable RNG.
2. **Data access (`src/data/`)**
   - Define a `StorageAdapter` interface. Implement `localStorageAdapter` first.
   - Add a `supabaseAdapter` stub with the same interface, so it can be swapped in later without touching game logic.
3. **3D rendering (`src/render/`)**
   - Three.js r170: renderer, scene manager, one module per island, and an animal actor (wander AI, idle bob, walk cycle, level scale and halo).
   - Effects for hatch, level-up, and scene transitions.
   - An isometric orthographic camera with limited OrbitControls, plus raycast picking.
   - The render layer only reacts to events and never mutates game state.
4. **UI layer (`src/ui/`)**
   - Mobile-first hash routes: `#/island`, `#/read/:id`, `#/quiz/:id`, `#/egg`, `#/collection`, `#/scenes`, `#/settings`.
   - A top bar showing the scene name, capacity x/N, and progress toward the next egg (0–3).
   - A tab bar with 島嶼 / 圖鑑 / 場景.

**Data flow:** UI action → `dispatch` → state saved through `StorageAdapter` → events emitted → render and UI react.

**Build order:**
1. Core logic and tests.
2. Storage and at least 9 sample articles with quizzes (JSON).
3. The full Eden scene loop.
4. All UI screens.
5. The remaining 5 scenes, transitions, and the collection.
6. PWA, Playwright e2e at a 390×844 viewport, and a README.

## 3. Art style: minimalist geometric 3D
This style was chosen after comparing watercolor storybook, pixel art, Japanese anime, paper-cut, casual farm 3D, cel-shaded toon, and claymation.

**Pass every prompt in this section to Codex UNCHANGED.** Always prepend the shared style prefix (§3.0). For every animal, append the animal spec (§3.1).

### 3.0 共用風格前綴（每個 prompt 最前面都貼上）
```
Create a Three.js (r170) procedural low-poly asset as an ES module exporting a function that returns a THREE.Group.
Style: minimalist geometric isometric puzzle-game look. Use only primitive geometry (Box, Cylinder, Cone, Icosahedron/Dodecahedron detail 0-1, Sphere low segments), flatShading: true, MeshStandardMaterial roughness 0.9 metalness 0.
Palette: sage green #A8C686, moss #7FA36B, sand/stone #E8DCC4 #CFC2A8, water #6FB7E8, white #FFFFFF, soft gold halo #E9C46A, warm wood #A47551. No textures, no outlines.
Scale: 1 unit = 1 grid tile; keep the asset centered at origin, base at y=0. Max ~800 triangles per prop, ~400 per animal.
castShadow/receiveShadow on all meshes. Export name and a small demo comment.
```

### 3.1 動物共用規格（貼在每隻動物 prompt 後）
```
Build the animal in 3 growth levels via a parameter level (1|2|3):
- Level 1 (幼崽): scale 0.6, bigger head ratio, no accessory.
- Level 2 (成長): scale 0.85, normal proportions, one small accessory as described.
- Level 3 (成熟): scale 1.0, accessory + thin floating gold torus halo (radius 0.18, tube 0.015) above head that slowly rotates.
Return { group, animate(t) } where animate does an idle bob and a simple walk cycle (legs rotate ±20°). Eyes are tiny black spheres, cute and simple.
```

---

### 3.2 場景一：伊甸園（容量 6）
- **島嶼底座**：`Isometric floating island 6x6 tiles made of stacked stone blocks with uneven heights, grass top layer, a stepped channel river crossing diagonally ending in a small block waterfall off the edge, cliff underside tapering down in 3 layers.`
- **生命樹/果樹**：`Low-poly fruit tree: cylinder trunk, 3 clustered icosahedron canopy blobs, 5 small red sphere fruits.`
- **花叢**：`Cluster of 5 tiny flowers: thin cylinder stems, 5-petal flat discs in pink, white, pale yellow.`
- **石塊**：`Set of 3 low-poly dodecahedron rocks of different sizes in stone grey.`
- **小草**：`Grass tuft made of 4 thin tilted cones.`
- **動物**：
  - 兔子：`Cute geometric rabbit: box body, sphere head, two tall flattened ellipsoid ears, white. Level 2 accessory: small flower crown.`
  - 羊：`Cute geometric sheep: wool made of clustered white icosahedrons, dark grey box head and legs. Level 2: small bell on collar.`
  - 鹿：`Cute geometric deer: light brown box body, white spot discs, branching cylinder antlers (only level 2+). Level 2: flower on antler.`
  - 鴿子：`Cute geometric dove: white, ellipsoid body, flat triangular wings that flap, flies in slow circles. Level 2: olive branch in beak.`

### 3.3 場景二：挪亞方舟／亞拉臘山（容量 10）
- **島嶼底座**：`Floating mountain island 8x8 tiles, grey-brown stone blocks rising to a plateau, patches of grass, puddles left after a flood.`
- **方舟**：`Geometric Noah's ark: long wooden hull from boxes with tapered ends, cabin box with sloped roof, small door ramp.`
- **彩虹**：`Rainbow arc made of 6 thin half-torus bands (red to violet), semi-transparent, placed behind the island.`
- **橄欖樹**：`Small olive tree with silver-green flat canopy.`
- **動物**：
  - 大象：`Cute geometric elephant, grey, cylinder trunk that sways. Level 2: blanket on back.`
  - 長頸鹿：`Cute geometric giraffe, tall box neck, yellow with brown square spots. Level 2: scarf.`
  - 斑馬：`Cute geometric zebra, white body with black stripe boxes. Level 2: tuft mane.`
  - 烏鴉：`Cute geometric raven, black, perches and hops. Level 2: tiny twig.`

### 3.4 場景三：曠野與西奈山（容量 15）
- **島嶼底座**：`Floating desert island 9x9 tiles, sand-colored blocks, small dunes, one rocky mountain (Sinai) at the back built from stacked stone blocks.`
- **會幕**：`Tabernacle tent: rectangular courtyard of white cloth panels on thin posts, central tent box with blue/purple/scarlet roof stripes.`
- **雲柱/火柱**：`Pillar of cloud: stacked white icosahedrons forming a tall column (day). Pillar of fire variant: orange/yellow emissive cones flickering (night).`
- **嗎哪**：`Scatter of small white flat discs on the ground (manna).`
- **棕樹與泉水**：`Palm tree with segmented trunk and 6 drooping leaf planes; small square spring pool.`
- **動物**：
  - 駱駝：`Cute geometric camel, tan, one or two humps. Level 2: colorful saddle blanket.`
  - 驢：`Cute geometric donkey, grey, long ears. Level 2: small saddle bag.`
  - 鵪鶉：`Cute geometric quail, round brown body, small hops. Level 2: head plume.`
  - 銅蛇（裝飾不移動）：`Bronze serpent on a pole: torus-knot-like coiled cylinder segments on a vertical pole, bronze color #B08D57. Level 2+: gentle glow.`

### 3.5 場景四：伯利恆的野地（容量 20，固定夜晚）
- **島嶼底座**：`Floating hillside island 10x10 tiles, rolling stepped green hills, stone path, low stone fences.`
- **馬槽與小屋**：`Small stable: wooden box frame with slanted roof, manger trough filled with yellow straw boxes.`
- **伯利恆之星**：`Large emissive 8-point star made of thin cone spikes, soft gold, floats high above and slowly pulses.`
- **牧羊人篝火**：`Campfire: ring of small stones, crossed logs, emissive orange cone flames.`
- **橄欖樹/草叢**：同場景一花草，改深綠色。
- **動物**：
  - 羔羊：`Cute geometric lamb, extra fluffy white icosahedron wool, small. Level 2: ribbon.`
  - 牧羊犬：`Cute geometric sheepdog, black and white, wagging tail. Level 2: bandana.`
  - 牛：`Cute geometric ox/cow, brown and white, short horns. Level 2: bell.`
  - 驢（伯利恆版）：`Reuse donkey with blue blanket as Level 2 accessory.`

### 3.6 場景五：加利利海（容量 25）
- **島嶼底座**：`Floating lake island 11x11 tiles: large central water area with block shoreline, grassy hills on two sides, a small dock.`
- **漁船**：`Geometric fishing boat: hull from tapered boxes, mast cylinder, triangular sail plane, gently rocking on water.`
- **漁網與魚簍**：`Fishing net as a low-poly plane with grid wireframe overlay, and a woven basket cylinder.`
- **五餅二魚**：`Small basket with 5 round bread discs and 2 small fish shapes.`
- **山坡講台**：`Grassy terraced slope with a few flat stone seats (Sermon on the Mount).`
- **動物**：
  - 魚群：`School of 6 tiny geometric fish swimming in a loop under translucent water. Level 2: gold-tinted fins.`
  - 海鷗：`Cute geometric seagull, white with grey wings, glides. Level 2: tiny fish in beak.`
  - 羊群（加利利版）：`Reuse sheep with cream wool variant.`
  - 麻雀：`Cute geometric sparrow, brown, quick hops. Level 2: seed in beak.`

### 3.7 場景六：新耶路撒冷（容量 30，最終場景）
- **島嶼底座**：`Large floating island 12x12 tiles, pale gold and white blocks, a straight river of life running from center to edge as a waterfall.`
- **城牆與城門**：`Square city wall of jasper-green translucent blocks (#9ED8C6, opacity 0.8), 12 gates as arches, each gate topped with a white pearl sphere.`
- **生命樹**：`Tree of life on both sides of the river: tall trunk, layered round canopy with 12 different colored fruit spheres, soft emissive.`
- **寶座光芒**：`Central light source: emissive white-gold icosahedron with slow rotating rays (thin planes).`
- **黃金街道**：`Grid path tiles with gold color, slightly emissive.`
- **動物**：
  - 獅子：`Cute geometric lion, golden body, mane of radial cone spikes. Level 2: tiny crown.`
  - 羔羊（新耶路撒冷版）：`Reuse lamb with white glowing wool variant; often idles next to the lion.`
  - 豹：`Cute geometric leopard, yellow with dark spots. Level 2: soft collar.`
  - 鷹：`Cute geometric eagle, brown with white head, soaring circles. Level 2: wide golden-tipped wings.`

---

### 3.8 蛋（4 種）
```
Geometric egg (ellipsoid from Icosahedron detail 2, scaled y 1.3) with variants:
- common: off-white
- rare: pale blue with one gold star decal (flat extruded star)
- precious: crystal-like translucent lavender, faceted, inner glow
- legendary: gold, emissive rim, tiny orbiting particles
Include hatch animation: shake (rotate z ±10°) 3 times, crack into 6 shell shards that fly outward and fade, white light burst.
```

### 3.9 特效
- **光環**：`Reusable gold halo torus that hovers and rotates.`
- **升級特效**：`Level-up burst: ring of 12 small gold cubes expanding outward + vertical light column, 1 second.`
- **新動物出場**：`Spawn effect: soft white sparkle particles rising from ground circle.`
- **場景解鎖轉場**（各一個）：
  - 伊甸園→方舟：`Water rises and fills screen, then recedes revealing new island.`
  - 方舟→曠野：`Red-sea split: two water walls part in the middle.`
  - 曠野→伯利恆：`Fade to night, star appears and brightens.`
  - 伯利恆→加利利：`Camera pans down a hill to a lake at dawn.`
  - 加利利→新耶路撒冷：`Clouds part with golden light rays revealing the city.`

### 3.10 天空與光線
```
Gradient sky dome shader (top/bottom color uniforms) with presets per scene:
Eden: lavender-to-peach; Ark: pale blue with rainbow; Wilderness: warm sand-orange; Bethlehem: deep navy night with tiny star points; Galilee: aqua dawn; New Jerusalem: white-gold.
Include soft hemisphere light + one directional light with PCF soft shadows; optional day/night blend driven by device time.
```

### 3.11 UI 圖示（SVG，細線條極簡風）
```
Create minimalist thin-line SVG icons (stroke 1.5px, color #8A7A55, 24x24, rounded caps): sprout (logo), open book (reading), island outline (tab 島嶼), book (tab 圖鑑), mountains (tab 場景), egg, star, diamond, crown, check, cross, lock, arrow-right, scroll (經文), gift.
```


## 4. Delegation protocol (Claude ⇄ Codex)
- You write and run all code: logic, rendering, UI, tests, and build.
- Whenever a 3D asset, texture, or scene model is needed, follow these steps:
  1. Spawn a Codex subtask. Its prompt is the shared style prefix (§3.0), then the exact asset prompt from §3, then (for animals) the animal spec (§3.1). Add the target file path, e.g. `src/render/assets/animals/rabbit.ts`, and the required export signature.
  2. Wait for Codex to return the module.
  3. Integrate it: import it, register it in `config/animals.ts` or `config/scenes.ts`, check the triangle budget, and run it in the scene.
  4. If it fails a check, send Codex one follow-up with the specific fix needed. Do not rewrite the asset yourself.
- Do NOT hand-draw or hand-model assets yourself. Use simple placeholder boxes only while waiting for Codex.
- Batch Codex jobs scene by scene: finish and test all Eden assets on a phone before requesting scene 2.

## 5. Tech stack
- TypeScript (strict, no `any`), or vanilla JS if preferred. Use Vite and Three.js r170. Use Vitest and Playwright for tests.
- PWA: a manifest, and a service worker that is cache-first for assets and network-first for articles.
- Performance: target 60 fps on mid-range phones.
  - Merge static geometry and use instancing for flowers and grass.
  - Use shared materials, and dispose of objects on scene unload.
  - Pause rendering while the tab is hidden, and cap DPR at 2.
- Respect `prefers-reduced-motion`.
- **localStorage schema built for a future Supabase migration:**
  - Store everything under one key, `xinxi-island:v1`.
  - It holds a versioned `GameState`: `{ version, userId (uuid, local), reads[], pendingBatch[], eggs[], animals[], companions[], currentSceneId, unlockedSceneIds[], collection{}, goldenScenes[], lastResetAt, settings{} }`.
  - Every entity has a uuid `id`, plus `createdAt` and `updatedAt` as ISO strings. Arrays map 1:1 to future tables: `reads`, `eggs`, `animals`, `collection`.
  - Write migration functions keyed by `version`.
  - JSON export and import in Settings.
