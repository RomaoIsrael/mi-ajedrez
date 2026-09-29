# Avisos de terceros y licencias

## Kavalo

El código, el contenido pedagógico (lecciones, puzzles, explicaciones, comentarios de partidas),
los textos, el logotipo y los sets de piezas de este repositorio son originales del proyecto
Kavalo. Los autores clásicos citados en la documentación sirven como referencia de *métodos*;
no se reproduce su texto, diagramas ni ejercicios.

Las partidas de la biblioteca histórica (1750–1910) son de dominio público: las jugadas son
hechos históricos y todos los comentarios son originales.

La licencia del código propio la decidirá su titular antes del lanzamiento (ver
docs/18-publicacion.md §4). Mientras tanto, todos los derechos están reservados.

## Stockfish 19 (GNU GPL v3)

- Archivos: `vendor/stockfish/stockfish-19-lite-single.js` y `.wasm`, sin modificaciones.
- Autores: el equipo de desarrollo de Stockfish (https://stockfishchess.org) y el proyecto
  stockfish.js de Nathan Rugg (compilación a WebAssembly).
- Licencia: GNU General Public License v3 — texto completo en `vendor/stockfish/COPYING.txt`.
- Código fuente correspondiente: https://github.com/nmrugg/stockfish.js (tag `v19.0.0`, que
  incluye el código de Stockfish 19 usado en la compilación) y https://github.com/official-stockfish/Stockfish.
- Kavalo se comunica con Stockfish como un programa independiente mediante el protocolo UCI
  (Web Worker en el navegador, proceso aparte en Node). Quien distribuya la app debe ofrecer
  el código fuente de Stockfish junto con el binario (los enlaces anteriores y la copia de
  `COPYING.txt` incluida en el sitio publicado cumplen esa función en la web). Para tiendas de
  aplicaciones, revisar la compatibilidad de la GPL con sus condiciones antes de publicar.

## Herramientas de desarrollo (no se distribuyen)

- TypeScript (Apache-2.0) para compilar.
- Playwright (Apache-2.0) y Chromium (BSD y otras) para las pruebas e2e.
