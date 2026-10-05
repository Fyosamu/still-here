# Google Search Console — the 162 pages are invisible right now

Right now `site:fyosamu.github.io` returns **nothing**. Google has not been told the
pages exist. IndexNow already covers Bing, Yandex and DuckDuckGo; Google needs an
account, and an account needs your login — this is the one step I cannot do.

Expect **10–20 minutes** once, and it is the highest-return thing in this folder.

---

## 1 · Sign in and add the property

1. Go to <https://search.google.com/search-console> → **Start now** → sign in with your
   Google account.
2. In the top-left dropdown choose **Add property**.
3. Pick **URL prefix** (not "Domain") and paste exactly:

   ```
   https://fyosamu.github.io/still-here/
   ```

   URL-prefix is the right choice because you do not control `github.io` DNS, so the
   Domain method (TXT record) is impossible for us.

## 2 · Verify ownership — HTML tag method

1. Google will show a list of methods. Open **HTML tag** and press **Copy**. It looks like:

   ```html
   <meta name="google-site-verification" content="THE_LONG_CODE" />
   ```

2. **Paste that line into the chat here** (or into the `<head>` of `index.html`
   yourself) — the site redeploy in about a minute.
3. Back in Search Console, press **Verify**.

If it says *file not found* instead, you picked the wrong method: go back and choose
**HTML tag**. The "HTML file" method needs an upload we cannot do from a browser.

## 3 · Submit the sitemap

**Sitemaps** (left menu) → **Add a new sitemap** → paste:

```
still-here/sitemap.xml
```

That single file lists all **162 URLs**: the app, `all.html`, the six category hubs,
about/privacy/contact and `c/1.html … c/150.html`. Google picks it up on its own
schedule — usually within a few days for a first crawl.

## 4 · Force the first handful of pages

**URL Inspection** (top search box) → paste a URL → **Request indexing**.

Do these, one at a time, in this order (Google allows roughly **10 per day**, so stop
when it says you have reached the limit):

```
https://fyosamu.github.io/still-here/
https://fyosamu.github.io/still-here/all.html
https://fyosamu.github.io/still-here/category/tapeworm.html
https://fyosamu.github.io/still-here/c/1.html
https://fyosamu.github.io/still-here/c/51.html
https://fyosamu.github.io/still-here/c/76.html
https://fyosamu.github.io/still-here/c/101.html
https://fyosamu.github.io/still-here/c/126.html
```

Only these eight are worth the quota. Google will discover the other 153 through
`all.html`, the category hubs and the sitemap — that is exactly why every card is
reachable from `all.html`, every card's breadcrumb links its category, and the app
footer links `all.html`.

## 5 · What to look at afterwards

| Report | Why it matters |
|---|---|
| **Performance** | Which queries bring impressions. This is how you find out which cards are worth making into videos. |
| **Pages** (indexing) | How many of the 162 are actually indexed. Expect "Discovered – not crawled" for weeks on a new site — normal. |
| **Sitemaps** | Confirms 162 submitted, 162 found. |

Come back weekly. Nothing here is urgent after the first submission.

---

## Why this beats everything else in the folder

- Pinterest, Telegram and X all need you to keep posting or the traffic stops.
- One indexed card page keeps bringing visitors indefinitely, and every one of those
  visitors lands on a page that shows a 300×250 banner.
- A new domain/subdomain with zero impressions is not going to rank on its own; the
  sitemap plus seven forced crawls is the push that starts it.

## If verification keeps failing

- The site must be **live first** — open `https://fyosamu.github.io/still-here/` in a
  private window and check it loads.
- GitHub Pages takes **60–120 seconds** after a push. Verify too early and Google sees
  the old deploy.
- The code is **case sensitive** and must match exactly.
- After a redeploy, press **Verify** again rather than reloading the property list.
