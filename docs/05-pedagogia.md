# 05 · Pedagogía

## 1. Método de enseñanza

Cada concepto sigue **EMPCRAE**:

| Paso | Qué ocurre | Ejemplo: *Control del centro* |
|---|---|---|
| Explicar | 2–4 frases, un solo concepto | "Las 4 casillas centrales son las más valiosas: desde ahí tus piezas llegan a todas partes." |
| Mostrar | Tablero con casillas resaltadas + animación | d4, e4, d5, e5 iluminadas; un caballo en e4 vs en a1 muestra su alcance |
| Practicar | Ejercicio guiado | "Mueve un peón que controle el centro" |
| Corregir | Feedback inmediato con motivo | "a4 no ayuda al centro; mira qué casillas controla" |
| Repetir | 3–5 variaciones | Distintas posiciones iniciales |
| Aplicar | Situación de partida / partida temática vs IA | "Gana la batalla del centro en las primeras 8 jugadas" |
| Evaluar | Test y verificación posterior (SRS + partidas) | Medido automáticamente en partidas reales |

**Bases cognitivas:** carga cognitiva baja (un concepto por pantalla), práctica de recuperación (*retrieval practice*), repetición espaciada, práctica intercalada (*interleaving*) una vez introducido el concepto, feedback inmediato y elaborado, andamiaje que se retira (*fading*), metacognición (rutina mental).

**Referencias pedagógicas** (solo ideas y métodos generales, contenido 100 % original):
- Claridad y finales tempranos, simplicidad de ejecución → enfoque inspirado en Capablanca.
- Profilaxis, bloqueo, puestos avanzados → Nimzowitsch.
- Pensamiento práctico y lucha → Lasker.
- Principios de desarrollo y actividad → Tarrasch.
- Árbol de variantes y jugadas candidatas → Kotov.
- Desequilibrios como guía del plan → Silman.
- Progresión por módulos y test de nivel → Yusupov.
- Finales esenciales priorizados → De la Villa; entrenamiento exigente de finales y cálculo → Dvoretsky.
- Explicación jugada a jugada → Chernev; ataque al rey → Vuković.

## 2. Mapa de aprendizaje

```
FUNDAMENTOS → VISIÓN → TÁCTICA → APERTURAS → ESTRATEGIA → FINALES → CÁLCULO → PLANIFICACIÓN → MAESTRÍA
```

El mapa es visualmente lineal pero internamente es un **grafo de prerrequisitos** (DAG). Un nodo se desbloquea cuando sus prerrequisitos están en ● o más. Secciones posteriores se intercalan: p.ej. los finales básicos (K+D vs K) aparecen justo tras aprender el jaque mate.

| Sección | Nodos (resumen) |
|---|---|
| **Fundamentos** | Qué es el ajedrez · objetivo · tablero · filas/columnas/diagonales · coordenadas · piezas · posición inicial · movimientos (P, T, A, D, R, C) · captura · jaque · jaque mate · ahogado · tablas · enroque · promoción · captura al paso · valor de piezas |
| **Visión** | Piezas atacadas · defendidas · indefensas · rutas de caballo · diagonales y columnas · detectar jaques · capturas · amenazas · rutina mental 1–7 |
| **Táctica** | Mate en 1 · mate en 2 · horquilla · ataque doble · clavada · ensartada/rayos X · ataque descubierto · jaque descubierto · eliminación del defensor · sobrecarga · desviación · atracción · interferencia · bloqueo · zwischenzug · red de mate · sacrificio · combinación · promoción táctica · defensa táctica · jaque perpetuo |
| **Aperturas** | Principios (centro, desarrollo, enroque, conectar torres, no repetir piezas, dama tarde) · estructuras · repertorio guiado por estilo |
| **Estrategia** | Estructura de peones (doblados, aislados, atrasados, pasados, mayorías) · casillas débiles · puestos avanzados · columnas abiertas/semiabiertas · pareja de alfiles · alfil bueno/malo · caballo vs alfil · actividad · iniciativa · espacio · ventaja de desarrollo · rey vulnerable · cambios favorables · profilaxis · restricción · peor pieza |
| **Finales** | K+D vs K · K+T vs K · dos torres · oposición · cuadrado · K+P vs K · zugzwang · triangulación · finales de torres (activa, detrás del pasado, Lucena, Philidor) · dama · caballo · alfil (mismo/distinto color) · piezas menores · finales prácticos |
| **Cálculo** | Jugadas candidatas · visualización · líneas forzadas · evaluación del final de la línea · profundidad progresiva |
| **Planificación** | Evaluación posicional · desequilibrios · planes · transiciones apertura→medio juego→final · transformación de ventajas |
| **Maestría** | Sacrificios posicionales · compensación · juego dinámico · profilaxis avanzada · estructuras típicas · análisis de partidas propias |

## 3. Currículo por nivel

### Nivel 0 — Primer contacto
Todos los nodos de *Fundamentos*. Tras **cada** concepto, ejercicio interactivo (ej.: "Lleva la torre a h8 en el menor número de jugadas", "¿Puede este peón capturar al paso?"). Minijuegos clásicos de iniciación (originales en ejecución): *batalla de peones*, *el caballo hambriento* (comer todos los peones), *lleva al rey a salvo*.

### Principiante
Desarrollo, centro, seguridad del rey, enroque, conectar torres, desarrollo eficiente, no repetir piezas, dama tarde, piezas defendidas/indefensas, intercambios, valor material, amenazas. Táctica básica: mate en 1–2, clavada, horquilla, ataque doble, descubierto, jaque descubierto, eliminación del defensor, sobrecarga. Finales básicos de mate.

### Intermedio
Todos los temas de *Estrategia*, táctica completa, finales de rey y peón completos y torres básicas, aperturas por principios→estructuras→planes.

### Avanzado
Cálculo, candidatas, visualización, evaluación, planificación, desequilibrios, sacrificios posicionales, transformación de ventajas, dinámica, compensación, profilaxis avanzada, estructuras típicas, transiciones.

### Módulo de táctica (por patrón)
`TEORÍA → DEMOSTRACIÓN → EJERCICIO GUIADO → PUZZLES (5 niveles de dificultad) → TEST → PARTIDA TEMÁTICA`
La partida temática arranca desde una posición donde el patrón es probable (p.ej. horquillas de caballo con reyes/damas en casillas del mismo color) contra un bot configurado para "permitirlo".

### Módulo de aperturas
Orden: **PRINCIPIOS → ESTRUCTURAS → PLANES → JUGADAS TÍPICAS → VARIANTES**. Nada de memorizar árboles al principio.

| Blancas | Negras vs 1.e4 | Negras vs 1.d4 |
|---|---|---|
| Italiana · Española · Londres · Gambito de Dama · Catalana | 1…e5 · Siciliana · Francesa · Caro‑Kann | Gambito de Dama (aceptado/declinado) · India de Rey · Nimzoindia · Eslava |

Cada apertura: objetivo, estructura, piezas y casillas importantes, planes, rupturas, errores frecuentes, trampas, medios juegos y finales típicos. Entrenamiento: "¿Cuál es el plan aquí?" en vez de "¿cuál es la jugada 7?". Las desviaciones del usuario se explican por principio ("sacaste la dama pronto; mira cómo gana tiempos el rival").

### Módulo de finales
Especialmente completo; cada final tiene: posición clave, idea en una frase, método paso a paso, práctica contra el motor (con tablebases Syzygy de ≤ 5 piezas para garantizar juego perfecto del rival y veredicto exacto), y repaso espaciado.

## 4. Sistema de niveles y progresión

| Nivel | Nombre | Rating de juego aprox. | Hito de entrada |
|---|---|---|---|
| 1 | Novato | 0–400 | Conoce el tablero |
| 2 | Aprendiz | 400–700 | Mueve todas las piezas, reglas especiales ● |
| 3 | Principiante | 700–1000 | Da mate con D+R, principios de apertura ● |
| 4 | Jugador | 1000–1250 | Táctica básica ●, blunders < 1,5/40 jugadas |
| 5 | Club | 1250–1500 | Táctica completa ◐+, finales de peón ● |
| 6 | Intermedio | 1500–1750 | Estrategia básica ●, Lucena/Philidor ● |
| 7 | Avanzado | 1750–2000 | Cálculo ≥ 4 plies fiable |
| 8 | Experto | 2000–2250 | Planificación ● |
| 9 | Master Training | 2250+ | Maestría |

El nivel **no** sube solo por rating: exige hitos de dominio (evita "subir" con suerte o bajar por una mala racha). Ratings separados con Glicko‑2: Game, Puzzle, Tactical, Strategy, Endgame, Opening Knowledge, Calculation.

## 5. Estados de dominio

| Estado | Criterio (todos los indicados) |
|---|---|
| 🔒 No iniciado | Prerrequisitos pendientes o no visto |
| ○ Introducido | Lección vista |
| ◐ En aprendizaje | ≥ 1 ejercicio resuelto |
| ● Comprendido | ≥ 80 % en ≥ 5 ejercicios de la sesión **y** 1 repaso correcto ≥ 1 día después |
| ★ Dominado | Repasos correctos a ≥ 7 días **y** aplicado en ≥ 2 contextos (puzzle + partida) **y** probabilidad de dominio ≥ 0,9 |
| ♛ Maestría | ★ mantenido ≥ 30 días, aplicado sin pistas en partidas reales ≥ 3 veces, sin errores del concepto en las últimas 10 partidas relevantes |

**Probabilidad de dominio:** Bayesian Knowledge Tracing por concepto (`P(L0)`, `P(T)` aprendizaje, `P(S)` desliz, `P(G)` acierto por azar), con pesos de evidencia: partida real > puzzle personal > puzzle genérico > ejercicio guiado. Esto implementa el **sistema de confianza** (§98): un solo fallo de alguien con `P(L)` alto se interpreta como desliz (`P(S)`), no como desconocimiento. Se degrada a ◐ solo con evidencia múltiple.

## 6. Repetición espaciada

Base: intervalos **1 → 3 → 7 → 14 → 30 días**, adaptados por rendimiento (esquema tipo SM‑2 con escalera fija inicial).

```ts
// packages/pedagogy/src/srs.ts (diseño)
const LADDER = [1, 3, 7, 14, 30];            // días

interface ReviewCard {
  conceptId: string; itemId: string;         // puzzle / posición personal / pregunta
  step: number;                              // índice en LADDER (≥ LADDER.length → modo libre)
  ease: number;                              // 1.3 – 2.8, empieza en 2.3
  intervalDays: number; dueAt: Date; lapses: number;
}

type Grade = 'fail' | 'hard' | 'good' | 'easy';  // derivado de acierto, pistas y tiempo

function schedule(card: ReviewCard, grade: Grade, now: Date): ReviewCard {
  if (grade === 'fail') {
    return { ...card, step: 0, lapses: card.lapses + 1,
             ease: Math.max(1.3, card.ease - 0.2), intervalDays: 1, dueAt: addDays(now, 1) };
  }
  const step = card.step + (grade === 'easy' ? 2 : 1);
  const base = step < LADDER.length ? LADDER[step]
             : Math.round(card.intervalDays * card.ease);
  const factor = grade === 'hard' ? 0.7 : 1;
  const ease = card.ease + (grade === 'easy' ? 0.15 : grade === 'hard' ? -0.15 : 0);
  const intervalDays = Math.max(1, Math.round(base * factor));
  return { ...card, step, ease: clamp(ease, 1.3, 2.8), intervalDays, dueAt: addDays(now, intervalDays) };
}
```

`Grade`: *fail* = incorrecto o solución vista; *hard* = correcto con pistas ≥ 2 o tiempo > 2× mediana; *good* = correcto; *easy* = correcto rápido sin pistas. Cada repaso usa una **posición distinta** del mismo concepto cuando es posible (evita memorizar la posición en vez del patrón); las posiciones propias del usuario tienen prioridad.

## 7. Rutina mental del jugador

Las 15 preguntas se introducen **por bloques**, no todas a la vez:

| Bloque | Preguntas | Se introduce en |
|---|---|---|
| A · Seguridad | 1 ¿Qué hizo mi rival? 2 ¿Qué amenaza? 3 ¿Hay jaques? 4 ¿Hay capturas? | Aprendiz |
| B · Material | 5 ¿Amenazas tácticas? 6 ¿Tengo piezas indefensas? 7 ¿Tiene él piezas indefensas? | Principiante |
| C · Mejora | 8 ¿Mi peor pieza? 9 ¿Su mejor pieza? 10 ¿Qué puedo mejorar? | Jugador |
| D · Plan | 11 ¿Cuál es mi plan? 12 ¿Qué quiere mi rival? | Club |
| E · Verificación | 13 ¿Mi jugada deja táctica? 14 ¿Qué contestaría? 15 ¿Quedo mejor? | Club → Intermedio |

**Checklist antes de mover** (opcional): JAQUES · CAPTURAS · AMENAZAS · PIEZAS INDEFENSAS · SEGURIDAD DEL REY · RESPUESTA DEL RIVAL. Cuando el detector ve que el usuario ya no comete el error asociado a un ítem durante N partidas, el ítem se **retira** con un mensaje ("Ya no necesitas este recordatorio 👏").

## 8. Pistas progresivas

| Peldaño | Tipo | Ejemplo |
|---|---|---|
| 1 | Pregunta conceptual | "Observa qué cambió con la última jugada." |
| 2 | Zona del tablero | "Mira el flanco de rey." (resaltado de zona) |
| 3 | Pieza relevante | "Tu caballo puede hacer algo interesante." |
| 4 | Candidatas | "Considera Cxe5 o Ab5." |
| 5 | Respuesta completa | "Cxe5: gana un peón porque d6 no puede recapturar (clavado)." |

Coste de las pistas: no restan XP de forma punitiva; se registran para el índice de independencia y el `Grade` del SRS.

## 9. Progresión de ayudas (fading)

| Nivel | Ayudas por defecto |
|---|---|
| Novato–Aprendiz | Movimientos legales visibles, aviso de pieza colgada antes de confirmar, checklist completo, coach proactivo |
| Principiante–Jugador | Aviso solo tras mover ("¿Seguro?" con 1 s para deshacer en modo educativo), checklist A+B |
| Club–Intermedio | Sin avisos; coach solo a demanda; preguntas ocasionales |
| Avanzado+ | Solo post‑partida; preguntas socráticas esporádicas |

La retirada es **individual y por concepto**, no solo por nivel global: si alguien ya no cuelga piezas, se retira ese aviso aunque siga en Aprendiz.

## 10. Entrenamientos específicos

- **Visión:** piezas atacadas/defendidas/indefensas, rutas de caballo (camino más corto), diagonales, columnas, jaques, capturas, amenazas — cronometrados.
- **Cálculo:** posición sin poder mover → candidata, respuesta, siguiente; comparación con MultiPV; métricas: profundidad, precisión, candidatas, errores.
- **Coordenadas:** "Selecciona e4", "¿De qué color es f5?", "¿Qué casillas controla este caballo?" — con ambos lados del tablero.
- **Partidas históricas:** partidas de dominio público (anteriores a ~1950 o ampliamente difundidas como hechos; los movimientos de una partida no son obra protegida, pero los comentarios sí → comentarios 100 % propios). En momentos clave: "¿Qué jugarías?" → qué ocurrió, cuál era la idea, qué concepto aprender.
