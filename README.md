# Kavalo — Entrenador digital personal de ajedrez

> *Nombre provisional (codename). Ver [docs/01-producto.md](docs/01-producto.md#3-30-propuestas-de-nombre) — la marca definitiva requiere verificación de registro y dominio.*

Kavalo no es otra app para jugar partidas. Es un **entrenador personal** que:

```
APRENDE DEL JUGADOR → DETECTA SUS ERRORES → EXPLICA POR QUÉ → ENSEÑA EL CONCEPTO
→ LE HACE PRACTICAR → COMPRUEBA SI APRENDIÓ → ADAPTA EL SIGUIENTE ENTRENAMIENTO
```

Principio rector: **no enseñar qué jugar, enseñar a pensar.** El éxito se mide cuando el jugador ya no necesita la app para encontrar la jugada.

## Estado del proyecto

| Fase | Contenido | Estado |
|---|---|---|
| 1. Producto | Concepto, propuesta de valor, nombres, pedagogía, ADN, coach | ✅ Documentado |
| 2. UX/UI | Flujos, mapa de pantallas, wireframes, design system, identidad | ✅ Documentado |
| 3. Arquitectura | Funcional, técnica, Stockfish, base de datos, modelos | ✅ Documentado |
| 4. Prototipo navegable | App web con tablero real, lecciones, partidas con coach, análisis, puzzles, progreso y ADN básico | ✅ [docs/10-prototipo.md](docs/10-prototipo.md) |
| 5. Tablero | Flechas y círculos del usuario, navegación ◀ ▶, teclado, jugada escrita, 6 temas, daltonismo, animaciones, sonidos | ✅ [docs/11-tablero.md](docs/11-tablero.md) |
| 6. Stockfish | Motor fuerte en Web Worker, análisis posicional, bots 7–10 | ⏭ Siguiente (requiere acceso a npm) |
| 7. Contenido | 21 lecciones (fundamentos, visión, táctica, aperturas, estrategia, finales) y 28 puzzles verificados, incluidos mates en 2 | ✅ [docs/12-contenido.md](docs/12-contenido.md) |
| 8–12 | Coach, ADN, personalización, pruebas, publicación | Pendiente |

## Probar el prototipo

Requiere Node.js ≥ 20. No hay dependencias externas.

```bash
npm install --offline   # solo enlaza los paquetes del monorepo
npm start               # compila y abre http://localhost:5173/apps/web-prototype/
npm test                # 100 pruebas unitarias (perft del motor + verificación de cada lección y puzzle)
npm run test:e2e        # 3 recorridos con Playwright: app, tablero y las 21 lecciones (con el servidor arrancado)
```

```
apps/web-prototype   interfaz (TypeScript + DOM, sin framework)
packages/chess-core  reglas, FEN, SAN, PGN
packages/tactics     ChessExplanationEngine v0: hechos → explicación, pistas, ¿Por qué?
packages/bots        rivales humanizados (niveles 1–6) con personalidad
packages/pedagogy    repetición espaciada y modelo de dominio
packages/content     mapa, 21 lecciones y 28 puzzles originales (verificados por tests)
```

## Entregables iniciales (sección 101 del brief)

| # | Entregable | Documento |
|---|---|---|
| 1 | Concepto general | [01-producto](docs/01-producto.md#1-concepto-general) |
| 2 | Propuesta de valor | [01-producto](docs/01-producto.md#2-propuesta-de-valor) |
| 3 | 30 nombres | [01-producto](docs/01-producto.md#3-30-propuestas-de-nombre) |
| 4 | Identidad visual | [02-identidad-visual](docs/02-identidad-visual.md) |
| 5 | Logo conceptual | [02-identidad-visual](docs/02-identidad-visual.md#2-logo-conceptual) · [`assets/brand/logo.svg`](assets/brand/logo.svg) |
| 6 | Set inicial de piezas | [02-identidad-visual](docs/02-identidad-visual.md#3-set-inicial-royal-modern) · [`assets/pieces/royal-modern/`](assets/pieces/royal-modern/) |
| 7 | Arquitectura funcional | [03-arquitectura](docs/03-arquitectura.md#1-arquitectura-funcional) |
| 8 | Arquitectura técnica | [03-arquitectura](docs/03-arquitectura.md#2-arquitectura-técnica) |
| 9 | Flujo de usuario | [04-ux](docs/04-ux.md#1-flujos-de-usuario) |
| 10 | Mapa de pantallas | [04-ux](docs/04-ux.md#2-mapa-de-pantallas) |
| 11 | Mapa de aprendizaje | [05-pedagogia](docs/05-pedagogia.md#2-mapa-de-aprendizaje) |
| 12 | Sistema de niveles | [05-pedagogia](docs/05-pedagogia.md#4-sistema-de-niveles-y-progresión) |
| 13 | ADN Ajedrecístico | [06-inteligencia](docs/06-inteligencia.md#1-adn-ajedrecístico-chess-dna) |
| 14 | Sistema Coach AI | [06-inteligencia](docs/06-inteligencia.md#3-chess-coach-ai) |
| 15 | Stockfish | [03-arquitectura](docs/03-arquitectura.md#3-stockfish) |
| 16 | Base de datos | [07-datos](docs/07-datos.md#1-esquema-postgresql) |
| 17 | Modelo de usuario | [07-datos](docs/07-datos.md#2-userchessprofile) |
| 18 | Sistema de errores | [06-inteligencia](docs/06-inteligencia.md#4-detector-de-patrones-de-error) |
| 19 | Repetición espaciada | [05-pedagogia](docs/05-pedagogia.md#6-repetición-espaciada) |
| 20 | Gamificación | [08-gamificacion](docs/08-gamificacion.md) |
| 21 | Wireframes | [04-ux](docs/04-ux.md#4-wireframes) |
| 22 | Design System | [02-identidad-visual](docs/02-identidad-visual.md#5-design-system) |
| 23 | MVP | [09-mvp-roadmap-pruebas](docs/09-mvp-roadmap-pruebas.md#1-mvp) |
| 24 | Roadmap | [09-mvp-roadmap-pruebas](docs/09-mvp-roadmap-pruebas.md#2-roadmap) |
| 25 | Plan de pruebas | [09-mvp-roadmap-pruebas](docs/09-mvp-roadmap-pruebas.md#3-plan-de-pruebas) |

Índice completo: [docs/00-indice.md](docs/00-indice.md).

## Decisiones clave (resumen)

- **Web‑first PWA** (Next.js + TypeScript) con Stockfish WASM en Web Worker → funciona offline desde el día 1. App móvil con Expo/React Native reutilizando los paquetes de dominio del monorepo.
- **Backend** Node.js (NestJS) + PostgreSQL + Redis; Stockfish nativo en workers para análisis profundo.
- **Cuatro capas diferenciadoras:** Motor (qué es correcto) → Pedagogía (qué concepto hay detrás) → Perfil (quién es el jugador) → IA generativa (cómo decirlo). La IA **nunca** inventa evaluaciones: solo verbaliza hechos verificados por el motor.
