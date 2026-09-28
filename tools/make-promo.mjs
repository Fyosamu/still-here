/* ============================================================
   STILL HERE — promo pack generator

   Writes the two files a human would otherwise have to write by
   hand for 150 cards:

     promo/x-posts.csv        one ready-to-schedule post per card
     promo/telegram-plan.csv  30 days × 5 cards, full message text
     promo/video-plan.csv     75 days × 2 videos, file + caption + hashtags

   node tools/make-promo.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://fyosamu.github.io";
const BASE = `${ORIGIN}/still-here/`;
const OUT = path.join(ROOT, "promo");

const source = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
const CATEGORIES = new Function(`${source}; return CATEGORIES;`)();

const flat = [];
CATEGORIES.forEach((cat) => (cat.items || []).forEach((it) => flat.push({ cat, it })));
if (flat.length !== 150) {
  console.error(`expected 150 cards, got ${flat.length}`);
  process.exit(1);
}

/* ------------------------------------------------------------ helpers */
const clean = (s) => String(s).replace(/\s+/g, " ").trim();

function clamp(text, n) {
  let t = clean(text);
  if (t.length <= n) return t;
  t = t.slice(0, n);
  const cut = t.lastIndexOf(" ");
  if (cut > 30) t = t.slice(0, cut);
  return t.replace(/[,;:—–-]$/, "").trim() + "…";
}

/** first complete sentence, or a clamped fragment when there isn't one */
function firstSentence(body, n = 165) {
  const m = clean(body).match(/^[^.!?]{10,}[.!?]/);
  return m ? clamp(m[0], n) : clamp(body, n);
}

/** X counts every URL as 23 characters, whatever its real length */
const xLen = (s) => s.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const writeCsv = (name, cols, rows) => {
  const p = path.join(OUT, name);
  fs.writeFileSync(
    p,
    `${cols.map(csvCell).join(",")}\n` +
      `${rows.map((r) => r.map(csvCell).join(",")).join("\n")}\n`,
    "utf8"
  );
  return p;
};

/** RFC4180 reader — videos.csv holds quoted cells with real newlines */
function readCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v !== ""));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

/* -------------------------------------------------- one X / Bluesky post */
const TAGS = {
  numbers: ["costofliving", "inflation"],
  biology: ["sciencefacts", "evolution"],
  seat: ["gratitude", "perspective"],
  tapeworm: ["natureisweird", "biologyfacts"],
  nowgo: ["motivation", "discipline"],
  loose: ["deepthoughts", "lifelessons"],
};

function xPost(n, { cat, it }) {
  const link = `${BASE}c/${n}.html`;
  const tags = `#${TAGS[cat.id][0]} #stillhere`;
  const cta = "STILL HERE — 150 short reads, free, no account.";
  let sentence = firstSentence(it.b);

  const build = (s, withCta) =>
    [clean(it.t), s, withCta ? cta : "", link, tags]
      .filter(Boolean)
      .join("\n\n");

  /* shrink the sentence until the post fits, X's way of counting */
  while (xLen(build(sentence, true)) > 280 && sentence.length > 60) {
    sentence = clamp(sentence, sentence.length - 20);
  }
  /* the CTA is free on short posts and too expensive on long ones */
  let text = build(sentence, true);
  if (xLen(text) > 280) text = build(sentence, false);
  if (xLen(text) > 280) {
    console.error(`post ${n} is ${xLen(text)} chars — needs a shorter title`);
    process.exit(1);
  }
  return { text, len: xLen(text) };
}

/* ----------------------------------------------------- the X / Bluesky csv */
const xRows = flat.map((card, i) => {
  const n = i + 1;
  const { text, len } = xPost(n, card);
  return [
    n,
    card.cat.id,
    clean(card.it.t),
    text,
    len,
    `${BASE}c/${n}.html`,
  ];
});

fs.mkdirSync(OUT, { recursive: true });
const xCsv = writeCsv(
  "x-posts.csv",
  ["Number", "Category", "Title", "Post", "Chars", "Link"],
  xRows
);

/* ------------------------------------------------------- telegram plan */
/* 5 cards a day, in order, wrapping back to card 1 after 150 — so the
   channel never runs dry and nobody posts the same card twice in a row. */
const PER_DAY = 5;
const days = Math.ceil(flat.length / PER_DAY);

const tgRows = [];
for (let d = 0; d < days; d++) {
  const picks = [];
  for (let k = 0; k < PER_DAY; k++) picks.push((d * PER_DAY + k) % flat.length);

  const lines = picks.map((idx) => {
    const card = flat[idx];
    return `${card.cat.icon} ${clean(card.it.t)}\n${BASE}c/${idx + 1}.html`;
  });

  const message =
    `STILL HERE · day ${d + 1} · 5 short reads\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `All 150 are free, work offline and need no account:\n${BASE}`;

  tgRows.push([
    d + 1,
    picks.map((i) => i + 1).join(" "),
    message,
    message.length,
  ]);
}

const tgCsv = writeCsv(
  "telegram-plan.csv",
  ["Day", "Cards", "Message", "Chars"],
  tgRows
);

/* Same messages, but as plain text with a marker between them — copying a
   multi-line cell out of a spreadsheet is miserable, this is not. */
const tgTxt = path.join(OUT, "telegram-messages.txt");
fs.writeFileSync(
  tgTxt,
  tgRows
    .map(([d, cards, message]) => `===== DAY ${d} (cards ${cards}) =====\n${message}`)
    .join("\n\n") + "\n",
  "utf8"
);

/* --------------------------------------------------- the video upload plan */
/* 2 a day for 75 days, walking the six categories round-robin so two
   consecutive uploads are never the same flavour of video. */
const slug = (t) =>
  String(t).replace(/\$/g, "").replace(/[^a-zA-Z0-9]+/g, "").slice(0, 34) || "card";

const scripts = new Map(
  readCsv(fs.readFileSync(path.join(ROOT, "videos.csv"), "utf8")).map((r) => [
    Number(r.Number),
    r,
  ])
);

const byCat = new Map(CATEGORIES.map((c) => [c.id, []]));
flat.forEach((_, i) => byCat.get(flat[i].cat.id).push(i + 1));

const order = [];
for (let round = 0; round < 25; round++)
  for (const cat of CATEGORIES) order.push(byCat.get(cat.id)[round]);

const PER_DAY_V = 2;
const vRows = [];
for (let idx = 0; idx < order.length; idx++) {
  const n = order[idx];
  const s = scripts.get(n) || {};
  const file = `build/reels/${String(n).padStart(3, "0")}-${slug(s.Title || flat[n - 1].it.t)}.mp4`;
  vRows.push([
    Math.floor(idx / PER_DAY_V) + 1,
    (idx % PER_DAY_V) + 1,
    file,
    clean(s.Caption || `${flat[n - 1].it.t}\n${BASE}c/${n}.html`),
    clean(s.Hashtags || ""),
    `${BASE}c/${n}.html`,
  ]);
}

const videoCsv = writeCsv(
  "video-plan.csv",
  ["Day", "Slot", "File", "Caption", "Hashtags", "Link"],
  vRows
);

/* -------------------------------------------------------------- report */
const lens = xRows.map((r) => r[4]);
console.log(`posts   : ${xRows.length} (${Math.min(...lens)}–${Math.max(...lens)} chars, X limit 280)`);
console.log(`days    : ${days} × ${PER_DAY} cards`);
console.log(`videos  : ${vRows.length} over ${Math.ceil(vRows.length / PER_DAY_V)} days × ${PER_DAY_V}`);
console.log(`wrote   : ${path.relative(ROOT, xCsv)}`);
console.log(`wrote   : ${path.relative(ROOT, tgCsv)}`);
console.log(`wrote   : ${path.relative(ROOT, tgTxt)}`);
console.log(`wrote   : ${path.relative(ROOT, videoCsv)}`);
