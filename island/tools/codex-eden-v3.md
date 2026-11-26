The attached image is the user's concept art for the Eden scene of our 3D island game (it is also at ../scene-concepts/00-eden-reference.png). The user wants the in-game 3D Eden view to look AS CLOSE AS POSSIBLE to this image ("100% the same"). The camera is fixed (no rotation), so only this one viewpoint matters.

Work only inside this directory (Vite + TS, three@0.170). TypeScript strict, no `any`.
You may edit ONLY:
- `src/render/assets/island/edenIsland.ts` (keep exports `WalkPoint`, `IslandScene`, `createEdenIsland(): IslandScene` with `group`, `walk` (exact top-surface y, >= 20 points, clear of props/water), `radius`)
- `src/render/assets/props/*` (add files freely)
- `src/render/assets/animals/{rabbit,sheep,deer,dove}.ts` (keep signatures `createX(level: 1|2|3): { group; animate(t) }`, feet at y=0, facing +Z, Lv scales 0.6/0.85/1.0, Lv3 gold halo)
- `src/render/stage.ts`: ONLY camera angle/framing, lights and shadows. Keep the class API (`new Stage(host)`, `setAnimals(animals)`), the fixed camera (no OrbitControls), the pause-when-hidden loop and DPR cap 2. The HTML header (top ~13% of the screen) and the button + tab bar (bottom ~27%) are drawn over the canvas by the UI; keep the island framed between them as in the image.
Do NOT edit src/ui, src/core, config, tests.

## Your loop (do at least 3 rounds)
1. A dev server is running at http://localhost:5173. Run `node tools/shot.mjs /tmp/eden-shot.png eden` to screenshot the game exactly like a phone (390x844 @2x, with 4 Lv3 Eden animals) and look at it.
2. Compare it with the attached concept image region by region, then change the code to close the gaps, and repeat.

## What to match (from the image)
- **Framing**: island spans ~95% of the screen width; grass top edge at ~25% of screen height, cliff bottom at ~73%. View is a classic isometric diamond (island corner pointing at the viewer).
- **Island shape**: diamond footprint with chipped stepped edges; terraces at several heights (raised grass plateau back-center with the small round tree; raised stone platform left where the rabbit sits; lower front-left).
- **Water**: a pond at back-right with a small waterfall step, a wide winding channel through the middle around a grass islet (sheep stands on it), and the main waterfall on the FRONT-LEFT face falling into a pool on a lower ledge, then a second fall off the bottom-left. Water is bright clear blue with white foam, light-blue translucent falls.
- **Cliff**: deep, made of large cream/beige blocks at the top turning to grey at the bottom, with uneven protruding blocks, tapering to a narrower bottom.
- **Props**: big broad-leaf tree back-left (2 big pale-green canopy clusters, brown trunk), small round tree back-center, tall layered conifer at right, grey boulders (left edge, near the big tree, right), many pink/white flower clusters, spiky dark-green agave clumps, cream paved paths.
- **Animals**: sitting white rabbit with pink inner ears, very fluffy cream sheep, slender tan deer with antlers and white spots, white dove flying high at the upper right with spread wings. All have a thin gold halo.
- **Light / colour**: soft, bright, airy, low-contrast pastel look; gentle soft shadows; grass light yellow-green (#B9D38C-ish), stone cream (#EDE3CF), cliff beige to grey. Avoid dark harsh shadows.

Keep total triangles under ~15000 and 60 fps on phones (instancing / merged geometry). When done, report only: what you changed, rounds done, triangle estimate.
