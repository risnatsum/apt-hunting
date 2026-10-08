// Floor plan planner: to-scale 2D plan with draggable furniture, plus a 3D view.
//
// Everything is in centimetres. An apartment gets drawn one of two ways:
//  - Traced plan (preferred): apartments/<id>/plan.js registers walls, doors,
//    windows, floors and fittings in window.PLANS[id]. Renders in 2D and 3D.
//  - Listing image: the floor plan image is used as the backdrop once its
//    scale is set by clicking a wall of known length. 3D shows the image on
//    the floor with your furniture on top.
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  window.PLANS = window.PLANS || {};

  // ---------- Units ----------
  // Parses 152, 152cm, 1.52m, 1520mm, 5'0", 60in. A bare number is cm.
  function parseLen(str) {
    const s = String(str ?? "").trim().toLowerCase().replace(/[’′]/g, "'").replace(/[”″]/g, '"');
    let m;
    if (!s) return null;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:cm)?$/))) return +m[1];
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*mm$/))) return m[1] / 10;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*m$/))) return m[1] * 100;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in)?)?$/))) return (m[1] * 12 + (+m[2] || 0)) * 2.54;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)$/))) return m[1] * 2.54;
    return null;
  }
  const ftin = (cm) => {
    let ft = Math.floor(cm / 30.48), inch = Math.round((cm - ft * 30.48) / 2.54);
    if (inch === 12) { ft++; inch = 0; }
    return `${ft}'${inch}"`;
  };
  const fmt = (cm) => cm >= 100 ? `${(cm / 100).toFixed(2)} m (${ftin(cm)})` : `${Math.round(cm)} cm (${ftin(cm)})`;

  // ---------- Furniture catalogue (cm) ----------
  const CATALOGUE = {
    "bed-king": { n: "King bed", w: 183, d: 203, g: "Bedroom" },
    "bed-queen": { n: "Queen bed", w: 152, d: 190, g: "Bedroom" },
    "bed-double": { n: "Double bed", w: 135, d: 190, g: "Bedroom" },
    "bed-single": { n: "Single bed", w: 90, d: 190, g: "Bedroom" },
    nightstand: { n: "Bedside table", w: 45, d: 40, g: "Bedroom" },
    wardrobe: { n: "Wardrobe", w: 120, d: 60, g: "Bedroom" },
    dresser: { n: "Chest of drawers", w: 100, d: 45, g: "Bedroom" },
    sofa3: { n: "3-seat sofa", w: 210, d: 90, g: "Living" },
    sofa2: { n: "2-seat sofa", w: 160, d: 85, g: "Living" },
    sectional: { n: "L-sofa", w: 250, d: 160, g: "Living" },
    sofabed: { n: "Sofa bed", w: 190, d: 90, g: "Living" },
    armchair: { n: "Armchair", w: 80, d: 80, g: "Living" },
    coffee: { n: "Coffee table", w: 100, d: 55, g: "Living" },
    tv: { n: "TV unit", w: 160, d: 40, g: "Living" },
    rug: { n: "Rug", w: 200, d: 140, g: "Living" },
    bookshelf: { n: "Bookshelf", w: 80, d: 30, g: "Living" },
    dining4: { n: "Dining table (4)", w: 120, d: 75, g: "Dining & work" },
    dining6: { n: "Dining table (6)", w: 180, d: 90, g: "Dining & work" },
    round: { n: "Round table", w: 90, d: 90, g: "Dining & work" },
    chair: { n: "Dining chair", w: 45, d: 50, g: "Dining & work" },
    bench: { n: "Bench", w: 100, d: 35, g: "Dining & work" },
    desk: { n: "Desk", w: 120, d: 60, g: "Dining & work" },
    officechair: { n: "Desk chair", w: 60, d: 60, g: "Dining & work" },
    shoe: { n: "Shoe cabinet", w: 80, d: 30, g: "Extras" },
    plant: { n: "Plant", w: 40, d: 40, g: "Extras" },
    lamp: { n: "Floor lamp", w: 40, d: 40, g: "Extras" },
    washer: { n: "Washer / dryer", w: 60, d: 60, g: "Extras" },
    box: { n: "Custom piece", w: 100, d: 50, g: "Extras" },
  };
  const isRug = (t) => t === "rug";

  // ---------- SVG helpers ----------
  const el = (t, a = {}, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

  function furniture2d(type, w, d) {
    const hw = w / 2, hd = d / 2;
    const r = (x, y, ww, dd, c = "f", rx = 3) => `<rect x="${x}" y="${y}" width="${ww}" height="${dd}" rx="${rx}" class="${c}"/>`;
    const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="fl"/>`;
    switch (type) {
      case "bed-king": case "bed-queen": case "bed-double": case "bed-single": {
        let s = r(-hw, -hd, w, d); const n = w > 110 ? 2 : 1, pw = (w - 12 - (n - 1) * 6) / n;
        for (let i = 0; i < n; i++) s += r(-hw + 6 + i * (pw + 6), -hd + 6, pw, 28, "ff", 5);
        return s + L(-hw, -hd + d * 0.3, hw, -hd + d * 0.3) + L(-hw + 4, -hd + d * 0.3 + 8, hw - 4, -hd + d * 0.3 + 8);
      }
      case "sofa3": case "sofa2": case "sofabed": case "armchair": {
        let s = r(-hw, -hd, w, d, "f", 8) + r(-hw + 2, -hd + 2, w - 4, 20, "ff", 5) + r(-hw + 2, -hd + 2, 16, d - 4, "ff", 5) + r(hw - 18, -hd + 2, 16, d - 4, "ff", 5);
        const seats = type === "armchair" ? 1 : type === "sofa2" ? 2 : 3, sw = (w - 36) / seats;
        for (let i = 1; i < seats; i++) s += L(-hw + 18 + i * sw, -hd + 22, -hw + 18 + i * sw, hd - 4);
        return s;
      }
      case "sectional": {
        const a = Math.min(90, d / 2);
        return `<path class="f" d="M${-hw} ${-hd}H${hw}V${hd}H${hw - a}V${-hd + a}H${-hw}Z"/>` +
          r(-hw + 2, -hd + 2, w - 4, 20, "ff", 5) + r(hw - 22, -hd + 2, 20, d - 4, "ff", 5);
      }
      case "chair": return r(-hw, -hd + 8, w, d - 8, "f", 4) + r(-hw, -hd, w, 9, "ff", 3);
      case "officechair": return `<circle r="${hw - 4}" class="f"/>` + r(-hw + 6, -hd, w - 12, 10, "ff", 4);
      case "round": return `<circle r="${hw}" class="f"/>`;
      case "plant": return `<circle r="${hw}" class="f"/><circle r="${hw * 0.55}" class="ff"/>${L(-hw * 0.7, 0, hw * 0.7, 0)}${L(0, -hw * 0.7, 0, hw * 0.7)}`;
      case "lamp": return `<circle r="${hw * 0.8}" class="f"/><circle r="4" class="ff"/>`;
      case "rug": return r(-hw, -hd, w, d, "rug", 4);
      case "wardrobe": return r(-hw, -hd, w, d) + L(0, -hd, 0, hd) + L(-hw, hd - 4, hw, hd - 4);
      case "tv": return r(-hw, -hd, w, d) + r(-w * 0.37, -hd + 4, w * 0.74, 5, "ff", 1);
      case "bookshelf": { let s = r(-hw, -hd, w, d); for (let i = 1; i < 4; i++) s += L(-hw + i * w / 4, -hd, -hw + i * w / 4, hd); return s; }
      case "dresser": case "nightstand": case "shoe": return r(-hw, -hd, w, d) + L(-hw + 4, hd - 5, hw - 4, hd - 5);
      case "desk": return r(-hw, -hd, w, d) + L(-hw + 6, -hd + 6, -hw + 30, -hd + 6);
      case "washer": return r(-hw, -hd, w, d) + `<circle r="${Math.min(w, d) * 0.32}" class="fl"/>`;
      default: return r(-hw, -hd, w, d);
    }
  }

  // Draws walls, floors, fittings and labels of a traced plan into group g.
  function drawGeometry(P, g, showDims) {
    const gF = el("g", {}, g);
    (P.floors || []).forEach((f) => el("rect", { x: f.r[0], y: f.r[1], width: f.r[2], height: f.r[3], class: "floor-" + (f.kind || "wood") }, gF));
    (P.fixtures || []).forEach((f) => {
      const [x, y, w, d] = f.r;
      el("rect", { x, y, width: w, height: d, rx: f.round ? Math.min(w, d) / 2.4 : 2, class: "fix" }, gF);
      if (f.glass) el("line", { x1: x, y1: y, x2: x + w, y2: y, class: "win", style: "stroke-width:2;opacity:.6" }, gF);
      if (f.kind === "hob") [0.2, 0.5, 0.8].forEach((t) => el("circle", { cx: x + w * t, cy: y + d * 0.4, r: Math.min(11, w / 8), class: "fixl" }, gF));
      if (f.kind === "sink") el("rect", { x: x + w * 0.12, y: y + d * 0.3, width: w * 0.76, height: Math.min(d * 0.4, 55), rx: 4, class: "fixl" }, gF);
      if (f.label) { const t = el("text", { x: f.lx ?? x + w / 2, y: f.ly ?? y + d / 2, class: "dim", "text-anchor": "middle", "dominant-baseline": "middle" }, gF); t.textContent = f.label; }
    });
    const gW = el("g", {}, g);
    (P.walls || []).forEach((w) => {
      const [ax, ay] = w.a, [bx, by] = w.b, len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
      const at = (s) => [ax + ux * s, ay + uy * s];
      const seg = (s, e) => { if (e - s <= 0) return; const [x1, y1] = at(s), [x2, y2] = at(e); el("line", { x1, y1, x2, y2, class: "wall", "stroke-width": w.t || 12 }, gW); };
      let cur = 0;
      (w.o || []).slice().sort((p, q) => p.s - q.s).forEach((o) => {
        seg(cur, o.s); cur = o.e;
        const [x1, y1] = at(o.s), [x2, y2] = at(o.e);
        if (o.k === "win") {
          el("line", { x1, y1, x2, y2, class: o.frost ? "win-frost" : "win" }, gW);
          const nx = -uy * (w.t || 12) / 2, ny = ux * (w.t || 12) / 2;
          el("line", { x1: x1 + nx, y1: y1 + ny, x2: x2 + nx, y2: y2 + ny, class: "fixl" }, gW);
          el("line", { x1: x1 - nx, y1: y1 - ny, x2: x2 - nx, y2: y2 - ny, class: "fixl" }, gW);
        } else if (o.k === "door") {
          const hinge = o.h === "e" ? [x2, y2] : [x1, y1], other = o.h === "e" ? [x1, y1] : [x2, y2];
          const L = o.e - o.s, nx = -uy * (o.side || 1), ny = ux * (o.side || 1);
          const tip = [hinge[0] + nx * L, hinge[1] + ny * L];
          el("line", { x1: hinge[0], y1: hinge[1], x2: tip[0], y2: tip[1], class: "leaf" }, gW);
          const v1 = [other[0] - hinge[0], other[1] - hinge[1]], v2 = [tip[0] - hinge[0], tip[1] - hinge[1]];
          const pts = [];
          for (let i = 0; i <= 14; i++) { const t = i / 14 * Math.PI / 2, c = Math.cos(t), s = Math.sin(t); pts.push(`${hinge[0] + v1[0] * c + v2[0] * s},${hinge[1] + v1[1] * c + v2[1] * s}`); }
          el("polyline", { points: pts.join(" "), class: "swing" }, gW);
        }
        // k === "open": a gap with nothing drawn
      });
      seg(cur, len);
    });
    (P.marks || []).forEach((a) => {
      el("rect", { x: a.x - 14, y: a.y - 6, width: 28, height: 12, rx: 2, class: "acbox" }, gW);
      const t = el("text", { x: a.x, y: a.y + 0.5, class: "ac", "text-anchor": "middle", "dominant-baseline": "middle" }, gW); t.textContent = a.l;
    });
    const gL = el("g", {}, g);
    (P.rooms || []).forEach((r) => {
      const t = el("text", { x: r.x, y: r.y, class: "room-label", "text-anchor": "middle" }, gL); t.textContent = r.n;
      if (r.dim && showDims) { const d = el("text", { x: r.x, y: r.y + 15, class: "dim", "text-anchor": "middle" }, gL); d.textContent = r.dim; }
    });
    (P.notes || []).forEach((n) => {
      const t = el("text", { x: n.x, y: n.y, class: "dim", "text-anchor": "middle", ...(n.rot ? { transform: `rotate(${n.rot} ${n.x} ${n.y})` } : {}) }, gL);
      t.textContent = n.text;
    });
  }

  function drawItems(items, g, opts = {}) {
    const order = items.slice().sort((a, b) => (isRug(a.type) ? 0 : 1) - (isRug(b.type) ? 0 : 1));
    order.forEach((it) => {
      const cls = "item" + (opts.sel === it.id ? " sel" : "") + (opts.clashes && opts.clashes.has(it.id) ? " clash" : "");
      const grp = el("g", { class: cls, transform: `translate(${it.x} ${it.y}) rotate(${it.rot || 0})`, "data-id": it.id }, g);
      grp.innerHTML = furniture2d(it.type, it.w, it.d);
      if (Math.max(it.w, it.d) >= 70 && it.type !== "plant") {
        const t = el("text", { class: "ilabel", transform: `rotate(${-(it.rot || 0)})` }, grp);
        t.textContent = (it.name || (CATALOGUE[it.type] || {}).n || "").replace(/ \(.*\)/, "");
      }
    });
  }

  function bbox(it) {
    const a = (it.rot || 0) * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const W = it.w * c + it.d * s, D = it.w * s + it.d * c;
    return [it.x - W / 2, it.y - D / 2, it.x + W / 2, it.y + D / 2];
  }
  function findClashes(items) {
    const out = new Set(), its = items.filter((i) => !isRug(i.type));
    for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) {
      const A = bbox(its[i]), B = bbox(its[j]);
      if (A[0] < B[2] - 2 && A[2] > B[0] + 2 && A[1] < B[3] - 2 && A[3] > B[1] + 2) {
        const tt = [its[i].type, its[j].type];
        if (tt.some((t) => t === "chair" || t === "officechair") && tt.some((t) => ["dining4", "dining6", "round", "desk"].includes(t))) continue;
        out.add(its[i].id); out.add(its[j].id);
      }
    }
    return out;
  }

  // ---------- Per-apartment saved state ----------
  const KEY = (id) => "aptHunt.plan." + id;
  function loadSaved(id) { try { return JSON.parse(localStorage.getItem(KEY(id))) || {}; } catch { return {}; } }
  function storeSaved(id, s) { try { localStorage.setItem(KEY(id), JSON.stringify(s)); } catch { /* private mode */ } }

  // Calibration from apartments.js may be in inches (older format) or cm.
  function calibCm(c) {
    if (!c) return null;
    const cm = c.cm || (c.inches ? c.inches * 2.54 : 0);
    return cm ? { ...c, cm } : null;
  }
  function backdropOf(apt) {
    const saved = loadSaved(apt.id);
    const c = calibCm(saved.calibration || apt.calibration);
    return c ? { pxPerCm: Math.hypot(c.x2 - c.x1, c.y2 - c.y1) / c.cm, calib: c } : null;
  }

  const mkItem = (a, id) => ({ id, type: a[0], x: a[1], y: a[2], w: a[3] ?? CATALOGUE[a[0]].w, d: a[4] ?? CATALOGUE[a[0]].d, rot: a[5] || 0 });
  function presetItems(P, name) { return ((P && P.presets && P.presets[name]) || []).map((a, i) => mkItem(a, i + 1)); }
  function itemsOf(apt) {
    const saved = loadSaved(apt.id);
    if (Array.isArray(saved.items)) return saved.items;
    if (Array.isArray(apt.layout) && apt.layout.length && apt.layout[0].type) return apt.layout;
    const P = window.PLANS[apt.id];
    return P && P.defaultPreset ? presetItems(P, P.defaultPreset) : [];
  }

  // Bounds of the drawing, in cm.
  function boundsOf(apt, imgSize) {
    const P = window.PLANS[apt.id];
    if (P) return P.bounds;
    const b = backdropOf(apt);
    if (b && imgSize) return [0, 0, imgSize.w / b.pxPerCm, imgSize.h / b.pxPerCm];
    return null;
  }

  // Static drawing (used by Compare): returns an <svg> at k screen px per cm.
  function renderStatic(apt, imgSize, k) {
    const bounds = boundsOf(apt, imgSize);
    if (!bounds) return null;
    const [x0, y0, x1, y1] = bounds;
    const svg = el("svg", { viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}`, width: (x1 - x0) * k, height: (y1 - y0) * k, class: "plan-svg static" });
    const P = window.PLANS[apt.id];
    if (P) drawGeometry(P, svg, false);
    else el("image", { href: apt.floorPlan, x: 0, y: 0, width: x1, height: y1 }, svg);
    drawItems(itemsOf(apt), el("g", {}, svg));
    return svg;
  }

  // ---------- Interactive planner ----------
  function mount(root, apt, ctx) {
    const P = window.PLANS[apt.id] || null;
    const saved = loadSaved(apt.id);
    let items = itemsOf(apt).map((i) => ({ ...i }));
    let uid = Math.max(0, ...items.map((i) => i.id || 0)) + 1;
    items.forEach((i) => { if (!i.id) i.id = uid++; });
    let sel = null, showDims = true, mode = "move", pts = [], view = null, imgSize = null, tab = "2d";

    const persist = () => { const s = loadSaved(apt.id); s.items = items; storeSaved(apt.id, s); };

    root.innerHTML = `
      <div class="planner">
        <aside class="rail">
          ${P && P.presets ? `<h2>Layouts</h2><div class="presets">${Object.keys(P.presets).map((k) => `<button class="btn${k === P.defaultPreset ? " primary" : ""}" data-preset="${k}">${(P.presetNames || {})[k] || k}</button>`).join("")}</div>` : ""}
          <h2>Add furniture</h2>
          <div class="cat"></div>
          <h2>Custom size</h2>
          <div class="custom">
            <input class="c-name" placeholder="Name, e.g. our sofa">
            <div class="row2"><input class="c-w" placeholder="Width, e.g. 220"><input class="c-d" placeholder="Depth, e.g. 95"></div>
            <button class="btn c-add">Add piece</button>
          </div>
          <h2>Save</h2>
          <p class="note">Saved in this browser. Export to keep it in the repo or move it to another device.</p>
          <div class="presets"><button class="btn x-export">Export</button><label class="btn file-btn">Import<input type="file" accept=".json" hidden class="x-import"></label><button class="btn danger x-clear">Clear furniture</button></div>
        </aside>
        <section class="pmain">
          <div class="ptop">
            <div class="seg view-seg"><button data-v="2d" class="on">Plan</button><button data-v="3d">3D</button></div>
            <div class="seg tool-seg">
              <button data-m="move" class="on">Move</button>
              <button data-m="measure">Measure</button>
              ${P ? "" : `<button data-m="calibrate">Set scale</button>`}
            </div>
            <div class="seg zoom-seg"><button class="z-out" title="Zoom out">−</button><button class="z-fit">Fit</button><button class="z-in" title="Zoom in">+</button></div>
            ${P && apt.floorPlan ? `<label class="chk"><input type="checkbox" class="ref-toggle"> Listing plan overlay</label>` : ""}
          </div>
          <div class="toolbar"></div>
          <div class="stage stage2d"><svg class="plan-svg" xmlns="${NS}"></svg><div class="plan-empty" hidden></div></div>
          <div class="stage stage3d" hidden><div class="view3d"></div></div>
          <p class="note src-note"></p>
        </section>
      </div>`;
    const $ = (s) => root.querySelector(s);
    const svg = $(".plan-svg"), tb = $(".toolbar");

    // Catalogue
    const cat = $(".cat"); let lastG = "";
    Object.entries(CATALOGUE).forEach(([k, v]) => {
      if (k === "box") return;
      if (v.g !== lastG) { lastG = v.g; const h = document.createElement("h3"); h.textContent = v.g; cat.appendChild(h); }
      const b = document.createElement("button");
      b.innerHTML = `${v.n}<span>${v.w}×${v.d}</span>`;
      b.onclick = () => addItem({ type: k, w: v.w, d: v.d });
      cat.appendChild(b);
    });
    $(".c-add").onclick = () => {
      const w = parseLen($(".c-w").value), d = parseLen($(".c-d").value);
      if (!w || !d) { alert("Enter a width and depth in cm (or like 7'2\")."); return; }
      addItem({ type: "box", w: Math.round(w), d: Math.round(d), name: $(".c-name").value || "Custom" });
    };
    root.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => {
      items = presetItems(P, b.dataset.preset); uid = items.length + 1; sel = null; commit();
      root.querySelectorAll("[data-preset]").forEach((x) => x.classList.toggle("primary", x === b));
    }));
    $(".x-clear").onclick = () => { if (confirm("Remove all furniture?")) { items = []; sel = null; commit(); } };
    $(".x-export").onclick = () => ctx.exportAll();
    $(".x-import").onchange = (e) => ctx.importFile(e.target.files[0]);

    function scaleReady() { return !!P || !!backdropOf(apt); }
    function addItem(o) {
      if (!scaleReady()) { alert("Set the scale first: click Set scale, then click both ends of a wall with a known length."); return; }
      const c = view ? { x: view.x + view.w / 2, y: view.y + view.h / 2 } : { x: 100, y: 100 };
      const n = { id: uid++, x: Math.round(c.x), y: Math.round(c.y), rot: 0, ...o };
      items.push(n); sel = n.id; commit();
    }
    function commit() { persist(); draw(); if (tab === "3d") build3dFurniture(); }

    // ----- 2D drawing -----
    function fit() {
      const b = boundsOf(apt, imgSize); if (!b) return;
      const pad = 40, W = b[2] - b[0] + pad * 2, H = b[3] - b[1] + pad * 2;
      const aspect = (svg.clientHeight || 500) / (svg.clientWidth || 800);
      let w = W, h = W * aspect; if (h < H) { h = H; w = H / aspect; }
      view = { x: (b[0] + b[2]) / 2 - w / 2, y: (b[1] + b[3]) / 2 - h / 2, w, h };
    }
    function applyView() { if (view) svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`); }
    const unit = () => (view ? view.w / (svg.clientWidth || 800) : 1);

    function draw() {
      svg.innerHTML = "";
      const empty = $(".plan-empty");
      if (!P && !apt.floorPlan) {
        empty.hidden = false; empty.textContent = "No floor plan for this apartment yet. Send Claude an image or link to one and it will be traced.";
        renderToolbar(new Set()); return;
      }
      empty.hidden = true;
      const defs = el("defs", {}, svg);
      defs.innerHTML = `<pattern id="g50" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="currentColor" stroke-width=".6" opacity=".18"/></pattern>`;
      const b = boundsOf(apt, imgSize);
      if (b) el("rect", { x: b[0] - 400, y: b[1] - 400, width: b[2] - b[0] + 800, height: b[3] - b[1] + 800, fill: "url(#g50)", class: "gridbg" }, svg);
      const bd = backdropOf(apt);
      if (P) {
        drawGeometry(P, svg, showDims);
        const ref = $(".ref-toggle");
        if (ref && ref.checked && P.reference) {
          const r = P.reference;
          el("image", { href: apt.floorPlan, x: r.x, y: r.y, width: r.w, height: r.h, opacity: 0.45, preserveAspectRatio: "none" }, svg);
        }
      } else if (imgSize) {
        const s = bd ? bd.pxPerCm : 1;
        el("image", { href: apt.floorPlan, x: 0, y: 0, width: imgSize.w / s, height: imgSize.h / s }, svg);
      }
      const clashes = findClashes(items);
      drawItems(items, el("g", {}, svg), { sel, clashes });
      if (showDims && sel) {
        const it = items.find((i) => i.id === sel);
        if (it) { const t = el("text", { x: it.x, y: it.y + Math.max(it.w, it.d) / 2 + 14, class: "dim sel-dim", "text-anchor": "middle" }, svg); t.textContent = `${it.w} × ${it.d} cm (${ftin(it.w)} × ${ftin(it.d)})`; }
      }
      drawOverlay();
      renderToolbar(clashes);
      $(".src-note").textContent = P ? (P.source || "") : bd ? "Drawn on the listing's floor plan. Check key sizes with Measure." : "";
    }
    let overlay = null;
    function drawOverlay(hover) {
      if (overlay) overlay.remove();
      overlay = el("g", {}, svg);
      const u = unit(), list = hover && pts.length === 1 ? [...pts, hover] : pts;
      const color = mode === "calibrate" ? "#d6336c" : "var(--accent)";
      list.forEach((p) => el("circle", { cx: p.x, cy: p.y, r: 5 * u, fill: color }, overlay));
      if (list.length === 2) {
        const [a, b] = list;
        el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, "stroke-width": 2.5 * u }, overlay);
        if (mode === "measure" && scaleReady()) {
          const t = el("text", { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 * u, "text-anchor": "middle", "font-size": 15 * u, "font-weight": 700, fill: color, stroke: "var(--sheet)", "stroke-width": 4 * u, "paint-order": "stroke" }, overlay);
          t.textContent = fmt(Math.hypot(b.x - a.x, b.y - a.y));
        }
      }
    }

    function renderToolbar(clashes) {
      const it = items.find((i) => i.id === sel);
      const warn = clashes.size ? `<span class="warn">${clashes.size} pieces overlap</span>` : "";
      const dimsT = `<label class="chk"><input type="checkbox" class="dims" ${showDims ? "checked" : ""}> Sizes</label>`;
      const hints = { move: scaleReady() ? "Tap a piece to move, rotate or resize it. Drag empty space to pan, scroll to zoom." : "Set the scale first: click Set scale, then both ends of a wall whose length is printed on the plan.", measure: "Click two points to measure.", calibrate: "Click both ends of a wall or dimension line with a known length." };
      if (!it) tb.innerHTML = `<span class="hint">${hints[mode]}</span><span class="spacer"></span>${warn}${dimsT}`;
      else {
        tb.innerHTML = `<span class="name"></span>
          <label>W <input type="number" class="iw" min="10" max="600" step="5" value="${it.w}"></label>
          <label>D <input type="number" class="id" min="10" max="600" step="5" value="${it.d}"></label>
          <span class="hint">cm</span>
          <button class="btn rot">Rotate 90°</button><button class="btn dup">Duplicate</button><button class="btn danger del">Remove</button>
          <span class="spacer"></span>${warn}${dimsT}`;
        tb.querySelector(".name").textContent = it.name || CATALOGUE[it.type].n;
        tb.querySelector(".iw").onchange = (e) => { it.w = clamp(+e.target.value || it.w, 10, 600); commit(); };
        tb.querySelector(".id").onchange = (e) => { it.d = clamp(+e.target.value || it.d, 10, 600); commit(); };
        tb.querySelector(".rot").onclick = () => { it.rot = ((it.rot || 0) + 90) % 360; commit(); };
        tb.querySelector(".dup").onclick = () => { const n = { ...it, id: uid++, x: it.x + 20, y: it.y + 20 }; items.push(n); sel = n.id; commit(); };
        tb.querySelector(".del").onclick = () => { items = items.filter((i) => i.id !== it.id); sel = null; commit(); };
      }
      tb.querySelector(".dims").onchange = (e) => { showDims = e.target.checked; draw(); };
    }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ----- Pointer: drag furniture, pan, measure, calibrate -----
    const toWorld = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    let drag = null;
    svg.addEventListener("pointerdown", (e) => {
      if (!view) return;
      const p = toWorld(e);
      if (mode !== "move") {
        if (pts.length >= 2) pts = [];
        pts.push({ x: p.x, y: p.y }); drawOverlay();
        if (mode === "calibrate" && pts.length === 2) setTimeout(finishCalibration, 30);
        return;
      }
      const g = e.target.closest(".item");
      if (g) {
        const it = items.find((i) => i.id === +g.dataset.id);
        sel = it.id; drag = { kind: "item", it, dx: p.x - it.x, dy: p.y - it.y, moved: false };
        draw();
      } else {
        if (sel) { sel = null; draw(); }
        drag = { kind: "pan", sx: e.clientX, sy: e.clientY, v: { ...view } };
        svg.classList.add("panning");
      }
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svg.addEventListener("pointermove", (e) => {
      if (!view) return;
      if (!drag) { if (mode !== "move" && pts.length === 1) { const p = toWorld(e); drawOverlay({ x: p.x, y: p.y }); } return; }
      if (drag.kind === "item") {
        const p = toWorld(e), nx = Math.round((p.x - drag.dx) / 5) * 5, ny = Math.round((p.y - drag.dy) / 5) * 5;
        if (nx !== drag.it.x || ny !== drag.it.y) {
          drag.it.x = nx; drag.it.y = ny; drag.moved = true;
          const g = svg.querySelector(`.item[data-id="${drag.it.id}"]`);
          if (g) { g.setAttribute("transform", `translate(${nx} ${ny}) rotate(${drag.it.rot || 0})`); g.classList.add("dragging"); }
        }
      } else {
        const k = drag.v.w / svg.clientWidth;
        view.x = drag.v.x - (e.clientX - drag.sx) * k; view.y = drag.v.y - (e.clientY - drag.sy) * k; applyView();
      }
    });
    const end = () => { if (drag && drag.kind === "item" && drag.moved) commit(); drag = null; svg.classList.remove("panning"); };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
    svg.addEventListener("wheel", (e) => { if (!view) return; e.preventDefault(); zoomAt(toWorld(e), Math.exp(e.deltaY * 0.0015)); }, { passive: false });
    function zoomAt(p, f) {
      const w = clamp(view.w * f, 80, 20000), k = w / view.w;
      view = { x: p.x - (p.x - view.x) * k, y: p.y - (p.y - view.y) * k, w, h: view.h * k }; applyView(); drawOverlay();
    }
    const center = () => ({ x: view.x + view.w / 2, y: view.y + view.h / 2 });
    $(".z-in").onclick = () => view && zoomAt(center(), 0.8);
    $(".z-out").onclick = () => view && zoomAt(center(), 1.25);
    $(".z-fit").onclick = () => { fit(); applyView(); drawOverlay(); };
    const ro = new ResizeObserver(() => { if (view && svg.clientWidth) { view.h = view.w * svg.clientHeight / svg.clientWidth; applyView(); } });
    ro.observe(svg);
    const refToggle = $(".ref-toggle"); if (refToggle) refToggle.onchange = draw;

    root.querySelectorAll(".tool-seg button").forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
    function setMode(m) {
      mode = m; pts = [];
      root.querySelectorAll(".tool-seg button").forEach((x) => x.classList.toggle("on", x.dataset.m === m));
      svg.classList.toggle("crosshair", m !== "move");
      draw();
    }
    function finishCalibration() {
      const [a, b] = pts;
      const ans = prompt('How long is the line you just drew? e.g. 3.2m, 320cm, 10\'6"');
      const cm = parseLen(ans && /^\d+(\.\d+)?$/.test(ans.trim()) ? ans + "cm" : ans);
      if (!cm) { if (ans != null) alert("Couldn't read that length. Try 3.2m or 320cm."); pts = []; drawOverlay(); return; }
      // Points were placed in the current drawing units; convert back to image pixels.
      const s = backdropOf(apt) ? backdropOf(apt).pxPerCm : 1;
      const s2 = loadSaved(apt.id);
      s2.calibration = { x1: +(a.x * s).toFixed(1), y1: +(a.y * s).toFixed(1), x2: +(b.x * s).toFixed(1), y2: +(b.y * s).toFixed(1), cm: +cm.toFixed(1) };
      storeSaved(apt.id, s2);
      setMode("move"); fit(); applyView(); draw();
    }

    document.addEventListener("keydown", onKey);
    function onKey(e) {
      if (!root.isConnected) { document.removeEventListener("keydown", onKey); return; }
      if (!sel || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) { if (e.key === "Escape") setMode("move"); return; }
      const it = items.find((i) => i.id === sel); if (!it) return;
      const st = e.shiftKey ? 20 : 5;
      const m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (m) { it.x += m[0]; it.y += m[1]; e.preventDefault(); commit(); }
      else if (e.key === "r" || e.key === "R") { it.rot = ((it.rot || 0) + (e.shiftKey ? 15 : 90)) % 360; commit(); }
      else if (e.key === "Delete" || e.key === "Backspace") { items = items.filter((i) => i.id !== sel); sel = null; commit(); e.preventDefault(); }
      else if (e.key === "Escape") { sel = null; draw(); }
    }

    // ----- 3D -----
    let R3 = null;
    root.querySelectorAll(".view-seg button").forEach((b) => (b.onclick = () => show(b.dataset.v)));
    function show(v) {
      tab = v;
      root.querySelectorAll(".view-seg button").forEach((x) => x.classList.toggle("on", x.dataset.v === v));
      $(".stage2d").hidden = v === "3d"; $(".stage3d").hidden = v !== "3d";
      [".tool-seg", ".zoom-seg", ".toolbar"].forEach((q) => { const n = root.querySelector(q); if (n) n.style.display = v === "3d" ? "none" : ""; });
      $(".src-note").textContent = v === "3d" ? "Drag to orbit, right-drag to pan, scroll to zoom. Switch back to Plan to move furniture." : (P ? P.source || "" : "");
      if (v === "3d") {
        if (!window.THREE) { $(".view3d").innerHTML = `<p class="note" style="padding:16px">The 3D view needs a library that didn't load. Check your connection and reload.</p>`; return; }
        if (!scaleReady()) { $(".view3d").innerHTML = `<p class="note" style="padding:16px">Set the plan's scale first.</p>`; return; }
        init3d(); build3dFurniture();
      }
    }
    function init3d() {
      if (R3) return;
      const T = window.THREE, host = $(".view3d");
      host.innerHTML = "";
      const renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      scene.background = new T.Color(dark ? 0x1b2326 : 0xe9eef0);
      const b = boundsOf(apt, imgSize), cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2, span = Math.max(b[2] - b[0], b[3] - b[1]);
      const cam = new T.PerspectiveCamera(40, 1, 10, 20000);
      cam.position.set(cx, span * 1.25, cz + span * 0.85);
      const ctr = new T.OrbitControls(cam, renderer.domElement);
      ctr.target.set(cx, 0, cz); ctr.maxPolarAngle = Math.PI / 2.05; ctr.enableDamping = true; ctr.minDistance = 100; ctr.maxDistance = span * 4;
      scene.add(new T.HemisphereLight(0xffffff, 0x8a8070, 0.75));
      const sun = new T.DirectionalLight(0xfff4e0, 0.75);
      sun.position.set(cx - 400, 900, cz - 600); sun.target.position.set(cx, 0, cz);
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 100, far: 4000 });
      scene.add(sun, sun.target);
      const building = new T.Group(), furn = new T.Group(); scene.add(building, furn);
      R3 = { renderer, scene, cam, ctr, building, furn, host };
      buildBuilding(b);
      const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w) return; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
      new ResizeObserver(resize).observe(host); resize();
      (function loop() { if (!root.isConnected) { renderer.dispose(); return; } requestAnimationFrame(loop); if (tab !== "3d") return; ctr.update(); renderer.render(scene, cam); })();
    }
    const matCache = {};
    const mat = (c, o = {}) => { const k = c + JSON.stringify(o); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o))); };
    function box(g, x, z, y, w, d, h, c, o) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x, y + h / 2, z); m.castShadow = !(o && o.transparent); m.receiveShadow = true; g.add(m); return m; }
    const FLOOR3D = { wood: "#d8c7ab", tile: "#dfe3e4", bath: "#5b6268", kitchen: "#e9e2d6" };
    function buildBuilding(b) {
      const g = R3.building, H = (P && P.ceiling) || 250;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), mat(0xcfd6d4));
      ground.rotation.x = -Math.PI / 2; ground.position.set((b[0] + b[2]) / 2, -3, (b[1] + b[3]) / 2); ground.receiveShadow = true; g.add(ground);
      if (!P) {
        // Listing image laid on the floor at true scale.
        const w = b[2] - b[0], d = b[3] - b[1];
        new THREE.TextureLoader().load(apt.floorPlan, (tex) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
          m.rotation.x = -Math.PI / 2; m.position.set(w / 2, -1, d / 2); m.receiveShadow = true; g.add(m);
        }, undefined, () => box(g, w / 2, d / 2, -2, w, d, 2, "#e8e2d6"));
        return;
      }
      (P.floors || []).forEach((f) => box(g, f.r[0] + f.r[2] / 2, f.r[1] + f.r[3] / 2, -2, f.r[2], f.r[3], 2, FLOOR3D[f.kind || "wood"]));
      (P.walls || []).forEach((w) => {
        const t = w.t || 12, [ax, ay] = w.a, [bx, by] = w.b, len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len, ang = Math.atan2(uy, ux);
        const piece = (s, e, y0, y1) => {
          if (e - s <= 0 || y1 - y0 <= 0) return;
          const s2 = s === 0 ? -t / 2 : s, e2 = e === len ? len + t / 2 : e;
          const m = new THREE.Mesh(new THREE.BoxGeometry(e2 - s2, y1 - y0, t), mat("#f3f2ee"));
          m.position.set(ax + ux * (s2 + e2) / 2, y0 + (y1 - y0) / 2, ay + uy * (s2 + e2) / 2); m.rotation.y = -ang; m.castShadow = true; m.receiveShadow = true; g.add(m);
        };
        let cur = 0;
        (w.o || []).slice().sort((p, q) => p.s - q.s).forEach((o) => {
          piece(cur, o.s, 0, H); cur = o.e;
          if (o.k === "win") {
            piece(o.s, o.e, 0, o.sill ?? 90); piece(o.s, o.e, o.head ?? 215, H);
            const sill = o.sill ?? 90, head = o.head ?? 215;
            const gl = box(g, ax + ux * (o.s + o.e) / 2, ay + uy * (o.s + o.e) / 2, sill, o.e - o.s, 3, head - sill, o.frost ? "#e9d6cf" : "#9fd0ea", { transparent: true, opacity: o.frost ? 0.7 : 0.28, roughness: 0.1 });
            gl.rotation.y = -ang; gl.castShadow = false;
          } else if (o.k === "door") piece(o.s, o.e, 210, H);
        });
        piece(cur, len, 0, H);
      });
      (P.fixtures || []).forEach((f) => {
        const [x, y, w, d] = f.r;
        if (f.glass) { box(g, x + w / 2, y + d / 2, 0, w, d, 2, "#7c868c"); box(g, x + w / 2, y + 1, 0, w, 2, 195, "#cfe9e0", { transparent: true, opacity: 0.35 }); }
        else box(g, x + w / 2, y + d / 2, 0, w, d, f.h ?? 85, f.color || "#e9e6df");
      });
      (P.cabinets || []).forEach((c) => box(g, c.r[0] + c.r[2] / 2, c.r[1] + c.r[3] / 2, c.z ?? 150, c.r[2], c.r[3], c.h ?? 70, c.color || "#d6bf9b"));
    }
    const FAB = "#8996a0", WOOD = "#a9805a", LWOOD = "#d6bf9b", WHITE = "#f1f0ec", DARK = "#30363b", LINEN = "#e6e0d5";
    function parts(type, w, d) {
      const Pp = [], b = (x, y, z, ww, dd, h, c, o) => Pp.push({ x, y, z, w: ww, d: dd, h, c, o });
      const hw = w / 2, hd = d / 2, legs = (z, ins = 4, c = WOOD) => { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => b(i * (hw - ins), j * (hd - ins), 0, 4, 4, z, c)); };
      switch (type) {
        case "bed-king": case "bed-queen": case "bed-double": case "bed-single": {
          b(0, 0, 0, w, d, 30, LWOOD); b(0, 6, 30, w - 6, d - 16, 20, WHITE); b(0, -hd + 4, 0, w, 8, 100, LWOOD);
          const n = w > 110 ? 2 : 1, pw = (w - 12 - (n - 1) * 6) / n;
          for (let i = 0; i < n; i++) b(-hw + 6 + pw / 2 + i * (pw + 6), -hd + 28, 50, pw, 30, 10, LINEN);
          b(0, d * 0.15, 50, w - 2, d * 0.62, 4, "#7f97a6"); break;
        }
        case "sofa3": case "sofa2": case "sofabed": case "armchair": {
          const c = type === "armchair" ? "#b98d6b" : FAB;
          b(0, 0, 0, w, d, 42, c); b(0, -hd + 10, 42, w, 20, 40, c); b(-hw + 9, 5, 42, 18, d - 10, 18, c); b(hw - 9, 5, 42, 18, d - 10, 18, c); break;
        }
        case "sectional": { const a = Math.min(90, d / 2); b(0, -hd + a / 2, 0, w, a, 42, FAB); b(hw - a / 2, a / 2, 0, a, d - a, 42, FAB); b(0, -hd + 10, 42, w, 20, 40, FAB); b(hw - 10, a / 2, 42, 20, d - a, 40, FAB); break; }
        case "coffee": b(0, 0, 36, w, d, 5, WOOD); legs(36); break;
        case "tv": b(0, 0, 0, w, d, 45, LWOOD); b(0, -hd + 10, 52, w * 0.75, 4, 62, DARK); b(0, -hd + 10, 45, 20, 10, 7, DARK); break;
        case "dining4": case "dining6": case "desk": b(0, 0, 72, w, d, 4, type === "desk" ? WHITE : WOOD); legs(72, 4, type === "desk" ? DARK : WOOD); break;
        case "round": Pp.push({ cyl: 1, x: 0, y: 0, z: 72, r: hw, h: 4, c: WOOD }); Pp.push({ cyl: 1, x: 0, y: 0, z: 0, r: 6, h: 72, c: WOOD }); break;
        case "chair": b(0, 4, 42, w, d - 8, 5, WOOD); b(0, -hd + 3, 47, w, 5, 40, WOOD); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => b(i * (hw - 3), 4 + j * (hd - 7), 0, 3, 3, 42, WOOD)); break;
        case "officechair": Pp.push({ cyl: 1, x: 0, y: 4, z: 45, r: hw - 6, h: 8, c: DARK }); b(0, -hd + 6, 53, w - 14, 6, 45, DARK); Pp.push({ cyl: 1, x: 0, y: 4, z: 0, r: 3, h: 45, c: "#888" }); break;
        case "wardrobe": b(0, 0, 0, w, d, 200, LWOOD); break;
        case "bookshelf": b(0, 0, 0, w, d, 180, WOOD); for (let i = 1; i < 5; i++) b(0, 1, i * 36 - 6, w - 6, d - 4, 14, ["#c45a3c", "#3f6b7d", "#d6b45a", "#6c7b4f"][i - 1]); break;
        case "nightstand": b(0, 0, 0, w, d, 50, LWOOD); Pp.push({ cyl: 1, x: 0, y: 0, z: 50, r: 6, h: 30, c: "#efe6d2" }); break;
        case "dresser": b(0, 0, 0, w, d, 80, LWOOD); break;
        case "shoe": b(0, 0, 0, w, d, 100, LWOOD); break;
        case "bench": b(0, 0, 0, w, d, 45, WOOD); break;
        case "washer": b(0, 0, 0, w, d, 85, WHITE); break;
        case "rug": b(0, 0, 0, w, d, 1, "#c9b7a4"); break;
        case "plant": Pp.push({ cyl: 1, x: 0, y: 0, z: 0, r: hw * 0.55, h: 35, c: "#c6b29a" }); Pp.push({ sph: 1, x: 0, y: 0, z: 75, r: hw * 0.75, c: "#4f7d52" }); break;
        case "lamp": Pp.push({ cyl: 1, x: 0, y: 0, z: 0, r: 12, h: 3, c: DARK }); Pp.push({ cyl: 1, x: 0, y: 0, z: 0, r: 1.5, h: 150, c: DARK }); Pp.push({ cyl: 1, x: 0, y: 0, z: 140, r: hw * 0.5, h: 28, c: "#f3e6c8" }); break;
        default: b(0, 0, 0, w, d, 75, LWOOD);
      }
      return Pp;
    }
    function build3dFurniture() {
      if (!R3) return;
      const g = R3.furn; while (g.children.length) g.remove(g.children[0]);
      items.forEach((it) => {
        const grp = new THREE.Group(); grp.position.set(it.x, 0, it.y); grp.rotation.y = -(it.rot || 0) * Math.PI / 180;
        parts(it.type, it.w, it.d).forEach((p) => {
          let m;
          if (p.cyl) { m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, p.h, 24), mat(p.c)); m.position.set(p.x, p.z + p.h / 2, p.y); }
          else if (p.sph) { m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 20, 14), mat(p.c)); m.position.set(p.x, p.z, p.y); }
          else { m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), mat(p.c)); m.position.set(p.x, p.z + p.h / 2, p.y); }
          m.castShadow = true; m.receiveShadow = true; grp.add(m);
        });
        g.add(grp);
      });
    }

    // ----- Start -----
    function start() { fit(); applyView(); draw(); }
    if (!P && apt.floorPlan) {
      const im = new Image();
      im.onload = () => { imgSize = { w: im.naturalWidth, h: im.naturalHeight }; start(); };
      im.onerror = () => { $(".plan-empty").hidden = false; $(".plan-empty").textContent = "Couldn't load the floor plan image."; };
      im.src = apt.floorPlan;
    } else start();
  }

  window.Planner = { mount, renderStatic, itemsOf, backdropOf, calibCm, loadSaved, storeSaved, CATALOGUE };
})();
