# 16 · Personalización y módulos (Fase 10)

La Fase 10 completa los módulos del brief que faltaban en el prototipo. Cada bloque se entregó
con explicación, código, pruebas unitarias y un recorrido e2e.

| Bloque | Brief | Dónde | Pruebas |
|---|---|---|---|
| Modos de partida | §60 | `screens/play.ts` (`MODES`) | `tests/e2e/modes.e2e.cjs` |
| Controles de tiempo | §61 | `screens/play.ts` (`CLOCKS`, personalizado) | `modes.e2e.cjs` |
| Posiciones de inicio | §60 | `packages/content/src/positions.ts` | `content/test/stockfish.test.mjs` |
| Visión, cálculo, coordenadas | §51–53 | `packages/training`, `screens/train.ts` | `training/test`, `training.e2e.cjs` |
| Aperturas | §13 | `screens/openings.ts` | `study.e2e.cjs` |
| Partidas históricas | §54 | `content/src/historical.ts`, `screens/library.ts` | `content.test.mjs`, `study.e2e.cjs` |
| Importar | §74 | `screens/import.ts`, `Game.fromPgn`, `splitPgn`, `pgnHeaders` | `chess-core/test`, `import.e2e.cjs` |
| Exportar | §75 | `components/board-image.ts`, `state/exports.ts` | `import.e2e.cjs` |
| Sets de piezas | §33–34, §78.21 | `tools/gen-piece-sets.mjs`, `assets/pieces/*`, Ajustes | `personal.e2e.cjs` |
| Modo niños / adulto | §46–47 | `theme.ts`, `components/coach.ts`, `styles.css` | `personal.e2e.cjs` |
| Multiidioma | §71 | `src/i18n.ts` | `apps/web-prototype/test/i18n.test.mjs` |
| Dashboard, radar, ratings | §48–50 | `screens/progress.ts`, `store.ts` (`skillRatings`) | `personal.e2e.cjs` |
| Test inicial | §80–81 | `content/src/assessment.ts`, `screens/onboarding.ts` | `stockfish.test.mjs`, `personal.e2e.cjs` |
| Objetivos | §59 | `onboarding.ts` (8 objetivos) | — |

## Modos de partida (§60) y relojes (§61)

- **Contra la IA**, **Coach Mode**, **Educativa** (objetivo = no repetir tu error más frecuente;
  al final se comprueba), **Entrenamiento** (pistas y deshacer, sin rating), **Sin pistas**,
  **Libre** (dos personas en el mismo dispositivo), **Temática**, **Desde apertura** (la línea
  principal ya jugada), **Desde medio juego** y **Desde final** (posiciones con objetivo).
- Solo las partidas completas contra la IA desde la posición inicial cuentan para el rating.
- Relojes: sin reloj, 1+0, 3+0, 3+2, 5+0, 5+3, 10+0, 15+10, 30 min y personalizado. A quien
  está por debajo de 1000 se le recomienda jugar lento.
- Las 11 posiciones de inicio tienen objetivo verificable (ganar, tablas o posición
  equilibrada) y Stockfish lo confirma en los tests (profundidad 18).

## Entrenamientos (§51–53)

`@kavalo/training` es puro (sin DOM) y calcula las respuestas con las reglas, así que cualquier
posición legal sirve de ejercicio:

- **Coordenadas**: «Selecciona e4», color de una casilla y casillas que controla un caballo;
  20 preguntas contra el reloj, con récord.
- **Visión**: piezas atacadas, defendidas e indefensas, amenazas, jaques y capturas (todas),
  líneas de alfil/torre/dama y rutas de caballo (BFS). Corrección por conjuntos: acertadas,
  que faltaban y marcadas de más.
- **Cálculo**: no se puede mover. Se escriben candidatas y la línea (jugada, respuesta,
  siguiente); se mide profundidad correcta, si la buena estaba entre las candidatas, jugadas
  ilegales y dónde se desvió. Alterna mates en 2 verificados con posiciones tácticas cuya
  línea calcula Stockfish.
- `Position.diagram()` permite tableros didácticos sin reyes (solo para mostrar).

## Aperturas (§13) y partidas históricas (§54)

- Cada apertura se estudia en 5 pasos: principios → estructura (casillas clave resaltadas) →
  planes y rupturas → jugadas típicas (con errores frecuentes y trampas) → variantes. Después se
  practica la línea: al desviarse, el coach recuerda primero el objetivo y solo al segundo
  intento muestra la jugada. «Jugar desde esta apertura» abre el modo correspondiente.
- La biblioteca contiene 5 partidas antiguas de dominio público (Légal 1750, la Ópera 1858, la
  Inmortal 1851, la Siempreviva 1852, Réti–Tartakower 1910). Las jugadas son hechos históricos;
  todos los comentarios son originales. En cada momento clave: «¿Qué jugarías?»; si el usuario
  elige otra jugada, Stockfish decide si también era buena (no se castiga pensar distinto).

## Importar y exportar (§74–75)

- PGN pegado o subido (.pgn ≤ 2 MB): comentarios, variantes anidadas, NAG, anotaciones (!?) y
  archivos con varias partidas. Si la partida termina en el tablero, el resultado real manda
  sobre la etiqueta. El color del usuario se deduce de su nombre (editable). Las partidas
  importadas se analizan y alimentan el ADN, pero no cambian el rating.
- FEN: validación con mensajes claros, imagen PNG y «jugar desde aquí contra la IA».
- Exportar: PGN (una partida o todas), FEN de la posición mostrada, imagen PNG (canvas con el
  tema y el set actuales), estadísticas CSV (protegidas contra inyección de fórmulas), plan de
  entrenamiento en Markdown y reporte semanal/mensual.

## Personalización (§33–34, §46–50, §71, §81)

- **Sets de piezas**: 12 sets (Royal Modern, Classic Elite, Natural Wood, Crystal, Cyber,
  Medieval, Fantasy, Kids, Minimal, Dark, Neon, Tournament) generados por
  `tools/gen-piece-sets.mjs`. Todos comparten la silueta de Royal Modern (el brief exige que
  sea siempre reconocible) y cambian el material: color, contorno, brillo, transparencia o
  acabado plano. Siluetas propias para Medieval y Fantasy y los modelos 3D (§37) quedan como
  trabajo de diseño para la versión con ilustrador.
- **Modo niños**: el coach es Kavi (frases cortas), explicaciones breves (qué pasó, qué mirar,
  una pregunta), nivel de explicación de principiante, interfaz más grande y redondeada, set
  Kids, historia en el inicio y lluvia de estrellas en los logros (se desactiva con «reducir
  animaciones»). Las reglas nunca cambian. **Modo adulto**: interfaz limpia y sin celebraciones.
- **Multiidioma**: `t(clave)` con diccionarios `es` y `en`; un test comprueba que todos los
  idiomas tienen las mismas claves y marcadores. Están traducidos la navegación, el inicio, los
  ajustes y el onboarding; las lecciones y explicaciones siguen en español y la app lo avisa.
  Añadir un idioma = añadir un diccionario.
- **Test inicial**: 13 ejercicios progresivos (reglas 3, visión 2, táctica 3, estrategia 2,
  finales 2, cálculo 1), de tablero o de opción múltiple, verificados con reglas y Stockfish.
  El nivel se estima con una actualización tipo Elo con K decreciente, se siembra el modelo de
  dominio y los ratings por área. Se puede terminar antes.
- **Ratings por área (§50)**: partidas, puzzles, táctica, estrategia, finales, aperturas y
  cálculo; se actualizan con puzzles, cálculo, práctica de aperturas y momentos históricos.
- **Dashboard (§48)**: rating, precisión, partidas y resultados, errores por partida, táctica en
  partidas, finales, tiempo por jugada, aperturas que juegas (con % de puntos), progresión del
  rating y ADN. **Radar (§49)**: táctica, estrategia, apertura, cálculo, finales, defensa,
  ataque, visión y planificación (dominio de conceptos + ADN; sin datos, el eje queda a cero).

## Limitaciones conocidas

- Traducción parcial al inglés (ver arriba).
- Los sets de piezas son variaciones de material, no siluetas nuevas.
- El modo libre no guarda la partida (no hay un «usuario» cuyo progreso medir); se puede
  copiar el PGN e importarlo.
