# Build water / waterfall masks from a scene's island.png by colour, for the subtle flow animation.
# Usage: python3 tools/water-mask.py public/scenes/eden
import sys, colorsys
from PIL import Image, ImageFilter
d = sys.argv[1]
im = Image.open(f'{d}/island.png').convert('RGBA')
W, H = im.size
water = Image.new('L', im.size, 0); fall = Image.new('L', im.size, 0)
wp, fp = water.load(), fall.load()
px = im.load()
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        if a < 200: continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if not (0.52 < h < 0.62): continue
        if s > 0.35 and v > 0.55: wp[x, y] = 255          # saturated blue pond / channel
        elif s > 0.08 and v > 0.8: fp[x, y] = 255          # pale blue falls
water = water.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
fall = fall.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.5))
from PIL import ImageChops
water = ImageChops.lighter(water, fall)  # falls shimmer too; they also get the downward streaks
# Saved as white with the mask in alpha, since CSS -webkit-mask reads alpha only.
white = Image.new('L', im.size, 255)
Image.merge('RGBA', (white, white, white, water)).save(f'{d}/water-mask.png')
Image.merge('RGBA', (white, white, white, fall)).save(f'{d}/fall-mask.png')
print('water px', sum(1 for v in water.getdata() if v > 128), 'fall px', sum(1 for v in fall.getdata() if v > 128))
