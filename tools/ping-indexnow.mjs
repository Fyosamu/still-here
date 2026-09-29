/* Tell Bing / Yandex / DuckDuckGo about the current URL list.
   Free, no account. Re-run after every push that changes URLs.

   node tools/ping-indexnow.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = "d45f585c83fde7efe6a64037511f5026";

const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const urlList = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const payload = {
  host: "fyosamu.github.io",
  key: KEY,
  keyLocation: `https://fyosamu.github.io/still-here/${KEY}.txt`,
  urlList,
};

const endpoints = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

/* one host can be unreachable from a given network while the others are
   fine — try them in turn rather than failing the whole run on the first */
let res = null;
for (const ep of endpoints) {
  try {
    res = await fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    console.log(`POST ${urlList.length} urls -> ${ep} => ${res.status} ${res.statusText}`);
    break;
  } catch (err) {
    console.log(`${ep} unreachable (${err.cause?.code || err.message}) — trying the next`);
  }
}

if (!res) {
  console.log("FAILED — no IndexNow endpoint reachable from this network. Retry later.");
  process.exit(1);
}

const body = (await res.text()).trim();
if (body) console.log(body.slice(0, 400));
console.log(
  res.status === 200
    ? "OK — accepted. Indexing for Bing/Yandex/DuckDuckGo starts within hours."
    : "FAILED — expected HTTP 200. Nothing was submitted."
);
process.exit(res.status === 200 ? 0 : 1);
