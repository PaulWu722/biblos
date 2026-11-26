Continue refining the Eden 3D view toward the concept art. Same file permissions and contracts as before (edenIsland.ts, props/*, the 4 Eden animal files, and stage.ts camera/lights only; nothing else).

Attached: (1) the concept art, (2) a side-by-side image: LEFT = concept art, RIGHT = the real in-game screenshot of your current code (390x844 phone, taken by me; your sandbox cannot launch Chromium, so do not try to screenshot — reason from this image and from the code).

Fix these gaps, most important first:
1. **Framing**: the island sits too low and the cliff is cut close to the button. Raise it so the grass top edge is at ~20% of the screen height and the cliff bottom at ~66%; island width ~95% of the screen.
2. **Cliff**: in the concept the cliff is a bit shallower relative to the island and clearly tapers to a narrower, darker grey bottom with many small protruding blocks; ours is a big flat beige wall. Use smaller, more varied blocks and a stronger beige→grey gradient.
3. **Layout**: rabbit's raised cream stone platform at front-left; big tree at back-left corner with grey boulders next to it; small round tree on the raised back-center grass plateau; pond with a short waterfall step at back-right; conifer tall at the right corner (about as tall as the big tree); the sheep's grass islet in the middle of the channel; the main waterfall on the front-left face falling into a pool on a lower ledge with a second fall. Our deer is on the islet and the conifer is too small.
4. **Density**: far more pink/white flower clusters and spiky agave clumps, as in the concept.
5. **Dove**: must fly high above the island at the upper right (about 2.5 units above the grass), wings spread, not walk on the ground. It may ignore walk points height: in dove.ts put the body high inside the group.
6. **Light**: brighter, softer, less contrast on the cliff faces (the concept's cliffs are light cream with soft shading).

Report only: what changed and triangle estimate.
