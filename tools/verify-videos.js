/* Sanity check for the generated video scripts. */
const fs = require("fs");

const md = fs.readFileSync("videos.md", "utf8");
const csv = fs.readFileSync("videos.csv", "utf8");
const problems = [];

/* ---- markdown structure ---- */
const secs = md.split(/^## /m).slice(1);
if (secs.length !== 150) problems.push(`markdown sections: ${secs.length} (want 150)`);

secs.forEach((sec, k) => {
  const n = k + 1;
  const head = sec.split("\n")[0];
  if (!head.startsWith(String(n).padStart(3, "0"))) problems.push(`#${n} bad heading: ${head}`);

  const g = (label) => {
    const m = sec.match(new RegExp(`\\*\\*${label}\\*\\*\\n\\n([\\s\\S]*?)(?=\\n\\n\\*\\*|\\n\\n\`\`\`)`));
    return m ? m[1].replace(/^> ?/gm, "").trim() : "";
  };
  const hook = g("Hook");
  const voice = g("Voiceover");
  const os = (sec.match(/\*\*On-screen text\*\*\n\n([\s\S]*?)\n\n\*\*Subtitles/) || [, ""])[1]
    .split("\n").filter((l) => l.startsWith("> ")).map((l) => l.slice(2));
  const srt = (sec.match(/```srt\n([\s\S]*?)```/) || [, ""])[1].trimEnd();
  const caption = (sec.match(/```text\n([\s\S]*?)```/) || [, ""])[1];
  const tags = (sec.match(/\*\*Hashtags:\*\* (.+)/) || [, ""])[1].trim().split(/\s+/);

  if (!hook) problems.push(`#${n} empty hook`);
  if (!voice) problems.push(`#${n} empty voiceover`);
  if (os.length !== 4) problems.push(`#${n} on-screen lines: ${os.length}`);
  else {
    if (os[0].toLowerCase() === os[1].toLowerCase()) problems.push(`#${n} opener repeats title`);
    if (os[1].length > 62) problems.push(`#${n} title line too long (${os[1].length})`);
    if (os[0].length > 76) problems.push(`#${n} opener too long (${os[0].length})`);
  }
  if (!voice.startsWith(hook.replace(/\.$/, "").slice(0, 24))) problems.push(`#${n} voice does not start with hook`);
  if (!caption.includes(`c/${n}.html`)) problems.push(`#${n} caption missing card link`);
  if (tags.length !== 9 || tags.some((t) => !t.startsWith("#"))) problems.push(`#${n} hashtags: ${tags.length}`);

  /* SRT */
  const blocks = srt.split(/\n{2,}/).filter(Boolean);
  let prevEnd = -1;
  blocks.forEach((b, bi) => {
    const [num, time, ...text] = b.split("\n");
    if (Number(num) !== bi + 1) problems.push(`#${n} srt index ${num} at ${bi + 1}`);
    const m = (time || "").match(/^(\d\d):(\d\d):(\d\d)\.(\d{3}) --> (\d\d):(\d\d):(\d\d)\.(\d{3})$/);
    if (!m) { problems.push(`#${n} srt time "${time}"`); return; }
    const start = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + m[4] / 1000;
    const end = (+m[5]) * 3600 + (+m[6]) * 60 + (+m[7]) + m[8] / 1000;
    if (end <= start) problems.push(`#${n} srt cue ${bi + 1} ends before it starts`);
    if (start < prevEnd) problems.push(`#${n} srt cue ${bi + 1} overlaps previous`);
    prevEnd = end;
    const body = text.join(" ");
    if (!body) problems.push(`#${n} srt cue ${bi + 1} empty`);
    if (body.length > 46) problems.push(`#${n} srt cue ${bi + 1} ${body.length} chars: "${body}"`);
    if (bi === blocks.length - 1) {
      const declared = Number((sec.match(/\*\*Length:\*\* ~(\d+)s/) || [, 0])[1]);
      if (Math.round(end) - declared > 1) problems.push(`#${n} length ${declared}s vs srt ${Math.round(end)}s`);
    }
  });
});

/* ---- csv structure ---- */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const rows = parseCsv(csv);
if (rows.length !== 151) problems.push(`csv rows: ${rows.length} (want 151)`);
if (rows[0].length !== 12) problems.push(`csv header cols: ${rows[0].length}`);
rows.slice(1).forEach((r, i) => {
  if (r.length !== 12) problems.push(`csv row ${i + 1} has ${r.length} cols`);
  else {
    if (!r[3].endsWith(`c/${i + 1}.html`)) problems.push(`csv row ${i + 1} link ${r[3]}`);
    if (!r[9].includes("-->")) problems.push(`csv row ${i + 1} srt missing`);
  }
});

console.log(problems.length ? `FAIL (${problems.length})\n` + problems.slice(0, 40).join("\n") : "OK — 150 scripts, csv, srt all consistent");
process.exit(problems.length ? 1 : 0);
