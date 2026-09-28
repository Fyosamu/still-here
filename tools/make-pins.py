"""Build the Pinterest pin set (pins/NNN.jpg) + a bulk-upload CSV.

Pinterest is a search engine, not a social network: pins keep sending traffic
for months instead of hours, which is exactly what a 150-card library wants.
One card = one 1000x1500 pin (Pinterest's preferred 2:3).

    python tools/make-pins.py

Output:
    pins/NNN.jpg    the artwork
    pins/pins.csv   Title / Description / Link / Media URL / Keywords
                    -> Pinterest > Bulk create > Upload CSV
"""
import csv
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from imgutil import (  # noqa: E402
    ACCENT_A,
    ACCENT_B,
    MUTED,
    TEXT,
    fit,
    key_out_background,
    space_background,
    with_alpha,
    wrap,
)

W, H = 1000, 1500
M = 88                      # side margin
CW = W - 2 * M              # content width
ORIGIN = "https://fyosamu.github.io"
BASE = ORIGIN + "/still-here/"

BOLD = r"C:\Windows\Fonts\arialbd.ttf"
REG = r"C:\Windows\Fonts\arial.ttf"
EMOJI = r"C:\Windows\Fonts\seguiemj.ttf"

BODY = (203, 210, 245)      # card body colour, matches .card in the generated pages
OUT_DIR = os.path.join(ROOT, "pins")

# one tag block per category — Pinterest reads these as keywords
TAGS = {
    "numbers": "money,cost of living,inflation,reality check,personal finance,life facts",
    "biology": "science,evolution,biology,psychology,how the mind works,facts",
    "seat": "gratitude,perspective,motivation,life advice,self improvement,thinking",
    "not-this": "science,nature,parasites,biology facts,gratitude,facts you did not know",
    "go": "motivation,productivity,discipline,self improvement,goal setting,inspiration",
    "loose": "deep thoughts,philosophy,life lessons,overthinking,quotes about life,mindset",
}


def load():
    with open(os.path.join(ROOT, "content.json"), encoding="utf-8") as fh:
        return json.load(fh)


def letterspaced(draw, xy, text, font, fill, spacing=3):
    """PIL has no letter-spacing; draw glyph by glyph."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + spacing
    return x - spacing


# Arial has no emoji — 📊 would land as an empty box, so the glyph gets its own face
try:
    F_EMOJI = ImageFont.truetype(EMOJI, 26)
except OSError:
    F_EMOJI = None

REGION_TOP, REGION_BOT = 76, 1214
REGION = REGION_BOT - REGION_TOP
FOOT_RULE, FOOT_LOGO, FOOT_URL = 1252, 1294, 1418


def layout(cat, item):
    """Measure everything before a single pixel is placed, so the block can be
    optically centred instead of leaving a hole under a short card."""
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))

    f_chip = ImageFont.truetype(BOLD, 26)
    icon_w = (probe.textlength(cat["icon"], font=F_EMOJI) + 12) if F_EMOJI else 0
    chip_w = 22 + icon_w + probe.textlength(cat["title"], font=f_chip) + 24

    tf, tlines = fit(probe, item["t"], BOLD, CW, max_lines=4, hi=74, lo=44, step=2)
    title_h = sum(int(tf.size * 1.16) for _ in tlines)

    bf, blines = fit(probe, item["b"], REG, CW, max_lines=11, hi=36, lo=24, step=2)
    body_h = sum(int(bf.size * 1.5) for _ in blines)

    block = 58 + 40 + title_h + 32 + body_h
    start = REGION_TOP + max(0, (REGION - block) // 2)
    return {
        "chip_w": chip_w, "f_chip": f_chip,
        "tf": tf, "tlines": tlines, "title_h": title_h,
        "bf": bf, "blines": blines, "body_h": body_h,
        "start": start, "end": start + block,
    }


def draw_pin(cat, item, n, logo):
    L = layout(cat, item)

    # keep stars off both the copy block and the brand footer
    img = space_background(
        W, H, seed=1000 + n, stars=320,
        clear=[(40, L["start"] - 24, 960, L["end"] + 24), (40, 1236, 960, H)],
    )
    d = ImageDraw.Draw(img, "RGBA")

    # ---- category pill ------------------------------------------------
    y = L["start"]

    def pill(layer):
        layer.rounded_rectangle(
            [M, y, M + L["chip_w"], y + 58], radius=29,
            fill=(255, 255, 255, 30), outline=(*ACCENT_A, 210), width=2,
        )

    img = with_alpha(img, pill)
    d = ImageDraw.Draw(img, "RGBA")

    x = M + 22
    if F_EMOJI:
        d.text((x, y + 13), cat["icon"], font=F_EMOJI, fill=(*TEXT, 255))
        x += d.textlength(cat["icon"], font=F_EMOJI) + 12
    d.text((x, y + 14), cat["title"], font=L["f_chip"], fill=(*ACCENT_A, 255))

    # ---- headline -----------------------------------------------------
    y += 58 + 40
    for line in L["tlines"]:
        d.text((M, y), line, font=L["tf"], fill=(*TEXT, 255))
        y += int(L["tf"].size * 1.16)

    # ---- body ---------------------------------------------------------
    y += 32
    for line in L["blines"]:
        d.text((M, y), line, font=L["bf"], fill=(*BODY, 255))
        y += int(L["bf"].size * 1.5)

    # ---- footer -------------------------------------------------------
    d.line([(M, FOOT_RULE), (M + 300, FOOT_RULE)], fill=(*ACCENT_B, 255), width=4)
    d.line([(M, FOOT_RULE), (M + 96, FOOT_RULE)], fill=(*ACCENT_A, 255), width=4)

    if logo is not None:
        img.alpha_composite(logo, (M, FOOT_LOGO))
    d.text((M + 108, FOOT_LOGO + 10), "STILL HERE", font=ImageFont.truetype(BOLD, 42),
           fill=(*TEXT, 255))
    letterspaced(d, (M + 110, FOOT_LOGO + 66), "150 READS  ·  FREE  ·  OFFLINE",
                 ImageFont.truetype(BOLD, 20), (*MUTED, 255), spacing=2)
    d.text((M, FOOT_URL), "fyosamu.github.io/still-here",
           font=ImageFont.truetype(REG, 27), fill=(*MUTED, 255))

    return img.convert("RGB")


def main():
    cats = load()
    os.makedirs(OUT_DIR, exist_ok=True)

    logo_path = os.path.join(ROOT, "icon-512.png")
    logo = None
    if os.path.exists(logo_path):
        logo = key_out_background(logo_path, size=216).resize((92, 92), Image.LANCZOS)

    rows, n = [], 0
    total_bytes = 0
    for cat in cats:
        for item in cat["items"]:
            n += 1
            name = f"{n:03d}.jpg"
            path = os.path.join(OUT_DIR, name)
            draw_pin(cat, item, n, logo).save(path, "JPEG", quality=86, optimize=True)
            total_bytes += os.path.getsize(path)

            slug = n - 1  # flat card index, matches ?c=
            link = f"{BASE}c/{n}.html"
            desc = (
                f"{item['b']}\n\n"
                f"STILL HERE — 150 short reads that put your life in perspective. "
                f"Free, works offline, no account.\n"
                f"{BASE}"
            )
            rows.append({
                "Title": item["t"][:98],
                "Description": desc,
                "Link": link,
                "Media URL": f"{BASE}pins/{name}",
                "Keywords": TAGS.get(cat["id"], "facts,motivation,perspective"),
            })

    csv_path = os.path.join(OUT_DIR, "pins.csv")
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=["Title", "Description", "Link", "Media URL", "Keywords"])
        w.writeheader()
        w.writerows(rows)

    print(f"pins    : {n}")
    print(f"artwork : {total_bytes / 1024 / 1024:.1f} MB in {OUT_DIR}")
    print(f"csv     : {csv_path}")


if __name__ == "__main__":
    main()
