# 11 · Tablero (Fase 5)

## Objetivo

Que el tablero sea cómodo para quien empieza y completo para quien ya juega, en cualquier dispositivo y también **sin ratón y sin vista** (brief §31, §38 y §70).

## Funciones

| Área | Qué hace |
|---|---|
| Mover | Tocar pieza y destino, o arrastrar. Solo se aceptan jugadas legales: un punto marca una casilla libre y un anillo marca una captura |
| Promoción | Selector de las 4 piezas (dama, torre, alfil, caballo), accesible por teclado |
| Anotaciones del usuario | Clic derecho y arrastrar dibuja una flecha; clic derecho en una casilla la marca con un círculo. Mayús = rojo, Alt = azul. En móvil, el botón **✏ Dibujar** activa el mismo modo con el dedo. Un clic normal borra las anotaciones |
| Navegación | ⏮ ◀ ▶ ⏭ y las teclas ← → Inicio Fin. En la partida, revisar una jugada anterior muestra un aviso y bloquea el tablero hasta volver a la posición actual. La lista de jugadas se puede pulsar |
| Teclado | Tab hasta el tablero; las flechas mueven un cursor visible (respeta la orientación del tablero); Enter o Espacio eligen pieza y destino; Esc cancela |
| Lector de pantalla | Cada casilla se anuncia ("e4, caballo blanco, destino posible"), igual que la selección ("… seleccionado, 2 jugadas posibles") y las jugadas ilegales |
| Jugada escrita | "Cf3", "cxd4", "Axe5+", "e8=D", "O-O"/"0-0", "e2-e4", "g1f3", "caballo f3", "caballo por e5" y también notación inglesa. En español, "R" es el rey y "T" la torre; "cxd4" siempre se lee como el peón c |
| Temas | Pizarra y marfil (por defecto), Nogal, Mármol, Océano, Bosque y Alto contraste, con vista previa en Ajustes |
| Daltonismo | Paletas deuteranopía/protanopía (azul y naranja) y tritanopía (verde y rojo anaranjado). El significado nunca depende solo del color |
| Texto | Tamaño de 100 % a 200 % |
| Animaciones | Deslizamiento de la jugada, pulso del rey en jaque, destello verde (buena jugada) o dorado (brillante), la pieza que "crece" al coronar, y en el mate el rey derrotado se inclina y el tablero brilla. **Reducir animaciones** las desactiva todas |
| Sonidos y vibración | Opcionales y desactivados por defecto. Distinguen jugada, captura, jaque, coronación, acierto, error y final. Se sintetizan con Web Audio, así que funcionan sin archivos ni conexión |

## Arquitectura

```
apps/web-prototype/src/
 ├─ components/board.ts        Board: render, interacción puntero/teclado, anotaciones, animaciones
 ├─ components/board-tools.ts  moveNavigator(), moveInput(), drawToggle()
 ├─ feedback.ts                cue() y moveCue(): sonidos y vibración
 └─ theme.ts                   atributos data-theme / data-board-theme / data-cb y --text-scale
packages/chess-core/src/san.ts parseUserMove(): interpreta jugadas escritas o dictadas
```

- Las escuchas globales de puntero solo existen mientras se arrastra, así que cambiar de pantalla no deja memoria ocupada.
- Los temas son variables CSS: añadir un tema nuevo son dos líneas de CSS.
- `parseUserMove` sirve también para la futura entrada por voz (Fase 4 del roadmap): basta con pasarle el texto dictado.

## Pruebas

- `packages/chess-core/test/rules.test.mjs`: interpretación de jugadas escritas, incluidos los casos ambiguos del español.
- `tests/e2e/board.e2e.cjs` (17 comprobaciones): jugar solo con teclado, jugada escrita, jugada ilegal escrita, navegación y bloqueo en modo revisión, flechas y círculos, modo dibujo, promoción, temas, daltonismo, tamaño de texto y persistencia de ajustes.

## Pendiente

- *Premove* (jugada anticipada, solo para avanzados) y confirmación de jugada opcional para principiantes.
- Sets de piezas adicionales (Fase 2 del roadmap): el tablero ya carga las piezas desde una ruta configurable.
- Guardar las anotaciones del usuario junto con la partida.
