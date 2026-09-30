/* ============================================================
   STILL HERE — static page generator

   The app is a single-page shell: all 150 cards live inside one
   document, so search engines see 1 URL where there is really 150
   pieces of writing. This emits one indexable page per card plus
   an index page and a sitemap.

   node tools/build-pages.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://fyosamu.github.io";
const BASE = "/still-here/";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const attr = (s) => esc(s).replace(/'/g, "&#39;");

/** Trim to `n` characters, never mid-word, and drop a trailing comma/period. */
function clamp(text, n) {
  let t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  t = t.slice(0, n);
  const cut = t.lastIndexOf(" ");
  if (cut > 40) t = t.slice(0, cut);
  return t.replace(/[,;:\-–—.]$/, "").trim() + "…";
}

/* ------------------------------------------------------------ content */
const source = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
const CATEGORIES = new Function(`${source}; return CATEGORIES;`)();

const flat = [];
CATEGORIES.forEach((cat, ci) => {
  (cat.items || []).forEach((it, ii) => {
    flat.push({ flat: flat.length, cat, ci, ii, it });
  });
});

if (flat.length !== 150) {
  console.error(`expected 150 cards, got ${flat.length}`);
  process.exit(1);
}

/* --------------------------------------------------------------- page */
const FONT =
  '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />';

const PAGE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#04050c;color:#E9EDFF;
  font-family:"Space Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;
  line-height:1.6;min-height:100vh;display:flex;flex-direction:column}
a{color:inherit}
img{max-width:100%}
.top{display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.10);
  background:rgba(4,5,12,.86);backdrop-filter:blur(10px);
  position:sticky;top:0;z-index:5}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;
  letter-spacing:.14em;font-size:14px}
.brand img{width:26px;height:26px;border-radius:7px}
.brand small{display:block;font-size:10px;letter-spacing:.06em;color:#8C93B8;font-weight:500}
.open{display:inline-block;text-decoration:none;font-size:13px;font-weight:600;
  padding:9px 16px;border-radius:999px;color:#04050c;
  background:linear-gradient(96deg,#3BE0C8,#9B6BFF);white-space:nowrap}
main{width:100%;max-width:720px;margin:0 auto;padding:34px 20px 56px;flex:1}
.crumb{margin:0 0 20px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;
  color:#8C93B8;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.crumb b{color:#3BE0C8;font-weight:600}
h1{margin:0 0 18px;font-size:clamp(28px,6vw,44px);line-height:1.12;
  letter-spacing:-.02em;font-weight:700}
.card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.10);
  border-radius:18px;padding:22px 22px 24px;font-size:clamp(16.5px,2.6vw,19px);
  color:#CBD2F5}
.card::first-letter{color:#9B6BFF}
.box{margin-top:26px;padding:22px;border-radius:18px;
  background:linear-gradient(150deg,rgba(59,224,200,.10),rgba(155,107,255,.14));
  border:1px solid rgba(155,107,255,.34)}
.box b{display:block;font-size:17px;margin-bottom:6px}
.box p{margin:0 0 16px;font-size:14.5px;color:#B9C0E4}
.btn{display:inline-block;text-decoration:none;font-weight:600;font-size:15px;
  padding:12px 22px;border-radius:12px;color:#04050c;
  background:linear-gradient(96deg,#3BE0C8,#9B6BFF)}
.pager{display:flex;justify-content:space-between;gap:12px;align-items:center;
  margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,.10);
  font-size:13.5px}
.pager a{text-decoration:none;color:#8C93B8;max-width:38%;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pager a:hover{color:#9B6BFF}
.pager .mid{letter-spacing:.1em;text-transform:uppercase;font-size:11.5px}
footer{border-top:1px solid rgba(255,255,255,.10);padding:26px 20px 40px;
  text-align:center;font-size:13px;color:#8C93B8}
footer nav{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin:12px 0}
footer a{color:#8C93B8;text-decoration:none}
footer a:hover{color:#9B6BFF}
.back{display:inline-block;margin-top:6px;font-size:12.5px;color:#8C93B8}
/* ad slot — fixed 300×250, centred, never overflows a 360px phone */
.ad-slot{display:flex;flex-direction:column;align-items:center;gap:7px;
  margin:26px 0 4px;min-height:0}
.ad-label{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:#5E6488}
.ad-slot iframe{display:block;border:0;border-radius:10px;
  background:rgba(255,255,255,.03)}
/* leaderboard 728×90 — its own band under the sticky header, because the
   reading column beside it is only 720px wide; hidden on a phone, which
   gets the 300×250 further down the page instead */
.ad-slot--wide{width:fit-content;max-width:100%;margin:14px auto 0}
@media (max-width:800px){.ad-slot--wide{display:none}}
/* index page */
.toc h2{margin:34px 0 10px;font-size:15px;letter-spacing:.16em;text-transform:uppercase;
  color:#3BE0C8;font-weight:600}
.toc ol{list-style:none;margin:0;padding:0}
.toc li{border-bottom:1px solid rgba(255,255,255,.07)}
.toc a{display:flex;gap:12px;align-items:baseline;padding:13px 4px;
  text-decoration:none;font-size:16px;transition:.15s}
.toc a:hover{color:#9B6BFF}
.toc i{font-style:normal;color:#8C93B8;font-size:12px;min-width:30px;
  font-variant-numeric:tabular-nums}
@media (max-width:520px){
  .pager a{max-width:32%;font-size:12.5px}
  main{padding:26px 16px 44px}
}`;

/* category hub pages — declared up here because head() reads it, and the
   card pages are written before the hub section of this file runs */
const CATEGORY_CSS = `
.cat-list{list-style:none;margin:6px 0 0;padding:0;
  border-top:1px solid rgba(255,255,255,.08)}
.cat-list li{border-bottom:1px solid rgba(255,255,255,.07)}
.cat-list a{display:flex;gap:14px;align-items:baseline;padding:15px 4px;
  text-decoration:none;transition:.15s}
.cat-list a:hover{color:#9B6BFF}
.cat-list i{font-style:normal;color:#8C93B8;font-size:12px;min-width:32px;
  font-variant-numeric:tabular-nums}
.cat-list b{display:block;font-weight:600;font-size:16.5px;line-height:1.35}
.cat-list small{display:block;color:#8C93B8;font-size:13.5px;line-height:1.5;
  margin-top:4px}
.lede{margin:0 0 4px;font-size:16.5px;color:#B9C0E4}
.crumb a{color:#3BE0C8;text-decoration:none}
.crumb a:hover{color:#9B6BFF}
.toc h2 a{color:inherit;text-decoration:none}
.toc h2 a:hover{color:#9B6BFF}`;

const url = (rel) => ORIGIN + BASE + rel;
const APP = ORIGIN + BASE;

/* ---------------------------------------------------------------- ads
   The static pages are where Google/Reddit traffic lands, so they need
   the same banner the app uses. Keys are read out of app.js so there is
   exactly one place to change them.

   Each unit lives in its own tiny document under ad/ and is framed: two
   Adsterra units would otherwise fight over the same global `atOptions`,
   and a frame also keeps their document.write off our page. */
const AD_KEYS = Object.fromEntries(
  [...fs.readFileSync(path.join(ROOT, "app.js"), "utf8").matchAll(
    /(\w+):\s*"([0-9a-f]{32})"/g
  )].map((m) => [m[1], m[2]])
);
const AD_W = 300;
const AD_H = 250;
const AD_KEY = AD_KEYS.reader;   // 300×250 — also the in-app reader unit

const AD_WIDE_W = 728;
const AD_WIDE_H = 90;
const AD_WIDE_KEY = AD_KEYS.feed; // 728×90 — the second unit, otherwise PWA-only

function adDoc(key, w, h) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="robots" content="noindex, nofollow" />
<title>Advertisement</title>
<style>
html,body{margin:0;padding:0;overflow:hidden;background:transparent}
body{text-align:center}
</style>
</head>
<body>
<script type="text/javascript">
\tatOptions = { 'key':'${key}', 'format':'iframe', 'height':${h}, 'width':${w}, 'params':{} };
</script>
<script type="text/javascript" src="https://www.highrevenueformat.com/${key}/invoke.js"></script>
</body>
</html>
`;
}

/** `rel` is "" at the site root and "../" from c/ */
function adSlot(rel) {
  if (!AD_KEY) return "";
  return `    <div class="ad-slot">
      <span class="ad-label">Advertisement</span>
      <iframe src="${rel}ad/${AD_W}x${AD_H}.html" width="${AD_W}" height="${AD_H}"
        scrolling="no" frameborder="0" loading="lazy" title="Advertisement"></iframe>
    </div>`;
}

/** 728×90 leader, first thing inside <main> so it never crowds the h1 */
function adSlotWide(rel) {
  if (!AD_WIDE_KEY) return "";
  return `    <div class="ad-slot ad-slot--wide">
      <span class="ad-label">Advertisement</span>
      <iframe src="${rel}ad/${AD_WIDE_W}x${AD_WIDE_H}.html" width="${AD_WIDE_W}" height="${AD_WIDE_H}"
        scrolling="no" frameborder="0" loading="lazy" title="Advertisement"></iframe>
    </div>`;
}

function head({ title, desc, canonical, jsonld, rel = "../" }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${attr(title)}</title>
<meta name="description" content="${attr(desc)}" />
<meta name="theme-color" content="#04050c" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="${attr(canonical)}" />
<link rel="icon" href="${rel}logo.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="${rel}icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Still Here" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="STILL HERE" />
<meta property="og:title" content="${attr(title)}" />
<meta property="og:description" content="${attr(desc)}" />
<meta property="og:url" content="${attr(canonical)}" />
<meta property="og:image" content="${attr(url("og.png"))}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="STILL HERE — 150 reads that put your life in perspective" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${attr(title)}" />
<meta name="twitter:description" content="${attr(desc)}" />
<meta name="twitter:image" content="${attr(url("og.png"))}" />
<meta name="twitter:image:alt" content="STILL HERE — 150 reads that put your life in perspective" />
${FONT}
<style>${PAGE_CSS}${CATEGORY_CSS}</style>
<script type="application/ld+json">
${jsonld}
</script>
</head>`;
}

const CHROME = `  <a class="back" href="../index.html">&larr; Still Here home</a>
  <footer>
    <nav>
      <a href="../index.html">Home</a>
      <a href="../all.html">All 150 reads</a>
      <a href="../get.html">Download</a>
      <a href="../about.html">About</a>
      <a href="../privacy.html">Privacy Policy</a>
      <a href="../contact.html">Contact</a>
    </nav>
    <p>Still Here &mdash; an independent project. Not affiliated with anyone.</p>
  </footer>`;

/* ------------------------------------------------------- emit the cards */
fs.mkdirSync(path.join(ROOT, "c"), { recursive: true });
if (AD_KEY) {
  fs.mkdirSync(path.join(ROOT, "ad"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "ad", `${AD_W}x${AD_H}.html`),
    adDoc(AD_KEY, AD_W, AD_H)
  );
}
if (AD_WIDE_KEY) {
  fs.mkdirSync(path.join(ROOT, "ad"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "ad", `${AD_WIDE_W}x${AD_WIDE_H}.html`),
    adDoc(AD_WIDE_KEY, AD_WIDE_W, AD_WIDE_H)
  );
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
];

sitemap.push(
  `  <url><loc>${APP}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  `  <url><loc>${url("all.html")}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
  `  <url><loc>${url("get.html")}</loc><changefreq>yearly</changefreq><priority>0.8</priority></url>`,
  `  <url><loc>${url("about.html")}</loc><priority>0.5</priority></url>`,
  `  <url><loc>${url("privacy.html")}</loc><priority>0.3</priority></url>`,
  `  <url><loc>${url("contact.html")}</loc><priority>0.3</priority></url>`
);

for (const card of flat) {
  const { flat: n, cat, ci, ii, it } = card;
  const slug = n + 1;
  const canonical = url(`c/${slug}.html`);
  const desc = clamp(it.b, 155);
  const title = clamp(`${it.t} — STILL HERE`, 68);
  const appUrl = `${APP}?c=${n}`;

  const prev = flat[n - 1];
  const next = flat[n + 1];
  const pager =
    prev
      ? `<a href="${prev.flat + 1}.html">&larr; ${esc(clamp(prev.it.t, 34))}</a>`
      : `<a href="../all.html">&larr; Start</a>`;

  const pagerNext = next
    ? `<a href="${next.flat + 1}.html">${esc(clamp(next.it.t, 34))} &rarr;</a>`
    : `<a href="../all.html">All 150 &rarr;</a>`;

  const jsonld = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: it.t,
      description: desc,
      url: canonical,
      image: url("og.png"),
      datePublished: "2026-09-27",
      dateModified: "2026-09-30",
      inLanguage: "en",
      articleSection: cat.title,
      publisher: { "@type": "Organization", name: "STILL HERE", url: APP },
      mainEntityOfPage: canonical,
      isPartOf: {
        "@type": "WebApplication",
        name: "Still Here",
        url: APP,
        applicationCategory: "EducationalApplication",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    },
    null,
    2
  );

  const html = `${head({ title, desc, canonical, jsonld })}
<body>
  <header class="top">
    <a class="brand" href="../index.html">
      <img src="../logo.svg" alt="" />
      <span>STILL HERE<small>150 reads &middot; ${esc(cat.title)}</small></span>
    </a>
    <a class="open" href="../?c=${n}">Open the app</a>
  </header>

  <main>
    <p class="crumb">
      <b>${cat.icon}</b> <a href="../category/${cat.id}.html">${esc(cat.title)}</a>
      <span>&middot;</span> read ${slug} of 150
    </p>

    <h1>${esc(it.t)}</h1>

    <div class="card">${esc(it.b)}</div>

${adSlot("../")}
    <div class="box">
      <b>There are ${150 - slug} more like this.</b>
      <p>STILL HERE is a free reading app &mdash; 150 short reads across six categories. Works offline, no account, no catch.</p>
      <a class="btn" href="../?c=${n}">Read in the app &rarr;</a>
    </div>

      <nav class="pager">
      ${pager}
      <a class="mid" href="../all.html">All 150</a>
      ${pagerNext}
    </nav>
  </main>
${CHROME}
</body>
</html>
`;

  fs.writeFileSync(path.join(ROOT, "c", `${slug}.html`), html);
  sitemap.push(
    `  <url><loc>${canonical}</loc><changefreq>yearly</changefreq><priority>0.6</priority></url>`
  );
}

/* ---------------------------------------------------- category hubs
   A site that is 1 index + 150 leaves has no middle: crawlers meet a wall
   of unrelated URLs. Six hub pages give it a real three-level shape
   (all → category → card) and something to rank for the category words. */
const CAT_INTRO = {
  numbers:
    "No slogans here. Twenty-five reads that start from a number — a wage, a rent, a price — and follow it to where it actually goes. Read them in order and the arithmetic finishes the argument for you.",
  biology:
    "Twenty-five reads that trace a person backwards: from the adult with opinions to the single cell it started as, and to the only thing that cell was ever for. Emotions get included too — they show up as the value tags a gene uses to steer you.",
  seat:
    "Twenty-five reasons, each about a minute long, that what you have is unusual. Not cheerful noise: the actual odds, the actual timeline, and the small abilities you use without noticing.",
  tapeworm:
    "Twenty-five animals with no mouth, no stomach, no eyes or no plan — every one of them alive, successful, and having a worse time than you. The category works as a low bar. You clear it by breathing.",
  nowgo:
    "Twenty-five short instructions for the moment after reading. Start embarrassingly small, feel it and do it anyway, track it or it didn't happen. Nothing here asks for a personality transplant.",
  loose:
    "Twenty-five thoughts that refused to be filed. Some are jokes, some are Tuesday afternoons, one of them is about tabs. Read them in any order — they do not build on each other, and that is the point.",
};

fs.mkdirSync(path.join(ROOT, "category"), { recursive: true });

CATEGORIES.forEach((cat, ci) => {
  const cards = flat.filter((f) => f.cat === cat);
  const canonical = url(`category/${cat.id}.html`);
  const title = clamp(`${cat.title} — ${cards.length} one-minute reads`, 68);
  const desc = clamp(`${cat.subtitle} ${CAT_INTRO[cat.id]}`, 155);
  const prev = CATEGORIES[ci - 1];
  const next = CATEGORIES[ci + 1];

  const jsonld = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      description: desc,
      url: canonical,
      numberOfItems: cards.length,
      itemListElement: cards.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: url(`c/${c.flat + 1}.html`),
        name: c.it.t,
      })),
    },
    null,
    2
  );

  const rows = cards
    .map(
      (c) => `        <li><a href="../c/${c.flat + 1}.html"><i>${
        String(c.flat + 1).padStart(3, "0")
      }</i><span><b>${esc(c.it.t)}</b><small>${esc(clamp(c.it.b, 118))}</small></span></a></li>`
    )
    .join("\n");

  const html = `${head({ title, desc, canonical, jsonld })}
<body>
  <header class="top">
    <a class="brand" href="../index.html">
      <img src="../logo.svg" alt="" />
      <span>STILL HERE<small>${esc(cat.title)}</small></span>
    </a>
    <a class="open" href="../index.html">Open the app</a>
  </header>

${adSlotWide("../")}
  <main>
    <p class="crumb">
      <a href="../all.html">All 150</a>
      <span>&middot;</span> ${esc(cat.title)}
    </p>

    <h1><b>${cat.icon}</b> ${esc(cat.title)}</h1>
    <p class="lede">${esc(CAT_INTRO[cat.id])}</p>

${adSlot("../")}
    <ol class="cat-list">
${rows}
    </ol>
${adSlot("../")}

    <div class="box">
      <b>The app is where these live.</b>
      <p>Install STILL HERE and all ${cards.length} of these sit in one list, with the reader, the offline cache and the rest of the 150 &mdash; no account, no catch.</p>
      <a class="btn" href="../index.html?c=${cards[0].flat}">Open ${esc(cat.title)} &rarr;</a>
    </div>

    <nav class="pager">
      ${prev ? `<a href="${prev.id}.html">&larr; ${esc(clamp(prev.title, 30))}</a>` : `<a href="../all.html">&larr; All 150</a>`}
      <a class="mid" href="../all.html">All 150</a>
      ${next ? `<a href="${next.id}.html">${esc(clamp(next.title, 30))} &rarr;</a>` : `<a href="../all.html">All 150 &rarr;</a>`}
    </nav>
  </main>
${CHROME}
</body>
</html>
`;

  fs.writeFileSync(path.join(ROOT, "category", `${cat.id}.html`), html);
  sitemap.push(
    `  <url><loc>${canonical}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
  );
});

/* --------------------------------------------------------- index page */const tocTitle = `${flat.length} reads, ${CATEGORIES.length} categories — STILL HERE`;
const tocDesc = clamp(
  "Every read in STILL HERE, in order: the numbers, the biology of you, why you got a seat, the tapeworm you should be grateful you're not, and a few loose thoughts.",
  155
);
const tocJsonld = JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: tocTitle,
    description: tocDesc,
    url: url("all.html"),
    inLanguage: "en",
    isPartOf: {
      "@type": "WebApplication",
      name: "Still Here",
      url: APP,
    },
    numberOfItems: flat.length,
  },
  null,
  2
);

let toc = "";
for (const cat of CATEGORIES) {
  toc += `      <h2><a href="category/${cat.id}.html">${cat.icon} ${esc(cat.title)}</a> &mdash; <span style="color:#8C93B8;font-weight:400">${esc(cat.subtitle)}</span></h2>\n`;
  toc += "      <ol>\n";
  for (const card of flat.filter((f) => f.cat === cat)) {
    toc += `        <li><a href="c/${card.flat + 1}.html"><i>${card.flat + 1}</i><span>${esc(card.it.t)}</span></a></li>\n`;
  }
  toc += "      </ol>\n";
}

const tocHtml = `${head({
  title: tocTitle,
  desc: tocDesc,
  canonical: url("all.html"),
  jsonld: tocJsonld,
  rel: "",
})}
<body>
  <header class="top">
    <a class="brand" href="index.html">
      <img src="logo.svg" alt="" />
      <span>STILL HERE<small>every read, in order</small></span>
    </a>
    <a class="open" href="index.html">Open the app</a>
  </header>

${adSlotWide("")}
  <main class="toc">
    <p class="crumb"><b>&#128218;</b> the full list <span>&middot;</span> 150 reads</p>
    <h1>All 150 reads</h1>
    <div class="card">${esc(tocDesc)}</div>

${adSlot("")}
${toc}
    <div class="box">
      <b>The app is the point.</b>
      <p>Install STILL HERE and read all 150 with the cards, the reader and the offline cache &mdash; not a wall of links.</p>
      <a class="btn" href="index.html">Open STILL HERE &rarr;</a>
    </div>

${adSlot("")}
  </main>
${CHROME.replace(/\.\.\//g, "")}
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, "all.html"), tocHtml);

sitemap.push("</urlset>");
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap.join("\n") + "\n");

/* ------------------------------------- machine copy for pins / scripts */
const dump = CATEGORIES.map((cat) => ({
  id: cat.id,
  icon: cat.icon,
  title: cat.title,
  subtitle: cat.subtitle,
  items: cat.items,
}));
fs.writeFileSync(
  path.join(ROOT, "content.json"),
  JSON.stringify(dump, null, 2) + "\n"
);

console.log(`pages   : ${flat.length}`);
console.log(`hubs    : ${CATEGORIES.length} category pages`);
console.log(`index   : all.html`);
console.log(`sitemap : ${sitemap.length - 3} urls`);
console.log(`dump    : content.json`);
