#!/usr/bin/env node
/**
 * make-windows-package.mjs — build the Microsoft Store package for STILL HERE.
 *
 *   node tools/make-windows-package.mjs
 *   → build/windows/Still-Here-windows-package.zip
 *
 * PWABuilder's web app does exactly this: it POSTs our manifest to their
 * Windows-packaging service and hands back a zip (Visual Studio solution +
 * .msix project + a self-signed test certificate). Doing it from the CLI keeps
 * the identity fields under our control — the website defaults them to
 * "MyCompany.StillHere" / "My Company Inc", which would have to be changed by
 * hand on every regeneration.
 *
 * The zip is ~9 MB and contains:
 *   - a WindowsAppSDK (MSIX) project, ready for `msbuild` or VS
 *   - the generated .pfx (test signing; Store submissions sign differently)
 *   - the PWA's own files pulled from the live site
 *
 * Publishing needs a Partner Center account — that part cannot be scripted.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";

const BASE = "https://fyosamu.github.io/still-here/";
const ENDPOINT = "https://pwabuilder-windows-docker.azurewebsites.net/msix/generatezip";
const OUT = new URL("../build/windows/Still-Here-windows-package.zip", import.meta.url);

// Identity of the package. `packageId` becomes the Store's package identity
// name — keep it stable once the listing exists.
const PACKAGE_ID = "Fyosamu.StillHere";
const PUBLISHER = {
  displayName: "Fyosamu",
  commonName: "CN=3a54a224-05dd-42aa-85bd-3f3c1478fdca",
};

// The manifest comes from the repo, not the live URL: GitHub Pages is
// unreachable from this machine. The packaging service fetches the icons
// itself, so only the local copy is needed here.
const manifest = JSON.parse(
  await readFile(new URL("../manifest.json", import.meta.url), "utf8")
);

const payload = {
  name: manifest.name,
  packageId: PACKAGE_ID,
  url: BASE,
  version: "1.0.1",
  allowSigning: true,
  publisher: PUBLISHER,
  generateModernPackage: true,
  classicPackage: { generate: true, version: "1.0.0", url: BASE },
  edgeHtmlPackage: { generate: false },
  manifestUrl: new URL("manifest.json", BASE).href,
  manifest,
  images: {
    baseImage: new URL("icon-512.png", BASE).href,
    backgroundColor: "transparent",
    padding: 0,
  },
  resourceLanguage: "en",
  enableWebAppWidgets: false,
  extensions: "appurihandler",
  targetDeviceFamilies: ["Desktop", "Holographic"],
};

console.log(`manifest   ${manifest.name} · ${manifest.short_name}`);
console.log(`package id ${PACKAGE_ID} · ${payload.version}`);

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://www.pwabuilder.com",
    accept: "*/*",
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`packaging failed: HTTP ${res.status}\n${text.slice(0, 800)}`);
  process.exit(1);
}

const bytes = Buffer.from(await res.arrayBuffer());
if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
  console.error(`response is not a zip (${bytes.length} bytes)`);
  process.exit(1);
}

await mkdir(new URL("../build/windows/", import.meta.url), { recursive: true });
await writeFile(OUT, bytes);

const mb = (bytes.length / 1024 / 1024).toFixed(1);
console.log(`wrote ${OUT.pathname} — ${bytes.length} bytes (${mb} MB)`);
console.log("next: Partner Center → new submission → Package type MSIX, or unpack and open in Visual Studio");
