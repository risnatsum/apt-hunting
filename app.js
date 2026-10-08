(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // ---------- Data ----------
  const APTS = (window.APARTMENTS || []).map((a) => ({ photos: [], layout: [], ...a }));

  const sizeText = (a) => !a.sqft ? "" : `${a.sqft} sq ft` + (a.grossSqft ? ` saleable (${a.grossSqft} gross)` : "");
  const money = (n) => (n || n === 0) && !isNaN(n) ? (window.CURRENCY || "$") + Number(n).toLocaleString() : "";

  // ---------- App state ----------
  const state = { tab: "photos", aptId: null, showRuledOut: false };
  const visibleApts = () => APTS.filter((a) => a.enabled !== false || state.showRuledOut);
  const enabledApts = () => APTS.filter((a) => a.enabled !== false);
  const currentApt = () => APTS.find((a) => a.id === state.aptId);

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get("tab")) state.tab = p.get("tab");
    if (p.get("apt")) state.aptId = p.get("apt");
  }
  function writeHash() {
    const p = new URLSearchParams();
    p.set("tab", state.tab);
    if (state.aptId) p.set("apt", state.aptId);
    history.replaceState(null, "", "#" + p.toString());
  }

  // Traced plans live in apartments/<id>/plan.js; load them before first render.
  function loadPlanFiles() {
    return Promise.all(APTS.filter((a) => a.planFile).map((a) => new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = a.planFile; s.onload = s.onerror = resolve;
      document.head.appendChild(s);
    })));
  }

  // ---------- Floor plan tab ----------
  let mounted = null;
  function renderPlan() {
    const apt = currentApt();
    const root = $("#plan-root");
    if (!apt) { root.innerHTML = `<div class="empty">No apartment selected.</div>`; mounted = null; return; }
    if (mounted === apt.id && root.firstChild) return;
    mounted = apt.id;
    Planner.mount(root, apt, { exportAll, importFile });
  }

  // ---------- Sidebar ----------
  function renderList() {
    const ul = $("#apt-list");
    ul.innerHTML = "";
    const list = visibleApts();
    if (!list.length) {
      ul.innerHTML = `<li class="meta">No apartments enabled.</li>`;
    }
    for (const a of list) {
      const li = document.createElement("li");
      if (a.id === state.aptId) li.classList.add("on");
      if (a.enabled === false) li.classList.add("off");
      const bits = [money(a.rent) && money(a.rent) + "/mo", a.beds != null && `${a.beds} bd`, a.sqft && `${a.sqft} sq ft`].filter(Boolean);
      li.innerHTML = `<div class="name"></div><div class="meta">${bits.join(" · ")}</div>`;
      li.querySelector(".name").textContent = a.name || a.id;
      if (a.enabled === false) li.querySelector(".name").insertAdjacentHTML("beforeend", `<span class="tag">ruled out</span>`);
      li.onclick = () => { selectApt(a.id); $("#sidebar").classList.remove("open"); };
      ul.appendChild(li);
    }
  }
  function selectApt(id) {
    state.aptId = id;
    render();
  }

  // ---------- Tabs ----------
  function render() {
    if (!currentApt() || !visibleApts().includes(currentApt())) {
      state.aptId = (visibleApts()[0] || {}).id || null;
    }
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === state.tab));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("on", p.id === "tab-" + state.tab));
    renderList();
    writeHash();
    if (state.tab === "photos") renderPhotos();
    if (state.tab === "plan") renderPlan();
    if (state.tab === "compare") renderCompare();
  }

  // ---------- Photos ----------
  function renderPhotos() {
    const apt = currentApt();
    const head = $("#apt-header");
    const gal = $("#gallery");
    gal.innerHTML = "";
    if (!apt) { head.innerHTML = `<div class="empty">No apartments yet. Add one to apartments.js.</div>`; return; }
    head.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = apt.name || apt.id;
    head.appendChild(h);
    const facts = document.createElement("div");
    facts.className = "facts";
    const add = (label, val) => {
      if (!val) return;
      const span = document.createElement("span");
      span.textContent = label ? label + " " : "";
      const b = document.createElement("b");
      b.textContent = val;
      span.appendChild(b);
      facts.appendChild(span);
    };
    add("", apt.address);
    add("Rent", money(apt.rent) && money(apt.rent) + "/mo");
    add("Beds", apt.beds != null ? String(apt.beds) : "");
    add("Baths", apt.baths != null ? String(apt.baths) : "");
    add("Size", sizeText(apt));
    add("Available", apt.available);
    head.appendChild(facts);
    if (apt.url) {
      const a = document.createElement("a");
      a.href = apt.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Open listing ↗";
      head.appendChild(a);
    }
    if (apt.notes) {
      const p = document.createElement("p");
      p.className = "notes"; p.textContent = apt.notes;
      head.appendChild(p);
    }
    const pics = [...apt.photos];
    if (!pics.length) {
      gal.innerHTML = `<div class="empty">No photos yet for this apartment.</div>`;
      return;
    }
    pics.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src; img.loading = "lazy"; img.alt = `${apt.name} photo ${i + 1}`;
      img.onclick = () => openLightbox(pics, i);
      gal.appendChild(img);
    });
  }

  let lb = { pics: [], i: 0 };
  function openLightbox(pics, i) { lb = { pics, i }; showLb(); $("#lightbox").hidden = false; }
  function showLb() {
    $("#lb-img").src = lb.pics[lb.i];
    $("#lb-count").textContent = `${lb.i + 1} / ${lb.pics.length}`;
  }
  function stepLb(d) { lb.i = (lb.i + d + lb.pics.length) % lb.pics.length; showLb(); }
  $(".lb-close").onclick = () => ($("#lightbox").hidden = true);
  $(".lb-prev").onclick = () => stepLb(-1);
  $(".lb-next").onclick = () => stepLb(1);
  $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") $("#lightbox").hidden = true; });

  // ---------- Export / import ----------
  function exportData() {
    const out = {};
    for (const a of APTS) {
      const s = Planner.loadSaved(a.id);
      if (s.items || s.calibration) out[a.id] = { ...(s.calibration ? { calibration: s.calibration } : {}), ...(s.items ? { layout: s.items } : {}) };
    }
    return JSON.stringify(out, null, 2);
  }
  function exportAll() { $("#export-text").value = exportData(); $("#export-dialog").showModal(); }
  $("#export-close").onclick = () => $("#export-dialog").close();
  $("#export-copy").onclick = () => navigator.clipboard.writeText($("#export-text").value);
  $("#export-download").onclick = () => {
    const blob = new Blob([$("#export-text").value], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "apartment-layouts.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  async function importFile(f) {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      for (const [id, v] of Object.entries(data)) {
        const s = Planner.loadSaved(id);
        if (v.calibration) s.calibration = v.calibration;
        if (v.layout) s.items = v.layout;
        Planner.storeSaved(id, s);
      }
      mounted = null; render();
    } catch { alert("That file isn't a valid export."); }
  }

  // ---------- Compare ----------
  // ---------- Scores ----------
  // Door-to-door minutes and walk minutes both map to 1-5 (see RUBRIC).
  const TIME_BANDS = [15, 22, 30, 40];
  const WALK_BANDS = [5, 8, 12, 16];
  const band = (m, bands) => m == null ? null : 5 - bands.filter((b) => m > b).length;
  const DEST = window.COMMUTE_TO || [];
  const W_MTR = 0.2, W_BUS = 0.1;
  function transportScore(a) {
    const t = a.transport;
    if (!t) return null;
    let sum = 0, w = 0;
    for (const d of DEST) { const sc = band(t[d.key]?.min, TIME_BANDS); if (sc != null) { sum += sc * d.weight; w += d.weight; } }
    const m = band(t.mtrWalk, WALK_BANDS), b = band(t.busWalk, WALK_BANDS);
    if (m != null) { sum += m * W_MTR; w += W_MTR; }
    if (b != null) { sum += b * W_BUS; w += W_BUS; }
    return w ? sum / w : null;
  }
  const PHOTO_FACTORS = [["light", "Sunlight / light"], ["kitchen", "Kitchen"], ["bathroom", "Bathroom"], ["condition", "Condition"], ["view", "View"], ["storage", "Storage"]];
  function photoScore(a) {
    const r = a.photoReview;
    if (!r) return null;
    const v = PHOTO_FACTORS.map(([k]) => r[k]?.[0]).filter((x) => x != null);
    return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
  }
  const dots = (n) => `<span class="dots" title="${n}/5">${"●".repeat(n)}<i>${"●".repeat(5 - n)}</i></span>`;
  const scoreText = (x) => x == null ? "" : `<b class="score">${x.toFixed(1)}</b> / 5`;
  const mapsLink = (from, to) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
  const origin = (a) => `${a.name}, ${a.address}, Hong Kong`;

  const COMPARE_ROWS = [
    ["Photo", (a) => a.photos[0] ? `<img src="${encodeURI(a.photos[0])}" alt="">` : "", true],
    ["Rent", (a) => money(a.rent) && money(a.rent) + "/mo"],
    ["Rent ±10%", (a) => a.rent ? `${money(Math.round(a.rent * 0.9))} – ${money(Math.round(a.rent * 1.1))}` : ""],
    ["Fees", (a) => a.fees],
    ["All-in / month", (a) => money(a.allIn)],
    ["Beds / baths", (a) => [a.beds, a.baths].every((x) => x == null) ? "" : `${a.beds ?? "?"} bd / ${a.baths ?? "?"} ba`],
    ["Size", (a) => sizeText(a)],
    ["Building", (a) => a.building],
    ["Floor", (a) => a.floor],
    ["Per sq ft", (a) => a.rent && a.sqft ? (window.CURRENCY || "$") + (a.rent / a.sqft).toFixed(2) : ""],
    ["Available", (a) => a.available],
    ["section", "Transport (estimates)"],
    ["Transport score", (a) => scoreText(transportScore(a)), true],
    ["MTR", (a) => a.transport ? `${dots(band(a.transport.mtrWalk, WALK_BANDS))} ${esc(a.transport.mtr)}, ${a.transport.mtrWalk} min walk` : "", true],
    ["Bus / minibus", (a) => a.transport ? `${dots(band(a.transport.busWalk, WALK_BANDS))} ${esc(a.transport.bus)}, ${a.transport.busWalk} min walk` : "", true],
    ...DEST.map((d) => [d.label, (a) => {
      const t = a.transport?.[d.key];
      if (!t) return "";
      return `${dots(band(t.min, TIME_BANDS))} <b>~${t.min} min</b><div class="sub">${esc(t.how)}</div><a href="${mapsLink(origin(a), d.place)}" target="_blank" rel="noopener">Check in Google Maps ↗</a>`;
    }, true]),
    ["Commute", (a) => a.commute],
    ["section", "From the photos"],
    ["Photo score", (a) => scoreText(photoScore(a)), true],
    ...PHOTO_FACTORS.map(([k, label]) => [label, (a) => a.photoReview?.[k] ? `${dots(a.photoReview[k][0])}<div class="sub">${esc(a.photoReview[k][1])}</div>` : "", true]),
    ["section", "Notes"],
    ["Pros", (a) => a.pros],
    ["Cons", (a) => a.cons],
    ["Notes", (a) => a.notes],
    ["Listing", (a) => a.url ? `<a href="${encodeURI(a.url)}" target="_blank" rel="noopener">Open ↗</a>` : "", true],
  ];
  // Rows where lower (rent, $/sqft) or higher (sqft, scores) is better get the best cell highlighted.
  const BEST = {
    "Rent": (a) => -a.rent, "All-in / month": (a) => a.allIn ? -a.allIn : null, "Size": (a) => a.sqft, "Per sq ft": (a) => a.rent && a.sqft ? -(a.rent / a.sqft) : null,
    "Transport score": transportScore, "Photo score": photoScore,
    "MTR": (a) => a.transport ? -a.transport.mtrWalk : null,
    ...Object.fromEntries(DEST.map((d) => [d.label, (a) => a.transport?.[d.key] ? -a.transport[d.key].min : null])),
    ...Object.fromEntries(PHOTO_FACTORS.map(([k, label]) => [label, (a) => a.photoReview?.[k]?.[0] ?? null])),
  };

  function renderRubric() {
    const rng = (bands, unit) => [`≤${bands[0]} ${unit}`, `${bands[0] + 1}–${bands[1]}`, `${bands[1] + 1}–${bands[2]}`, `${bands[2] + 1}–${bands[3]}`, `>${bands[3]} ${unit}`];
    const t = rng(TIME_BANDS, "min"), w = rng(WALK_BANDS, "min");
    const weights = [...DEST.map((d) => `${d.label} ${Math.round(d.weight * 100)}%`), `MTR walk ${W_MTR * 100}%`, `bus walk ${W_BUS * 100}%`].join(", ");
    $("#rubric").innerHTML = `<summary>How the scores work</summary>
      <h4>Transport score</h4>
      <p>Each factor gets 1 to 5, then a weighted average: ${esc(weights)}.</p>
      <table class="rubric-table"><thead><tr><th>Score</th><th>Door-to-door by public transport</th><th>Walk to MTR or bus stop</th></tr></thead><tbody>
      ${[0, 1, 2, 3, 4].map((i) => `<tr><td>${dots(5 - i)}</td><td>${t[i]}</td><td>${w[i]}</td></tr>`).join("")}
      </tbody></table>
      <p class="hint">Times are estimates for a weekday morning (walk + wait + ride), not live data. Use the Google Maps links in each cell to check.</p>
      <h4>Photo score</h4>
      <p>The average of six 1 to 5 ratings judged from the listing photos: sunlight/light (window size, aspect, how close the next building is), kitchen (size, hob, counter, washer, fridge), bathroom (size, finish, window), condition (age of finishes), view, and storage (built-ins). 3 is a typical Hong Kong flat at this rent. Photos are chosen by agents, so treat these as a first pass to check at the viewing.</p>`;
  }

  function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  async function renderCompare() {
    const apts = enabledApts();
    const table = $("#compare-table");
    const plans = $("#compare-plans");
    if (!apts.length) { table.innerHTML = ""; plans.innerHTML = `<div class="empty">No apartments enabled.</div>`; return; }
    let html = `<thead><tr><th></th>${apts.map((a) => `<th>${esc(a.name || a.id)}</th>`).join("")}</tr></thead><tbody>`;
    for (const [label, fn, raw] of COMPARE_ROWS) {
      if (label === "section") { html += `<tr class="row-section"><th colspan="${apts.length + 1}">${esc(fn)}</th></tr>`; continue; }
      const vals = apts.map(fn);
      if (vals.every((v) => !v)) continue;
      let bestIdx = -1;
      if (BEST[label] && apts.length > 1) {
        const scores = apts.map((a) => { const v = BEST[label](a); return v == null || isNaN(v) ? null : v; });
        const max = Math.max(...scores.filter((v) => v != null));
        if (scores.filter((v) => v === max).length === 1) bestIdx = scores.indexOf(max);
      }
      html += `<tr><th>${label}</th>${vals.map((v, i) => `<td class="${i === bestIdx ? "best" : ""}">${raw ? v : esc(v)}</td>`).join("")}</tr>`;
    }
    table.innerHTML = html + "</tbody>";
    renderRubric();

    // Plans at a common scale: K screen pixels per cm.
    const K = 0.42;
    plans.innerHTML = `<div class="scale-bar" style="width:100%"><span class="bar" style="width:${100 * K}px"></span> 1 m</div>`;
    for (const a of apts) {
      const fig = document.createElement("figure");
      const cap = document.createElement("figcaption");
      cap.textContent = a.name || a.id;
      const size = !window.PLANS[a.id] && a.floorPlan ? await loadImageSize(a.floorPlan) : null;
      const svgEl = Planner.renderStatic(a, size, K);
      if (!svgEl) {
        const d = document.createElement("div");
        d.className = "hint";
        d.style.width = "180px";
        d.textContent = !a.floorPlan ? "No floor plan yet." : !size ? "Floor plan didn't load." : "Scale not set yet. Open Floor plan and use Set scale.";
        fig.appendChild(d);
      } else fig.appendChild(svgEl);
      fig.appendChild(cap);
      plans.appendChild(fig);
    }
  }

  const imgSize = {};
  function loadImageSize(src) {
    if (imgSize[src]) return Promise.resolve(imgSize[src]);
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve((imgSize[src] = { w: im.naturalWidth, h: im.naturalHeight }));
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  // ---------- Wiring ----------
  document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; render(); }));
  $("#show-ruled-out").onchange = (e) => { state.showRuledOut = e.target.checked; render(); };
  $("#menu-btn").onclick = () => $("#sidebar").classList.toggle("open");

  readHash();
  loadPlanFiles().then(render);
})();
