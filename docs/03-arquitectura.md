# 03 · Arquitectura

## 1. Arquitectura funcional

Módulos de dominio y sus responsabilidades:

```
┌──────────────────────────────── EXPERIENCIA ────────────────────────────────┐
│ Onboarding · Home · Aprender (mapa) · Jugar · Puzzles · Análisis · ADN ·    │
│ Progreso · Aperturas · Finales · Biblioteca · Perfil · Ajustes               │
└───────────────┬─────────────────────────────────────────────┬───────────────┘
                │                                             │
┌───────────────▼──────────────┐              ┌───────────────▼──────────────┐
│ 1. MOTOR (verdad objetiva)    │              │ 2. PEDAGOGÍA (qué enseñar)    │
│ - Reglas (chess.js)           │              │ - Currículo / grafo concepto  │
│ - Stockfish (perfiles)        │              │ - Lecciones EMPCRAE           │
│ - Bots humanizados            │              │ - Puzzles y generador         │
│ - Clasificador de jugadas     │              │ - Motor de dominio            │
│ - Detector de motivos tácticos│              │ - Repetición espaciada        │
└───────────────┬──────────────┘              └───────────────┬──────────────┘
                │         ┌─────────────────────────────┐     │
                └────────►│ ChessExplanationEngine      │◄────┘
                          │ (hechos → concepto → texto) │
                          └──────────────┬──────────────┘
┌──────────────────────────────┐         │         ┌──────────────────────────────┐
│ 3. PERFIL (quién es)          │◄────────┴────────►│ 4. IA (cómo decirlo)          │
│ - UserChessProfile            │                   │ - Verbalización por nivel     │
│ - ADN Ajedrecístico           │                   │ - Personalidad del coach      │
│ - Detector de errores         │                   │ - Conversación guiada         │
│ - Ratings múltiples           │                   │ - Guardarraíles: sin inventar │
└───────────────┬──────────────┘                   └──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────────────┐
│ COACH / RECOMENDADOR: ¿qué estudiar ahora? → plan diario, misiones, repasos   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**EMPCRAE** = Explicar → Mostrar → Practicar → Corregir → Repetir → Aplicar → Evaluar (ver [05-pedagogia](05-pedagogia.md)).

## 2. Arquitectura técnica

### Decisión: monorepo TypeScript, web‑first PWA

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| Flutter + FastAPI | UI nativa muy fluida | Dos lenguajes; lógica de dominio duplicada entre cliente (offline) y servidor | ✗ |
| React Native + FastAPI | Un cliente móvil | Dominio duplicado en Python/TS | ✗ |
| **Next.js PWA + Expo (RN) + NestJS, todo TS** | Un único paquete de dominio (reglas, clasificador, explicador, dominio, SRS) ejecutable en cliente offline **y** en servidor; Stockfish WASM en navegador | RN algo menos fluido que Flutter en animaciones complejas | ✅ |

La lógica pedagógica **debe** funcionar offline (requisito §72), así que compartir código cliente/servidor es decisivo.

### Estructura del monorepo (pnpm + Turborepo)

```
kavalo/
├─ apps/
│  ├─ web/            Next.js 15 (App Router) · PWA · i18n
│  ├─ mobile/         Expo / React Native (Fase 2)
│  └─ api/            NestJS · REST + WebSocket
├─ workers/
│  └─ analysis/       Worker Node con Stockfish nativo (cola BullMQ)
├─ packages/
│  ├─ chess-core/     Wrapper de chess.js · FEN/PGN · utilidades de tablero
│  ├─ engine/         Interfaz UCI común: WASM (cliente) / nativo (servidor), perfiles
│  ├─ bots/           Bots humanizados y personalidades
│  ├─ tactics/        Detector de motivos (horquilla, clavada, …) sobre posición + PV
│  ├─ explain/        ChessExplanationEngine (hechos → concepto → plantilla/LLM)
│  ├─ pedagogy/       Grafo de conceptos, dominio, SRS, selector de puzzles
│  ├─ profile/        UserChessProfile, ADN, detector de errores, ratings Glicko‑2
│  ├─ coach/          Recomendador y generador de planes
│  ├─ content/        Lecciones y puzzles originales (JSON/MDX versionados)
│  ├─ ui/             Design system (tokens, Board, CoachBubble…)
│  └─ i18n/           Diccionarios es/en
└─ infra/             Docker, IaC, CI
```

### Componentes de ejecución

```
[Cliente web/móvil]
  ├─ UI (React)
  ├─ Stockfish WASM (Web Worker) ── juego contra bots, análisis rápido (depth ≤ 18)
  ├─ packages de dominio (explain, pedagogy, profile, coach) ── funcionan offline
  └─ IndexedDB (Dexie) / SQLite (móvil) ── cola de eventos para sync
        │  REST (JSON) + WebSocket (análisis en progreso, partidas en vivo Fase 3)
        ▼
[API NestJS] ── Auth (email, Google, Apple, invitado) · Perfil · Contenido · Sync
   ├─ PostgreSQL 16 (datos principales, JSONB para ADN/snapshots)
   ├─ Redis (caché de evaluaciones por FEN, sesiones, rate limiting, colas BullMQ)
   ├─ Workers de análisis (Stockfish nativo, multi‑hilo, depth 20–24, MultiPV 3)
   ├─ Servicio LLM (proveedor intercambiable; salida validada)
   └─ Object storage (PGN subidos, exportaciones, imágenes)
```

**¿GraphQL?** No en MVP: los datos son de un solo usuario y las pantallas tienen necesidades estables; REST + OpenAPI generando cliente tipado basta. WebSocket solo para progreso de análisis y, en Fase 3, multijugador.

### Caché de evaluaciones

Clave `eval:{fen_normalizada}:{depth}:{multipv}` en Redis + tabla `position_evals` en Postgres para posiciones de contenido. Las posiciones de apertura y puzzles se pre‑analizan offline y se distribuyen con el contenido.

## 3. Stockfish

Interfaz común `EngineAdapter` (UCI) con dos implementaciones: `stockfish.wasm` (lite, NNUE) en cliente y binario nativo en workers. Licencia GPLv3: el motor se distribuye como componente separado con su código fuente y aviso de licencia; revisar implicaciones legales antes de publicar en tiendas.

### Perfiles por función

| Perfil | Uso | Configuración |
|---|---|---|
| `play-bot` | Rival (ver bots) | Según nivel: `Skill Level`, `nodes`, MultiPV para humanización |
| `hint` | Pistas en Coach Mode | depth 14, MultiPV 3, ≤ 300 ms |
| `live-eval` | Barra/estado durante partida (oculta a principiantes) | depth 12, incremental |
| `review-fast` | Post‑partida en cliente | depth 16, MultiPV 2, ~150 ms/jugada |
| `review-deep` | Análisis servidor, generación de puzzles | depth 22, MultiPV 3, `Threads` 4 |
| `puzzle-verify` | Validar unicidad de solución | depth 24, MultiPV 2; única si gap ≥ 150 cp (o mate vs no‑mate) |
| `what-if` | "¿Qué pasaba si…?" | depth 16, PV recortada a 3–5 jugadas (ampliable) |

### Bots humanizados (niveles 1–10)

Los niveles bajos **no** juegan al azar: imitan errores humanos típicos. Algoritmo:

1. Obtener MultiPV `k` (k = 6–8) con presupuesto de nodos del nivel.
2. Convertir cada candidata a **probabilidad de victoria** `W(cp) = 1 / (1 + e^(−0.00368·cp))`.
3. Aplicar **sesgos humanos** según nivel:
   - *Ceguera de amenazas*: con probabilidad `pBlind`, ignora respuestas del rival de más de `h` plies (horizonte corto) → cae en tácticas simples.
   - *Atracción material*: sobrepondera capturas y jaques.
   - *Piezas colgadas*: con probabilidad `pHang`, no considera defender una pieza atacada.
   - *Principios de apertura imperfectos*: en niveles 1–3, mueve la dama pronto o repite pieza con cierta probabilidad.
4. Elegir con softmax de temperatura `T` sobre `W` sesgado.
5. Aplicar personalidad (ver [06-inteligencia §8](06-inteligencia.md#8-robots-con-personalidad)).

| Nivel | Nombre | Elo aprox. | nodes | T | pBlind | pHang | Horizonte |
|---|---|---|---|---|---|---|---|
| 1 | Primera partida | 250 | 200 | 1.2 | 0.60 | 0.40 | 1 |
| 2 | Aprendiz | 450 | 500 | 1.0 | 0.45 | 0.30 | 1 |
| 3 | Principiante | 700 | 1 000 | 0.8 | 0.35 | 0.20 | 2 |
| 4 | Club inicial | 950 | 3 000 | 0.6 | 0.25 | 0.12 | 2 |
| 5 | Club | 1200 | 8 000 | 0.45 | 0.15 | 0.07 | 3 |
| 6 | Intermedio | 1450 | 20 000 | 0.3 | 0.08 | 0.03 | 4 |
| 7 | Avanzado | 1700 | 60 000 | 0.2 | 0.04 | 0.01 | 6 |
| 8 | Experto | 2000 | 200 000 | 0.1 | 0.01 | 0 | — |
| 9 | Maestro | 2300 | Skill 18, 1 s | — | — | — | — |
| 10 | Máxima | 3000+ | Skill 20, 2 s+ | — | — | — | — |

Los valores son iniciales y se **calibran** con partidas de usuarios reales (objetivo: resultado esperado según Glicko‑2 ± 5 %).

## 4. ChessExplanationEngine

```
POSICIÓN (FEN + jugada del usuario)
   │
   ▼
STOCKFISH  → eval antes/después, mejor jugada, PV de la mejor y de la jugada jugada (MultiPV)
   │
   ▼
EXTRACCIÓN DE HECHOS (determinista, packages/tactics)
   - material ganado/perdido en la PV
   - pieza colgada / indefensa (atacantes > defensores, SEE < 0)
   - motivos: horquilla, clavada, rayos X, descubierto, sobrecarga, desviación…
   - amenaza de mate / red de mate
   - seguridad del rey (escudo de peones, casillas atacadas cerca del rey)
   - desarrollo (piezas sin mover, enroque), estructura (doblados, aislados, pasados)
   - actividad (movilidad), fase de juego
   │
   ▼
CLASIFICADOR DE PATRONES → concepto(s) raíz con confianza
   (material · táctica[subtipo] · rey · desarrollo · estructura · actividad · espacio · tiempo · final)
   │
   ▼
CONTEXTO DEL USUARIO → nivel, veces que cometió este error, estado de dominio del concepto,
                       personalidad del coach, idioma, modo niño/adulto
   │
   ▼
EXPLICACIÓN DIDÁCTICA
   1) Plantilla determinista (siempre disponible, offline)
   2) Reescritura por LLM opcional (tono/nivel), validada contra los hechos
   + flechas y resaltados en el tablero, + ejercicio de seguimiento
```

### Estructura de salida

```ts
interface Explanation {
  moveClass: MoveClass;                 // blunder, mistake, …
  concept: ConceptId;                   // p.ej. "tactics.hanging-piece"
  facts: Fact[];                        // hechos verificados (fuente de verdad)
  whatWentWrong: string;                // QUÉ estuvo mal
  why: string;                          // POR QUÉ
  consequence: string;                  // QUÉ consecuencia (PV traducida)
  whatToNotice: string;                 // QUÉ debías observar
  howToAvoid: string;                   // CÓMO evitarlo (pregunta de la rutina mental)
  visuals: { arrows: Arrow[]; highlights: Square[] };
  followUp: { type: 'puzzle' | 'lesson' | 'retry'; refId: string };
  memoryStage: 1 | 2 | 3 | 4;           // explicación completa → recordatorio → pregunta → sin ayuda
}
```

Esto implementa el principio §93: nunca solo "esta jugada está mal".

### Explicación según nivel (misma jugada, mismos hechos)

| Nivel | Texto |
|---|---|
| Principiante | "Tu caballo en e5 quedó sin defensa y el alfil rival puede capturarlo gratis." |
| Intermedio | "Esta jugada pierde material: el caballo de e5 está clavado contra tu dama y no puede retirarse." |
| Avanzado | "Permite …Axe5 porque tu d4 está sobrecargado: defiende e5 y c5 a la vez." |

## 5. IA generativa: rol y guardarraíles

**Sí:** explicar, adaptar lenguaje y tono, conversar sobre una posición, motivar, resumir reportes.
**No:** evaluar posiciones, proponer jugadas no verificadas, inventar variantes.

Guardarraíles:
1. El LLM recibe solo `facts` estructurados + plantilla; no la posición "en crudo" para juzgarla.
2. **Validador post‑generación:** toda jugada en notación SAN que aparezca en el texto debe existir en las PV del motor; toda pieza/casilla mencionada debe coincidir con los hechos. Si falla → se usa la plantilla determinista.
3. Sin números de evaluación en modo principiante (los filtra el validador).
4. Preguntas libres del usuario sobre una posición: se consulta al motor primero y se responde sobre sus resultados.
5. Modo niños: sin chat libre; solo textos plantillados/revisados.
6. Coste: caché de explicaciones por `(fen, jugada, concepto, nivel, idioma, tono)`.

## 6. Offline

| Disponible sin conexión | Mecanismo |
|---|---|
| Jugar contra bots 1–8 | Stockfish WASM |
| Análisis post‑partida rápido | `review-fast` en cliente + plantillas |
| Lecciones descargadas, puzzles | Paquetes de contenido versionados en IndexedDB |
| Historial y perfil básico | Base local |
| Sincronización | Cola de eventos append‑only; el servidor recalcula agregados; conflictos por *last‑writer‑wins* en ajustes y *merge* por eventos en progreso |

## 7. Seguridad y privacidad

- Auth: OAuth2/OIDC (Google, Apple), email con enlace mágico o contraseña (Argon2id), cuentas invitado convertibles.
- JWT de acceso corto + refresh rotativo; HTTPS; cifrado en reposo.
- Validación estricta de FEN/PGN importados (tamaño, parser seguro), rate limiting.
- **Privacidad por defecto:** perfil privado, mínima recogida, sin publicidad comportamental.
- Exportación completa de datos (JSON + PGN) y eliminación de cuenta en autoservicio (RGPD).
- **Menores:** cuenta infantil gestionada por adulto, consentimiento parental verificable, sin chat libre, sin funciones sociales abiertas (COPPA / RGPD art. 8).
- Telemetría de aprendizaje agregada y opt‑in para mejorar contenido.

## 8. Formatos y comunicación

FEN y PGN (con comentarios y NAGs para exportar análisis) · REST + OpenAPI · WebSocket · Import PGN/FEN (pegar o archivo) · Export PGN, FEN, PNG del tablero, PDF del reporte, JSON de estadísticas y plan.
