// The apartments list. Edit this file to add apartments or rule them out.
//
//   enabled: true   -> shown in the app
//   enabled: false  -> ruled out (hidden unless "Show ruled out" is ticked)
//
// Files for each apartment live in apartments/<id>/.
// calibration: two points on the floor plan image (in image pixels) and the
// real distance between them in inches. Set it from the app with "Set scale",
// then use "Export" and paste the result here so it is saved for everyone.
// layout: saved furniture (also exported from the app).

window.APARTMENTS = [
  {
    id: "example",
    enabled: true,
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
