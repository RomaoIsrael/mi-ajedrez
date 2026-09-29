# 17 · Pruebas y calidad (Fase 11)

**Objetivo.** Que cada cambio llegue a los usuarios sin romper las reglas del ajedrez, las
explicaciones, el progreso guardado ni la accesibilidad. Las pruebas son automáticas y se
ejecutan en cada push y pull request (`.github/workflows/ci.yml`).

## 1. Pirámide de pruebas

| Nivel | Qué cubre | Dónde | Cómo se ejecuta |
|---|---|---|---|
| Unitarias | reglas, FEN, SAN, PGN, perft; clasificación y cliente UCI; explicaciones y pistas; robots; repaso espaciado y dominio; contenido; coach; ADN; entrenamientos; i18n | `packages/*/test`, `apps/*/test` | `npm test` |
| Contenido con motor | puzzles, posiciones de inicio y test inicial verificados con Stockfish 19 | `packages/content/test/stockfish.test.mjs` | `npm test` |
| Calidad estática | presupuesto de tamaño, integridad y licencia de Stockfish, pruebas por paquete, coherencia del contenido, sin identificadores de modelos | `tools/check.mjs` | `npm run check` |
| E2E | 12 recorridos reales en Chromium (ver §2) | `tests/e2e/*.e2e.cjs` | `npm run test:e2e` |
| Accesibilidad | 18 pantallas en tema claro y oscuro | `tests/e2e/a11y.e2e.cjs` | `npm run test:a11y` |

## 2. Recorridos e2e

`prototype` (onboarding → lección → partida → análisis → puzzles), `board` (arrastrar, teclado,
flechas, promoción, temas), `content` (las 21 lecciones), `coach` (recomendación, repasos,
misiones, logros, reporte), `engine` (Stockfish en Web Worker, nivel 8, análisis, «¿Qué pasaba
si…?»), `dna`, `modes`, `training`, `study` (aperturas y biblioteca), `import` (PGN, FEN,
PNG, CSV) y `personal` (inglés, modo niños, test inicial, piezas, dashboard).

## 3. Control de calidad del brief (§90)

| Validar | Prueba |
|---|---|
| Movimientos | perft de 6 posiciones de referencia hasta profundidad 3–5 (`chess-core/test/rules.test.mjs`) |
| Jaque, mate, ahogado | pruebas de estado de partida y de mate/ahogado; animación de mate en e2e |
| Enroque | derechos, casillas atacadas y FEN tolerante; ítem del test inicial |
| Promoción | las cuatro piezas, con captura; diálogo de promoción en `board.e2e` |
| Captura al paso | casilla al paso en FEN y en jugada; ítem del test inicial |
| Repetición | triple repetición con `repetitionKey` |
| 50 movimientos | contador de medio movimiento |
| Material insuficiente | rey contra rey, rey y pieza menor, alfiles del mismo color |
| PGN | exportar ↔ importar; variantes anidadas, comentarios, NAG, varias partidas |
| FEN | ida y vuelta; errores claros (reyes, peones en 1.ª/8.ª, bando que no mueve en jaque) |
| Análisis Stockfish | cliente UCI con motor real en Node; clasificación y revisión de partidas |
| Perfiles | migraciones de perfiles antiguos (ajustes, entrenamientos, idioma) y e2e con perfiles sembrados |
| Sincronización | API de sincronización con pruebas de conflicto e idempotencia (Fase 12, `server/test`) |

## 4. Accesibilidad (§70)

La auditoría automática comprueba en cada pantalla: `lang`, un solo `h1`, nombre accesible en
botones y enlaces, etiqueta en cada campo, `alt` en imágenes, `aria-label` en gráficos,
objetivos táctiles ≥ 24 px (los botones principales miden 44–52 px), contraste de texto ≥ 4,5:1
(WCAG AA) en tema claro y oscuro, y foco visible con teclado. Se complementa con la revisión
manual:

- Teclado completo en el tablero (flechas, Enter, Esc) y anuncios para lectores de pantalla.
- Paletas para daltonismo (deuteranopía/protanopía y tritanopía) que no dependen solo del color:
  símbolos (✓ ?! ? ??) y texto acompañan a cada color.
- Tamaño de texto hasta 200 %, reducción de animaciones, sonidos y vibración opcionales.
- Pendiente de verificación manual con VoiceOver y TalkBack en dispositivos reales antes del
  lanzamiento público.

## 5. Rendimiento

| Métrica | Objetivo | Medida actual |
|---|---|---|
| JS+CSS de la app (sin Stockfish) | ≤ 1,2 MB sin comprimir | `npm run check` lo imprime en cada ejecución |
| Primera pantalla | sin esperar al motor | Stockfish se carga 1,5 s después, en un Web Worker |
| Motor | no bloquear la interfaz | Web Worker + cola de análisis; los robots 1–6 funcionan sin motor |
| Revisión de partidas | en segundo plano | cola en serie (`state/review.ts`) |
| Generación de jugadas | perft(4) de la posición inicial < 2 s | prueba unitaria |

## 6. Criterios para aceptar un cambio

1. `npm test`, `npm run check`, `npm run test:e2e` y `npm run test:a11y` en verde (CI).
2. Contenido nuevo: verificado por reglas y, si tiene solución, por Stockfish.
3. Textos nuevos en pantallas traducidas: clave en todos los diccionarios (lo exige el test).
4. Ninguna explicación dice solo «está mal»: qué, por qué, consecuencia, qué mirar y cómo
   evitarlo (brief §93).

## 7. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Stockfish no carga (navegador antiguo, sin WASM) | robots 1–6 y análisis táctico propios; la interfaz lo indica |
| Almacenamiento local lleno o bloqueado | la app sigue en memoria; exportar datos en Ajustes |
| Un puzzle con dos soluciones | test con MultiPV exige margen ≥ 150 cp |
| Sobrecorregir por una partida | modelo de dominio con varias evidencias; ADN con intervalos |
