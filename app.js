(() => {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const STORE_KEY = "aptHunt.v1";
  const $ = (sel) => document.querySelector(sel);

  // ---------- Data ----------
  const APTS = (window.APARTMENTS || []).map((a) => ({ photos: [], layout: [], ...a }));
  const FURNITURE = window.FURNITURE || [];

  // Local edits (calibration + layout per apartment), layered over apartments.js.
  let local = loadLocal();
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { calib: {}, layout: {} }; }
    catch { return { calib: {}, layout: {} }; }
  }
  function saveLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(local)); } catch { /* private mode */ }
  }
  const calibOf = (apt) => local.calib[apt.id] || apt.calibration || null;
  const layoutOf = (apt) => local.layout[apt.id] || apt.layout || [];
  function setLayout(apt, items) { local.layout[apt.id] = items; saveLocal(); }
  // Image pixels per inch, or null if the plan has no scale yet.
  function pxPerInch(apt) {
    const c = calibOf(apt);
    if (!c || !c.inches) return null;
    return Math.hypot(c.x2 - c.x1, c.y2 - c.y1) / c.inches;
  }

  // ---------- Lengths ----------
  // Accepts 12'6", 12' 6, 12.5ft, 150in, 150", 3.8m, 380cm. A bare number is feet.
  function parseLength(str) {
    if (str == null) return null;
    const s = String(str).trim().toLowerCase().replace(/[’′]/g, "'").replace(/[”″]/g, '"');
    if (!s) return null;
    let m;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?)?$/))) {
      return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
    }
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)$/))) return parseFloat(m[1]);
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*cm$/))) return parseFloat(m[1]) / 2.54;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*m$/))) return parseFloat(m[1]) * 100 / 2.54;
    if ((m = s.match(/^(\d+(?:\.\d+)?)$/))) return parseFloat(m[1]) * 12;
    return null;
  }
  function fmtLength(inches) {
    if (inches == null || isNaN(inches)) return "";
    let ft = Math.floor(inches / 12);
    let inch = Math.round(inches - ft * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    return ft ? `${ft}' ${inch}"` : `${inch}"`;
  }
  const money = (n) => (n || n === 0) && !isNaN(n) ? "$" + Number(n).toLocaleString() : "";

  // ---------- Image sizes ----------
  const imgSize = {};
  function loadImageSize(src) {
    if (imgSize[src]) return Promise.resolve(imgSize[src]);
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        imgSize[src] = { w: im.naturalWidth || 1000, h: im.naturalHeight || 800 };
        resolve(imgSize[src]);
      };
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  // ---------- App state ----------
  const state = {
    tab: "photos",
    aptId: null,
    showRuledOut: false,
    mode: "move",
    selected: null,
    points: [], // for measure / calibrate
    view: null, // viewBox {x,y,w,h}
  };
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
    state.selected = null;
    state.points = [];
    state.view = null;
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
    add("Size", apt.sqft ? apt.sqft + " sq ft" : "");
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

  // ---------- Furniture drawing (shared by editor and compare) ----------
  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function drawItem(item, s, parent, selected) {
    const W = item.w * s, D = item.d * s;
    const g = el("g", {
      class: "furn" + (item.rug ? " rug" : "") + (selected ? " sel" : ""),
      transform: `translate(${item.x} ${item.y}) rotate(${item.rot || 0})`,
    }, parent);
    g.dataset.uid = item.uid;
    const fill = item.color || "#bbb";
    if (item.round) {
      el("ellipse", { class: "body", cx: 0, cy: 0, rx: W / 2, ry: D / 2, fill }, g);
    } else if (item.shape === "L") {
      const arm = Math.min(36 * s, W / 2, D / 2);
      const x0 = -W / 2, y0 = -D / 2;
      el("path", {
        class: "body", fill,
        d: `M${x0} ${y0} H${x0 + W} V${y0 + arm} H${x0 + arm} V${y0 + D} H${x0} Z`,
      }, g);
    } else {
      el("rect", { class: "body", x: -W / 2, y: -D / 2, width: W, height: D, rx: Math.min(W, D) * 0.06, fill }, g);
    }
    const label = item.name || "";
    const fs = Math.max(2, Math.min(D * 0.28, W / (Math.max(label.length, 4) * 0.58), 9 * s * 1.6));
    const t = el("text", { x: 0, y: 0, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": fs }, g);
    t.textContent = label;
    if (D > fs * 3) {
      const t2 = el("text", { x: 0, y: fs * 1.15, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": fs * 0.8, "fill-opacity": 0.7 }, g);
      t2.textContent = `${fmtLength(item.w)} × ${fmtLength(item.d)}`;
    }
    return g;
  }

  // ---------- Floor plan editor ----------
  const svg = $("#plan-svg");
  const world = $("#world");
  const furnLayer = $("#furniture-layer");
  const overlay = $("#overlay-layer");
  const planImg = $("#plan-img");

  async function renderPlan() {
    const apt = currentApt();
    const empty = $("#plan-empty");
    renderScaleCard();
    renderLibrary();
    if (!apt || !apt.floorPlan) {
      empty.hidden = false;
      empty.textContent = apt ? "No floor plan for this apartment yet." : "No apartment selected.";
      furnLayer.innerHTML = ""; overlay.innerHTML = ""; planImg.removeAttribute("href");
      return;
    }
    empty.hidden = true;
    const size = await loadImageSize(apt.floorPlan);
    if (currentApt() !== apt) return;
    if (!size) { empty.hidden = false; empty.textContent = "Couldn't load the floor plan image: " + apt.floorPlan; return; }
    planImg.setAttribute("href", apt.floorPlan);
    planImg.setAttribute("width", size.w);
    planImg.setAttribute("height", size.h);
    if (!state.view) fitView(size);
    applyView();
    drawGrid(apt, size);
    drawFurniture();
    drawOverlay();
    renderSelected();
  }

  // Fit the whole plan, matching the element's aspect ratio so pan math stays 1:1.
  function fitView(size) {
    const pad = Math.max(size.w, size.h) * 0.03;
    let w = size.w + pad * 2, h = size.h + pad * 2;
    const aspect = svg.clientHeight / svg.clientWidth || h / w;
    if (h / w > aspect) w = h / aspect; else h = w * aspect;
    state.view = { x: size.w / 2 - w / 2, y: size.h / 2 - h / 2, w, h };
  }
  function applyView() {
    const v = state.view;
    svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
  }
  function drawGrid(apt, size) {
    const s = pxPerInch(apt);
    const r = $("#grid-rect");
    const on = $("#grid-toggle").checked && s;
    r.setAttribute("visibility", on ? "visible" : "hidden");
    if (!s) return;
    r.setAttribute("width", size.w); r.setAttribute("height", size.h);
    const pat = $("#grid-pat");
    const c = calibOf(apt);
    pat.setAttribute("width", 12 * s); pat.setAttribute("height", 12 * s);
    pat.setAttribute("x", c.x1); pat.setAttribute("y", c.y1);
    pat.querySelector("path").setAttribute("d", `M${12 * s} 0 L0 0 0 ${12 * s}`);
  }
  function drawFurniture() {
    const apt = currentApt();
    furnLayer.innerHTML = "";
    const s = pxPerInch(apt);
    if (!s) return;
    for (const item of layoutOf(apt)) drawItem(item, s, furnLayer, item.uid === state.selected);
  }

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(world.getScreenCTM().inverse());
  }
  // Size of one screen pixel in plan coordinates, for constant-size overlays.
  const unitPx = () => state.view.w / svg.clientWidth;

  function drawOverlay(hover) {
    overlay.innerHTML = "";
    const apt = currentApt();
    if (!apt || !state.view) return;
    const u = unitPx();
    const pts = [...state.points];
    if (hover && pts.length === 1) pts.push(hover);
    const color = state.mode === "calibrate" ? "#e11d48" : "#2563eb";
    // Show the current calibration line faintly while setting scale.
    const c = calibOf(apt);
    if (state.mode === "calibrate" && c && !pts.length) {
      el("line", { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, stroke: "#e11d48", "stroke-opacity": 0.35, "stroke-width": 4 * u }, overlay);
    }
    pts.forEach((p) => el("circle", { cx: p.x, cy: p.y, r: 5 * u, fill: color }, overlay));
    if (pts.length === 2) {
      const [a, b] = pts;
      el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, "stroke-width": 2.5 * u }, overlay);
      const s = pxPerInch(apt);
      if (state.mode === "measure" && s) {
        const len = Math.hypot(b.x - a.x, b.y - a.y) / s;
        const t = el("text", {
          x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 * u, "text-anchor": "middle",
          "font-size": 15 * u, "font-weight": 700, fill: color, stroke: "#fff", "stroke-width": 4 * u, "paint-order": "stroke",
        }, overlay);
        t.textContent = fmtLength(len);
      }
    }
  }

  // Pointer handling: drag furniture, pan background, place measure/scale points.
  let drag = null;
  svg.addEventListener("pointerdown", (e) => {
    const apt = currentApt();
    if (!apt || !state.view) return;
    const p = svgPoint(e);
    if (state.mode === "measure" || state.mode === "calibrate") {
      if (state.points.length >= 2) state.points = [];
      state.points.push({ x: p.x, y: p.y });
      drawOverlay();
      if (state.mode === "calibrate" && state.points.length === 2) setTimeout(finishCalibration, 30);
      return;
    }
    const g = e.target.closest(".furn");
    if (g) {
      const item = layoutOf(apt).find((i) => i.uid === g.dataset.uid);
      state.selected = item.uid;
      drag = { kind: "item", item, dx: p.x - item.x, dy: p.y - item.y, moved: false };
      drawFurniture();
      renderSelected();
    } else {
      if (state.selected) { state.selected = null; drawFurniture(); renderSelected(); }
      drag = { kind: "pan", sx: e.clientX, sy: e.clientY, v: { ...state.view } };
      svg.classList.add("panning");
    }
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!state.view) return;
    if (!drag) {
      if ((state.mode === "measure" || state.mode === "calibrate") && state.points.length === 1) {
        const p = svgPoint(e);
        drawOverlay({ x: p.x, y: p.y });
      }
      return;
    }
    if (drag.kind === "item") {
      const p = svgPoint(e);
      drag.item.x = p.x - drag.dx;
      drag.item.y = p.y - drag.dy;
      drag.moved = true;
      const g = furnLayer.querySelector(`[data-uid="${drag.item.uid}"]`);
      g.setAttribute("transform", `translate(${drag.item.x} ${drag.item.y}) rotate(${drag.item.rot || 0})`);
    } else {
      const k = drag.v.w / svg.clientWidth;
      state.view.x = drag.v.x - (e.clientX - drag.sx) * k;
      state.view.y = drag.v.y - (e.clientY - drag.sy) * k;
      applyView();
    }
  });
  const endDrag = () => {
    if (drag && drag.kind === "item" && drag.moved) saveCurrentLayout();
    drag = null;
    svg.classList.remove("panning");
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  svg.addEventListener("wheel", (e) => {
    if (!state.view) return;
    e.preventDefault();
    zoomAt(svgPoint(e), Math.exp(e.deltaY * 0.0015));
  }, { passive: false });
  function zoomAt(p, f) {
    const v = state.view;
    const w = Math.min(Math.max(v.w * f, 20), 50000);
    const k = w / v.w;
    state.view = { x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w, h: v.h * k };
    applyView();
    drawOverlay();
  }
  const viewCenter = () => ({ x: state.view.x + state.view.w / 2, y: state.view.y + state.view.h / 2 });
  $("#zoom-in").onclick = () => state.view && zoomAt(viewCenter(), 0.8);
  $("#zoom-out").onclick = () => state.view && zoomAt(viewCenter(), 1.25);
  $("#zoom-fit").onclick = () => { const a = currentApt(); if (a && imgSize[a.floorPlan]) { fitView(imgSize[a.floorPlan]); applyView(); drawOverlay(); } };
  // Keep the viewBox aspect ratio matched to the element so pan math stays 1:1.
  new ResizeObserver(() => {
    if (!state.view || !svg.clientWidth) return;
    state.view.h = state.view.w * (svg.clientHeight / svg.clientWidth);
    applyView();
  }).observe(svg);
  $("#grid-toggle").onchange = () => { const a = currentApt(); if (a && imgSize[a.floorPlan]) drawGrid(a, imgSize[a.floorPlan]); };

  // Modes
  const MODE_HINTS = {
    move: "",
    measure: "Click two points to measure.",
    calibrate: "Click both ends of a wall or dimension line whose length you know.",
  };
  function setMode(m) {
    state.mode = m;
    state.points = [];
    document.querySelectorAll("#mode-seg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
    svg.classList.toggle("crosshair", m !== "move");
    $("#mode-hint").textContent = MODE_HINTS[m];
    drawOverlay();
  }
  document.querySelectorAll("#mode-seg button").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

  function finishCalibration() {
    const apt = currentApt();
    const [a, b] = state.points;
    const ans = prompt('How long is the line you just drew? e.g. 12\'6", 150in, 3.8m');
    const inches = parseLength(ans);
    if (!inches) {
      if (ans != null) alert("Couldn't read that length. Try something like 12'6\" or 150in.");
      state.points = []; drawOverlay(); return;
    }
    local.calib[apt.id] = { x1: +a.x.toFixed(1), y1: +a.y.toFixed(1), x2: +b.x.toFixed(1), y2: +b.y.toFixed(1), inches: +inches.toFixed(2) };
    saveLocal();
    setMode("move");
    renderPlan();
  }

  function renderScaleCard() {
    const apt = currentApt();
    const card = $("#scale-card");
    if (!apt) { card.innerHTML = ""; return; }
    const c = calibOf(apt);
    const s = pxPerInch(apt);
    let html = `<h3>Scale</h3>`;
    if (s) {
      html += `<div class="scale-ok">Set: the line you drew is ${fmtLength(c.inches)}.</div>`;
      const size = imgSize[apt.floorPlan];
      if (size && apt.sqft) {
        html += `<p class="hint">Whole image is about ${fmtLength(size.w / s)} × ${fmtLength(size.h / s)}. Listing says ${apt.sqft} sq ft. Use Measure on a room to sanity-check.</p>`;
      } else {
        html += `<p class="hint">Use Measure on a room with a printed size to double-check.</p>`;
      }
    } else {
      html += `<div class="scale-missing">Not set yet.</div><p class="hint">Click <b>Set scale</b>, then click both ends of a wall whose length is printed on the plan. Furniture unlocks after that.</p>`;
    }
    card.innerHTML = html;
  }

  function renderLibrary() {
    const lib = $("#library");
    if (lib.dataset.ready) return;
    lib.dataset.ready = "1";
    const groups = {};
    FURNITURE.forEach((f) => (groups[f.group || "Other"] ||= []).push(f));
    for (const [name, items] of Object.entries(groups)) {
      lib.insertAdjacentHTML("beforeend", `<div class="grp">${name}</div>`);
      const box = document.createElement("div");
      box.className = "items";
      for (const f of items) {
        const b = document.createElement("button");
        b.textContent = f.name;
        b.title = `${fmtLength(f.w)} × ${fmtLength(f.d)}`;
        b.onclick = () => addFurniture(f);
        box.appendChild(b);
      }
      lib.appendChild(box);
    }
  }

  const uid = () => Math.random().toString(36).slice(2, 9);
  function addFurniture(f) {
    const apt = currentApt();
    if (!apt || !apt.floorPlan) return;
    if (!pxPerInch(apt)) { alert("Set the scale first: click Set scale, then click both ends of a wall with a known length."); return; }
    const c = viewCenter();
    const item = {
      uid: uid(), name: f.name, w: f.w, d: f.d, color: f.color || "#bbbbbb",
      round: !!f.round, rug: !!f.rug, shape: f.shape || "", x: c.x, y: c.y, rot: 0,
    };
    const items = [...layoutOf(apt), item];
    // Rugs go underneath everything else.
    items.sort((a, b) => (b.rug ? 1 : 0) - (a.rug ? 1 : 0));
    setLayout(apt, items);
    state.selected = item.uid;
    drawFurniture();
    renderSelected();
  }
  $("#custom-add").onclick = () => {
    const w = parseLength($("#custom-w").value), d = parseLength($("#custom-d").value);
    if (!w || !d) { alert("Enter a width and depth, e.g. 88in and 38in."); return; }
    addFurniture({ name: $("#custom-name").value || "Custom", w, d, color: "#d8b4a0" });
  };

  function saveCurrentLayout() { const a = currentApt(); setLayout(a, layoutOf(a)); }
  const selItem = () => { const a = currentApt(); return a && layoutOf(a).find((i) => i.uid === state.selected); };

  function renderSelected() {
    const it = selItem();
    $("#selected-card").hidden = !it;
    if (!it) return;
    $("#sel-name").value = it.name;
    $("#sel-w").value = fmtLength(it.w);
    $("#sel-d").value = fmtLength(it.d);
    $("#sel-color").value = it.color || "#bbbbbb";
    $("#sel-rot").value = Math.round(it.rot || 0);
  }
  function updateSel(fn) {
    const it = selItem();
    if (!it) return;
    fn(it);
    saveCurrentLayout();
    drawFurniture();
    renderSelected();
  }
  $("#sel-name").onchange = (e) => updateSel((it) => (it.name = e.target.value));
  $("#sel-w").onchange = (e) => updateSel((it) => { const v = parseLength(e.target.value); if (v) it.w = v; });
  $("#sel-d").onchange = (e) => updateSel((it) => { const v = parseLength(e.target.value); if (v) it.d = v; });
  $("#sel-color").oninput = (e) => updateSel((it) => (it.color = e.target.value));
  $("#sel-rot").onchange = (e) => updateSel((it) => (it.rot = ((+e.target.value % 360) + 360) % 360));
  $("#sel-rotate").onclick = () => updateSel((it) => (it.rot = ((it.rot || 0) + 90) % 360));
  $("#sel-dup").onclick = () => {
    const it = selItem(); if (!it) return;
    const s = pxPerInch(currentApt());
    const copy = { ...it, uid: uid(), x: it.x + 12 * s, y: it.y + 12 * s };
    const a = currentApt();
    setLayout(a, [...layoutOf(a), copy]);
    state.selected = copy.uid; drawFurniture(); renderSelected();
  };
  function deleteSel() {
    const a = currentApt();
    setLayout(a, layoutOf(a).filter((i) => i.uid !== state.selected));
    state.selected = null; drawFurniture(); renderSelected();
  }
  $("#sel-del").onclick = deleteSel;
  $("#clear-btn").onclick = () => {
    const a = currentApt();
    if (a && confirm(`Remove all furniture from ${a.name}?`)) { setLayout(a, []); state.selected = null; drawFurniture(); renderSelected(); }
  };

  document.addEventListener("keydown", (e) => {
    if (state.tab !== "plan" || /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === "Escape") { setMode("move"); return; }
    const it = selItem();
    if (!it) return;
    const s = pxPerInch(currentApt());
    const step = (e.shiftKey ? 6 : 1) * s;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) { e.preventDefault(); updateSel((i) => { i.x += moves[e.key][0]; i.y += moves[e.key][1]; }); }
    else if (e.key === "r" || e.key === "R") updateSel((i) => (i.rot = ((i.rot || 0) + (e.shiftKey ? 15 : 90)) % 360));
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSel(); }
  });

  // ---------- Export / import ----------
  function exportData() {
    const out = {};
    for (const a of APTS) {
      const c = local.calib[a.id], l = local.layout[a.id];
      if (c || l) out[a.id] = { ...(c ? { calibration: c } : {}), ...(l ? { layout: l } : {}) };
    }
    return JSON.stringify(out, null, 2);
  }
  $("#export-btn").onclick = () => { $("#export-text").value = exportData(); $("#export-dialog").showModal(); };
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
  $("#import-file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      for (const [id, v] of Object.entries(data)) {
        if (v.calibration) local.calib[id] = v.calibration;
        if (v.layout) local.layout[id] = v.layout;
      }
      saveLocal(); state.view = null; render();
    } catch { alert("That file isn't a valid export."); }
    e.target.value = "";
  };

  // ---------- Compare ----------
  const COMPARE_ROWS = [
    ["Photo", (a) => a.photos[0] ? `<img src="${encodeURI(a.photos[0])}" alt="">` : "", true],
    ["Rent", (a) => money(a.rent) && money(a.rent) + "/mo"],
    ["Fees", (a) => a.fees],
    ["Beds / baths", (a) => [a.beds, a.baths].every((x) => x == null) ? "" : `${a.beds ?? "?"} bd / ${a.baths ?? "?"} ba`],
    ["Size", (a) => a.sqft ? `${a.sqft} sq ft` : ""],
    ["$ per sq ft", (a) => a.rent && a.sqft ? "$" + (a.rent / a.sqft).toFixed(2) : ""],
    ["Available", (a) => a.available],
    ["Commute", (a) => a.commute],
    ["Pros", (a) => a.pros],
    ["Cons", (a) => a.cons],
    ["Notes", (a) => a.notes],
    ["Listing", (a) => a.url ? `<a href="${encodeURI(a.url)}" target="_blank" rel="noopener">Open ↗</a>` : "", true],
  ];
  // Rows where lower (rent, $/sqft) or higher (sqft) is better get the best cell highlighted.
  const BEST = { "Rent": (a) => -a.rent, "Size": (a) => a.sqft, "$ per sq ft": (a) => a.rent && a.sqft ? -(a.rent / a.sqft) : null };

  function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  async function renderCompare() {
    const apts = enabledApts();
    const table = $("#compare-table");
    const plans = $("#compare-plans");
    if (!apts.length) { table.innerHTML = ""; plans.innerHTML = `<div class="empty">No apartments enabled.</div>`; return; }
    let html = `<thead><tr><th></th>${apts.map((a) => `<th>${esc(a.name || a.id)}</th>`).join("")}</tr></thead><tbody>`;
    for (const [label, fn, raw] of COMPARE_ROWS) {
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

    // Plans at a common scale: K screen pixels per real inch.
    const K = 0.8;
    plans.innerHTML = `<div class="scale-bar" style="width:100%"><span class="bar" style="width:${120 * K}px"></span> 10 ft</div>`;
    for (const a of apts) {
      const fig = document.createElement("figure");
      const cap = document.createElement("figcaption");
      cap.textContent = a.name || a.id;
      const s = pxPerInch(a);
      const size = a.floorPlan ? await loadImageSize(a.floorPlan) : null;
      if (!size || !s) {
        const d = document.createElement("div");
        d.className = "hint";
        d.style.width = "180px";
        d.textContent = !a.floorPlan ? "No floor plan yet." : !size ? "Floor plan didn't load." : "Scale not set yet. Open Floor plan and use Set scale.";
        fig.appendChild(d);
      } else {
        const svgEl = el("svg", { viewBox: `0 0 ${size.w} ${size.h}`, width: (size.w / s) * K, height: (size.h / s) * K });
        el("image", { href: a.floorPlan, x: 0, y: 0, width: size.w, height: size.h }, svgEl);
        const g = el("g", {}, svgEl);
        for (const it of layoutOf(a)) drawItem(it, s, g, false);
        fig.appendChild(svgEl);
      }
      fig.appendChild(cap);
      plans.appendChild(fig);
    }
  }

  // ---------- Wiring ----------
  document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; render(); }));
  $("#show-ruled-out").onchange = (e) => { state.showRuledOut = e.target.checked; render(); };
  $("#menu-btn").onclick = () => $("#sidebar").classList.toggle("open");

  readHash();
  render();
})();
