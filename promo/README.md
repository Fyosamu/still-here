# Promo pack — copy, paste, post

Everything here is written **in English, aimed at US/EU readers** — same as the app.
Nothing in this folder is automatic: Reddit, Telegram, X and Google all need an
account only you can make. What the pack removes is the writing.

| File | What it is | Who posts it |
|---|---|---|
| `x-posts.csv` | **150 ready posts** — title, hook, link, hashtags, char count | you (X / Bluesky / Threads) |
| `telegram-plan.csv` | **30 days × 5 cards**, full message text ready to paste | you (Telegram channel) |
| `video-plan.csv` | **75 days × 2 videos** — file to upload, caption, hashtags, link | you (TikTok / Reels / Shorts) |
| `videos.md` | Where to upload each file, and the rules that keep the accounts alive | you (5 minutes) |
| `reddit.md` | 4 subreddits, a title + body for each, and the rules that get posts removed | you (Reddit) |
| `telegram.md` | How to run the channel, and how to schedule a month at once | you (Telegram) |
| `descriptions.md` | Short / medium / long descriptions for every directory and newsletter | you or me |
| `search-console.md` | Google Search Console — 161 pages are waiting for this | you (2 minutes) |

Re-generate the CSVs after any copy change:

```
node tools/build-pages.mjs      # pages first, they hold the links
node tools/make-promo.mjs
```

---

## Order of operations (best return per minute)

1. **Google Search Console** — `search-console.md`. 161 pages are built but Google
   has not been told. This is the only step that brings visitors while you sleep.
2. **Telegram channel** — `telegram-plan.csv`, schedule the whole month in one
   sitting. Free, instant, no approval queue.
3. **Pinterest bulk upload** — `pins/pins.csv` (see README §13). One CSV, 150 pins.
4. **X / Bluesky** — `x-posts.csv`, 1–3 a day. Do not dump all 150 at once.
5. **Short videos** — `video-plan.csv`. The 150 mp4s are already rendered in
   `build/reels/`; the plan says which file goes up on which day, with the caption
   and hashtags already attached. Two a day, no editing.
6. **Reddit** — `reddit.md`. Slow, and it punishes spam harder than anything else.
   Do this last, and never post the same link to two subreddits on the same day.

## The three rules that keep the accounts alive

- **One link per day, per platform.** Reddit's spam filter reads "same URL,
  many subs, one hour" as a bot and shadowbans the account — not just the post.
- **Never post the app root in a thread.** Share the card:
  `https://fyosamu.github.io/still-here/c/76.html` has a title, a description and a
  picture in the preview; `/still-here/` has none of that.
- **Never click your own ads.** Adsterra voids the account for it. Traffic from
  your own phone only counts once you have looked, then closed.

## Where the money comes from

The ad is now on **every** surface:

| Surface | Ad |
|---|---|
| App — before opening a card | 300×250 overlay |
| App — while reading | 300×250 in the corner |
| App — between categories | 728×90 in-feed |
| Card page (`/c/76.html`) | 300×250 under the article |
| Index (`all.html`) + 6 category hubs | 728×90 under the header, 300×250 × 2 |
| About / Privacy / Contact / Download (`get.html`) | 300×250, one centred unit |

Traffic that arrives from Google, Reddit or a shared link lands on a card page, so
that traffic earns too — it used to earn nothing.
