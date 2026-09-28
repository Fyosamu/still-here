"""Shared image helpers for STILL HERE's generated artwork.

The exported icon sits on an opaque black square, which looked fine as a
favicon but reads as a sticker once it lands on a gradient. These helpers
cut it out and draw the starfield both the share card and the pins use.
"""
from PIL import Image, ImageDraw, ImageFilter

# brand palette — keep in sync with :root in styles.css
BG_TOP = (4, 5, 12)
BG_BOT = (10, 16, 48)
ACCENT_A = (59, 224, 200)   # --a1 teal
ACCENT_B = (155, 107, 255)  # --a2 purple
TEXT = (233, 237, 255)      # --txt
MUTED = (140, 147, 184)     # --muted


def key_out_background(path, thresh=46, size=None, feather=1.2):
    """Flood the black square away from the border.

    Flood-filling (rather than keying on colour) matters: the smiley's own
    outlines are black too, and they are never reached by a flood that only
    starts outside the silhouette.
    """
    src = Image.open(path).convert("RGBA")
    if size:
        src = src.resize((size, size), Image.LANCZOS)
    px = src.load()
    w, h = src.size

    def is_bg(p):
        return p[0] < thresh and p[1] < thresh and p[2] < thresh

    seen = bytearray(w * h)
    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    stack += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    while stack:
        x, y = stack.pop()
        if not (0 <= x < w and 0 <= y < h):
            continue
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not is_bg(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    if feather:
        src.putalpha(src.getchannel("A").filter(ImageFilter.GaussianBlur(feather)))
    return src


def with_alpha(base, fn):
    """Composite a translucent drawing pass onto `base`.

    PIL 11's ``ImageDraw.Draw(im, "RGBA")`` writes RGBA ink through unchanged
    instead of blending it, so ``fill=(255,255,255,16)`` lands as opaque white
    once the alpha channel is dropped. Anything with alpha < 255 has to be
    drawn on its own transparent layer and composited instead.
    """
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    fn(ImageDraw.Draw(layer, "RGBA"))
    return Image.alpha_composite(base, layer)


def space_background(w, h, seed=7, stars=340, clear=None):
    """Dark nebula + starfield, optionally keeping rectangles star-free.

    `clear` is one (x0, y0, x1, y1) box or a list of them.
    """
    import random

    if clear is None:
        boxes = []
    elif isinstance(clear[0], (int, float)):
        boxes = [tuple(clear)]
    else:
        boxes = [tuple(b) for b in clear]

    rng = random.Random(seed)
    img = Image.new("RGB", (w, h), BG_TOP)
    d = ImageDraw.Draw(img, "RGBA")

    for y in range(h):
        t = y / (h - 1)
        d.line(
            [(0, y), (w, y)],
            fill=tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3)),
        )

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w - w * 0.48, -h * 0.5, w + w * 0.2, h * 0.75], fill=(124, 92, 255, 74))
    gd.ellipse([-w * 0.3, h * 0.6, w * 0.3, h + h * 0.4], fill=(59, 224, 200, 46))
    glow = glow.filter(ImageFilter.GaussianBlur(max(w, h) // 11))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    d = ImageDraw.Draw(img, "RGBA")

    drawn = 0
    guard = 0
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer, "RGBA")
    while drawn < stars and guard < stars * 8:
        guard += 1
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        if any(b[0] < x < b[2] and b[1] < y < b[3] for b in boxes):
            continue
        r = rng.choice([0.8, 1.0, 1.2, 1.5, 1.9, 2.4])
        a = rng.randint(70, 235)
        ld.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
        if r > 2 and rng.random() < 0.35:
            ld.line([(x - 6, y), (x + 6, y)], fill=(255, 255, 255, 46))
            ld.line([(x, y - 6), (x, y + 6)], fill=(255, 255, 255, 46))
        drawn += 1

    return Image.alpha_composite(img, layer)


def wrap(draw, text, font, width):
    """Greedy word wrap measured with the actual font."""
    words = str(text).split()
    lines, cur = [], ""
    for w in words:
        trial = w if not cur else cur + " " + w
        if draw.textlength(trial, font=font) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit(draw, text, font_path, width, max_lines, hi, lo, step=3):
    """Largest font size whose wrapped text fits in `max_lines`."""
    from PIL import ImageFont

    size = hi
    while size > lo:
        font = ImageFont.truetype(font_path, size)
        lines = wrap(draw, text, font, width)
        if len(lines) <= max_lines:
            return font, lines
        size -= step
    font = ImageFont.truetype(font_path, lo)
    return font, wrap(draw, text, font, width)
