# Reddit — 4 posts, and the ones to stay away from

Reddit is the best free traffic for a site like this **and** the fastest way to get
an account killed. Read the two sections at the bottom before you post anything.

---

## Before anything else: warm the account up

Most of the subs below filter out accounts younger than a few days or with low
karma. A brand-new account posting one link looks exactly like a spam bot.

- Use an account that is at least **a week old**.
- Spend a few days commenting normally in threads you actually care about.
- Then post **one** of the four below. Not two. Not "whenever you feel like it".

---

## 1 · r/SideProject — the safest first post

**Title**

```
I built STILL HERE — 150 short reads about money, biology and why you're lucky
to be here (free PWA, no account)
```

**Body**

```
It's a Progressive Web App, so there's nothing to install from a store — it runs
in the browser and you can add it to your home screen. Works offline once it's
open, no sign-up, no email, no catch.

The idea: 150 reads, six categories, each one about a minute long.

- THE NUMBERS — what a $120/month wage and a $30,000 apartment actually imply
- THE BIOLOGY OF YOU — you started as one cell, and the gene that wants to
  survive is the thing writing your opinions
- YOU GOT A SEAT — infinite people never got here, you did
- GLAD YOU'RE NOT THIS — one specific animal (the tapeworm). No human wants
  its job.
- NOW GO — the part where you do something
- LOOSE THOUGHTS — the stuff that doesn't fit anywhere else

Live: https://fyosamu.github.io/still-here/
How to put it on your phone: https://fyosamu.github.io/still-here/get.html
Every read also has its own page, e.g. https://fyosamu.github.io/still-here/c/76.html

Honest bit: it's ad-supported, one banner per card click. That's the whole
business model and the donation button goes to a public wallet. Roast the design.
```

---

## 2 · r/PWA — talk about the build, not the content

**Title**

```
Show-and-tell: a 150-page static PWA — one indexable URL per card, generated
from a single content.js
```

**Body**

```
The interesting part isn't the writing, it's the plumbing.

The app is one HTML shell with all 150 cards inside content.js — which means
search engines would see 1 URL where there are 150 pieces of content. So a
generator (Node) emits:

- c/1.html … c/150.html — real pages, canonical tags, prev/next, Article JSON-LD
- category/*.html — six hub pages, so it's index → category → card instead of
  one index pointing at 150 unrelated URLs; each carries an ItemList of its 25
- all.html — crawl entry point, linked from the footer
- sitemap.xml — 162 URLs

plus a service worker for offline and a manifest so it installs. Ad slots are
keyed from app.js so the static pages and the SPA use the same units.

https://fyosamu.github.io/still-here/all.html

Happy to answer anything about the generation step.
```

---

## 3 · r/InternetIsBeautiful — short, no sales pitch

**Title**

```
STILL HERE — 150 one-minute reads, free, no account, works offline
```

**Body**

```
Six categories: what things actually cost, where your opinions come from,
why you got a seat at all, one animal you should be grateful you're not,
and a folder of loose thoughts.

https://fyosamu.github.io/still-here/
```

Keep this one to three lines. That sub rewards curiosity and punishes anything
that reads like a launch announcement.

---

## 4 · r/DecidingToBeBetter — the habit angle

**Title**

```
I made a free app of 150 one-minute reads because "read a book" was too big
a commitment
```

**Body**

```
Every attempt to get better failed at the same point: the next step was always
a whole book, a whole course, a whole morning. So each read here is about a
minute — one idea, then you're done.

The category that stuck for me is "Glad you're not this": it reads like a joke
until you get to the tapeworm and realise the bar for a decent life is lower
than you were treating it.

Free, works offline, no account:
https://fyosamu.github.io/still-here/
```

---

## Do NOT post here — links get stripped automatically

| Sub | Why |
|---|---|
| r/GetMotivated | images and text only; external links removed |
| r/selfimprovement | link posts removed; text-only, and self-promo in text gets you banned |
| r/philosophy | only academic paper links, everything else removed |
| r/psychology | research sources only |
| r/todayilearned | no personal sites, and "TIL about my site" is a ban |

In these subs you can still be useful: **answer questions with the idea, not the
link.** Someone asks about inflation or motivation, you type out the card. If
someone asks where it's from, then you post the URL. That is not spam and it
converts better anyway.

---

## The rules that get accounts killed

1. **Never post the same URL to two subreddits on the same day.** Reddit's site-wide
   spam filter reads that as one actor, and it shadowbans the account — every future
   post becomes invisible while still *looking* normal to you.
2. **Space it: one Reddit post per week, maximum.** This channel is slow on purpose.
3. **Read the current rules** before posting — they change and every sub is different:
   <https://www.reddit.com/r/SideProject/about/rules/> ·
   <https://www.reddit.com/r/PWA/about/rules/> ·
   <https://www.reddit.com/r/InternetIsBeautiful/about/rules/> ·
   <https://www.reddit.com/r/DecidingToBeBetter/about/rules/>
4. **Comment on other people's posts** in between. A profile that only ever submits
   one URL is the pattern the filter looks for.
5. **Never post from two accounts to the same link.** Ban evasion is permanent.
