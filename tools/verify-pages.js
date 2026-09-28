/* Sanity check for the generated static pages: every local link must
   resolve, every document must be balanced, and the sitemap must match
   what is actually on disk.

   node tools/verify-pages.js
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === ".git" ? [] : walk(p);
    return e.name.endsWith(".html") ? [p] : [];
  });

const pages = walk(ROOT).filter((p) => !/[\\/](ad|tools)[\\/]/.test(p));

for (const file of pages) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);

  /* balanced containers */
  for (const tag of ["div", "main", "body", "html", "ol", "ul"]) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, "g")) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (open !== close) problems.push(`${rel}: <${tag}> ${open} open / ${close} close`);
  }

  /* every local href/src exists */
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const raw of refs) {
    if (/^(https?:|mailto:|data:|#|javascript:)/.test(raw)) continue;
    const target = raw.split("#")[0].split("?")[0];
    if (!target) continue;
    const abs = path.resolve(dir, target);
    if (!fs.existsSync(abs)) problems.push(`${rel}: broken -> ${raw}`);
  }

  /* exactly one h1, one canonical, one title */
  for (const [label, re] of [
    ["h1", /<h1[\s>]/g],
    ["canonical", /rel="canonical"/g],
    ["title", /<title>/g],
    ["description", /name="description"/g],
  ]) {
    const n = (html.match(re) || []).length;
    if (n !== 1) problems.push(`${rel}: ${label} x${n}`);
  }
}

/* sitemap vs disk */
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const u of locs) {
  const rel = u.replace("https://fyosamu.github.io/still-here/", "");
  const p = path.join(ROOT, rel.replace(/\/$/, "/index.html"));
  if (!fs.existsSync(p)) problems.push(`sitemap -> missing file: ${rel}`);
}

/* the sitemap should cover every content page */
const listed = new Set(locs.map((u) => u.replace("https://fyosamu.github.io/still-here/", "")));
for (const file of pages) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel === "index.html" || rel.startsWith("ad/") || rel.startsWith("tools/")) continue;
  if (!listed.has(rel)) problems.push(`on disk but not in sitemap: ${rel}`);
}

console.log(`pages checked: ${pages.length}, sitemap urls: ${locs.length}`);
console.log(problems.length ? `FAIL (${problems.length})\n` + problems.slice(0, 40).join("\n") : "OK — links, tags and sitemap all line up");
process.exit(problems.length ? 1 : 0);
