// Furniture library. Sizes are width x depth in inches.
// Add your own pieces here (e.g. your actual couch) so they show up in the app.

window.FURNITURE = [
  { group: "Bedroom", name: "King bed", w: 76, d: 80, color: "#9db4d6" },
  { group: "Bedroom", name: "Queen bed", w: 60, d: 80, color: "#9db4d6" },
  { group: "Bedroom", name: "Full bed", w: 54, d: 75, color: "#9db4d6" },
  { group: "Bedroom", name: "Twin bed", w: 38, d: 75, color: "#9db4d6" },
  { group: "Bedroom", name: "Nightstand", w: 20, d: 16, color: "#c9a77c" },
  { group: "Bedroom", name: "Dresser", w: 60, d: 18, color: "#c9a77c" },
  { group: "Bedroom", name: "Wardrobe", w: 40, d: 24, color: "#c9a77c" },

  { group: "Living", name: "3-seat sofa", w: 84, d: 36, color: "#a7c4a0" },
  { group: "Living", name: "Loveseat", w: 60, d: 34, color: "#a7c4a0" },
  { group: "Living", name: "Sectional (L)", w: 110, d: 84, color: "#a7c4a0", shape: "L" },
  { group: "Living", name: "Armchair", w: 32, d: 34, color: "#a7c4a0" },
  { group: "Living", name: "Coffee table", w: 48, d: 24, color: "#c9a77c" },
  { group: "Living", name: "TV stand", w: 60, d: 18, color: "#c9a77c" },
  { group: "Living", name: "Rug 8x10", w: 120, d: 96, color: "#e6d3b3", rug: true },
  { group: "Living", name: "Rug 5x8", w: 96, d: 60, color: "#e6d3b3", rug: true },
  { group: "Living", name: "Bookshelf", w: 32, d: 12, color: "#c9a77c" },

  { group: "Dining", name: "Dining table (4)", w: 48, d: 30, color: "#d4b48c" },
  { group: "Dining", name: "Dining table (6)", w: 72, d: 36, color: "#d4b48c" },
  { group: "Dining", name: "Round table 42\"", w: 42, d: 42, color: "#d4b48c", round: true },
  { group: "Dining", name: "Chair", w: 18, d: 20, color: "#d4b48c" },
  { group: "Dining", name: "Bar stool", w: 16, d: 16, color: "#d4b48c", round: true },

  { group: "Office", name: "Desk", w: 48, d: 24, color: "#b9a6d1" },
  { group: "Office", name: "Large desk", w: 60, d: 30, color: "#b9a6d1" },
  { group: "Office", name: "Office chair", w: 26, d: 26, color: "#b9a6d1", round: true },

  { group: "Other", name: "Plant", w: 18, d: 18, color: "#7fbf7f", round: true },
  { group: "Other", name: "Floor lamp", w: 14, d: 14, color: "#e8d27a", round: true },
  { group: "Other", name: "Washer/dryer", w: 27, d: 30, color: "#cccccc" },
  { group: "Other", name: "Bike", w: 70, d: 24, color: "#cccccc" }
];
