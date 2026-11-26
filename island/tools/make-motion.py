"""Build motion layers for a scene plate: a water mask and swaying flower/grass patches.
Usage: python3 tools/make-motion.py eden
Writes public/scenes/<id>/water.png, sway/*.png and motion.json. Pillow only (no numpy here)."""
import json, os, sys
from PIL import Image, ImageFilter

scene = sys.argv[1]
d = f'public/scenes/{scene}'
im = Image.open(f'{d}/island.png').convert('RGBA')
W, H = im.size
px = im.load()

def build(test):
    m = Image.new('L', im.size, 0)
    mp = m.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a > 200 and test(r, g, b): mp[x, y] = 255
    return m

# Water: clearly blue pixels (pond, channel, waterfalls).
water = build(lambda r, g, b: b > r + 45 and b > g + 10)
soft = water.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
Image.merge('RGBA', [soft, soft, soft, soft]).save(f'{d}/water.png', optimize=True)

pink = build(lambda r, g, b: r > 215 and g < 205 and b > 170 and r - g > 30)
leaf = build(lambda r, g, b: g > r + 25 and g > b + 35 and g < 165)  # dark agave, not pale grass tops

def boxes(m, cell):
    """Bounding boxes of pixel groups within ~`cell` px of each other (flood fill on a coarse grid)."""
    gw, gh = (W + cell - 1) // cell, (H + cell - 1) // cell
    grid = m.resize((gw, gh), Image.BOX).point(lambda v: 255 if v > 8 else 0)
    gp, seen = grid.load(), set()
    for sy in range(gh):
        for sx in range(gw):
            if not gp[sx, sy] or (sx, sy) in seen: continue
            stack, cells = [(sx, sy)], []
            seen.add((sx, sy))
            while stack:
                x, y = stack.pop(); cells.append((x, y))
                for nx in (x - 1, x, x + 1):
                    for ny in (y - 1, y, y + 1):
                        if 0 <= nx < gw and 0 <= ny < gh and gp[nx, ny] and (nx, ny) not in seen:
                            seen.add((nx, ny)); stack.append((nx, ny))
            xs, ys = [c[0] for c in cells], [c[1] for c in cells]
            yield (max(0, min(xs) * cell - 4), max(0, min(ys) * cell - 4),
                   min(W, (max(xs) + 1) * cell + 4), min(H, (max(ys) + 1) * cell + 4))

os.makedirs(f'{d}/sway', exist_ok=True)
for f in os.listdir(f'{d}/sway'): os.remove(f'{d}/sway/{f}')
patches = []
for kind, m, cell, min_px in (('flower', pink, 14, 25), ('grass', leaf, 8, 260)):
    for x0, y0, x1, y1 in boxes(m, cell):
        count = sum(1 for v in m.crop((x0, y0, x1, y1)).getdata() if v)
        if count < min_px or y1 - y0 > 120 or x1 - x0 > 170: continue  # noise / trees
        if any(p['x'] <= x0 and p['y'] <= y0 and p['x'] + p['w'] >= x1 and p['y'] + p['h'] >= y1 for p in patches): continue  # inside another patch
        name = f'{kind}{len(patches)}.png'
        im.crop((x0, y0, x1, y1)).save(f'{d}/sway/{name}', optimize=True)
        patches.append({'src': name, 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'kind': kind})
json.dump({'water': 'water.png', 'sway': patches}, open(f'{d}/motion.json', 'w'))
print('patches', len(patches), {k: sum(p['kind'] == k for p in patches) for k in ('flower', 'grass')})
