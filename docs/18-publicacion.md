# 18 · Publicación (Fase 12)

**Objetivo.** Poner Kavalo en manos de usuarios reales sin renunciar a la privacidad: una web
instalable (PWA) que funciona sin conexión, con copia en la nube opcional, despliegue
automático tras las pruebas y licencias en regla.

## 1. App instalable y sin conexión (brief §72)

| Archivo | Función |
|---|---|
| `apps/web-prototype/manifest.webmanifest` | nombre, iconos, colores, `display: standalone` |
| `apps/web-prototype/sw.js` | service worker: precarga la app, los paquetes, Stockfish y las piezas |
| `src/main.ts` | registra el service worker (se puede desactivar con `?nosw` para depurar) |

Estrategia de caché: el código (HTML/CSS/JS) va **red primero** con respaldo en caché, para que
cada despliegue llegue enseguida y sin conexión se use la última versión; Stockfish, piezas e
imágenes van **caché primero**. Sin conexión funcionan partidas contra los robots (1–10 con
Stockfish local), análisis, lecciones, puzzles, entrenamientos, aperturas, biblioteca e
historial. Las partidas jugadas offline se sincronizan al volver la conexión (evento `online`).
Probado en `tests/e2e/pwa.e2e.cjs`.

## 2. Despliegue

- `tools/build-site.mjs` copia solo lo publicable (sin fuentes ni tests): la app, el JS
  compilado de los paquetes, los recursos, Stockfish con `COPYING.txt`, `NOTICE.md` y
  `PRIVACY.md` (≈ 3,8 MB, de los que 1,8 MB son el motor).
- `.github/workflows/deploy.yml` publica en **GitHub Pages** al hacer push a `main` o a mano,
  solo si `npm test` y `npm run check` pasan. Pages sirve `.wasm` con el tipo correcto y HTTPS
  (necesario para el service worker).
- Probar el sitio publicado en local: `node tools/build-site.mjs _site && SERVE_ROOT=_site node tools/serve.mjs 5174`.
- Cualquier hosting estático sirve igual (Netlify, Cloudflare Pages, S3+CDN): solo hay que
  servir `application/wasm` para `.wasm` y `application/manifest+json` para el manifiesto.

## 3. Cuentas y sincronización (brief §72–73)

### 3.1 Servidor

`server/src/server.mjs`: Node sin dependencias (`node:http` + `node:sqlite`, Node ≥ 22.5),
esquema en `server/schema.sql`. Arranque: `npm run sync` (puerto 8787).

| Endpoint | Descripción |
|---|---|
| `POST /v1/accounts/guest` | cuenta de invitado → token |
| `POST /v1/accounts/email/start` / `verify` | código de 6 dígitos (10 min, 5 intentos) que convierte al invitado en cuenta con email sin perder el progreso |
| `POST /v1/accounts/oauth/google\|apple` | 501 hasta configurar el cliente OAuth (§3.3) |
| `GET/PUT /v1/profile` | perfil con control de versión optimista: `409` devuelve la copia del servidor |
| `GET /v1/export` | todos los datos de la cuenta |
| `DELETE /v1/account` | borra cuenta, tokens y perfil (cascada) |

Seguridad: tokens aleatorios de 256 bits guardados como SHA-256; email guardado solo como huella;
sin IP; comparación de códigos en tiempo constante; límite de 5 MB por petición; solo JSON;
CORS con lista de orígenes (`SYNC_ORIGINS`); 120 peticiones/minuto por IP; cabeceras
`no-store` y `nosniff`. Pruebas en `server/test/server.test.mjs` (flujo, conflictos, seguridad,
CORS, email, exportación y borrado).

### 3.2 Cliente y fusión

`state/sync.ts` (desactivado por defecto; se activa en Privacidad con consentimiento explícito
y, en modo niños, del tutor). Ante un conflicto, `state/merge.ts` fusiona sin perder nada:
unión de partidas (conservando el análisis más completo), errores, ejercicios, eventos, logros
(fecha más antigua), lecciones y puzzles resueltos; dominio con más evidencias; tarjeta de
repaso más avanzada; rating según el último registro; ajustes de la copia más reciente.
Pruebas: `apps/web-prototype/test/merge.test.mjs` y `tests/e2e/pwa.e2e.cjs`.

### 3.3 Pendiente antes de producción

- **Google y Apple**: registrar los clientes OAuth (IDs y secretos que solo puede crear el
  titular) y completar el intercambio de código en `/v1/accounts/oauth/:provider`.
- **Envío de emails**: conectar un proveedor en `sendCode` (hoy lo escribe en el registro, y en
  desarrollo lo devuelve con `SYNC_DEV=1`).
- **Escala**: el esquema es portable al PostgreSQL de docs/07-datos.md; SQLite basta para miles
  de usuarios en una sola máquina con copias de seguridad del archivo.

## 4. Licencias

`NOTICE.md` resume las licencias. Stockfish es GPLv3: se distribuye sin modificar, como
programa independiente comunicado por UCI, con su licencia y enlaces al código fuente en el
sitio publicado. Antes de publicar en tiendas de apps, revisar la compatibilidad de la GPL con
sus condiciones. El titular debe elegir la licencia del código propio (propietaria o libre).

## 5. Privacidad (brief §77)

`PRIVACY.md` (borrador para revisión legal) y la pantalla `#/privacy`: privacidad por defecto,
mínima recopilación, exportación (JSON y PGN), eliminación en dispositivo y servidor,
consentimiento explícito y protección infantil.

## 6. Lista de comprobación del lanzamiento

- [x] Pruebas unitarias, de calidad, e2e y de accesibilidad en CI.
- [x] Sitio estático verificado (Stockfish carga desde el sitio publicado).
- [x] PWA instalable y uso sin conexión.
- [x] Exportación y borrado de datos.
- [ ] Nombre y marca definitivos (verificar registro y dominio; docs/01-producto.md §3).
- [ ] Licencia del código propio y revisión legal de PRIVACY.md.
- [ ] Credenciales OAuth y proveedor de email; dominio del servidor de sincronización.
- [ ] Pruebas con usuarios reales y con lectores de pantalla en dispositivos (docs/17-calidad.md §4).
- [ ] Traducción completa al inglés de lecciones y explicaciones.
