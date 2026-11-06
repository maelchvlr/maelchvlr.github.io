# maelchvlr.github.io

Portfolio of Maël Chevalier. Plain HTML, CSS and JS with no build step, served by GitHub Pages.

- `index.html`: all the content
- `style.css`: palette and layout
- `main.js`: hero particles, clips, reel, copy button
- `media/`: short muted loops with their posters

To preview locally:

```bash
python -m http.server 8770
```

GitHub Pages lets browsers cache files for 10 minutes. When `main.js` or `style.css` changes, raise the `?v=` number on their links in `index.html` so a new page never runs with old files.
