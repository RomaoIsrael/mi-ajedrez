# 10 · Prototipo navegable (Fase 4)

## Objetivo

Validar el **bucle de aprendizaje** con usuarios reales antes de invertir en la app definitiva:

```
jugar / resolver → detectar el error → explicarlo con palabras → reintentar
→ convertirlo en ejercicio personal → repasarlo días después → medir si mejora
```

No es la app final: es la versión más pequeña que permite comprobar si las explicaciones y los ejercicios personales ayudan de verdad.

## Qué incluye

| Pantalla | Qué se puede hacer |
|---|---|
| Onboarding | Splash, "¿Has jugado antes?", nombre, objetivo, minutos diarios, coach y evaluación rápida con 4 posiciones reales (si ya sabe jugar) |
| Home | Saludo, nivel, racha, resumen del ADN, recomendación del coach con **¿Por qué esto?** y un único botón principal |
| Plan diario | Bloques según el tiempo elegido (5–60 min) |
| Aprender | Mapa de 9 secciones con estados de dominio 🔒 ○ ◐ ● ★ ♛ y desbloqueo por prerrequisitos |
| Lección | 5 lecciones con los pasos explicar, mostrar, seleccionar casillas, mover, llegar a una casilla y quiz, con corrección inmediata |
| Jugar | Rivales Nova, Leo, Sofía, Max y Arthur, niveles 1–6, color, reloj, Coach Mode y checklist |
| Partida | Pistas en 5 niveles, aviso de amenazas, **¿Por qué jugó eso?**, explicación del error con **Intentar de nuevo**, deshacer, girar, rendirse y reloj |
| Análisis | Resultado, precisión en palabras, **los 3 momentos**, "Ver la jugada correcta", "¿Qué pasaba después?", "¿Por qué es buena?" y PGN |
| Puzzles | Repasos vencidos de posiciones de tus partidas primero, luego puzzles según tus errores y tu rating; pistas, solución y rating |
| Progreso | Ratings, partidas, errores frecuentes, Error Reduction Rate (con 10 partidas o más), conceptos y partidas recientes |
| ADN | Radar con 5 dimensiones; "perfil en construcción" con un ejemplo marcado como tal si hay menos de 5 partidas |
| Ajustes | Nombre, minutos, coach, nivel de explicaciones, tema claro/oscuro, coordenadas, reducir animaciones, exportar y borrar datos |

## Arquitectura

```
apps/web-prototype  (TypeScript + DOM, sin framework)
 ├─ src/main.ts               enrutado por hash + navegación inferior
 ├─ src/components/board.ts   tablero interactivo propio
 ├─ src/components/coach.ts   burbuja del coach y tarjeta de explicación
 ├─ src/state/store.ts        perfil local (localStorage) ≈ UserChessProfile mínimo
 ├─ src/state/insights.ts     recomendación, plan diario, estadísticas, ERR, ADN básico
 └─ src/screens/*.ts          una pantalla = una decisión principal
packages/
 ├─ chess-core   reglas, FEN, SAN/UCI, PGN, perft
 ├─ tactics      hechos → explicación (primera versión del ChessExplanationEngine), pistas, ¿Por qué?
 ├─ bots         rivales con niveles humanizados y personalidad
 ├─ pedagogy     repetición espaciada + modelo de dominio (BKT + sistema de confianza)
 └─ content      mapa de conceptos, lecciones y puzzles originales
```

El navegador resuelve los paquetes `@kavalo/*` con un *import map* declarado en `apps/web-prototype/index.html`. No hay bundler.

## Dependencias

**Ninguna dependencia externa en tiempo de ejecución.** Solo se usa el compilador de TypeScript. Motivos:

1. La política de red del entorno de desarrollo bloquea el registro de npm y los CDN.
2. Tener el motor de reglas propio y validado con *perft* nos da control total sobre la capa pedagógica (atacantes, defensores, piezas colgadas), que chess.js no expone.

Cuando la red lo permita, la migración a Next.js prevista en la arquitectura solo cambia la capa `apps/`: los paquetes de `packages/` se reutilizan tal cual.

## Flujo principal: un error en partida

```
Tablero.onMove → Game.move → analyzeMove(antes, jugada)   ← hechos deterministas
  → explain(análisis, nivel, memoriaPedagógica)           ← plantilla ES/EN
  → tarjeta del coach: qué · por qué · consecuencia · qué observar · cómo evitarlo
  → [Intentar de nuevo] deshace  |  [Continuar] juega el bot
  → store: error registrado + evidencia de dominio (BKT)
  → si había un mate o una captura que no se vio: puzzle personal + tarjeta de repaso (1, 3, 7, 14, 30 días)
```

## Cómo ejecutarlo

```bash
npm install --offline   # solo crea los enlaces de los paquetes del monorepo
npm start               # compila y sirve en http://localhost:5173
npm test                # 69 pruebas (reglas con perft, tácticas, bots, pedagogía, contenido)
npm run test:e2e        # recorridos completos con Playwright (con el servidor arrancado)
```

## Limitaciones conocidas (se resuelven en fases posteriores)

- El análisis usa detectores tácticos de 1–2 jugadas. No detecta todavía errores posicionales, que llegarán con Stockfish en la Fase 6.
- Los bots de nivel 5–6 piensan en el hilo principal (~1–2 s en medio juego). En la Fase 6 pasarán a un Web Worker.
- Hay 21 lecciones y 28 puzzles (ver [12-contenido](12-contenido.md)). Los nodos de cálculo, planificación y maestría aún aparecen como "Próximamente".
- Los textos de la interfaz están solo en español. Las explicaciones del motor ya tienen versión en inglés; el sistema i18n completo llegará con Next.js.
- Los datos se guardan solo en el navegador. Todavía no hay cuentas ni sincronización.
- La PGN importada no admite variantes.
