#!/usr/bin/env python3
"""Render the 150 scripts in videos.csv into ready-to-upload 1080x1920 shorts.

    node tools/make-videos.mjs          # scripts first
    python tools/make-reels.py          # then this

Output  build/reels/NNN-slug.mp4  +  the matching .srt sidecar
Cache   build/audio/NNN.mp3       (a finished voice is never re-synthesised)
Needs   ffmpeg on PATH,  pip install edge-tts pillow

Everything is deterministic except the voice: one pass, no editing, no account.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import random
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("Pillow is missing:  pip install pillow")

import json

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
OUT, AUD, TXT = BUILD / "reels", BUILD / "audio", BUILD / "text"
BG = BUILD / "bg"
FOOT = BG / "foot.png"
FONTS = ROOT / "tools" / "fonts"

W, H, FPS = 1080, 1920, 30
SW, SH = int(W * 1.2), int(H * 1.2)          # oversize, so the frame can drift
PAUSE = 0.6                                   # hold after the voice stops

BG_RGB = (4, 5, 12)
MUTED = (140, 147, 184)                       # #8C93B8
A1 = (59, 224, 200)                           # #3BE0C8
A2 = (155, 107, 255)                          # #9B6BFF

VOICE = "en-US-AndrewNeural"
BLOCK_MAX_W, BLOCK_MAX_H = 900, 700
CAPTION_MAX_W = 960
SIZES = [112, 98, 86, 76, 68, 60, 54]

F_BOLD = FONTS / "SpaceGrotesk-Bold.ttf"
F_MED = FONTS / "SpaceGrotesk-Medium.ttf"
F_REG = FONTS / "SpaceGrotesk-Regular.ttf"
F_EMOJI = Path(r"C:\Windows\Fonts\seguiemj.ttf")
F_ARIALB = Path(r"C:\Windows\Fonts\arialbd.ttf")

FFMPEG = shutil.which("ffmpeg") or sys.exit("ffmpeg not on PATH")
FFPROBE = shutil.which("ffprobe")

# codepoints no desktop TTF will draw — dropped from every drawn string
DROP = re.compile(
    "[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]"
)


def keep(s: str) -> str:
    return DROP.sub("", s).replace("\n", " ").strip()


# ---------------------------------------------------------------- palette art
def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def spaced(draw, xy, text, fnt, fill, gap=3):
    """Letter-spaced text — PIL has no tracking, so draw it glyph by glyph."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += int(draw.textlength(ch, font=fnt)) + gap
    return x - xy[0] - gap


def spaced_width(draw, text, fnt, gap=3):
    return sum(int(draw.textlength(c, font=fnt)) + gap for c in text) - gap


def make_background(cat: dict, path: Path) -> Path:
    """One 1080x1920 plate per category: nebula, stars, category pill, footer."""
    rnd = random.Random(cat["id"])
    img = Image.new("RGB", (W, H), BG_RGB)

    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([-360, 320, 640, 1320], fill=(8, 52, 48))
    g.ellipse([520, 880, 1520, 1880], fill=(34, 20, 62))
    glow = glow.filter(ImageFilter.GaussianBlur(240))
    img = ImageChops.add(img, glow)

    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(540):
        x, y = rnd.randrange(W), rnd.randrange(H)
        r = rnd.choice([1, 1, 1, 1, 2])
        a = rnd.randrange(70, 255)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    for _ in range(24):
        x, y = rnd.randrange(W), rnd.randrange(H)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 255, 255, 255))

    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    return path


def make_pill(cat: dict, path: Path) -> Path:
    """Category chip, kept as its own RGBA layer: the plate is scaled up and
    cropped, so anything baked into it would be sliced off at the edges."""
    f_icon, f_lab = font(F_EMOJI, 40), font(F_BOLD, 28)
    label = cat["title"].upper()
    pad, icon_w, gap = 34, 52, 14
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    w = pad + icon_w + gap + spaced_width(measure, label, f_lab, 5) + pad
    h = 78
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=24,
                        fill=(255, 255, 255, 18), outline=(255, 255, 255, 62))
    d.text((pad - 4, 16), cat["icon"], font=f_icon, fill=(255, 255, 255, 255))
    spaced(d, (pad + icon_w + gap, 26), label, f_lab, (233, 237, 255, 255), 5)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    return path


def make_foot(path: Path) -> Path:
    """The wordmark strip — identical in every video, so it exists once."""
    im = Image.new("RGBA", (W, 168), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([96, 0, W - 96, 1], fill=(255, 255, 255, 34))
    f_word, f_sub = font(F_BOLD, 46), font(F_MED, 21)
    word, sub = "STILL HERE", "150 READS · FREE · NO ACCOUNT"
    ww = spaced_width(d, word, f_word, 7)
    spaced(d, ((W - ww) // 2, 30), word, f_word, (233, 237, 255, 255), 7)
    sw = spaced_width(d, sub, f_sub, 4)
    spaced(d, ((W - sw) // 2, 106), sub, f_sub, (140, 147, 184, 255), 4)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    return path


# ------------------------------------------------------------------- voice
async def _speak(text: str, dest: Path, voice: str):
    import edge_tts

    last = None
    for _ in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate="+0%").save(str(dest))
            if dest.stat().st_size > 1000:
                return
            last = RuntimeError("empty audio")
        except Exception as exc:                     # noqa: BLE001
            last = exc
            await asyncio.sleep(1.5)
    raise last or RuntimeError("tts failed")


def speak_all(rows: list[dict], voice: str, force: bool) -> list[str]:
    """Synthesise every missing voice first, in one concurrent pass."""
    todo = [r for r in rows if force or not (AUD / f"{r['num']:03d}.mp3").exists()]
    if not todo:
        return []
    AUD.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)

    async def one(row):
        async with sem:
            await _speak(row["voice"], AUD / f"{row['num']:03d}.mp3", voice)

    async def run():
        results = await asyncio.gather(*(one(r) for r in todo),
                                       return_exceptions=True)
        return [e for e in results if isinstance(e, BaseException)]

    print(f"voice: {len(todo)} to synthesise ...", flush=True)
    errs = asyncio.run(run())
    # edge-tts can leave a zero-byte file behind on failure — drop it, or the
    # next run thinks the voice is cached and skips the card for good
    for r in todo:
        p = AUD / f"{r['num']:03d}.mp3"
        if p.exists() and p.stat().st_size < 1000:
            p.unlink()
    if errs:
        print(f"  {len(errs)} failed: {errs[0]!r}")
    return errs


def duration(path: Path) -> float:
    if FFPROBE:
        out = subprocess.run(
            [FFPROBE, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", str(path)],
            capture_output=True, text=True, check=True)
        return float(out.stdout.strip())
    out = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", out.stderr)
    h, mn, s = m.groups()
    return int(h) * 3600 + int(mn) * 60 + float(s)


# ------------------------------------------------------------------- SRT
TS = re.compile(r"(\d+):(\d+):(\d+)[.,](\d+)")


def read_srt(cell: str):
    cues, start, end, lines = [], None, None, []
    for raw in cell.replace("\r", "").split("\n"):
        line = raw.strip()
        m = TS.search(line)
        if "-->" in line and m:
            if start is not None:
                cues.append((start, end, " ".join(lines)))
            parts = line.split("-->")
            s, e = TS.search(parts[0]), TS.search(parts[1])
            start = ts(s)
            end = ts(e)
            lines = []
        elif line and not line.isdigit() and start is not None:
            lines.append(line)
    if start is not None and lines:
        cues.append((start, end, " ".join(lines)))
    return cues


def ts(m) -> float:
    h, mn, s, ms = (int(g) for g in m.groups())
    return h * 3600 + mn * 60 + s + ms / 1000


def stamp(t: float) -> str:
    t = max(0.0, t)
    h, rem = divmod(t, 3600)
    mn, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(mn):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"


def fit_srt(cues, dur: float):
    """The script assumed 2.5 words/s; the voice does what it does. Rescale."""
    if not cues:
        return []
    span = max(cues[-1][1], 0.001)
    k = dur / span
    out = [(a * k, b * k, txt) for a, b, txt in cues]
    out[-1] = (out[-1][0], max(out[-1][1], min(dur + 0.4, out[-1][1])), out[-1][2])
    return out


def write_srt(path: Path, cues):
    path.parent.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        f"{i}\n{stamp(a)} --> {stamp(b)}\n{txt}\n"
        for i, (a, b, txt) in enumerate(cues, 1)
    )
    path.write_text(body + "\n", encoding="utf-8")


# ------------------------------------------------------------------- layout
def wrap(text: str, fnt, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if not cur or ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [text]


def fit_block(text: str):
    """Largest size that still fits the middle of the frame."""
    meas = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for size in SIZES:
        fnt = font(F_BOLD, size)
        lines = wrap(text, fnt, BLOCK_MAX_W)
        h = int(len(lines) * size * 1.34) + 12 * max(0, len(lines) - 1)
        if h <= BLOCK_MAX_H:
            return fnt, lines, size, h
    fnt = font(F_BOLD, SIZES[-1])
    lines = wrap(text, fnt, BLOCK_MAX_W)
    return fnt, lines, SIZES[-1], int(len(lines) * SIZES[-1] * 1.34)


def normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower()).split()


def block_windows(blocks, cues, dur):
    """Place every block on screen, never two at once.

    The script's beats are sequential, so each one owns the stretch from its own
    start to the next block's start. A block that matches a spoken cue starts
    there (a breath early); one that does not falls back to its position in the
    sequence. Monotonic afterwards — so beats can only be out of order, never
    stacked on top of each other."""
    n = len(blocks)
    starts = [None] * n

    for i, block in enumerate(blocks):
        head = normalize(block)[:3]
        if not head:
            continue
        for a, _b, txt in cues:
            words = normalize(txt)
            k = min(len(head), len(words))
            if k >= 2 and head[:k] == words[:k]:
                starts[i] = max(0.0, a - 0.12)
                break

    for i in range(n):
        if starts[i] is None:
            starts[i] = (i / n) * dur
    for i in range(1, n):
        starts[i] = max(starts[i], starts[i - 1] + 0.4)

    return [
        (starts[i], starts[i + 1] if i + 1 < n else dur + PAUSE)
        for i in range(n)
    ]


def txt_file(name: str, text: str) -> Path:
    p = TXT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    # newline="" — drawtext reads these bytes raw, and a translated \r\n
    # becomes two line advances instead of one
    p.write_text(text, encoding="utf-8", newline="")
    return p


def q(path: Path) -> str:
    """Paths inside a filtergraph are resolved against ffmpeg's cwd, so keep
    them relative: a Windows absolute path breaks on `C:` and on the space in
    the project folder name."""
    try:
        rel = Path(path).resolve().relative_to(ROOT)
    except ValueError:
        return "'" + Path(path).as_posix().replace("'", r"\'") + "'"
    return rel.as_posix()


def build_graph(row, blocks, captions, dur):
    """Layer order: drifting plate -> progress bar -> chip -> footer -> type.

    The plate is upscaled and then cropped — that crop is what makes it drift —
    so anything near the edge has to be composited afterwards, in output
    coordinates, or it gets sliced away."""
    head = [
        f"[0:v]scale={SW}:{SH}:flags=lanczos,"
        f"crop={W}:{H}:x='(iw-ow)/2+12*sin(t/3.1)':y='(ih-oh)/2+12*cos(t/4.3)',"
        f"drawbox=x=0:y=0:w='iw*min(t/{dur:.3f},1)':h=8:"
        f"color=0x3BE0C8@0.85:t=fill[p0]",
        "[p0][1:v]overlay=x='(main_w-overlay_w)/2':y=92[p1]",
        "[p1][2:v]overlay=x=0:y=1712[p2]",
    ]

    layers = []
    for a, b, path, size in blocks:
        fade = b - a > 0.45
        if fade:
            a2, b2 = a + 0.18, b - 0.18
            alpha = (f"alpha='if(lt(t,{a:.3f}),0,if(lt(t,{a2:.3f}),"
                     f"(t-{a:.3f})/0.18,if(lt(t,{b2:.3f}),1,"
                     f"if(lt(t,{b:.3f}),({b:.3f}-t)/0.18,0))))'")
        else:
            alpha = "alpha=1"
        layers.append(
            f",drawtext=fontfile={q(F_BOLD)}:textfile={q(path)}:"
            f"fontcolor=0xE9EDFF:fontsize={size}:line_spacing=12:"
            f"expansion=none:"          # a literal % is "Stray %" otherwise
            f"enable='between(t,{a:.3f},{b:.3f})':{alpha}:"
            f"x=(w-text_w)/2:y='850-text_h/2'"
        )

    for a, b, path in captions:
        layers.append(
            f",drawtext=fontfile={q(F_MED)}:textfile={q(path)}:"
            f"fontcolor=0xB9C0E4@0.92:fontsize=40:line_spacing=6:"
            f"expansion=none:"
            f"enable='between(t,{a:.3f},{b:.3f})':x=(w-text_w)/2:y='1546-text_h/2'"
        )

    layers.append(
        f",drawtext=fontfile={q(F_MED)}:text='READ {row['num']:03d} OF 150':"
        f"fontcolor=0x8C93B8:fontsize=30:x=(w-text_w)/2:y=1644"
    )

    # `[p2]` closes its chain; the next chain re-opens it and must go straight
    # into a filter — a leading comma there reads as an empty filter name.
    body = "".join(layers).lstrip(",")
    return (";".join(head) + ";[p2]" + body + "[v];"
            f"[3:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]")


def render(row, voice_ok=True) -> tuple[int, str]:
    num, dest = row["num"], OUT / row["fname"]
    mp3 = AUD / f"{num:03d}.mp3"
    if not mp3.exists():
        return num, "no voice"
    try:
        dur = duration(mp3)
    except Exception:
        # a truncated download: unreadable, and keeping it would make every
        # later run skip this card forever
        mp3.unlink(missing_ok=True)
        return num, "voice unreadable — deleted, re-run"

    cues0 = read_srt(row["srt"])
    assumed = cues0[-1][1] if cues0 else 0.0
    if assumed and dur < assumed * 0.6:
        # edge-tts sometimes drops the stream half-way and still writes a file
        # over 1 kB: too short, but cached, so it would never be retried
        mp3.unlink(missing_ok=True)
        return num, "voice truncated — deleted, re-run"

    total = dur + PAUSE
    cues = fit_srt(cues0, dur)

    write_srt(OUT / f"{num:03d}.srt", cues)

    placed, blocks = [], []
    for i, block in enumerate(row["blocks"]):
        text = keep(block)
        if not text:
            continue
        fnt, lines, size, h = fit_block(text)
        p = txt_file(f"blk_{num:03d}_{i}.txt", "\n".join(lines))
        placed.append(block)
        blocks.append((p, size))

    windows = block_windows(placed, cues, dur)
    blocks = [(a, b, p, size) for (a, b), (p, size) in zip(windows, blocks)]
    blocks.sort(key=lambda x: x[0])
    for k in range(len(blocks) - 1):
        if blocks[k][1] > blocks[k + 1][0] + 1e-6:
            return num, "crashed: two beats would share the screen"

    captions = []
    for a, b, text in cues:
        text = keep(text)
        if not text:
            continue
        p = txt_file(f"cap_{num:03d}_{len(captions)}.txt",
                     "\n".join(wrap(text, font(F_MED, 40), CAPTION_MAX_W)))
        captions.append((a, b, p))

    graph = build_graph(row, blocks, captions, total)
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-framerate", str(FPS), "-i", str(row["bg"]),
        "-loop", "1", "-framerate", str(FPS), "-i", str(row["pill"]),
        "-loop", "1", "-framerate", str(FPS), "-i", str(FOOT),
        "-i", str(mp3),
        "-filter_complex", graph,
        "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", str(dest),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                       errors="replace", cwd=str(ROOT))
    if r.returncode != 0 or not dest.exists():
        lines = [l.strip() for l in (r.stderr or "").splitlines() if l.strip()]
        # ffmpeg echoes the whole filtergraph back; keep the human part
        lines = [l for l in lines if len(l) < 300
                 and "filterchain" not in l and "filtergraph '" not in l]
        return num, "ffmpeg:\n    " + "\n    ".join(lines[-25:])
    return num, f"{total:.1f}s {dest.stat().st_size // 1024}KB"


# ------------------------------------------------------------------- source
def slug(title: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "", title.replace("$", ""))
    return s[:34] or "card"


def load_rows(bgs: dict) -> list[dict]:
    with open(ROOT / "videos.csv", encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    out = []
    missing = set()
    for r in rows:
        num = int(r["Number"])
        key = r["Category"].strip().upper()
        if key not in bgs:
            missing.add(key)
        art = bgs.get(key, next(iter(bgs.values())))
        blocks = [b for b in r["On-screen text"].split("|") if b.strip()]
        out.append({
            "num": num,
            "fname": f"{num:03d}-{slug(r['Title'])}.mp4",
            "srt": r["Subtitles (SRT)"],
            "voice": r["Voiceover"].strip(),
            "blocks": blocks,
            "bg": art,
            "pill": art.with_name(art.stem.replace("-art", "-pill") + ".png"),
        })
    if missing:
        print(f"warning: unknown categories {sorted(missing)}", file=sys.stderr)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", help="comma list, e.g. 1,76,126")
    ap.add_argument("--limit", type=int, help="stop after N videos")
    ap.add_argument("--force", action="store_true", help="re-render what exists")
    ap.add_argument("--no-voice", action="store_true", help="skip synthesis")
    ap.add_argument("--voice", default=VOICE)
    ap.add_argument("--jobs", type=int, default=3)
    args = ap.parse_args()

    # layer art — cheap, so always rebuilt: the look lives here
    cats = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))
    BG.mkdir(parents=True, exist_ok=True)
    bgs = {}
    for cat in cats:
        bgs[cat["title"].strip().upper()] = make_background(
            cat, BG / f"{cat['id']}-art.png")
        make_pill(cat, BG / f"{cat['id']}-pill.png")
    make_foot(FOOT)

    rows = load_rows(bgs)
    if args.only:
        want = {int(x) for x in args.only.split(",")}
        rows = [r for r in rows if r["num"] in want]
    if args.limit:
        rows = rows[: args.limit]

    if not args.no_voice:
        errs = speak_all(rows, args.voice, args.force)
        if errs:
            print(f"warning: {len(errs)} voice(s) failed", file=sys.stderr)

    todo = [r for r in rows if args.force or not (OUT / r["fname"]).exists()]
    print(f"render: {len(todo)} of {len(rows)}", flush=True)

    ok, bad = 0, []
    FAILED = ("ffmpeg", "crashed", "voice ")
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        futs = {pool.submit(render, r): r for r in todo}
        for fut in as_completed(futs):
            row = futs[fut]
            try:
                num, msg = fut.result()
            except Exception as exc:                # one card must not kill 149
                num, msg = row["num"], f"crashed: {type(exc).__name__}: {exc}"
            if msg == "no voice" or msg.startswith(FAILED):
                bad.append((num, msg))
                print(f"  FAIL {num:03d}  {msg}")
            else:
                ok += 1
                print(f"  {num:03d}  {msg}")

    print(f"\ndone: {ok} rendered, {len(bad)} failed -> {OUT}")
    if bad:
        for num, msg in bad[:10]:
            print(f"  {num:03d}: {msg}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
