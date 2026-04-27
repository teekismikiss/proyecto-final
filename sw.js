const CACHE_NAME = "bdtracker-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./graficos.html",
  "./listado.html",
  "./nuevabd.html",
  "./nuevatienda.html",
  "./tiendas.html",
  "./style.css",
  "./app.js",
  "./bdColeccion.js",
  "./data/bdColeccion.json",
  "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/chart.js@4"
];

/* ── Install: cache all assets ─────────────────── */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ────────────────── */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: cache-first, fallback to network ───── */
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((response) => {
        // Cache new successful GET requests
        if (e.request.method === "GET" && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation requests
      if (e.request.mode === "navigate") {
        return caches.match("./index.html");
      }
    })
  );
});
