The attached image is the user's concept art for the Ararat (Noah's ark) scene (also at ../scene-concepts/02-ararat.png, 941x1672). The game will now show THIS ART DIRECTLY as the island (no more 3D island), floating and gently bobbing, with the animals as separate sprites that wander on it. Use your image generation / editing tool, editing the attached image so the art stays as identical as possible (same island, same style, same colours, same perspective). Only add files under `public/scenes/ark/`; do not touch any code.

Produce:
1. `public/scenes/ark/island.png` — ONLY the floating island (grass, paths, water, trees, rocks, flowers, waterfall, cliff) on a fully TRANSPARENT background. Remove: the sky gradient, every text/UI element (title, counters, icons, button, divider, tab bar), and ALL animals (elephant, giraffe, zebra, raven) — fill where the animals were with the matching ground/grass/stone so it looks natural; also remove the gold halos. Crop tightly to the island, keep high resolution (at least 1024 px wide; upscale cleanly if needed), keep the exact composition. Edges should be clean (no sky-coloured halo).
2. `public/scenes/ark/elephant.png`, `giraffe.png`, `zebra.png`, `raven.png` — each animal exactly as drawn in the concept (same pose and style), WITHOUT its halo and without any ground/grass under it, on a transparent background, cropped tightly, about 256–384 px on the longest side.
3. `public/scenes/ark/layout.json` describing positions in `island.png` pixel coordinates:
```json
{ "width": <island.png width>, "height": <island.png height>,
  "walk": [[x, y], ...],          // >= 20 points on grass/stone tops where an animal's FEET can stand (not on water, trees, rocks, cliff, sky); spread over all terraces
  "sky":  [[x, y], ...],          // 3-5 points in the air above the island for the raven (it flies/perches) (may be outside the island bbox: negative y allowed)
  "animalHeight": <typical standing-animal sprite height in island.png pixels, matching the concept's scale>
}
```
Verify the files open and have transparency (e.g. with python3 PIL: mode RGBA, corner pixels alpha 0). Report only: files written with their pixel sizes, and anything you could not do.

Extra for this scene:
- Keep the ark, its ramp, the snowy mountains, the rainbow and the clouds that belong to the island composition in `island.png` (they are scenery, not UI). Remove only the sky gradient around them; soft clouds may keep partial transparency.
- Keep each animal's accessories as drawn (elephant blanket, giraffe scarf) in its sprite.
- Also add to layout.json `"sizes": {"elephant": h, "giraffe": h, "zebra": h, "raven": h}` = each animal's height as drawn in the concept, converted to island.png pixels.
- Note in the report which direction each sprite faces (left or right).
