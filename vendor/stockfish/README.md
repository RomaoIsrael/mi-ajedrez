# Stockfish 19 Lite (WASM, un hilo)

Motor de ajedrez **Stockfish** compilado a WebAssembly por el proyecto
[stockfish.js](https://github.com/nmrugg/stockfish.js) (v19.0.0), sin modificaciones.

| Archivo | SHA-256 |
|---|---|
| `stockfish-19-lite-single.js` | `d3344124ab067fb0b90ee77873bb8e9fbf5fc01bc525fe714b0f942581e889e6` |
| `stockfish-19-lite-single.wasm` | `57ac2d72312aba346760e3f173f687a8c211208e97a87268436f7f0e10bb5387` |

- Descarga: `https://github.com/nmrugg/stockfish.js/releases/download/v19.0.0/<archivo>`
- Código fuente: https://github.com/nmrugg/stockfish.js (tag `v19.0.0`) y https://github.com/official-stockfish/Stockfish
- Licencia: **GNU GPL v3** (ver `COPYING.txt`). Stockfish se distribuye como un programa independiente
  con el que Kavalo se comunica por el protocolo UCI (en un Web Worker o en un proceso aparte).
  Antes de publicar en tiendas de aplicaciones debe revisarse el cumplimiento de la GPL (ver docs/03-arquitectura.md §3).

Se usa la versión *lite* (≈1,8 MB) porque carga rápido y ya es muchísimo más fuerte que cualquier humano.
El `package.json` de esta carpeta solo indica a Node que el archivo es CommonJS.
