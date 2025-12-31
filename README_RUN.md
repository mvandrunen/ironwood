# Run Ironwood Crossing (local)

This project uses ES modules (`<script type="module">`). Most browsers will **not** run modules correctly if you open `index.html` directly via `file://`.

## Option A (recommended): Python web server

From the project folder (the one containing `index.html`):

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000/`

## Option B: Node server

```bash
npx serve .
```

## If you still see a blank canvas

Open DevTools Console and look for a red error (missing import path, blocked module, etc.).
