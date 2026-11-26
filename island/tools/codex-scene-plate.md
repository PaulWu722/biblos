The attached image is the user's concept art for the "__NAME__" scene of our reading game (file: `__SRC__`). The game shows THIS ART DIRECTLY as a floating island that gently bobs, with the animals as separate sprites that wander on it. Use your image editing tool on the attached image so the art stays as identical as possible. Only write files under `public/scenes/__ID__/`; do not touch code or any other folder.

Produce:
1. `public/scenes/__ID__/island.png` — ONLY the floating island and its scenery (buildings, trees, props, water, waterfalls, cliff, and any decor that belongs to the island such as clouds, a star or light rays drawn with it) on a fully TRANSPARENT background. Remove: the sky gradient, every text/UI element (title, counters, icons, button, divider, tab bar), ALL animals listed below and their gold halos — fill those spots naturally with the surrounding ground. Do not move, redraw or recolour anything else. Crop to the island (keep native resolution; do not upscale), clean edges.
2. One transparent sprite per species: __SPRITES__. Each exactly as drawn in the concept (same pose, colours, accessories), WITHOUT halo and without ground under it, cropped tightly. If a species is NOT drawn in the concept, create it with your image tool in exactly the same art style, lighting and scale as the other animals of this image.
3. `public/scenes/__ID__/layout.json` in island.png pixel coordinates:
{ "width": W, "height": H,
  "walk": [[x,y],...],   // >= 20 feet positions on open ground (NOT on buildings, ramps, roofs, trees, rocks, water, cliff)
  "sky":  [[x,y],...],   // 3-5 points in the air above the island for flying birds (negative y allowed)
  "swim": [[x,y],...],   // only if the scene has a lake/sea area: 6+ points ON the water surface for fish (else [])
  "animalHeight": H0,    // typical standing animal height
  "sizes": {"<species>": h, ...},   // every species' height as drawn (or as it should be at that scale)
  "facesRight": ["<species>", ...]  // species whose sprite faces right (others face left)
}
Verify every PNG is RGBA with transparent corners (python3 PIL). Report only: files with pixel sizes, which sprites you had to create, and anything you could not do.
