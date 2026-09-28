# Uploading the 150 videos

The videos exist. `build/reels/` holds all 150 as `NNN-title.mp4` — 1080×1920,
30 fps, 8–24 seconds, voice already in them, subtitles burned in. Next to each
one sits `NNN.srt`, the same captions as a file.

`video-plan.csv` says **which file on which day** — 2 a day for 75 days, always
two different categories in a row, with the caption and hashtags already in the
row. Nothing needs writing.

| Column | What to do with it |
|---|---|
| `File` | the mp4 to upload |
| `Caption` | paste into the description (it already contains the card link) |
| `Hashtags` | paste after the caption |
| `Link` | the card URL — also the one to put in comments if the caption truncates |

## Where each one goes

Upload the same file to all four. They are different audiences, and a video that
died on one routinely takes off on another.

| Platform | Notes |
|---|---|
| **YouTube Shorts** | Captions are already burned in, and YouTube auto-generates its own — don't upload the `.srt` or the two will stack. Put the hook line in the title |
| **TikTok** | Caption from the CSV + the hashtags. TikTok shows the first line, so keep the hook sentence first |
| **Instagram Reels** | Same file, same caption. Reels re-encode hard — the source is already high-bitrate, leave it |
| **Facebook Reels / Threads / X** | Same file again; X wants the caption under 280 chars, so use the title + link only |
| **Scheduling tools** | `NNN.srt` is there for Later / Buffer / Sprout, which want captions as a file |

## The rules

- **Two a day, roughly 12 hours apart.** Dumping 150 at once reads as a bot on
  every one of these platforms.
- **Never re-upload the same file twice in a day** to the same account.
- **The audience is US/EU.** Nothing in the videos says Iran — keep it that way
  in replies and comments too.
- **Never click your own link and then an ad.** Same rule as the site.
- **If a video gets real views, pin a comment** with the next card's link. That
  is the whole funnel: short video → card page → ad → donation link.

## When something works

Reorder `video-plan.csv` by moving the winning category's rows earlier — the
column `Day` is just a number, a spreadsheet will renumber it. The plan starts
with the six categories round-robin so the first two weeks test all of them
evenly; after that, the data decides.

## Rebuilding anything

```
node tools/make-videos.mjs        # scripts (videos.md / videos.csv)
python tools/make-reels.py        # the mp4s
python tools/verify-reels.py      # 1080x1920, h264+aac, duration, .srt sync
node tools/make-promo.mjs         # video-plan.csv picks up new captions
```

Needs `ffmpeg` on PATH and `pip install edge-tts pillow`. Audio is cached in
`build/audio/`, so re-running only renders what is missing.
