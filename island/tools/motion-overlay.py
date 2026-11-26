# Cut only the moving parts (waterfall, plants) out of an animated concept webp and save them as a
# small looping overlay aligned to the scene's island.png.
# Usage: python3 tools/motion-overlay.py <concept.webp> <scene dir> <k> <ox> <oy>
#   k, ox, oy: island.png maps into the concept frame as (ox, oy) + k * (x, y)  (found by matching; eden: 0.509 28 302)
import sys, json
from PIL import Image, ImageChops, ImageFilter
src, d, k, ox, oy = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
plate = Image.open(f'{d}/island.png')
W, H = plate.size
box = tuple(round(v) for v in (ox, oy, ox + W * k, oy + H * k))
im = Image.open(src)
frames, durs = [], []
for i in range(im.n_frames):
    im.seek(i); durs.append(im.info.get('duration') or 50)
    frames.append(im.convert('RGBA').crop(box).resize((W, H), Image.LANCZOS))
# Pixels that change across the loop = the motion; grow and feather so edges blend into the still art.
lo = hi = None
for f in frames:
    g = f.convert('L'); lo = g if lo is None else ImageChops.darker(lo, g); hi = g if hi is None else ImageChops.lighter(hi, g)
mask = ImageChops.difference(hi, lo).point(lambda v: 255 if v > 18 else 0)
mask = mask.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(6))
mask = ImageChops.multiply(mask, plate.getchannel('A'))  # never paint outside the island
# Things removed from the plate (animals, halos) still sit in the animation frames; keep them out of the overlay.
removed = ImageChops.difference(frames[0].convert('RGB'), plate.convert('RGB')).convert('L').point(lambda v: 255 if v > 25 else 0)
removed = ImageChops.multiply(removed, plate.getchannel('A').point(lambda v: 255 if v > 200 else 0))
removed = removed.filter(ImageFilter.MaxFilter(19)).filter(ImageFilter.GaussianBlur(3))
mask = ImageChops.subtract(mask, removed)
bb = mask.getbbox()
# Phones show the island ~800 px wide at most, so the overlay is stored at 60% and stretched back by CSS.
SCALE = 0.6
out = []
for f in frames:
    f.putalpha(ImageChops.multiply(f.getchannel('A'), mask)); c = f.crop(bb)
    out.append(c.resize((round(c.width * SCALE), round(c.height * SCALE)), Image.LANCZOS))
# Every other frame (10 fps) is smooth enough for a breeze and halves the file.
out, durs = out[::2], [a + b for a, b in zip(durs[::2], durs[1::2] + [durs[-1]])]
out[0].save(f'{d}/motion.webp', save_all=True, append_images=out[1:], duration=durs, loop=0, quality=70, method=6, minimize_size=True, allow_mixed=True)
meta = json.load(open(f'{d}/layout.json')); meta['motion'] = {'src': 'motion.webp', 'x': bb[0], 'y': bb[1], 'w': bb[2] - bb[0], 'h': bb[3] - bb[1]}
json.dump(meta, open(f'{d}/layout.json', 'w'))
print('motion box', bb, 'frames', len(out))
