// The apartments list. Edit this file to add apartments or rule them out.
//
//   enabled: true   -> shown in the app
//   enabled: false  -> ruled out (hidden unless "Show ruled out" is ticked)
//
// Files for each apartment live in apartments/<id>/.
// planFile: the traced plan (walls, doors, windows) used for the 2D/3D view.
// calibration: for apartments without a traced plan, two points on the floor
// plan image (in image pixels) and the real distance between them in cm. Set it
// from the app with "Set scale", then Export so it is saved for everyone.
// layout: saved furniture (also exported from the app).
// allIn: rent plus any fees not included, per month (used to rank in Compare).
// transport: nearest MTR and bus, walk minutes, and estimated door-to-door
// public transport minutes to the two places in COMMUTE_TO below. Compare turns
// these into a score (rubric shown under the table).
// photoReview: 1-5 scores with a note, judged from the listing photos.

// Where the commute times are measured to. "key" matches transport.<key>.
window.COMMUTE_TO = [
  { key: "work", label: "Work: The Landmark, Central", place: "The Landmark, 15 Queen's Road Central, Hong Kong", weight: 0.4 },
  { key: "parents", label: "Parents: Flora Garden", place: "Flora Garden, 7 Chun Fai Road, Jardine's Lookout, Hong Kong", weight: 0.3 },
];

window.CURRENCY = "HK$";

window.APARTMENTS = [
  {
    id: "ming-sun-building",
    enabled: true,
    name: "Ming Sun Building",
    building: "Ming Sun Building",
    address: "90-96 Tung Lo Wan Road, Tai Hang / Tin Hau",
    url: "https://www.28hse.com/en/rent/apartment/property-4015019",
    rent: 22000,
    fees: "Management HK$1,875/mo; rates not included",
    allIn: 23875,
    beds: 1,
    baths: 1,
    sqft: 466,
    floor: "",
    available: "",
    transport: {
      mtr: "Tin Hau", mtrWalk: 6,
      bus: "Buses and minibuses on Tung Lo Wan Rd / Causeway Rd", busWalk: 1,
      work: { min: 23, how: "Walk to Tin Hau, Island line 5 stops to Central, walk to the Landmark" },
      parents: { min: 15, how: "Bus or minibus up Tai Hang Rd; taxi about 7 min" }
    },
    photoReview: {
      light: [4, "Large windows in living room and bedroom, bright white finish"],
      kitchen: [3, "Separate but compact; 2-burner gas hob, washer, full fridge, little counter"],
      bathroom: [3, "Small; frosted-glass shower partition, glass basin"],
      condition: [4, "Fresh paint and new floors in a rebuilt building; window AC units"],
      view: [4, "Open view over Queen's College sports ground towards the harbour (low floor)"],
      storage: [2, "No built-in wardrobes or cabinets visible"]
    },
    pros: "Fully rebuilt building, premium renovation; separate kitchen; furnished with appliances incl. washer; pet friendly; walk to Tin Hau MTR",
    cons: "Rates on top of rent",
    notes: "Listed by Omura Property (28hse #4015019). Long-term lease preferred.",
    photos: [
      "apartments/ming-sun-building/photo-01.jpg",
      "apartments/ming-sun-building/photo-02.jpg",
      "apartments/ming-sun-building/photo-03.jpg",
      "apartments/ming-sun-building/photo-04.jpg",
      "apartments/ming-sun-building/photo-05.jpg",
      "apartments/ming-sun-building/photo-06.jpg",
      "apartments/ming-sun-building/photo-07.jpg",
      "apartments/ming-sun-building/photo-08.jpg",
      "apartments/ming-sun-building/photo-09.jpg",
      "apartments/ming-sun-building/photo-10.jpg",
      "apartments/ming-sun-building/photo-11.jpg",
      "apartments/ming-sun-building/photo-12.jpg",
      "apartments/ming-sun-building/photo-13.jpg",
      "apartments/ming-sun-building/photo-14.jpg",
      "apartments/ming-sun-building/photo-15.jpg",
      "apartments/ming-sun-building/photo-16.jpg",
      "apartments/ming-sun-building/photo-17.jpg",
      "apartments/ming-sun-building/photo-18.jpg",
      "apartments/ming-sun-building/photo-19.jpg",
      "apartments/ming-sun-building/photo-20.jpg",
      "apartments/ming-sun-building/photo-21.jpg",
      "apartments/ming-sun-building/photo-22.jpg",
      "apartments/ming-sun-building/photo-23.jpg"
    ],
    floorPlan: "apartments/ming-sun-building/floorplan.jpg",
    planFile: "apartments/ming-sun-building/plan.js",
    layout: []
  },
  {
    id: "ying-wa-court",
    enabled: true,
    name: "Ying Wa Court",
    building: "Ying Wa Court",
    address: "12 Ying Wa Terrace, Mid-Levels West",
    url: "https://www.28hse.com/en/rent/apartment/property-4036766",
    rent: 25000,
    fees: "Management fee not stated",
    beds: 2,
    baths: 1,
    sqft: 466,
    grossSqft: 728,
    floor: "",
    available: "Ready now (key with agent)",
    transport: {
      mtr: "Sai Ying Pun", mtrWalk: 6,
      bus: "Bonham Rd buses (e.g. 13, 23, 40M) and minibuses", busWalk: 3,
      work: { min: 18, how: "Sai Ying Pun to Central 2 stops, walk to the Landmark" },
      parents: { min: 40, how: "MTR to Causeway Bay, then bus or taxi up Tai Hang Rd" }
    },
    photoReview: {
      light: [3, "Normal-size windows; buildings close opposite"],
      kitchen: [4, "Renovated galley kitchen with gas hob, washer, door to utility balcony"],
      bathroom: [4, "Newly renovated, glass shower, modern fittings"],
      condition: [5, "Freshly renovated throughout, new floors and cabinetry"],
      view: [2, "Mostly neighbouring buildings"],
      storage: [4, "Wall of built-in display and low cabinets in living room"]
    },
    pros: "Newly renovated; close to MTR",
    cons: "",
    notes: "Richfield Property (28hse #4036766). Plan is Flat A from the building floor plan (A and B are mirror images).",
    photos: [
      "apartments/ying-wa-court/photo-01.jpg",
      "apartments/ying-wa-court/photo-02.jpg",
      "apartments/ying-wa-court/photo-03.jpg",
      "apartments/ying-wa-court/photo-04.jpg",
      "apartments/ying-wa-court/photo-05.jpg",
      "apartments/ying-wa-court/photo-06.jpg",
      "apartments/ying-wa-court/photo-07.jpg"
    ],
    floorPlan: "apartments/ying-wa-court/floorplan.jpg",
    planFile: "apartments/ying-wa-court/plan.js",
    layout: []
  },
  {
    id: "beaudry-tower",
    enabled: true,
    name: "Beaudry Tower",
    building: "Beaudry Tower (1989, 32 floors)",
    address: "38 Bonham Road, Mid-Levels West",
    url: "https://www.28hse.com/en/rent/apartment/property-4042863",
    rent: 25000,
    fees: "Management fee and rates included",
    allIn: 25000,
    beds: 1,
    baths: 1,
    sqft: 498,
    grossSqft: 686,
    floor: "Middle",
    available: "",
    transport: {
      mtr: "Sai Ying Pun", mtrWalk: 5,
      bus: "Bonham Rd bus stop at the building (13, 23, 40M and more)", busWalk: 1,
      work: { min: 17, how: "Sai Ying Pun to Central 2 stops, walk to the Landmark" },
      parents: { min: 37, how: "MTR to Causeway Bay, then bus or taxi up Tai Hang Rd" }
    },
    photoReview: {
      light: [5, "Corner bay window in living room, high floor, plenty of daylight"],
      kitchen: [4, "Full kitchen with granite counter, 3-burner gas hob, full-height fridge"],
      bathroom: [3, "Granite and glass shower, has a window, finishes dated"],
      condition: [3, "Well kept but 1989-era fittings and window AC units"],
      view: [5, "Open city view from a high floor"],
      storage: [5, "Built-in shelving wall, bedroom wardrobe and drawers, extra cabinets"]
    },
    pros: "Large bedroom with built-in wardrobe; open view; ~5 min walk to MTR",
    cons: "Older building (1989)",
    notes: "At Home Property (28hse #4042863). Plan is Flat A from the developer's brochure, the only 498 sq ft unit in the building.",
    photos: [
      "apartments/beaudry-tower/photo-01.jpg",
      "apartments/beaudry-tower/photo-02.jpg",
      "apartments/beaudry-tower/photo-03.jpg",
      "apartments/beaudry-tower/photo-04.jpg",
      "apartments/beaudry-tower/photo-05.jpg",
      "apartments/beaudry-tower/photo-06.jpg",
      "apartments/beaudry-tower/photo-07.jpg",
      "apartments/beaudry-tower/photo-08.jpg",
      "apartments/beaudry-tower/photo-09.jpg",
      "apartments/beaudry-tower/photo-10.jpg"
    ],
    floorPlan: "apartments/beaudry-tower/floorplan.jpg",
    planFile: "apartments/beaudry-tower/plan.js",
    layout: []
  },
  {
    id: "honor-villa",
    enabled: true,
    name: "Honor Villa",
    building: "Honor Villa (~26 yrs old)",
    address: "75 Caine Road, Mid-Levels West",
    url: "https://www.28hse.com/en/rent/apartment/property-4013550",
    rent: 28000,
    fees: "Management fee and rates included",
    allIn: 28000,
    beds: 2,
    baths: 1,
    sqft: 446,
    grossSqft: 685,
    floor: "Middle",
    available: "",
    transport: {
      mtr: "Central / Sai Ying Pun", mtrWalk: 13,
      bus: "Caine Rd buses (e.g. 13, 23, 40) and minibus 3/8 at the door", busWalk: 1,
      work: { min: 15, how: "Walk down via the Mid-Levels escalator (downhill in the morning) to the Landmark" },
      parents: { min: 40, how: "Walk to Central MTR, Island line to Causeway Bay, then bus or taxi" }
    },
    photoReview: {
      light: [3, "One window per room; building opposite"],
      kitchen: [3, "Compact; 2-burner gas hob, washer, full fridge, older cabinets"],
      bathroom: [4, "Bathtub with shower and a window; dated but clean"],
      condition: [3, "New laminate floors and fresh paint; older doors and AC"],
      view: [2, "Neighbouring residential towers"],
      storage: [4, "Large full-height sliding wardrobe in the bedroom"]
    },
    pros: "Large wardrobe; convenient location",
    cons: "~13 min walk to MTR; smallest of the four",
    notes: "28hse #4013550. Plan is Flat A from the developer's brochure, the only 446 sq ft unit in the building.",
    photos: [
      "apartments/honor-villa/photo-01.jpg",
      "apartments/honor-villa/photo-02.jpg",
      "apartments/honor-villa/photo-03.jpg",
      "apartments/honor-villa/photo-04.jpg",
      "apartments/honor-villa/photo-05.jpg",
      "apartments/honor-villa/photo-06.jpg"
    ],
    floorPlan: "apartments/honor-villa/floorplan.jpg",
    planFile: "apartments/honor-villa/plan.js",
    layout: []
  },
  {
    id: "example",
    enabled: false,
    name: "Example 1BR (demo)",
    address: "Not a real listing",
    url: "",
    rent: 2500,
    fees: "",
    beds: 1,
    baths: 1,
    sqft: 720,
    available: "",
    commute: "",
    pros: "Big living room",
    cons: "Small bath",
    notes: "Demo apartment so you can try the tools. Set enabled: false to hide it.",
    photos: [],
    floorPlan: "apartments/example/floorplan.svg",
    calibration: { x1: 60, y1: 30, x2: 660, y2: 30, inches: 360 },
    layout: []
  }
];
