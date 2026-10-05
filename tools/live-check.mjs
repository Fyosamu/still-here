#!/usr/bin/env node
/**
 * live-check.mjs — sweep the *published* site, not the local build.
 *
 *   node tools/live-check.mjs              every URL in sitemap.xml
 *   node tools/live-check.mjs --sample 20  a random 20 of them
 *
 * For each page it checks, over HTTP:
 *   - status 200
 *   - exactly one <h1>
 *   - the footer still links to get.html (the Download link)
 *   - card pages still frame the ad wrapper, and both wrappers still carry
 *     their Adsterra unit keys (the keys live in ad/*.html, not in the pages)
 *
 * Exit code 1 if anything failed. The local `verify-pages.js` proves the build is
 * consistent; this proves what GitHub Pages is actually serving is the same thing.
 *
 * NOTE: GitHub Pages' IPs (185.199.x) are unreachable from some networks — if every
 * single URL times out, that is the connection, not the site.
 */
import { readFile } from "node:fs/promises";

const BASE = "https://fyosamu.github.io/still-here/";
const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
let urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const sampleIdx = process.argv.indexOf("--sample");
if (sampleIdx > -1) {
  const n = Number(process.argv[sampleIdx + 1]) || 20;
  urls = [...urls].sort(() => Math.random() - 0.5).slice(0, n);
}

const adKey = "2d097414e61e7e1d6913a1ad20010a1c"; // 300x250 unit
let done = 0;
const bad = [];

// The ad keys live in the two wrapper pages — every page frames one of those.
const units = [
  ["ad/300x250.html", adKey],
  ["ad/728x90.html", "7f16d3b502399b57ed184d4115a85d56"], // 728x90 unit
];
for (const [path, key] of units) {
  const url = new URL(path, BASE).href;
  try {
    const html = await (await fetch(url)).text();
    if (!html.includes(key)) bad.push({ url, why: "unit key missing" });
    if (!/invoke\.js/.test(html)) bad.push({ url, why: "invoke script missing" });
  } catch (e) {
    bad.push({ url, why: String(e.message || e) });
  }
}

async function check(url) {
  const fail = (why) => ({ url, why });
  try {
    const res = await fetch(url, { redirect: "manual" });
    if (res.status !== 200) return fail(`status ${res.status}`);
    const html = await res.text();
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) return fail(`${h1} <h1> tags`);
    // card pages sit one directory down, so their link is `../get.html`
    if (!/href="(?:\.\.\/)?get\.html"/.test(html) && url !== BASE) return fail("no footer Download link");
    // the ad itself lives in a local wrapper page, framed in — the unit key is not in the card
    if (url.includes("/c/") && !/src="(?:\.\.\/)?ad\/300x250\.html"/.test(html)) return fail("no corner-ad frame");
    return null;
  } catch (e) {
    return fail(String(e.message || e));
  }
}

const CONCURRENCY = 12;
const queue = [...urls];
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const url = queue.shift();
    const r = await check(url);
    if (r) bad.push(r);
    done++;
    if (done % 40 === 0) process.stdout.write(`  ${done}/${urls.length}\n`);
  }
});
await Promise.all(workers);

console.log(`live pages checked: ${urls.length}`);
if (bad.length) {
  console.log(`FAILED (${bad.length}):`);
  for (const b of bad.slice(0, 25)) console.log(`  ${b.why}  ${b.url}`);
  process.exit(1);
}
console.log("OK — the deployed pages match the build");
