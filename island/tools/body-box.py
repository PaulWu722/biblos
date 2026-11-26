# Find the island body (ground + cliff, without sky decor such as rainbows, stars or smoke) in a scene's
# island.png and store it as layout.json "body": [x0, y0, x1, y1], so every island is drawn the same size.
# Usage: python3 tools/body-box.py public/scenes/<id> [...]
import sys, json
from PIL import Image
for d in sys.argv[1:]:
    a = Image.open(f'{d}/island.png').getchannel('A').point(lambda v: 255 if v > 200 else 0)
    W, H = a.size; px = a.load()
    rows = []
    for y in range(H):
        xs = [x for x in range(0, W, 2) if px[x, y]]
        rows.append((xs[0], xs[-1]) if xs else None)
    widest = max((r[1] - r[0]) for r in rows if r)
    # The body is the band of rows at least 70% as wide as the widest row; decor above is narrower.
    band = [y for y, r in enumerate(rows) if r and r[1] - r[0] >= 0.7 * widest]
    y0 = band[0]
    xs0 = min(r[0] for r in rows[y0:] if r); xs1 = max(r[1] for r in rows[y0:] if r)
    y1 = max(y for y, r in enumerate(rows) if r)
    meta = json.load(open(f'{d}/layout.json')); meta['body'] = [xs0, y0, xs1, y1]
    json.dump(meta, open(f'{d}/layout.json', 'w'))
    print(d.split('/')[-1], (W, H), 'body', meta['body'])
