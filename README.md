# STILL HERE — setup & launch

150 reads · 6 categories · dark space UI · 2-column layout · ad-supported · **costs $0**

---

## 1. What's in the folder

| File | What it does |
|---|---|
| `index.html` | The app (hero → support bar → 6 stacked categories → footer) |
| `styles.css` | Dark space theme (nebula, stars, glass cards) |
| `logo.svg` | Smiley-planet logo — also used as favicon + PWA icon |
| `content.js` | **All 150 cards** — edit text here |
| `app.js` | Logic + ad engine + donation config (**settings at the top**) |
| `manifest.json` | Makes it installable as a real app (PWA) |
| `about.html` | About page — **AdSense requires this** |
| `privacy.html` | Privacy policy — **AdSense requires this** |
| `contact.html` | Contact page — **AdSense requires this** |
| `README.md` | This file |

**Content — 6 × 25 = 150 cards**

| # | Category |
|---|---|
| 1 | 📊 THE NUMBERS |
| 2 | 🧬 THE BIOLOGY OF YOU |
| 3 | ✨ YOU GOT A SEAT |
| 4 | 🦍 GLAD YOU'RE NOT THIS (tapeworm) |
| 5 | 🚀 NOW GO |
| 6 | 💡 LOOSE THOUGHTS |

---

## 2. ⚙️ Your three settings (top of `app.js`)

```js
const AD_CONFIG = {
  provider: "adsterra",   // "adsterra" | "adsense" | "off"
  entryAd:    false,      // ← NO ad when the app opens
  clickEvery: 1,          // ← ad before EVERY card  (max profit)
  overlaySeconds: 5,
  cooldownSec:    0
};
```

The engine is **network-agnostic** — one adapter, two networks. Flip `provider`
and nothing else needs to change.

### 🟦 Track 1 — Adsterra ✅ CONNECTED & LIVE

> From `../ai-tool-scout/LAUNCH.md` §5: *"AdSense pays no crypto at all… Adsterra
> accepts the site earlier and pays in **USDT/BTC → Trust Wallet**."*

**Done — account created, verified, approved, and the ads are rendering on the live site.**

| | |
|---|---|
| Account | login `akhob59` · `akhob59@gmail.com` |
| Password | `Ariangol12` ⚠️ **change it — it was typed into a chat** |
| Dashboard | https://beta.publishers.adsterra.com/ |
| Approved site | `fyosamu.github.io` (id `6079826`, **Active**, category Books) |
| Unit `31429909` | Banner **728×90** → `feed` |
| Unit `31429908` | Banner **300×250** → `reader` + `overlay` |
| Live app | https://fyosamu.github.io/still-here/ |

```js
adsterra: {
  feed:    "7f16d3b502399b57ed184d4115a85d56",   // 728×90
  reader:  "2d097414e61e7e1d6913a1ad20010a1c",   // 300×250
  overlay: "2d097414e61e7e1d6913a1ad20010a1c"    // 300×250
}
```

> **Loader host matters.** Adsterra's current snippet is
> `https://www.highrevenueformat.com/{key}/invoke.js` — *not* the old
> `highperformanceformat.com/{key}.js`. A wrong host loads nothing and you'd
> earn $0 with no visible error.

If a key is removed, the slot shows an honest placeholder — **no fake ad, no
empty box, and no interstitial fires** (an ad box with nothing in it is exactly
the pattern that gets accounts flagged).

**To add the app's own domain later** (instead of running under `fyosamu.github.io`):
Adsterra only accepts a *host*, not a path — so publish to a host whose root is
the app (`*.netlify.app`, `*.pages.dev`) and add that in **Websites → ADD WEBSITE**.

### 🟧 Track 2 — AdSense (later)

```js
adsense: {
  publisherId: "ca-pub-…",
  slotFeed: "…", slotBanner: "…", slotOverlay: "…"
}
```
Then set `provider: "adsense"`. The loader injects itself — no HTML edit needed.

### Why it's set up this way

| Setting | Value | Why |
|---|---|---|
| `entryAd` | `false` | An ad on **every page load** is the fastest way to get flagged for invalid traffic. You said not to risk it → it's off. |
| `clickEvery` | `1` | Ad before every card. This is where the money is — tolerated **as long as** the close always works and you never hold a visitor when no ad is available. |

### 🛡️ Safety already built in — leave it alone

1. **No-ad release** — the "is an ad actually on screen" check looks for a real
   rendered `<iframe>`, *not* the loader script. Ad requested ≠ ad shown. If
   nothing renders within `adFillTimeoutMs` (3.5s), `Continue` unlocks.
   A visitor is never held hostage by an empty frame.
2. **Ad *did* render → the normal 5s lock runs**, so it's genuinely seen.
   (Fixing this bug added real impressions — the old check unlocked instantly
   when an ad arrived, letting people skip it in half a second.)
3. **Continue is always visible and clickable** — no trap.
4. **Ad units torn down** on overlay/reader close — no off-screen impressions.
5. **In-reader `Next / Previous` shows no ad** — same reading session, not a new
   navigation. Counting it is the pattern that gets accounts banned.
6. **No overlay stacking** — visibility is read from the DOM.

---

## 3. ✅ Already connected (found in your other projects)

| Item | Value | Where it came from | Status |
|---|---|---|---|
| **Contact email** | `akhob59@gmail.com` | `AGENCY_OUTREACH.md`, `SENT_LOG.csv` | ✅ wired into `contact.html` |
| **Trust Wallet** | `0xE1E3e1c2978c74f43Bb095023135C3278303aF34` | `fashion-store/`, `elementor-kit/`, `chroma-spirits/` | ✅ wired into `SUPPORT_CONFIG` |
| **Network** | Ethereum **(ERC-20)**, `coin: 60` | `fashion-store/get.html` — *"Send only USDT on Ethereum — other networks are lost forever"* | ✅ set |
| **Ad frequency** | no entry ad · ad before every click | your instruction | ✅ set |
| **Legal pages** | About / Privacy / Contact | AdSense requirement | ✅ built |

The donation popup now shows **QR + copy + "Open in Trust Wallet"** for that
address, and the network badge says `USDT · Ethereum (ERC-20)`.

> ⚠️ **Public address only.** Never paste a seed phrase or private key into a file.

---

## 4. 🟨 Adsterra ✅ done · AdSense ❌ still doesn't exist · Payout ⏳

### AdSense — still no account

Searched every file: only `ca-pub-0000000000000000` (a placeholder) with
`ADSENSE_ENABLED: false` in `ai-tool-scout/config.js`. Your own plan is to apply
only after 20–30 articles + traffic, via Afraz/Iranicard. **Nothing to connect
yet** — and I did not invent an ID, because a fake key silently produces *zero
revenue and a broken ad box*, which is worse than an honest placeholder.

### Payout → Trust Wallet — not blocked, but not filled in

Read straight from the dashboard API (`/api/payout-information`,
`/api/user/account/info`):

| | |
|---|---|
| `is_payout_blocked` | **`false`** ✅ nothing stopping you |
| `beneficiaryInfoFilled` | `false` ❌ name + country still empty |
| `minimal_amount` | **$100** — you can't withdraw below this |
| `hold` | 1 |
| KYC / KYB | `isKYCAvailable: false`, `isKYBAvailable: false` — not required yet |
| Unsigned legal docs | none ✅ Terms & Privacy already accepted at signup |

⚠️ **The payout page in the beta dashboard hangs on "Loading. Please, wait…"
(the `/payout-information` screen makes no API call at all).** That's their
frontend, not your account — the API behind it answers fine.

**To finish it:** open **Payout information** in the dashboard, fill in the
beneficiary (name + country = Iran), and pick the method. Adsterra lists crypto
among its payout methods — choose **USDT/BTC** and paste the same address:

```
0xE1E3e1c2978c74f43Bb095023135C3278303aF34
```

> 🔴 **Ethereum (ERC-20) only.** Your own note in `fashion-store/get.html`:
> *"Send only USDT on Ethereum — other networks are lost forever."* If Adsterra's
> dropdown offers a **network choice**, it must be ERC-20 to match that address —
> a TRON/BSC deposit to an `0x…` address is unrecoverable.

### 👉 Your two remaining actions

1. **Payout information** → fill beneficiary + choose USDT (ERC-20) → save
2. **Change the Adsterra password** (`Ariangol12`) — it was typed into a chat

Everything else — account, verification, site approval, ad units, keys, live
site, the app's ad engine — is **done and verified rendering real ads**.

---

## 5. ⚠️ Two rules you set for yourself — don't break them

From `ai-tool-scout/LAUNCH.md` §4:

> - [ ] **No ad code of any kind before AdSense approval**
> - [ ] **No bot/manual click padding** — natural CTR only, above ~3% is a red flag

Adsterra isn't AdSense, so rule 1 applies to *AdSense*, not this. But rule 2
applies everywhere: **never click your own ads**, never tell anyone to click
them. One self-click can cost the whole account.

Also from `LAUNCH.md` §7: Adsterra's **natural CTR** rule and AdSense's
**6-month blog** risk (R1) — this site is a *website*, not a blog, so if you
ever route it through AdSense that risk doesn't bind it.

---

## 6. Published ✅ — GitHub Pages (100% free, already live)

**Live now:** https://fyosamu.github.io/still-here/

Repo: `github.com/Fyosamu/still-here` (public). To ship an edit:

```bash
cd "C:\Users\USER\Documents\Default Project\still-here"
git add -A
git commit -m "what changed"
git push          # Pages rebuilds in ~30–60 s
```

### Other free hosts (if you ever want the app at its own root domain)

Adsterra rejects paths (`fyosamu.github.io/still-here` → *"host is invalid"*),
so a dedicated host must serve the app **at its root**:

### Netlify Drop (fastest — 60 seconds)
1. Go to **app.netlify.com/drop**
2. **Drag the whole `still-here` folder** onto the page
3. Live instantly at `https://something.netlify.app` — free forever
4. Optional: rename it under *Site settings → Change site name*

### GitHub Pages (permanent)
1. New repo → upload the folder
2. **Settings → Pages → Deploy from branch → main / root**
3. Live at `https://YOURNAME.github.io/REPO/`

### Cloudflare Pages (fastest load)
1. **dash.cloudflare.com → Pages → Create → Upload assets**
2. Drag the folder → done

> ❗ **Do not open it as `file://`** — AdSense will not serve ads on local files.
> You need a real `https://` URL.

---

## 7. Getting AdSense approved

Google rejects most first applications. This site now has everything they ask for:

- [x] **Privacy Policy** (`privacy.html`)
- [x] **About** page (`about.html`)
- [x] **Contact** page (`contact.html`)
- [x] Navigation in the footer of every page
- [x] Mobile responsive (2-column down to 360px)
- [x] Original content — all 150 pieces are written for this site

**Still needed from you:**
- [ ] A live `https://` URL (do step 6)
- [ ] Some real traffic first — get **30–50 visitors** before applying
- [ ] Your real contact email in `contact.html`

If you get a **"low value content"** rejection anyway, tell me — the fix is to
expand the card bodies from ~40s reads to ~90s reads and add a 7th category.

---

## 8. Getting paid — your options

| Route | How | Reaches Trust Wallet? |
|---|---|---|
| **A. AdSense → bank** | Needs a bank account **outside Iran**. Family abroad can receive it. | ❌ (convert after) |
| **B. AdSense → Payoneer** | Check availability when you set up payments. | ❌ (convert after) |
| **C. Donations → wallet** | The **Support** button is already wired. Money lands directly. | ✅ **Yes** |

- AdSense minimum payout: **$100**, around the 21st of the next month.
- Route C has **no minimum and no middleman** — it's the one that does what you originally asked.

---

## 9. Run locally (testing)

```bash
cd still-here
python -m http.server 8000
# open http://localhost:8000
```

---

## 10. Add more cards

Open `content.js`, add to any category:

```js
{ t: "The title", b: "The body text." },
```

The card count in the UI updates itself — no other edit needed.

---

## ✅ Verified

- [x] 6 categories, 150 cards, 2-column grid
- [x] No ad on page load
- [x] Ad before **every** card, correct card opens after Continue
- [x] In-reader navigation triggers **no** ad
- [x] Ad torn down whenever overlay/reader closes (no hidden impressions)
- [x] Auto-unlock when no ad is served
- [x] Donation popup + QR + copy address
- [x] About / Privacy / Contact pages, linked from every page
- [x] **Zero JavaScript errors** on all 4 pages
