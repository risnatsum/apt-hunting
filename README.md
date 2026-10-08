# Apartment Hunt

A small web app for comparing apartments: listing photos, a to-scale floor plan you can furnish, and a side-by-side comparison.

## Viewing it

Open `index.html` in a browser. No build step or server is needed.

## Adding or ruling out apartments

Everything about the apartments lives in [`apartments.js`](apartments.js):

- Set `enabled: false` to rule an apartment out. It's hidden unless you tick "Show ruled out".
- Each apartment's photos and floor plan go in `apartments/<id>/`.

The easiest way to add one is to send Claude the listing link. It collects the photos and floor plan and adds the entry.

## Floor plan tools

1. **Set scale:** click both ends of a wall or dimension line whose length is printed on the plan, then type that length (`12'6"`, `150in`, `3.8m` and `3800mm` all work). Everything after that is in real units.
2. **Measure:** click two points to get the real distance.
3. **Add furniture** from the library, or add a custom piece with your own measurements. Drag pieces to move them. With a piece selected, R rotates it by 90° (Shift+R by 15°), the arrow keys nudge it, and Delete removes it.

Furniture layouts and scales save in your browser automatically. Use **Export** to save them into the repo (send the file to Claude, or paste it into `apartments.js`) or to move them to another device with **Import**.

To add your own furniture to the library, edit [`furniture.js`](furniture.js). Sizes are in inches.
