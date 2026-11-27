# One sheet of every species at Lv1 / Lv2 / Lv3, grouped by scene, for reviewing the level looks.
# Usage: python3 tools/level-sheet.py out.png
import re, sys, os
from PIL import Image, ImageDraw, ImageFont

SCENES = [('eden', '伊甸園'), ('ark', '亞拉臘山'), ('wilderness', '西奈山'),
          ('bethlehem', '伯利恆的野地'), ('galilee', '加利利海'), ('jerusalem', '新耶路撒冷')]
species = re.findall(r"\{ id: '(\w+)', name: '([^']+)', scene: '(\w+)' \}", open('config/animals.ts').read())
font = lambda n: ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', n)
CELL, PAD, HEAD = 150, 14, 46          # one level image box, gaps, scene title height
SCALE = {1: 0.6, 2: 0.85, 3: 1.0}       # same as the game
GROUP_W = 3 * CELL + 2 * PAD
W = 4 * GROUP_W + 5 * PAD
ROW_H = HEAD + 26 + CELL + 30
sheet = Image.new('RGB', (W, 60 + len(SCENES) * ROW_H), (250, 247, 240))
d = ImageDraw.Draw(sheet)
d.text((PAD, 12), '動物三個等級：Lv1 幼崽 · Lv2 成長（配件）· Lv3 成熟（配件＋光環）', fill=(62, 74, 58), font=font(28))

def load(scene, sid, lv):
    for name in (f'{sid}-{1 if lv == 1 else 2}.png', f'{sid}.png'):
        p = f'public/scenes/{scene}/{name}'
        if os.path.exists(p): return Image.open(p).convert('RGBA'), name.endswith(f'-{1 if lv == 1 else 2}.png')
    return None, False

for r, (scene, title) in enumerate(SCENES):
    y0 = 60 + r * ROW_H
    d.text((PAD, y0 + 8), title, fill=(184, 151, 90), font=font(26))
    for c, (sid, name, _) in enumerate([s for s in species if s[2] == scene]):
        gx = PAD + c * (GROUP_W + PAD)
        d.text((gx, y0 + HEAD), name, fill=(74, 66, 50), font=font(20))
        imgs = [load(scene, sid, lv) for lv in (1, 2, 3)]
        tallest = max(im.height for im, _ in imgs if im) if any(im for im, _ in imgs) else 1
        for i, lv in enumerate((1, 2, 3)):
            im, own = imgs[i]
            x = gx + i * (CELL + PAD); y = y0 + HEAD + 26
            d.rounded_rectangle((x, y, x + CELL, y + CELL), 10, fill=(255, 253, 247), outline=(232, 220, 196))
            if im:
                k = (CELL - 24) / max(tallest, im.width) * SCALE[lv]
                t = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
                px, py = x + (CELL - t.width) // 2, y + CELL - 8 - t.height
                cx = px + t.width / 2
                if lv == 3:  # the game's Lv3 look: golden aura behind, then sparkles and a thick halo
                    aura = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)); ad = ImageDraw.Draw(aura)
                    for i2 in range(12, 0, -1):
                        rr = (CELL / 2 - 6) * i2 / 12
                        ad.ellipse((CELL / 2 - rr, CELL / 2 - rr * 0.9 + 6, CELL / 2 + rr, CELL / 2 + rr * 0.9 + 6), fill=(255, 214, 120, int(10 + 6 * (12 - i2))))
                    sheet.paste(aura, (x, y), aura)
                sheet.paste(t, (px, py), t)
                if lv == 3:
                    hw = t.width * 0.4
                    d.ellipse((cx - hw / 2, py - 11, cx + hw / 2, py - 1), outline=(240, 200, 90), width=4)
                    for sx, sy in ((0.12, 0.3), (0.88, 0.25), (0.8, 0.72), (0.22, 0.78)):
                        qx, qy = x + CELL * sx, y + CELL * sy
                        d.ellipse((qx - 3, qy - 3, qx + 3, qy + 3), fill=(255, 236, 160))
            label = f'Lv{lv}' + ('' if own else '（還沒有專屬圖）')
            d.text((x + 6, y + CELL + 4), label, fill=(138, 122, 85), font=font(16))
sheet.save(sys.argv[1])
print('saved', sys.argv[1], sheet.size)
