# 14 · Stockfish (Fase 6)

## Cómo se obtuvo el motor

El registro de npm está bloqueado en el entorno de desarrollo, pero las *releases* de GitHub no. Se descargó el binario oficial de [stockfish.js v19.0.0](https://github.com/nmrugg/stockfish.js) (Stockfish 19 **Lite**, WASM, un hilo, ≈1,8 MB), sin modificaciones y con su licencia GPLv3. Las sumas SHA-256 y el origen están en `vendor/stockfish/README.md`.

Se eligió la versión *lite* de un hilo porque carga rápido, no necesita cabeceras COOP/COEP y ya es muchísimo más fuerte que cualquier humano.

## Arquitectura

```
packages/engine
 ├─ uci.ts        UciEngine: cliente UCI independiente del transporte, con cola de búsquedas
 └─ classify.ts   probabilidad de victoria, clasificación, precisión, lenguaje sin números
packages/tactics/review.ts   reviewGame(): motor + hechos tácticos → explicación por nivel
packages/bots                niveles 1–10 y humanización de candidatas MultiPV
packages/content/openings.ts 13 aperturas (libro para el clasificador y módulo de aperturas)
apps/web-prototype/src/engine.ts   Stockfish en un Web Worker (carga en segundo plano)
tools/stockfish-node.mjs            el mismo motor en Node (pruebas, scripts, servidor)
```

Si el motor no está disponible (navegador sin WebAssembly, archivo ausente), la app sigue funcionando con el motor propio: robots 1–6, pistas y análisis táctico.

## Perfiles de búsqueda

| Uso | Configuración |
|---|---|
| Robots 1–6 | MultiPV 8→4 con presupuesto de nodos (1 500 → 150 000) y humanización |
| Robots 7–10 | `UCI_LimitStrength` + `UCI_Elo` 1700 / 2000 / 2400; nivel 10 a plena fuerza (1,2 s) |
| Pistas | profundidad 12, máx. 400 ms (solo si no hay una pista táctica propia) |
| Barra de evaluación (opcional) | profundidad 10 |
| Revisión de partida | profundidad 11 por posición, una sola vez; se guarda con la partida |
| «¿Qué pasaba si…?» | profundidad 14; variante de 5 medias jugadas (ampliable a 10) |
| Ejercicios desde partidas | MultiPV 2, profundidad 12: solo si la mejor jugada supera a la segunda por 1,5 puntos o más |
| Verificación de puzzles (pruebas) | profundidad 16, MultiPV hasta 6 |

## Robots humanizados (docs/03-arquitectura.md §3)

En los niveles 1–6, Stockfish propone candidatas con un presupuesto de nodos y el robot las humaniza:
- **Ceguera ante respuestas:** con cierta probabilidad solo mira lo que ve tras mover, así que cuelga piezas como un humano.
- **Personalidad:** Leo ataca, Sofía juega posicional, Max complica, Arthur defiende y Nova es equilibrada.
- **Elección con temperatura** según el nivel.

Sin motor, el buscador propio hace lo mismo y cede el control entre jugadas para no congelar la pantalla.

## Clasificación de jugadas (docs/06-inteligencia.md §2)

La pérdida de probabilidad de victoria es ΔW = W(mejor) − W(jugada), con W(cp) = 1 / (1 + e^(−0,00368·cp)).

| Clase | Regla |
|---|---|
| Libro | Coincide con una línea del libro de aperturas (13 aperturas) |
| Mejor / Excelente | Es la jugada del motor / ΔW < 2 % |
| Buena | ΔW < 5 % |
| Imprecisión | ΔW < 10 % |
| Error | ΔW < 20 % |
| Error grave | ΔW ≥ 20 % |
| Victoria perdida | W(mejor) ≥ 90 % y W(jugada) < 70 % |
| Brillante | Mejor o excelente, entrega material y la posición no estaba ya ganada |

- Para principiantes los umbrales se multiplican por 1,5.
- La precisión por jugada sigue una curva exponencial de ΔW, y la de la partida combina las medias aritmética y armónica.
- La precisión con número solo se muestra desde nivel intermedio; al principiante se le dice en palabras.

## Explicaciones

- Si el motor confirma un error y hay una causa táctica conocida (pieza colgada, mate permitido…), se usa la **explicación táctica** concreta.
- Si no, se genera una **explicación posicional** con el motor. Ejemplo real: *"Con Axc3 la posición pasa de igualdad a ventaja clara del rival. Mejor era d5: ocupa d5 y controla e4 y ataca el alfil de c4. Por ejemplo: d5 cxb4 dxc4 Te1+ Ce7"*. Para principiantes, sin números.

La IA nunca inventa evaluaciones: todas las afirmaciones salen de Stockfish o de los detectores tácticos.

## Verificación del contenido con Stockfish

Los 28 puzzles se comprueban ahora con **dos motores independientes**: el motor de reglas propio y Stockfish.
- Los mates deben ser mates en el número de jugadas indicado, sin otra solución.
- En los de material, la solución es la mejor jugada, deja ventaja clara y supera a cualquier alternativa por al menos 1,5 puntos.

Stockfish detectó un problema que el motor propio no veía: en **10 puzzles**, tras ganar el material solo quedaban rey y caballo, o rey y alfil, contra rey, que son **tablas**. Esa "ganancia" no enseñaba nada útil. Se rediseñaron con material equilibrado antes de la táctica y ventaja decisiva después, como en los ejercicios reales.

## Pruebas

- `packages/engine/test` (7): UCI, mates, MultiPV, cola, Elo, clasificación y lenguaje.
- `packages/content/test/stockfish.test.mjs` (28): cada puzzle verificado por Stockfish.
- `packages/tactics/test/review.test.mjs` (3): error táctico y error posicional con evaluaciones reales.
- `packages/bots/test` (+3): 10 niveles, versión asíncrona y humanización con candidatas reales.
- `tests/e2e/engine.e2e.cjs` (11 comprobaciones): Worker, robot de nivel 8, pista, análisis, gráfica, «¿Qué pasaba si…?» y tooltip.

## Licencia

Stockfish es GPLv3. Se distribuye como programa independiente, con su licencia y enlace al código fuente, y se comunica por UCI. Antes de publicar en tiendas conviene una revisión legal (ver docs/03-arquitectura.md §3).
