/* ============================================================
   STILL HERE — promo pack generator

   Writes the two files a human would otherwise have to write by
   hand for 150 cards:

     promo/x-posts.csv        one ready-to-schedule post per card
     promo/telegram-plan.csv  30 days × 5 cards, full message text

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

/* -------------------------------------------------------------- report */
const lens = xRows.map((r) => r[4]);
console.log(`posts   : ${xRows.length} (${Math.min(...lens)}–${Math.max(...lens)} chars, X limit 280)`);
console.log(`days    : ${days} × ${PER_DAY} cards`);
console.log(`wrote   : ${path.relative(ROOT, xCsv)}`);
console.log(`wrote   : ${path.relative(ROOT, tgCsv)}`);
console.log(`wrote   : ${path.relative(ROOT, tgTxt)}`);
