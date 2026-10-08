// Ming Sun Building, 1 bedroom, 466 sq ft saleable.
// Traced from the agent's floor plan (floorplan.jpg). Units are cm, north up.
window.PLANS = window.PLANS || {};
window.PLANS["ming-sun-building"] = {
  source: "Traced from the agent's floor plan (466 sq ft saleable). Expect sizes to be within 10-15 cm; measure the bedroom before buying a bed or wardrobe.",
  bounds: [-20, -20, 967, 578],
  ceiling: 250,
  // Where floorplan.jpg sits in plan coordinates, for the overlay toggle.
  reference: { x: -49.5, y: -93.6, w: 1081, h: 771 },
  floors: [
    { r: [0, 253, 947, 247], kind: "wood" },
    { r: [483, 179, 282, 76], kind: "wood" },
    { r: [0, 498, 153, 60], kind: "wood" },
    { r: [0, 0, 294, 253], kind: "wood" },
    { r: [294, 0, 189, 253], kind: "bath" },
    { r: [765, 27, 182, 305], kind: "kitchen" },
  ],
  rooms: [
    { n: "Living", x: 610, y: 335, dim: "9.3 × 2.4 m" },
    { n: "Bedroom", x: 243, y: 150, dim: "2.9 × 2.5 m" },
    { n: "Bath", x: 412, y: 128, dim: "1.8 × 2.4 m" },
    { n: "Kitchen", x: 825, y: 180, dim: "1.7 × 2.9 m" },
    { n: "Entry", x: 845, y: 392 },
  ],
  // a/b: wall end points; t: thickness; o: openings measured along the wall from a.
  // k: win | door | open; side: which way a door swings; h: hinge at start (s) or end (e).
  walls: [
    { a: [0, 0], b: [483, 0], t: 15 },
    { a: [483, 0], b: [483, 253], t: 12, o: [{ s: 37, e: 97, k: "win", frost: 1 }] },
    { a: [483, 179], b: [765, 179], t: 15, o: [{ s: 44, e: 146, k: "win" }] },
    { a: [765, 27], b: [765, 332], t: 12, o: [{ s: 7, e: 87, k: "win" }, { s: 223, e: 292, k: "door", side: -1, h: "e" }] },
    { a: [765, 27], b: [947, 27], t: 15 },
    { a: [947, 27], b: [947, 500], t: 15 },
    { a: [947, 500], b: [153, 500], t: 15, o: [{ s: 32, e: 105, k: "door", side: 1, h: "s" }] },
    { a: [153, 500], b: [153, 558], t: 15 },
    { a: [153, 558], b: [0, 558], t: 15 },
    { a: [0, 558], b: [0, 0], t: 15, o: [{ s: 10, e: 295, k: "win" }, { s: 315, e: 548, k: "win" }] },
    { a: [0, 253], b: [294, 253], t: 12, o: [{ s: 213, e: 282, k: "door", side: -1, h: "e" }] },
    { a: [294, 0], b: [294, 253], t: 12, o: [{ s: 66, e: 131, k: "door", side: -1, h: "e" }] },
    { a: [294, 253], b: [483, 253], t: 12 },
    { a: [765, 332], b: [947, 332], t: 12 },
  ],
  fixtures: [
    { r: [400, 8, 78, 24], h: 250, color: "#9aa3a8", label: "duct" },
    { r: [302, 8, 80, 50], h: 85, color: "#d9c3a0", label: "Basin", kind: "sink" },
    { r: [418, 36, 44, 60], h: 40, color: "#f7f7f5", label: "WC", round: 1 },
    { r: [300, 165, 176, 82], label: "Shower", glass: 1 },
    { r: [772, 34, 110, 60], h: 90, label: "Hob", kind: "hob" },
    { r: [882, 34, 58, 190], h: 90, label: "Sink" },
    { r: [878, 240, 62, 62], h: 170, color: "#b9bec2", label: "Fridge" },
  ],
  cabinets: [{ r: [772, 34, 110, 35] }, { r: [905, 34, 35, 190] }],
  marks: [{ x: 14, y: 400, l: "AC" }, { x: 150, y: 16, l: "AC" }],
  notes: [{ x: -30, y: 280, text: "harbour / skyline view", rot: -90 }, { x: 878, y: 528, text: "front door" }],
  // Furniture presets: [type, x, y, w, d, rotation]
  defaultPreset: "dining",
  presetNames: { dining: "Lounge + dining table", study: "Lounge + work desk", alcove: "Big wardrobe in the alcove", empty: "Empty flat" },
  presets: {
    dining: [
      ["rug", 112, 410, 200, 140], ["sofa3", 112, 301, 210, 85], ["tv", 77, 538, 130, 30, 180], ["coffee", 112, 405, 100, 50],
      ["plant", 245, 285, 40, 40], ["lamp", 190, 480, 40, 40], ["shoe", 925, 380, 80, 30, 90],
      ["bed-queen", 102, 127, 152, 190, 270], ["nightstand", 27, 25, 35, 40, 270], ["nightstand", 27, 229, 35, 40, 270], ["wardrobe", 244, 35, 90, 55],
      ["dining4", 420, 385, 120, 75], ["chair", 390, 335, 45, 50], ["chair", 450, 335, 45, 50], ["chair", 390, 435, 45, 50, 180], ["chair", 450, 435, 45, 50, 180],
      ["dresser", 570, 206, 100, 45],
    ],
    study: [
      ["rug", 112, 410, 200, 140], ["sofa3", 112, 301, 210, 85], ["tv", 77, 538, 130, 30, 180], ["coffee", 112, 405, 100, 50],
      ["plant", 245, 285, 40, 40], ["lamp", 190, 480, 40, 40], ["shoe", 925, 380, 80, 30, 90],
      ["bed-queen", 102, 127, 152, 190, 270], ["nightstand", 27, 25, 35, 40, 270], ["nightstand", 27, 229, 35, 40, 270], ["wardrobe", 244, 35, 90, 55],
      ["desk", 578, 214, 120, 60], ["officechair", 578, 272, 60, 60, 180],
      ["round", 420, 390, 90, 90], ["chair", 420, 335, 45, 50], ["chair", 420, 445, 45, 50, 180], ["bookshelf", 700, 199, 80, 30],
    ],
    alcove: [
      ["rug", 112, 410, 200, 140], ["sofa3", 112, 301, 210, 85], ["tv", 77, 538, 130, 30, 180], ["coffee", 112, 405, 100, 50],
      ["shoe", 925, 380, 80, 30, 90],
      ["bed-queen", 102, 127, 152, 190, 270], ["nightstand", 27, 25, 35, 40, 270], ["nightstand", 27, 229, 35, 40, 270], ["dresser", 244, 30, 90, 45],
      ["wardrobe", 700, 214, 120, 60], ["dining4", 420, 385, 120, 75], ["chair", 390, 335, 45, 50], ["chair", 450, 335, 45, 50],
    ],
    empty: [],
  },
};
