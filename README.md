# Confessio

A local-first study tool for memorizing historic creeds and catechisms. The app includes six catechisms—Westminster Shorter, Westminster Larger, Heidelberg, the 1695 Baptist Catechism, Keach's Catechism, and the Catechism for Young Children—with selectable study pools, four practice modes, progress analytics, and JSON backup/restore.

## Run locally

From the repository root:

```powershell
python -m http.server 8000 --directory docs
```

Then open <http://localhost:8000>. A local server is required because the app loads the catechism JSON with `fetch()`.

## Deployment

The site is entirely static and lives in `docs/`, matching the existing GitHub Pages workflow. Progress is stored per browser in IndexedDB and never sent to a server.
