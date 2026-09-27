/* ============================================================
   STILL HERE — app logic + ad engine (dual network)
   ============================================================ */

/* ------------------------------------------------------------------
   ⚙️  AD CONFIG — the only section you ever need to touch

   provider:
     "adsterra"  → pays in USDT/BTC straight to Trust Wallet  ← YOUR TRACK
     "adsense"   → pays to a bank account (apply later)
     "off"       → no ads

   entryAd : false   → NO ad when someone opens the app  ← current
   clickEvery:
        1 → an ad before EVERY card is opened  ← current (max profit)
        2 → every 2nd click
        0 → off

   SAFETY BUILT IN (leave these on):
   • Ad present  → full lock runs, visitor actually sees it (more revenue)
   • No ad served → box unlocks at adFillTimeoutMs. A visitor is never held
     hostage by an empty frame — that's what keeps you out of trouble.
   • Continue button always visible/clickable. No trap.
   • Ad units torn down on close — no off-screen impressions.
   • Overlay never stacks on itself.
------------------------------------------------------------------ */
const AD_CONFIG = {
  enabled: true,
  provider: "adsterra",            // "adsterra" | "adsense" | "off"

  /* ---- Track 1: Adsterra (USDT → Trust Wallet) — CONNECTED ✅
     Account: akhob59@… · Site: fyosamu.github.io (Active)
     Unit 31429909 = Banner 728×90  ·  Unit 31429908 = Banner 300×250
     Dashboard: beta.publishers.adsterra.com/websites  */
  adsterra: {
    feed:    "7f16d3b502399b57ed184d4115a85d56",   // 728×90  — in-feed banner
    reader:  "2d097414e61e7e1d6913a1ad20010a1c",   // 300×250 — inside the article
    overlay: "2d097414e61e7e1d6913a1ad20010a1c"    // 300×250 — before every card
  },

  /* ---- Track 2: AdSense (bank payout) — fill in once approved ---- */
  adsense: {
    publisherId: "ca-pub-XXXXXXXXXXXXXXXX",
    slotFeed:    "0000000000",
    slotBanner:  "1111111111",
    slotOverlay: "2222222222"
  },

  entryAd:        false,   // ← no ad on entry
  clickEvery:     1,       // ← ad before every card
  overlaySeconds: 5,
  cooldownSec:    0,       // no artificial delay between ads
  adFillTimeoutMs: 3500    // unlock early ONLY if no ad arrived
};

/* ------------------------------------------------------------------
   ⚙️  SUPPORT / DONATION — money goes straight to your wallet.
   Public address only. Never a seed phrase / private key.
   Verified against fashion-store/get.html: Ethereum (ERC-20) only.
------------------------------------------------------------------ */
const SUPPORT_CONFIG = {
  enabled: true,
  wallet:  "0xE1E3e1c2978c74f43Bb095023135C3278303aF34",
  network: "USDT · Ethereum (ERC-20)",
  coin:    60,                 // 60 = Ethereum. Other chains cannot be recovered.
  label:   "Buy me a coffee ☕"
};

/* ---------------- state ---------------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let currentCat = 0;
let currentCard = 0;
let clickCount = 0;
let lastOverlay = 0;
let pendingOpen = null;

/* overlay visibility is read from the DOM — never a separate flag,
   so a stray hide can never silently disable ads forever */
const overlayVisible = () => !$("#splash").hidden;

/* ============================================================
   1. RENDER — stacked categories, 2-column cards
   ============================================================ */
function render() {
  $("#grid").innerHTML = CATEGORIES.map((cat, ci) => `
    <section class="cat">
      <div class="cat-head">
        <div class="cat-ico">${cat.icon}</div>
        <div>
          <h3>${cat.title}</h3>
          <div class="cat-count">${cat.items.length} CARDS</div>
        </div>
      </div>
      <p class="cat-sub">${cat.subtitle}</p>
      <div class="cards">
        ${cat.items.map((it, ii) => `
          <button class="card" data-cat="${ci}" data-i="${ii}">
            <b>${it.t}</b>
            <span>${it.b}</span>
          </button>`).join("")}
      </div>
    </section>`).join("");

  $$(".card").forEach((el) =>
    el.addEventListener("click", () => requestOpen(+el.dataset.cat, +el.dataset.i))
  );
}

/* ============================================================
   2. AD ADAPTER — one API, two networks
   ============================================================ */

const adKeyFor = (which) =>
  AD_CONFIG.provider === "adsterra" ? AD_CONFIG.adsterra[which] : null;

const adReady = () => {
  if (!AD_CONFIG.enabled || AD_CONFIG.provider === "off") return false;
  if (AD_CONFIG.provider === "adsense") return true;
  return !!(AD_CONFIG.adsterra.feed || AD_CONFIG.adsterra.reader || AD_CONFIG.adsterra.overlay);
};

/* mount an ad into `box`. `which` = feed | reader | overlay */
function mountAd(box, which, w, h) {
  box.innerHTML = `<span class="ad-label">Advertisement</span><span class="ad-wait">Loading ad…</span>`;

  if (!adReady()) {                       // no keys yet → keep it honest, no fake ad
    box.innerHTML = `<span class="ad-label">Advertisement</span>
      <span class="ad-empty">Ad slot ready — paste your ${AD_CONFIG.provider} key in app.js</span>`;
    return;
  }

  if (AD_CONFIG.provider === "adsterra") {
    const key = adKeyFor(which);
    if (!key) {
      box.innerHTML = `<span class="ad-label">Advertisement</span>
        <span class="ad-empty">No ${which} key set yet</span>`;
      return;
    }
    box.innerHTML = `<span class="ad-label">Advertisement</span><span class="ad-wait">Loading ad…</span>`;
    const conf = document.createElement("script");
    conf.type = "text/javascript";
    conf.text = `atOptions = { 'key':'${key}', 'format':'iframe', 'height':${h}, 'width':${w}, 'params':{} };`;
    const loader = document.createElement("script");
    loader.type = "text/javascript";
    /* Adsterra's live snippet: /{key}/invoke.js  (NOT highperformanceformat) */
    loader.src = `https://www.highrevenueformat.com/${key}/invoke.js`;
    loader.async = true;
    box.appendChild(conf);
    box.appendChild(loader);
    return;
  }

  /* --- AdSense --- */
  const A = AD_CONFIG.adsense;
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.cssText = "display:block;width:100%;height:100%;position:absolute;inset:0";
  ins.setAttribute("data-ad-client", A.publisherId);
  ins.setAttribute("data-ad-slot",
    which === "feed" ? A.slotFeed : which === "reader" ? A.slotBanner : A.slotOverlay);
  ins.setAttribute("data-ad-format", which === "overlay" ? "rectangle" : "auto");
  ins.setAttribute("data-full-width-responsive", "true");
  box.innerHTML = `<span class="ad-label">Advertisement</span>`;
  box.style.position = "relative";
  box.appendChild(ins);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
}

function loadAdsenseScript() {
  if (AD_CONFIG.provider !== "adsense" || document.getElementById("adsbygoogle-js")) return;
  const s = document.createElement("script");
  s.id = "adsbygoogle-js";
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.adsense.publisherId}`;
  document.head.appendChild(s);
}

function clearAd(box) {
  box.innerHTML = `<span class="ad-label">Advertisement</span>`;
}

/* ============================================================
   3. AD ENGINE — the interstitial
   ============================================================ */

/* every content click goes through here */
function requestOpen(ci, ii) {
  if (!adReady() || AD_CONFIG.clickEvery <= 0) return openCard(ci, ii);

  clickCount++;
  const shouldShow = clickCount % AD_CONFIG.clickEvery === 0;
  const freshEnough = (Date.now() - lastOverlay) / 1000 >= AD_CONFIG.cooldownSec;

  if (shouldShow && freshEnough && !overlayVisible()) showOverlay({ ci, ii });
  else openCard(ci, ii);
}

/* target = what to open after "Continue" (null = just dismiss) */
function showOverlay(target) {
  const splash = $("#splash");
  const btn    = $("#splashContinue");
  const adBox  = $(".splash-ad");

  pendingOpen = target || null;
  splash.hidden = false;
  document.body.style.overflow = "hidden";
  lastOverlay = Date.now();

  mountAd(adBox, "overlay", 300, 250);

  let n = AD_CONFIG.overlaySeconds;
  let done = false;

  const unlock = () => {
    if (done) return;
    done = true;
    clearInterval(tick);
    clearInterval(fillWatch);
    btn.disabled = false;
    btn.textContent = "Continue →";
  };
  const lock = () => {
    btn.disabled = true;
    btn.textContent = `Continue in ${n}…`;
  };

  lock();
  const tick = setInterval(() => { n--; n <= 0 ? unlock() : lock(); }, 1000);

  /* SAFETY: no ad arrived → don't hold the visitor.
     An ad DID arrive → let the normal lock run so it's actually seen. */
  /* SAFETY: only a real rendered <iframe> counts as "an ad is on screen".
     Detecting the loader script would be wrong — an ad *requested* is not an
     ad *shown*, and we must never hold a visitor for an ad that never arrived. */
  const start = Date.now();
  const fillWatch = setInterval(() => {
    /* Only a real rendered <iframe> counts as "an ad is on screen".
       Adsterra may append it inside the box OR to document.body — cover both. */
    const iframe = adBox.querySelector("iframe") ||
                   document.querySelector('iframe[src*="highrevenueformat"]');
    if (iframe) {
      adBox.querySelector(".ad-wait")?.remove();
      clearInterval(fillWatch);
      return;                        // ad on screen → let the normal lock run
    }
    if (Date.now() - start > AD_CONFIG.adFillTimeoutMs) unlock();  // no ad → release
  }, 400);

  btn.onclick = () => {
    if (btn.disabled) return;
    unlock();
    splash.hidden = true;
    document.body.style.overflow = "";
    clearAd(adBox);                     // tear down — no hidden impressions
    const p = pendingOpen;
    pendingOpen = null;
    if (p) openCard(p.ci, p.ii);
  };
}

/* ============================================================
   4. CORNER AD — small floating card, re-fills while you read

   What you asked for: something in the corner that quietly comes
   back on its own so each repeat earns, WITHOUT nagging the reader.

   Rules that keep it honest:
   • appears ONLY while an article is open — never on entry
   • re-fills at most once a minute, and only when it is actually
     on screen and the tab is visible (no off-camera impressions)
   • one tap on ✕ hides it for the rest of the visit
   • torn down the moment the reader closes
============================================================ */
const CORNER_REFRESH_MS = 60000;   /* >= 60s — the safe, viewable cadence */
const CORNER_SHOW_DELAY = 900;     /* let the in-article ad grab its slot first */

let cornerTimer   = null;
let cornerDelay   = null;
let cornerInView  = false;
let cornerMounted = false;

const cornerOff = () => sessionStorage.getItem("cornerAdOff") === "1";

function showCorner() {
  if (cornerOff() || $("#reader").hidden) return;
  mountAd($("#cornerAdBox"), "reader", 300, 250);   // same approved 300×250 unit
  $("#cornerAd").hidden = false;
  $("#reader").classList.add("corner-on");
  cornerMounted = true;
}

function hideCorner() {
  $("#cornerAd").hidden = true;
  $("#reader").classList.remove("corner-on");
  clearAd($("#cornerAdBox"));        // tear down — no leftover frame
  cornerMounted = false;
}

function stopCorner() {
  clearTimeout(cornerDelay);  cornerDelay = null;
  clearInterval(cornerTimer); cornerTimer = null;
  hideCorner();
}

/* called once per minute: only ask for a new ad if the card is really
   being looked at. Idle tab, scrolled away, reader closed → no request. */
function refreshCorner() {
  if (cornerOff() || $("#reader").hidden) return stopCorner();
  if (!cornerMounted) return showCorner();
  if (document.visibilityState !== "visible" || !cornerInView) return;
  showCorner();
}

function startCorner() {
  if (cornerOff() || cornerTimer || !adReady()) return;   // already running
  cornerDelay = setTimeout(() => {
    cornerDelay = null;
    if ($("#reader").hidden) return;
    showCorner();
    cornerTimer = setInterval(refreshCorner, CORNER_REFRESH_MS);
  }, CORNER_SHOW_DELAY);
}

function watchCorner() {
  const el = $("#cornerAd");
  if (!("IntersectionObserver" in window)) { cornerInView = true; return; }
  new IntersectionObserver((e) => { cornerInView = e[0].isIntersecting; },
                           { threshold: 0.2 }).observe(el);
}

/* ============================================================
   5. READER
   ============================================================ */
function openCard(ci, ii) {
  currentCat = ci;
  currentCard = ii;
  const cat = CATEGORIES[ci];
  const it  = cat.items[ii];

  $("#readerCat").textContent   = `${cat.icon}  ${cat.title}`;
  $("#readerTitle").textContent = it.t;
  $("#readerBody").textContent  = it.b;
  $("#counter").textContent     = `${ii + 1} / ${cat.items.length}`;
  $("#reader").hidden = false;
  document.body.style.overflow = "hidden";

  mountAd($("#readerAd"), "reader", 300, 250);   // matches unit 31429908, only while open
  $(".modal-inner").scrollTop = 0;

  startCorner();                          // quiet corner card joins in
}

function closeReader() {
  $("#reader").hidden = true;
  clearAd($("#readerAd"));
  stopCorner();                           // no ad left running off-screen
  document.body.style.overflow = "";
}

function move(dir) {
  let n = currentCard + dir;
  if (n < 0) {
    currentCat = (currentCat - 1 + CATEGORIES.length) % CATEGORIES.length;
    n = CATEGORIES[currentCat].items.length - 1;
  }
  if (n >= CATEGORIES[currentCat].items.length) {
    currentCat = (currentCat + 1) % CATEGORIES.length;
    n = 0;
  }
  openCard(currentCat, n);   // in-reader nav = same session, no new ad
}

/* ============================================================
   6. SUPPORT / DONATE → Trust Wallet
   ============================================================ */
function renderSupport() {
  if (!SUPPORT_CONFIG.enabled) return;
  const el = $("#support");
  el.innerHTML = `
    <div class="support-inner">
      <div class="support-txt">
        <b>${SUPPORT_CONFIG.label}</b>
        <p>This site has no paywall and never will. If a card hit you,
           send a little something straight to my wallet.</p>
      </div>
      <button id="openSupport" type="button">Support →</button>
    </div>`;

  $("#openSupport").addEventListener("click", () => {
    $("#supportModal").hidden = false;
    document.body.style.overflow = "hidden";
    $("#walletAddr").textContent = SUPPORT_CONFIG.wallet;
    $("#netBadge").textContent   = SUPPORT_CONFIG.network;
    $("#qr").src =
      "https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=ffffff&bgcolor=0b0d1c&data=" +
      encodeURIComponent(SUPPORT_CONFIG.wallet);
    $("#openWallet").href =
      `https://link.trustwallet.com/send?coin=${SUPPORT_CONFIG.coin}&address=${encodeURIComponent(SUPPORT_CONFIG.wallet)}`;
  });

  $("#copyWallet").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(SUPPORT_CONFIG.wallet); } catch (e) {}
    $("#copyWallet").textContent = "Copied ✓";
    setTimeout(() => ($("#copyWallet").textContent = "Copy address"), 1800);
  });

  const close = () => { $("#supportModal").hidden = true; document.body.style.overflow = ""; };
  $("#supportClose").addEventListener("click", close);
  $("#supportModal").addEventListener("click", (e) => { if (e.target.id === "supportModal") close(); });
}

/* ============================================================
   7. STARFIELD
   ============================================================ */
function stars() {
  const c = $("#stars"), x = c.getContext("2d");
  let w, h, pts = [];
  const build = () => {
    w = c.width = innerWidth; h = c.height = innerHeight;
    pts = Array.from({ length: Math.round((w * h) / 5200) }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.4 + .2,
      s: Math.random() * .22 + .04,
      a: Math.random() * .7 + .25
    }));
  };
  const draw = () => {
    x.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.y += p.s;
      if (p.y > h) { p.y = -2; p.x = Math.random() * w; }
      x.globalAlpha = p.a;
      x.fillStyle = "#fff";
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.284); x.fill();
    }
    requestAnimationFrame(draw);
  };
  build(); addEventListener("resize", build); draw();
}

/* ============================================================
   8. BOOT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadAdsenseScript();
  render();
  stars();
  renderSupport();
  watchCorner();

  $("#readerClose").addEventListener("click", closeReader);
  $("#reader").addEventListener("click", (e) => { if (e.target.id === "reader") closeReader(); });
  $("#prevCard").addEventListener("click", () => move(-1));
  $("#nextCard").addEventListener("click", () => move(1));
  $("#btnTop").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

  /* one tap to spread the link — the cheapest traffic there is */
  $("#btnShare").addEventListener("click", async () => {
    const url = location.origin + location.pathname;
    const payload = {
      title: "STILL HERE",
      text: "150 reads that put your life in perspective — free, always.",
      url
    };

    /* 1. native share sheet (phones) */
    if (navigator.share) {
      try { await navigator.share(payload); return; } catch (e) { /* dismissed */ }
    }

    /* 2. straight to the clipboard — with a manual fallback for strict browsers */
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        ta.remove();
      } catch (e2) { copied = false; }
    }

    if (copied) {
      const b = $("#btnShare");
      const was = b.textContent;
      b.textContent = "Link copied ✓";
      setTimeout(() => { b.textContent = was; }, 2000);
      return;
    }

    /* 3. last resort: Telegram's share sheet */
    open("https://t.me/share/url?url=" + encodeURIComponent(url) +
         "&text=" + encodeURIComponent("STILL HERE — 150 reads that put your life in perspective"),
         "_blank", "noopener");
  });

  /* one tap and the corner card is gone for this visit — the reader is never nagged */
  $("#cornerAdClose").addEventListener("click", () => {
    sessionStorage.setItem("cornerAdOff", "1");
    stopCorner();
  });

  document.addEventListener("keydown", (e) => {
    if (!$("#supportModal").hidden) {
      if (e.key === "Escape") { $("#supportModal").hidden = true; document.body.style.overflow = ""; }
      return;
    }
    if ($("#reader").hidden) return;
    if (e.key === "Escape") closeReader();
    if (e.key === "ArrowRight") move(1);
    if (e.key === "ArrowLeft")  move(-1);
  });

  // in-feed banner
  mountAd($("#feedAd"), "feed", 728, 90);

  // NO entry ad — you asked for this to be off
  if (AD_CONFIG.entryAd) showOverlay(null);

  /* ---- installable: offline shell + "add to home screen" ---- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  const installBtn = $("#btnInstall");
  let deferredPrompt = null;

  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();              // keep the browser's own banner out of the way
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* dismissed */ }
    deferredPrompt = null;
    installBtn.hidden = true;
  });

  addEventListener("appinstalled", () => { deferredPrompt = null; installBtn.hidden = true; });
});
