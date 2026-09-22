# Reformanda

A local-first study tool for memorizing historic creeds and catechisms. The app includes six catechisms—Westminster Shorter, Westminster Larger, Heidelberg, the 1695 Baptist Catechism, Keach's Catechism, and the Catechism for Young Children—with selectable study pools, four practice modes, progress analytics, and JSON backup/restore.

## Run locally

From the repository root:

```powershell
python -m http.server 8000 --directory docs
```

Then open <http://localhost:8000>. A local server is required because the app loads the catechism JSON with `fetch()`.

## Install and use offline

Reformanda is a Progressive Web App. After visiting the deployed HTTPS site once, use **Install app** in Chrome on Android (or the install card under **Data**). The interface, all six catechisms, charts, and fonts are cached for offline study. Progress remains in IndexedDB on that device; use JSON export when moving it elsewhere.

## Deployment

The site is entirely static and lives in `docs/`, matching the existing GitHub Pages workflow. GitHub Pages supplies the HTTPS required for installation and service workers. Progress is stored per browser in IndexedDB and never sent to a server.
