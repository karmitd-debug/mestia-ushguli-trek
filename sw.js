const name = 'svaneti-journal-v8';
const shell = ['./', 'index.html', 'app.js', 'app.js?v=route-guide-8', 'style.css', 'route.js', 'tracks.js', 'map.js', 'photos.js', 'weather.js', 'media.js', 'manifest.webmanifest', 'icon.svg', 'gpx/day-1-mestia-zhabeshi.gpx', 'gpx/day-2-zhabeshi-adishi.gpx', 'gpx/day-3-adishi-iprali.gpx', 'gpx/day-4-iprali-ushguli.gpx'];
const media = ['mestia','zhabeshi','adishi','glacier','ushguli'];

async function cacheShell() {
  const cache = await caches.open(name);
  await cache.addAll(shell);
  return cache;
}
self.addEventListener('install', event => event.waitUntil(cacheShell().then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('svaneti-journal-') && key !== name) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data !== 'cache-trip') return;
  event.waitUntil((async () => {
    try {
      const cache = await cacheShell();
      const results = await Promise.allSettled(media.map(async key => {
        const path = `media/${key}`;
        if (!await cache.match(path)) await cache.add(new Request(path, { signal: AbortSignal.timeout(12000) }));
      }));
      event.ports[0].postMessage({ ok: true, images: results.filter(r => r.status === 'fulfilled').length });
    } catch { event.ports[0].postMessage({ ok: false }); }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const scope = new URL(self.registration.scope);
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  if (request.mode === 'navigate' && ['', 'index.html'].includes(path)) {
    event.respondWith(fetch(request).catch(async () => (await caches.open(name)).match('./')));
  } else if (shell.includes(path) || /^media\/(mestia|zhabeshi|adishi|glacier|ushguli)$/.test(path)) {
    event.respondWith((async () => {
      const cache = await caches.open(name);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
