"""Build the social share card (og.png, 1200x630).

og:image must be PNG/JPEG - Telegram, X, Facebook and LinkedIn all ignore SVG,
so pointing it at logo.svg meant every shared link came through with no picture.
Run:  python make-og.py
"""
import math
import random
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools"))
from imgutil import key_out_background  # noqa: E402

W, H = 1200, 630
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "og.png")

BOLD = r"C:\Windows\Fonts\arialbd.ttf"
REG = r"C:\Windows\Fonts\arial.ttf"
f = lambda path, size: ImageFont.truetype(path, size)

random.seed(11)

# ---------------------------------------------------------------- background
img = Image.new("RGB", (W, H), (4, 5, 12))
d = ImageDraw.Draw(img, "RGBA")

# vertical gradient  #04050c -> #0a1030
top, bot = (4, 5, 12), (10, 16, 48)
for y in range(H):
    t = y / (H - 1)
    d.line([(0, y), (W, y)],
           fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))

# nebula glows
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([W - 560, -330, W + 240, 470], fill=(124, 92, 255, 74))
gd.ellipse([-330, H - 420, 330, H + 250], fill=(91, 233, 185, 46))
gd.ellipse([W * 0.30, -260, W * 0.78, 250], fill=(74, 108, 255, 40))
glow = glow.filter(ImageFilter.GaussianBlur(96))
img = Image.alpha_composite(img.convert("RGBA"), glow)
d = ImageDraw.Draw(img, "RGBA")

# stars — kept out of the text column so nothing twinkles through a letter.
# Drawn on their own layer: PIL 11 writes RGBA ink straight through instead of
# blending it, so a translucent star would otherwise flatten to full white.
TXT = (330, 195, 990, 575)
stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(stars, "RGBA")
for _ in range(340):
    x, y = random.uniform(0, W), random.uniform(0, H)
    if TXT[0] < x < TXT[2] and TXT[1] < y < TXT[3]:
        continue
    r = random.choice([0.7, 0.9, 1.1, 1.4, 1.8, 2.3])
    a = random.randint(70, 235)
    sd.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    if r > 2 and random.random() < 0.35:
        sd.line([(x - 6, y), (x + 6, y)], fill=(255, 255, 255, 46))
        sd.line([(x, y - 6), (x, y + 6)], fill=(255, 255, 255, 46))
img = Image.alpha_composite(img, stars)
d = ImageDraw.Draw(img, "RGBA")

# a faint planet arc, bottom right
d.ellipse([W - 300, H - 120, W + 420, H + 600], outline=(124, 92, 255, 60), width=3)

# ------------------------------------------------------------------- content
logo_path = os.path.join(HERE, "icon-512.png")
if os.path.exists(logo_path):
    # 416 = 2x the drawn size; downscaling afterwards smooths the cut edge
    logo = key_out_background(logo_path, size=416)
    logo = logo.resize((216, 216), Image.LANCZOS)
    # soft halo behind it
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([58, 205, 308, 455], fill=(124, 92, 255, 66))
    halo = halo.filter(ImageFilter.GaussianBlur(46))
    img = Image.alpha_composite(img, halo)
    d = ImageDraw.Draw(img, "RGBA")
    img.alpha_composite(logo, (90, 216))

LX = 344  # text column

f_title = f(BOLD, 92)
f_sub = f(REG, 33)
f_chip = f(BOLD, 21)
f_url = f(BOLD, 23)

d.text((LX, 214), "STILL HERE", font=f_title, fill=(242, 244, 255, 255))
d.text((LX, 330), "150 reads that put your life in perspective",
       font=f_sub, fill=(176, 184, 220, 255))

# chips
chips = ["Free", "Works offline", "No account"]
cx = LX
for label in chips:
    tw = d.textlength(label, font=f_chip)
    d.rounded_rectangle([cx, 396, cx + tw + 34, 442], radius=23,
                        fill=(255, 255, 255, 20), outline=(255, 255, 255, 46), width=1)
    d.text((cx + 17, 409), label, font=f_chip, fill=(170, 226, 255, 255))
    cx += tw + 48

# accent rule
d.line([(LX, 496), (LX + 300, 496)], fill=(124, 92, 255, 220), width=4)
d.line([(LX, 496), (LX + 84, 496)], fill=(91, 233, 185, 255), width=4)

d.text((LX, 526), "fyosamu.github.io/still-here", font=f_url,
       fill=(140, 150, 195, 255))

img.convert("RGB").save(OUT, "PNG", optimize=True)
print("wrote", OUT, os.path.getsize(OUT), "bytes")
