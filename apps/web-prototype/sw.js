/**
 * Service worker (brief §72, docs/18-publicacion.md): la app funciona sin conexión.
 * - Código de la app (HTML, CSS, JS): red primero y copia en caché como respaldo, para que
 *   cada despliegue llegue enseguida y sin conexión se use la última versión descargada.
 * - Stockfish, piezas e imágenes: caché primero (cambian muy poco y pesan más).
 * Al instalarse descarga lo necesario para jugar, analizar, hacer lecciones y puzzles offline.
 */
const VERSION = 'kavalo-v1';
const APP = new URL('./', self.location).href;
const ROOT = new URL('../../', self.location).href;
const PACKAGES = ['chess-core', 'tactics', 'bots', 'pedagogy', 'content', 'coach', 'engine', 'dna', 'training'];

const PRECACHE = [
  APP, `${APP}index.html`, `${APP}styles.css`, `${APP}manifest.webmanifest`, `${APP}dist/main.js`,
  ...PACKAGES.map((p) => `${ROOT}packages/${p}/dist/index.js`),
  `${ROOT}vendor/stockfish/stockfish-19-lite-single.js`, `${ROOT}vendor/stockfish/stockfish-19-lite-single.wasm`,
  `${ROOT}assets/brand/favicon.svg`, `${ROOT}assets/brand/logo.svg`,
  ...['K', 'Q', 'R', 'B', 'N', 'P'].flatMap((p) => ['w', 'b'].map((c) => `${ROOT}assets/pieces/royal-modern/${c}${p}.svg`)),
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Una ruta que falle no impide instalar el resto (se cacheará al usarse).
    await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

const isStatic = (url) => /\/(vendor|assets)\//.test(url.pathname) || /\.(wasm|svg|png|woff2?)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (isStatic(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    })());
    return;
  }
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    } catch {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') return (await caches.match(`${APP}index.html`)) ?? Response.error();
      return Response.error();
    }
  })());
});
