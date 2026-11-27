Replace the bronze serpent of the Sinai (西奈山) scene with a new animal: a Nubian ibex / wild mountain goat (野山羊). Work only in `public/scenes/wilderness/`; do not touch code.

Attached: the Sinai concept art, then the scene's existing sprites camel.png, donkey.png and quail.png. Draw the ibex in EXACTLY the same art style, lighting, outline softness, colour palette and camera angle as those animals (cute, soft low-poly storybook look, 3/4 view), standing, facing LEFT, transparent background, no ground, no halo, tightly cropped, about the same pixel height as donkey.png.
Write:
1. `ibex.png` — mature ibex: sandy-tan coat with a lighter belly, dark short beard, large backward-curving ridged horns.
2. `ibex-1.png` — Lv1 baby (kid): bigger head, round soft body, short legs, big eyes, tiny horn nubs, no accessory.
3. `ibex-2.png` — Lv2 grown: same as ibex.png wearing a big, clearly visible colourful woven collar with tassels and a golden bell (matching the camel's saddle-blanket colours: purple, red, gold).
Then update `layout.json`: in "sizes" remove "bronzeSerpent" and add "ibex" with a height matching the donkey's size relation in the concept (a little taller than the donkey because of the horns); keep "ibex" out of "facesRight" (it faces left). Delete `bronzeSerpent.png`, `bronzeSerpent-1.png`, `bronzeSerpent-2.png`.
Verify the PNGs are RGBA with transparent corners. Report only the files written/deleted and the ibex size you set.
