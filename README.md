# Apartment Hunt

A small web app for comparing apartments: listing photos, a to-scale floor plan you can furnish, and a side-by-side comparison.

## Viewing it

Open `index.html` in a browser. No build step or server is needed.

## Adding or ruling out apartments

Everything about the apartments lives in [`apartments.js`](apartments.js):

- Set `enabled: false` to rule an apartment out. It's hidden unless you tick "Show ruled out".
- Each apartment's photos and floor plan go in `apartments/<id>/`.

The easiest way to add one is to send Claude the listing link. It collects the photos and floor plan and adds the entry.

## Floor plans

Each apartment's floor plan is traced into walls, doors, windows and fittings (`apartments/<id>/plan.js`, in cm), which gives a to-scale 2D plan and a 3D view. On the **Floor plan** tab:

- **Layouts** load a ready-made furniture arrangement; **Add furniture** drops a piece in the middle of the view; **Custom size** adds your own piece.
- Drag pieces to move them. With a piece selected you can type its width/depth, and R rotates it (Shift+R by 15°), arrows nudge it, Delete removes it. Overlapping pieces are outlined in red.
- **Measure** gives the real distance between two clicks. **Listing plan overlay** shows the original plan under the tracing so you can check it.
- **3D** shows the same layout in 3D: drag to orbit, scroll to zoom.

Apartments without a traced plan fall back to the listing image: click **Set scale**, then both ends of a wall whose length you know.

Layouts save in your browser. Use **Export** to save them into the repo (send the file to Claude) or move them to another device with **Import**.

## How the data is gathered

`tools/fetch_assets.py` runs as a GitHub Action (`.github/workflows/fetch-assets.yml`) whenever `apartments.js` or `tools/` changes. It downloads listing photos into `apartments/<id>/` and crawls estate pages for official floor plans into `candidates/`. `tools/trace_plans.py` turns traced pixel coordinates into `plan.js` files.
