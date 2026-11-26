# Cut a flame drawn in a scene's island.png out as a sprite for the flicker animation and record it
# in layout.json "fire". The flame box is given by hand (auto-detection mistakes wood and fruit for fire).
# Usage: python3 tools/fire-sprites.py public/scenes/galilee x0 y0 x1 y1   (adds one flame; run again for more)
#        python3 tools/fire-sprites.py public/scenes/galilee --clear
import sys, json, colorsys
from PIL import Image, ImageFilter
d = sys.argv[1]
meta = json.load(open(f'{d}/layout.json'))
if sys.argv[2] == '--clear':
    meta['fire'] = []; json.dump(meta, open(f'{d}/layout.json', 'w')); sys.exit()
x0, y0, x1, y1 = map(int, sys.argv[2:6])
crop = Image.open(f'{d}/island.png').convert('RGBA').crop((x0, y0, x1, y1))
m = Image.new('L', crop.size, 0); mp = m.load(); cp = crop.load()
for y in range(crop.height):
    for x in range(crop.width):
        r, g, b, a = cp[x, y]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        # orange/yellow flame, plus its near-white hot core
        if a > 150 and ((0.015 < h < 0.13 and s > 0.6 and v > 0.86) or (v > 0.96 and 0.05 < s < 0.45 and 0.11 < h < 0.17)):
            mp[x, y] = 255
# close small holes in the bright core, then soften the edge
m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1))
crop.putalpha(m)
fires = meta.get('fire', [])
name = f'fire{len(fires)}.png'; crop.save(f'{d}/{name}')
fires.append({'src': name, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}); meta['fire'] = fires
json.dump(meta, open(f'{d}/layout.json', 'w'))
print(name, (x0, y0, x1, y1))
