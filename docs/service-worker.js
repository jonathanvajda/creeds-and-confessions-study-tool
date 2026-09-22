const CACHE_NAME = 'reformanda-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './styles/app.css',
  './styles/documents.css',
  './manifest.webmanifest',
  './icons/reformanda-32.png',
  './icons/reformanda-192.png',
  './icons/reformanda-512.png',
  './icons/reformanda-maskable-512.png',
  './data/westminster-shorter-catechism_pca.json',
  './data/westminster_larger_catechism.json',
  './data/heidelberg_catechism.json',
  './data/1695_baptist_catechism.json',
  './data/keachs_catechism.json',
  './data/catechism_for_young_children.json'
];
const CHART_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Caslon+Text:wght@400;700&display=swap';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await Promise.allSettled([
      (async () => {
        const response = await fetch(CHART_URL);
        await cache.put(CHART_URL, response);
      })(),
      (async () => {
        const response = await fetch(FONT_CSS_URL);
        await cache.put(FONT_CSS_URL, response.clone());
        const fontUrls = [...(await response.text()).matchAll(/url\((https:[^)]+)\)/g)].map(match => match[1]);
        await Promise.all(fontUrls.map(async url => cache.put(url, await fetch(url))));
      })()
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        return (await caches.match(event.request)) || caches.match('./index.html');
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
