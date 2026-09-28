#!/usr/bin/env python3
"""Check the rendered shorts: one mp4 + one .srt per script, right shape, sane audio.

    python tools/make-reels.py
    python tools/verify-reels.py

Fails loudly rather than quietly: a 900-pixel-wide "1080" or a silent track
is exactly the sort of thing nobody notices until after 40 uploads.
"""
from __future__ import annotations

import csv
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT, AUD = ROOT / "build" / "reels", ROOT / "build" / "audio"
FFPROBE = shutil.which("ffprobe") or sys.exit("ffprobe not on PATH")

W, H = 1080, 1920
TS = re.compile(r"(\d+):(\d+):(\d+)[.,](\d+)")


def probe(path: Path) -> dict:
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-show_streams", "-show_format",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def secs(stamp: str) -> float:
    m = TS.search(stamp)
    h, mn, s, ms = (int(g) for g in m.groups())
    return h * 3600 + mn * 60 + s + ms / 1000


def main() -> int:
    with open(ROOT / "videos.csv", encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    problems: list[str] = []
    total_s = 0.0
    total_b = 0

    for r in rows:
        n = int(r["Number"])
        files = sorted(OUT.glob(f"{n:03d}-*.mp4"))
        if len(files) != 1:
            problems.append(f"{n:03d}: {len(files)} mp4 files found")
            continue
        mp4 = files[0]

        if not (OUT / f"{n:03d}.srt").exists():
            problems.append(f"{n:03d}: missing .srt sidecar")

        info = probe(mp4)
        v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
        a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)

        if not v or v.get("width") != W or v.get("height") != H:
            problems.append(f"{n:03d}: frame is "
                            f"{v.get('width') if v else '?'}x{v.get('height') if v else '?'}")
        if not v or v.get("codec_name") != "h264":
            problems.append(f"{n:03d}: video codec {v.get('codec_name') if v else 'none'}")
        if not a or a.get("codec_name") != "aac":
            problems.append(f"{n:03d}: audio codec {a.get('codec_name') if a else 'none'}")

        dur = float(info["format"].get("duration", 0))
        if not 8 <= dur <= 45:
            problems.append(f"{n:03d}: {dur:.1f}s long — outside 8–45s")
        total_s += dur
        total_b += int(info["format"].get("size", 0))

        srt = OUT / f"{n:03d}.srt"
        if srt.exists():
            text = srt.read_text(encoding="utf-8")
            spans = [(secs(a), secs(b))
                     for a, b in re.findall(r"([\d:,\.]+) --> ([\d:,\.]+)", text)]
            if not spans:
                problems.append(f"{n:03d}: .srt has no cues")
            else:
                for i, (a, b) in enumerate(spans, 1):
                    if b <= a:
                        problems.append(f"{n:03d}: cue {i} ends before it starts")
                        break
                    if i > 1 and a < spans[i - 2][1] - 0.05:
                        problems.append(f"{n:03d}: cue {i} overlaps cue {i - 1}")
                        break
                if spans[-1][1] > dur + 1.0:
                    problems.append(f"{n:03d}: .srt runs to {spans[-1][1]:.1f}s but "
                                    f"the video is {dur:.1f}s")

        if not (AUD / f"{n:03d}.mp3").exists():
            problems.append(f"{n:03d}: voice cache missing")

    have = len(list(OUT.glob("*.mp4")))
    print(f"videos : {have} mp4, {len(rows)} scripts")
    print(f"runtime: {total_s / 60:.1f} min total, {total_b / 1024**2:.0f} MB")
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for p in problems[:25]:
            print(f"  {p}")
        return 1
    print("OK — every script has its video, its subtitles and a sane picture")
    return 0


if __name__ == "__main__":
    sys.exit(main())
