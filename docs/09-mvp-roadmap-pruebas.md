# 09 · MVP, roadmap y plan de pruebas

## 1. MVP

**Hipótesis a validar:** *explicar errores con palabras + convertirlos en ejercicios personales reduce los errores recurrentes más rápido que jugar/puzzles genéricos.*
**Métrica de éxito del MVP:** ERR ≥ 30 % en `hanging_piece` para usuarios principiantes activos tras 4 semanas; activación (primera lección completada) ≥ 60 %; retención D30 ≥ 20 %.

| Incluido | Alcance MVP |
|---|---|
| Onboarding | Pregunta de experiencia + test inicial (12 ítems) + objetivo + tiempo diario |
| Tablero | Completo (drag/tap, legales, flechas, resaltado, girar, coordenadas, navegación) con set Royal Modern y tema Slate & Ivory |
| Reglas y movimientos | Nivel 0 completo con ejercicios |
| Lecciones | Principiante: ~25 conceptos EMPCRAE |
| Puzzles | ~1 500 puzzles originales verificados (táctica básica) + selector adaptativo simple |
| Stockfish | WASM en cliente (juego, hint, review‑fast) + worker servidor (review‑deep) |
| Partidas contra IA | Bots niveles 1–6, personalidad Nova + Leo, relojes sin reloj/10+0/15+10 |
| Análisis post‑partida | Clasificación, 3 momentos, explicación plantillada, ¿Por qué? / ¿Qué pasaba si…? |
| Errores | Detector de 6 categorías (hanging_piece, missed_threat, missed_tactic, poor_development, king_safety, impulsive) + ERR |
| Recomendaciones | Recomendador por reglas + plan diario (5/10/20/30 min) |
| Perfil y progreso | Ratings Game/Puzzle, dashboard básico, dominio por concepto |
| ADN básico | 5 dimensiones (Ataque, Defensa, Táctica, Finales, Tiempo) con "perfil en construcción" |
| Puzzles personales | Generados desde errores + SRS básico (ladder 1/3/7/14/30) |
| Plataforma | Web PWA (es/en), cuenta email/Google/invitado, claro/oscuro, reducción de animaciones |

**Fuera del MVP:** app nativa, Apple login, aperturas completas, finales de torres, ADN avanzado, 3D, modo niños completo, multijugador, LLM (el MVP usa plantillas deterministas; el LLM llega en Fase 2 tras validar el valor de las explicaciones).

## 2. Roadmap

| Fase | Periodo orientativo | Contenido |
|---|---|---|
| **0 · Fundaciones** | Semanas 1–3 | Monorepo, CI, design tokens, `chess-core`, `engine` (WASM), tablero, prototipo navegable (Fase 4 del brief) |
| **1 · MVP** | Semanas 4–14 | Todo lo de §1; beta cerrada con 50–100 usuarios |
| **2 · Coach completo** | Meses 4–7 | ADN avanzado + evolución, SRS adaptativo completo, aperturas (principios→planes), finales completos con tablebases, coach con LLM y personalidades, planes personalizados, app Expo, Apple login, modo niños, sets de piezas adicionales, partidas históricas, entrenamiento de cálculo |
| **3 · Social** | Meses 8–12 | Multijugador, amigos, clubes, torneos, rankings (opt‑in), desafíos, entrenadores humanos, contenido premium |
| **4 · Exploración** | 12+ meses | Reconocimiento de tablero por cámara, RA, tableros físicos conectados, voz, coach conversacional, análisis de torneos |

Orden de desarrollo del brief: Producto → UX/UI → Arquitectura *(esta entrega)* → Prototipo navegable → Tablero → Stockfish → Lecciones → Coach → ADN → Personalización → Pruebas → Publicación.

## 3. Plan de pruebas

### 3.1 Reglas y formatos (unitarias + propiedad)
| Área | Casos |
|---|---|
| Movimientos | Todas las piezas, bordes del tablero, piezas clavadas no pueden moverse ilegalmente |
| Jaque / mate / ahogado | Posiciones canónicas + mates raros (mate de la coz, mate con peón) |
| Enroque | Derechos perdidos por mover rey/torre, casillas atacadas, a través de jaque, torre capturada |
| Promoción | Las 4 piezas, promoción con captura, promoción con jaque/mate |
| Captura al paso | Solo inmediatamente; al paso que deja el rey en jaque (descubierta horizontal) |
| Tablas | Triple repetición, 50 jugadas (y 75), material insuficiente (K vs K, K+A vs K, K+C vs K, alfiles del mismo color) |
| FEN/PGN | Round‑trip, PGN con variantes/comentarios/NAGs, entradas malformadas y maliciosas |
| Perft | perft(1..5) desde posiciones de referencia públicas coincide con valores conocidos |

### 3.2 Motor y explicación
- `EngineAdapter`: mismas mejores jugadas WASM vs nativo en conjunto de 200 posiciones (tolerancia de profundidad).
- Clasificador: conjunto dorado de 500 jugadas etiquetadas por entrenadores; acuerdo ≥ 90 % en clase ±1.
- Detector de motivos: 50+ posiciones por motivo con etiqueta; precisión/recall ≥ 0,9 en horquilla, clavada, colgada.
- ExplanationEngine: cada explicación menciona solo piezas/casillas/jugadas presentes en los hechos (test automático); sin números en modo principiante.
- Validador LLM (Fase 2): corpus adversarial de salidas con jugadas inventadas → 100 % rechazadas.
- `puzzle-verify`: ningún puzzle publicado con solución alternativa equivalente.
- Bots: calibración por simulación (bot N vs bot N+1 ≈ 64 % para el superior) y con usuarios reales.

### 3.3 Aprendizaje y perfil
- SRS: tabla de transiciones por `Grade`, límites de `ease`, fechas en husos horarios distintos.
- BKT/dominio: escenarios (1 fallo con P alto = desliz; 2 fallos en 5 = reprogramar), ★ requiere contextos múltiples.
- ADN: determinismo dado un conjunto de partidas; intervalos amplios con pocas partidas; no se muestra delta no significativo.
- ERR: no se muestra con < 5 partidas por ventana.
- Recomendador: pruebas de "historias" (Jugador A/B/C del brief reciben planes distintos).

### 3.4 Sincronización y datos
Eventos duplicados idempotentes, offline prolongado (1 000 eventos), conflicto de ajustes, exportación completa, eliminación y purga, cuentas infantiles sin funciones restringidas.

### 3.5 UX y accesibilidad
- Prueba de usabilidad con 8–10 principiantes absolutos: deben completar Nivel 0 *sin ayuda externa* (criterio §104).
- Axe/Lighthouse: WCAG 2.2 AA, navegación por teclado, lector de pantalla en tablero.
- Rendimiento: tablero a 60 fps en móvil de gama media; primera carga PWA < 2,5 s LCP en 4G.

### 3.6 E2E
Playwright: onboarding → test → lección → partida vs bot → análisis → puzzle personal aparece al día siguiente (reloj simulado) → resolución → dominio actualizado.

### 3.7 Contenido
Revisión por un entrenador titulado de cada lección y puzzle original; verificación de originalidad (sin texto ni ejercicios de obras protegidas).
