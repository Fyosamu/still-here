/* ============================================================
   STILL HERE — short-video script generator

   Turns the 150 cards into a shooting script for one vertical
   video each (TikTok / Reels / YouTube Shorts): hook, voiceover,
   on-screen text, caption, hashtags and SRT subtitles.

   node tools/make-videos.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://fyosamu.github.io";
const BASE = ORIGIN + "/still-here/";

/* ------------------------------------------------------------ content */
const source = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
const CATEGORIES = new Function(`${source}; return CATEGORIES;`)();

const flat = [];
CATEGORIES.forEach((cat) => {
  (cat.items || []).forEach((it) => flat.push({ cat, it }));
});
if (flat.length !== 150) {
  console.error(`expected 150 cards, got ${flat.length}`);
  process.exit(1);
}

/* ------------------------------------------------------------ hooks */
/* One pool per category. The pool is cycled, never random, so a
   re-run produces the identical file. The card title is spliced in
   as {t}, which keeps every hook different from its neighbours. */
const HOOKS = {
  numbers: [
    "Nobody warns you about this number: {t}",
    "Do not guess it. Here it is: {t} — and that is the normal case",
    "Do the math with me. {t}",
    "This is the part nobody posts: {t}",
    "Check your budget against this: {t}",
    "It sounds dramatic until you see {t}",
    "An outsider's question: why is nobody angrier? {t}",
    "Plain arithmetic, no complaint: {t}",
  ],
  biology: [
    "Your genes wrote this, not you: {t}",
    "Here is where your opinions actually come from: {t}",
    "A science answer to a very personal question: {t}",
    "3.8 billion years of practice: {t}",
    "The manual nobody handed you: {t}",
    "Not a philosopher. A biologist: {t}",
    "The boring version of 'who am I': {t}",
    "Read this before you blame yourself again: {t}",
  ],
  seat: [
    "If you are watching this, read it twice: {t}",
    "Perspective check. {t}",
    "You needed this today: {t}",
    "Cosmic scale: {t}",
    "A free reminder, no account needed: {t}",
    "Read this before you complain: {t}",
    "The rarest thing in the cosmos, and you are holding it: {t}",
    "Hold still for fifteen seconds: {t}",
  ],
  tapeworm: [
    "The worst job in nature: {t}",
    "One specific animal, and no human wants its job: {t}",
    "Nature's worst gig: {t}",
    "This exists. It is still winning: {t}",
    "Fair warning, it gets worse: {t}",
    "You will feel better in fifteen seconds: {t}",
    "No mouth, no brain, no complaints: {t}",
    "The bar nobody wants to limbo under: {t}",
  ],
  nowgo: [
    "Motivation is a guest. Here is the rule: {t}",
    "Read this, then go do one thing: {t}",
    "No pep talk, just the instruction: {t}",
    "The part where you actually do something: {t}",
    "Your mood is weather. {t}",
    "You already know this. Do it anyway: {t}",
    "No inspiration required: {t}",
    "Today's only assignment: {t}",
  ],
  loose: [
    "A thought that did not fit anywhere else: {t}",
    "Loose thought, no category: {t}",
    "Sit with this one for a second: {t}",
    "Nobody says this out loud: {t}",
    "You will want to argue. Don't: {t}",
    "Overthinking it again? Read: {t}",
    "Random Tuesday thought: {t}",
    "It is small. That is why it lands: {t}",
  ],
};

const HASHTAGS = {
  numbers: ["costofliving", "moneyfacts", "inflation", "realitycheck", "personalfinance", "economy", "lifeinperspective"],
  biology: ["sciencefacts", "biology", "evolution", "psychology", "dna", "humanbody", "howthemindworks"],
  seat: ["gratitude", "perspective", "mindfulness", "cosmos", "appreciation", "lifeisshort", "growthmindset"],
  tapeworm: ["natureisweird", "parasites", "biologyfacts", "animalscience", "didyouknow", "naturefacts", "grossscience"],
  nowgo: ["motivation", "discipline", "productivity", "selfimprovement", "habits", "goals", "goalsetting"],
  loose: ["deepthoughts", "philosophy", "lifelessons", "overthinking", "wisdom", "mindset", "introspection"],
};

const OUTRO = "STILL HERE — a hundred and fifty reads, free, no account.";

const WORDS_PER_SEC = 2.5;   // calm narration, ~150 wpm
const MAX_CUE = 42;          // characters per subtitle line block

/* ------------------------------------------------------------ helpers */
const clean = (s) => String(s).replace(/\s+/g, " ").trim();
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function endSentence(s) {
  const t = clean(s);
  return /[.!?"'”’)]$/.test(t) ? t : `${t}.`;
}

function clamp(text, n) {
  let t = clean(text);
  if (t.length <= n) return t;
  t = t.slice(0, n);
  const cut = t.lastIndexOf(" ");
  if (cut > 40) t = t.slice(0, cut);
  return t.replace(/[,;:—-]$/, "").trim() + "…";
}

/** Split into subtitle cues of at most `max` characters, preferring
 *  sentence boundaries, then clause boundaries, then words. */
function cues(text, max = MAX_CUE) {
  const out = [];
  let rest = clean(text);

  while (rest.length > max) {
    let cut = -1;
    for (const re of [/^[^.!?]{6,}[.!?]\s+/, /^[^,;:]{6,}[,;:]\s+/]) {
      const m = rest.match(re);
      if (m && m[0].length <= max) { cut = m[0].length; break; }
    }
    if (cut < 0) {
      const window = rest.slice(0, max + 1);
      const sp = window.lastIndexOf(" ");
      cut = sp > 20 ? sp : max;
    }
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

const clock = (sec) => {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${r.toFixed(3).padStart(6, "0")}`;
};

function buildSrt(parts) {
  let t = 0.4; // first frame lands a beat after the cut
  const lines = [];
  parts.forEach((text, i) => {
    const dur = Math.max(1.1, words(text) / WORDS_PER_SEC);
    lines.push(
      String(i + 1),
      `${clock(t)} --> ${clock(t + dur)}`,
      text,
      ""
    );
    t += dur + 0.12;
  });
  return { srt: lines.join("\n"), end: t };
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

/* ------------------------------------------------------------ generate */
const rows = [];
const md = [];

md.push(
  "# STILL HERE — 150 short-video scripts",
  "",
  "One vertical video per card (TikTok / Reels / YouTube Shorts), generated from `content.js`.",
  "Re-run with `node tools/make-videos.mjs` after any copy change — output is deterministic.",
  "`node tools/verify-videos.js` re-checks the markdown, the CSV and every SRT cue.",
  "",
  "| field | use |",
  "| --- | --- |",
  "| **Hook** | first 2 seconds, spoken and shown on screen |",
  "| **Voiceover** | full read, ~150 wpm |",
  "| **On-screen text** | 4 stacked lines: hook → title → body → CTA |",
  "| **Subtitles** | SRT, paste straight into CapCut / Premiere / Descript |",
  "| **Caption** | description for the upload + link back to the card |",
  "| **Hashtags** | 9 tags: category tags + `#STILLHERE` + `#shorts` |",
  "",
  "---",
  ""
);

flat.forEach((card, i) => {
  const n = i + 1;
  const { cat, it } = card;
  const pool = HOOKS[cat.id] || HOOKS.loose;
  const title = clean(it.t);

  const hook = endSentence(pool[i % pool.length].replace("{t}", title));
  const body = endSentence(it.b);
  const outro = endSentence(OUTRO);
  const voice = `${hook} ${body} ${outro}`;

  /* The hook already contains the title, so show the two as separate
     stacked lines instead of printing the title twice. */
  const hit = hook.lastIndexOf(title);
  let opener = hook;
  if (hit >= 0) {
    opener =
      hook
        .slice(0, hit)
        .replace(/[\s:,.;—–-]+$/, "")
        .trim();
  }
  /* If the title sat at the very front there is no clause left over —
     fall back to the category line so the two on-screen lines never
     repeat each other. */
  if (opener.length < 10) opener = cat.subtitle;
  const onScreen = [
    clamp(opener, 74),
    clamp(title, 60),
    clamp(body, 96),
    "STILL HERE · 150 free reads",
  ];

  const link = `${BASE}c/${n}.html`;
  const tags = [
    ...(HASHTAGS[cat.id] || HASHTAGS.loose),
    "STILLHERE",
    "shorts",
  ].map((t) => `#${t}`);

  const caption = [
    hook,
    "",
    body,
    "",
    "STILL HERE — 150 short reads that put your life in perspective. Free, works offline, no account.",
    link,
    "",
    tags.join(" "),
  ].join("\n");

  const { srt, end } = buildSrt(cues(voice));
  const duration = Math.round(end);

  rows.push({
    n,
    category: cat.title,
    title,
    hook,
    voice,
    onScreen,
    srt,
    caption,
    tags: tags.join(" "),
    link,
    duration,
    wpm: words(voice),
  });

  md.push(
    `## ${String(n).padStart(3, "0")} · ${title}`,
    "",
    `**Category:** ${cat.icon} ${cat.title} — ${cat.subtitle}  `,
    `**Link:** ${link}  `,
    `**Length:** ~${duration}s (${words(voice)} words)`,
    "",
    "**Hook**",
    "",
    "> " + hook,
    "",
    "**Voiceover**",
    "",
    "> " + voice,
    "",
    "**On-screen text**",
    "",
    ...onScreen.map((l) => `> ${l}`),
    "",
    "**Subtitles (.srt)**",
    "",
    "```srt",
    srt.trimEnd(),
    "```",
    "",
    "**Caption**",
    "",
    "```text",
    caption,
    "```",
    "",
    `**Hashtags:** ${tags.join(" ")}`,
    "",
    "---",
    ""
  );
});

/* --------------------------------------------------------------- write */
const mdPath = path.join(ROOT, "videos.md");
fs.writeFileSync(mdPath, md.join("\n"), "utf8");

const cols = [
  "Number", "Category", "Title", "Link", "Length (s)", "Words",
  "Hook", "Voiceover", "On-screen text", "Subtitles (SRT)",
  "Caption", "Hashtags",
];
const csvBody = rows.map((r) =>
  [
    r.n, r.category, r.title, r.link, r.duration, r.wpm,
    r.hook, r.voice, r.onScreen.join(" | "), r.srt, r.caption, r.tags,
  ].map(csvCell).join(",")
);
const csvPath = path.join(ROOT, "videos.csv");
fs.writeFileSync(csvPath, `${cols.map(csvCell).join(",")}\n${csvBody.join("\n")}\n`, "utf8");

const lens = rows.map((r) => r.duration);
console.log(`scripts : ${rows.length}`);
console.log(`length  : ${Math.min(...lens)}s – ${Math.max(...lens)}s (avg ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)}s)`);
console.log(`md      : ${mdPath} (${(fs.statSync(mdPath).size / 1024).toFixed(0)} KB)`);
console.log(`csv     : ${csvPath} (${(fs.statSync(csvPath).size / 1024).toFixed(0)} KB)`);
