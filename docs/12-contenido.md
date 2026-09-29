# 12 · Contenido pedagógico (Fase 7)

## Objetivo

Cubrir el recorrido **desde "no sé jugar" hasta la táctica básica y los primeros finales** con contenido original y verificado, sin depender de Stockfish.

## Lecciones (21)

| Sección | Lección | Qué se practica |
|---|---|---|
| Fundamentos | El tablero | Coordenadas, colores de casillas, diagonales |
| | La torre | Casillas alcanzables con bloqueos; cruzar el tablero en 2 movimientos |
| | El alfil | Diagonales; un solo color; capturar |
| | La dama y el rey | Casillas de la dama; el rey no pisa casillas atacadas; valor de las piezas |
| | El caballo | Salto en L; ruta en 3 saltos; capturar |
| | El peón | Avance, primera jugada doble, captura en diagonal, bloqueo |
| | Jaque y jaque mate | Jaque, mate, ahogado; mate del pasillo |
| | Reglas especiales | Enroque (condiciones), promoción, captura al paso, tipos de tablas |
| Visión | Piezas indefensas | Defendida vs indefensa; elegir la captura correcta |
| | ¿Qué amenaza mi rival? | Detectar la pieza amenazada y ponerla a salvo |
| Táctica | La horquilla | Horquilla de caballo con jaque; horquilla de peón |
| | La clavada | Absoluta vs relativa; identificar la pieza clavada; ganar la dama con una clavada |
| | La ensartada | Con torre y con alfil |
| | Ataque descubierto | Jaque descubierto con alfil y con caballo |
| Aperturas | Control del centro | Casillas centrales, primera jugada |
| | Desarrollo de piezas | Sacar las piezas menores; no sacar la dama pronto; no repetir piezas |
| | Seguridad del rey | Enrocar a tiempo; el escudo de peones |
| Estrategia | Actividad de las piezas | Encontrar la peor pieza y liberarla |
| | Estructura de peones | Peones doblados, aislados y pasados |
| Finales | Rey y dama contra rey | Método de la caja, trampa del ahogado y **práctica real contra un defensor** (25 jugadas) |
| | La oposición y el cuadrado | Tomar la oposición; regla del cuadrado |

Tipos de paso: explicar, seleccionar casillas, mover, llevar una pieza a una casilla (cualquier pieza), quiz y práctica contra un rival (nuevo).

## Puzzles (28)

| Concepto | Puzzles |
|---|---|
| Piezas indefensas / amenazas | 4 (incluido uno en el que hay que elegir entre dos capturas) |
| Mate en 1 | 9 (pasillo, coz, árabe, gran diagonal, dama y caballo, coronación, uno con negras…) |
| Mate en 2 | 2 (dama + mate de la coz; desviación en la octava fila) con respuesta automática del rival |
| Horquilla | 7 (caballo, peón, alfil, una con negras y la coronación en caballo) |
| Clavada, ataque descubierto y ensartada | 5 |
| Ataque doble | 1 |

## Cómo se verifica el contenido

Nada se publica sin pasar las pruebas automáticas (`packages/content/test/`):

- **Mate en 1:** la jugada da mate y no hay otro mate.
- **Mate en 2:** no existe mate en 1; tras la jugada clave, **cualquier** defensa permite mate en la siguiente; y ninguna otra primera jugada lo consigue.
- **Ganar material:** con una búsqueda a 4 medias jugadas, la solución gana al menos 2 puntos y supera a cualquier alternativa por 1,5 puntos o más.
- **Lecciones:** las casillas pedidas coinciden exactamente con las jugadas legales de la pieza; la pieza señalada como amenazada está realmente colgada; las casillas seguras aceptadas son *todas* las seguras; la pieza "clavada" es la única sin jugadas; las respuestas de estructura de peones, oposición y regla del cuadrado se calculan y se comparan con la respuesta del quiz.
- **E2E:** `tests/e2e/content.e2e.cjs` recorre las 21 lecciones en el navegador respondiendo cada paso, juega el mate en 2 y comprueba que el defensor responde en la práctica de finales. La práctica de rey y dama contra rey se probó con una técnica automatizada que da mate en 8 jugadas, bien dentro del límite de 25.

Estas pruebas detectaron 5 errores de diseño que se corrigieron antes de publicar: dos puzzles con más de una solución, una horquilla que el rival podía neutralizar tapando el jaque, una jugada aceptada que era ilegal (la casilla estaba ocupada) y una posición en la que el rey negro empezaba en jaque.

## Cómo añadir contenido

1. Añade el puzzle a `packages/content/src/puzzles.ts` (FEN, jugadas aceptadas en UCI, objetivo, concepto, rating, explicación) o la lección a `lessons.ts`.
2. Ejecuta `npm test`. Si la posición tiene otra solución o la respuesta no es correcta, la prueba lo dirá.
3. Si la lección introduce un tipo de respuesta nuevo, añade su verificación en `packages/content/test/lessons.test.mjs`.

Todo el contenido es original. Las ideas pedagógicas se inspiran en métodos clásicos, pero no se reproduce texto, diagramas ni ejercicios de ninguna obra.
