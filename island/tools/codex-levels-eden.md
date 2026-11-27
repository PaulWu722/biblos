Make the growth-level looks for the animals of the "伊甸園" scene. Work only in `public/scenes/eden/`; do not touch code or any other file. Use your image generation / editing tool, always starting FROM the existing sprite of that species in this folder (`<id>.png`, the mature look from the concept art) so style, colours, lighting, line quality and camera angle stay identical.

For each species below write two new transparent PNGs next to the existing one (keep `<id>.png` unchanged):
- `<id>-1.png` — **Lv1 幼崽 (baby)**: the same animal as a cute baby: noticeably bigger head relative to body, rounder and softer body, shorter legs/neck, bigger eyes; NO accessory. Same facing direction and a similar pose.
- `<id>-2.png` — **Lv2 成長 (grown)**: the mature animal WITH its accessory (listed below). If the existing sprite already wears that accessory, `-2.png` may be a byte copy of `<id>.png`. Same facing direction and pose as `<id>.png`.
No gold halo on any sprite (the game draws the Lv3 halo itself). No ground or shadow under the animal. Crop tightly; keep roughly the same pixel height as `<id>.png` (the game scales them itself).

Species (id — Lv2 accessory — notes):
- rabbit — small flower crown
- sheep — small bell on a collar
- deer — a small flower on one antler (antlers only from Lv2; the baby has no antlers, just tiny nubs)
- dove — olive branch in its beak (keep it flying, wings spread)

Verify every PNG is RGBA with transparent corners (python3 PIL) and that `-1` and `-2` face the same way as `<id>.png`. Report only: files written, which `-2` files are copies, and anything you could not do.
