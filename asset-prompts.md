# 信息島：極簡幾何風素材 Prompt 清單（給 Codex）

## 0. 共用風格前綴（每個 prompt 最前面都貼上）
```
Create a Three.js (r170) procedural low-poly asset as an ES module exporting a function that returns a THREE.Group.
Style: minimalist geometric isometric puzzle-game look. Use only primitive geometry (Box, Cylinder, Cone, Icosahedron/Dodecahedron detail 0-1, Sphere low segments), flatShading: true, MeshStandardMaterial roughness 0.9 metalness 0.
Palette: sage green #A8C686, moss #7FA36B, sand/stone #E8DCC4 #CFC2A8, water #6FB7E8, white #FFFFFF, soft gold halo #E9C46A, warm wood #A47551. No textures, no outlines.
Scale: 1 unit = 1 grid tile; keep the asset centered at origin, base at y=0. Max ~800 triangles per prop, ~400 per animal.
castShadow/receiveShadow on all meshes. Export name and a small demo comment.
```

## 1. 動物共用規格（貼在每隻動物 prompt 後）
```
Build the animal in 3 growth levels via a parameter level (1|2|3):
- Level 1 (幼崽): scale 0.6, bigger head ratio, no accessory.
- Level 2 (成長): scale 0.85, normal proportions, one small accessory as described.
- Level 3 (成熟): scale 1.0, accessory + thin floating gold torus halo (radius 0.18, tube 0.015) above head that slowly rotates.
Return { group, animate(t) } where animate does an idle bob and a simple walk cycle (legs rotate ±20°). Eyes are tiny black spheres, cute and simple.
```

---

## 2. 場景一：伊甸園（容量 6）
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

## 3. 場景二：挪亞方舟／亞拉臘山（容量 10）
- **島嶼底座**：`Floating mountain island 8x8 tiles, grey-brown stone blocks rising to a plateau, patches of grass, puddles left after a flood.`
- **方舟**：`Geometric Noah's ark: long wooden hull from boxes with tapered ends, cabin box with sloped roof, small door ramp.`
- **彩虹**：`Rainbow arc made of 6 thin half-torus bands (red to violet), semi-transparent, placed behind the island.`
- **橄欖樹**：`Small olive tree with silver-green flat canopy.`
- **動物**：
  - 大象：`Cute geometric elephant, grey, cylinder trunk that sways. Level 2: blanket on back.`
  - 長頸鹿：`Cute geometric giraffe, tall box neck, yellow with brown square spots. Level 2: scarf.`
  - 斑馬：`Cute geometric zebra, white body with black stripe boxes. Level 2: tuft mane.`
  - 烏鴉：`Cute geometric raven, black, perches and hops. Level 2: tiny twig.`

## 4. 場景三：曠野與西奈山（容量 15）
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

## 5. 場景四：伯利恆的野地（容量 20，固定夜晚）
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

## 6. 場景五：加利利海（容量 25）
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

## 7. 場景六：新耶路撒冷（容量 30，最終場景）
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

## 8. 蛋（4 種）
```
Geometric egg (ellipsoid from Icosahedron detail 2, scaled y 1.3) with variants:
- common: off-white
- rare: pale blue with one gold star decal (flat extruded star)
- precious: crystal-like translucent lavender, faceted, inner glow
- legendary: gold, emissive rim, tiny orbiting particles
Include hatch animation: shake (rotate z ±10°) 3 times, crack into 6 shell shards that fly outward and fade, white light burst.
```

## 9. 特效
- **光環**：`Reusable gold halo torus that hovers and rotates.`
- **升級特效**：`Level-up burst: ring of 12 small gold cubes expanding outward + vertical light column, 1 second.`
- **新動物出場**：`Spawn effect: soft white sparkle particles rising from ground circle.`
- **場景解鎖轉場**（各一個）：
  - 伊甸園→方舟：`Water rises and fills screen, then recedes revealing new island.`
  - 方舟→曠野：`Red-sea split: two water walls part in the middle.`
  - 曠野→伯利恆：`Fade to night, star appears and brightens.`
  - 伯利恆→加利利：`Camera pans down a hill to a lake at dawn.`
  - 加利利→新耶路撒冷：`Clouds part with golden light rays revealing the city.`

## 10. 天空與光線
```
Gradient sky dome shader (top/bottom color uniforms) with presets per scene:
Eden: lavender-to-peach; Ark: pale blue with rainbow; Wilderness: warm sand-orange; Bethlehem: deep navy night with tiny star points; Galilee: aqua dawn; New Jerusalem: white-gold.
Include soft hemisphere light + one directional light with PCF soft shadows; optional day/night blend driven by device time.
```

## 11. UI 圖示（SVG，細線條極簡風）
```
Create minimalist thin-line SVG icons (stroke 1.5px, color #8A7A55, 24x24, rounded caps): sprout (logo), open book (reading), island outline (tab 島嶼), book (tab 圖鑑), mountains (tab 場景), egg, star, diamond, crown, check, cross, lock, arrow-right, scroll (經文), gift.
```

## 12. 給 Codex 的建議順序
1. 先做共用風格前綴與動物骨架（一個檔案 `animalBase.js`），所有動物共用。
2. 做場景一完整版（底座 + 道具 + 4 隻動物 + 蛋）先測手機效能。
3. 確認效能 OK，再依序做場景二到六。
4. 最後補特效、轉場、UI 圖示。
