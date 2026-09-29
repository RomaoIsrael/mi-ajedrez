# 13 · Coach (Fase 8)

## Objetivo

Que la app responda cada día, de forma explicable, a **"¿qué debería estudiar ahora?"**, que compruebe días después si lo aprendido se mantiene, que premie solo el aprendizaje real y que vaya **retirando las ayudas** cuando ya no hacen falta.

## Arquitectura

```
packages/coach  (funciones puras, sin DOM, probadas en Node)
 ├─ types.ts         CoachState (subconjunto de UserChessProfile) y ActivityEvent
 ├─ stats.ts         errores por tipo, ERR, "¿sin este error en las últimas N partidas?"
 ├─ recommend.ts     recomendaciones puntuadas y plan diario
 ├─ missions.ts      misiones del día
 ├─ achievements.ts  logros y racha
 ├─ report.ts        reporte semanal + exportación Markdown
 └─ fading.ts        retirada progresiva del checklist y de los avisos de amenaza
apps/web-prototype
 ├─ state/store.ts     registro de actividad, historial de rating, cobro de misiones y logros
 ├─ state/insights.ts  puente: aplica el coach al perfil y traduce acciones a rutas
 └─ screens/           Home, repaso de lección, logros (#/achievements), reporte (#/report)
```

**Fuente de verdad:** un registro de actividad *append-only* (`lesson`, `review`, `puzzle`, `game`, `mastery`). Misiones, logros, racha y reporte se calculan a partir de él, igual que hará el servidor con la cola de eventos (docs/07-datos.md).

## Recomendador

Cada candidato recibe una puntuación con factores legibles. La Home muestra el primero con **"¿Por qué esto?"** (motivo y factores) y ofrece las alternativas en **"Otras opciones"**.

| Candidato | Puntuación base | Ajustes |
|---|---|---|
| Repaso de lección vencido | 60 | +5 por día de retraso (máx. +30) |
| Repasos de puzzles (incluidos los de tus partidas) | 55 | +3 por repaso (máx. +15) |
| Tu error más frecuente (solo si aparece en ≥ 2 partidas) | 40 + 10 por partida (máx. 85) | Lleva a la lección si no la hiciste, si no a puzzles del concepto |
| Lección disponible | 50 (−2 por posición en el mapa) | +12 si encaja con tu objetivo · −15 si tienes ≥ 4 conceptos a medio aprender · −20 si es de aperturas y tus partidas se deciden por errores tácticos |
| Partida con el coach | 30 | +25 si aprendiste ≥ 2 conceptos desde tu última partida · −20 si aún no conoces las piezas |
| Cualquiera | — | −25 por fatiga si ya trabajaste ese concepto 3 veces hoy |

Ejemplos cubiertos por las pruebas:
- **Principiante absoluto:** empieza por "El tablero".
- **Jugador que cuelga piezas en 4 de 6 partidas:** "Hoy trabajamos: proteger tus piezas", y las aperturas quedan penalizadas.
- **Mismo nivel, objetivos distintos:** con objetivo "finales" le toca rey y dama contra rey; con objetivo "táctica", otra lección.
- **Sistema de confianza:** un error en una sola partida no cambia el plan.

## Repaso espaciado de lecciones

- Al completar una lección se crea su tarjeta de repaso: vuelve al día siguiente y después sigue la escalera **1 → 3 → 7 → 14 → 30 días** (docs/05-pedagogia.md §6).
- El repaso (`#/lesson/<id>/review`) tiene **solo pasos de práctica**, como máximo 3, y la selección rota entre repasos para no memorizar siempre la misma posición.
- Nota: sin errores = *good* (avanza), 1 error = *hard* (intervalo más corto), 2 o más = *fail* (vuelve a 1 día). También cuenta como evidencia de dominio en el contexto "repaso".
- Las lecciones completadas antes de esta versión reciben su tarjeta automáticamente.

## Misiones diarias

Hasta 3 al día, elegidas según lo que el jugador necesita. Siempre premian aprendizaje verificado:

| Misión | XP |
|---|---|
| Completa un repaso pendiente (prioritaria si hay repasos) | 15 |
| Resuelve 2 puzzles de tu punto débil (prioritaria si hay un error repetido) | 20 |
| Completa una lección nueva | 20 |
| Resuelve 3 puzzles al primer intento y sin pistas | 15 |
| Juega una partida sin errores graves | 25 |

La XP se cobra una sola vez por misión y día, con un aviso en pantalla.

## Logros (13)

Primer paso · Bases sólidas (todos los fundamentos) · Ojo táctico (toda la táctica) · Primer mate (en partida) · Guardián (10 partidas sin piezas colgadas) · Vista de lince (10 puzzles al primer intento) · Dos jugadas por delante (un mate en 2) · Memoria de elefante (10 repasos seguidos correctos) · Aprender del error (resolver un ejercicio creado desde tu propia partida) · Técnica de final (mate con rey y dama en la práctica) · Constancia (7 días seguidos) · Corrector (reducir a la mitad un tipo de error) · Autodidacta (5 partidas sin pistas ni errores graves).

Ninguno se consigue por tiempo de uso o por entrar en la app.

## Reporte semanal (`#/report`)

Compara los últimos 7 días con los 7 anteriores: días activos, minutos de estudio, lecciones, repasos, puzzles (precisión al primer intento), partidas, variación de rating, errores por partida, mejoras por tipo de error y nuevos puntos fuertes (conceptos que pasaron a "comprendido" o más). Solo afirma una mejora si hay al menos 2 partidas en cada semana y el error bajó un 30 % o más. Se exporta en Markdown.

## Retirada progresiva de ayudas

- Cada punto del **checklist antes de mover** tiene asociados unos tipos de error. Se retira cuando llevas **5 partidas seguidas** sin ninguno de ellos, y la partida muestra cuáles se retiraron y por qué.
- El **aviso proactivo de amenazas** se desactiva cuando llevas 5 partidas sin ignorar amenazas ni dejar piezas colgadas, o cuando el concepto "¿Qué amenaza mi rival?" está dominado.

## Pruebas

- `packages/coach/test/coach.test.mjs` (15 pruebas): recomendaciones para distintos perfiles de jugador, fatiga, plan diario, misiones, logros, racha, retirada de ayudas y reporte semanal.
- `tests/e2e/coach.e2e.cjs` (16 comprobaciones): aviso de logro, recomendación con motivo y factores, misiones, repaso espaciado completo con reprogramación a 3 días, misión cobrada, logros, reporte y retirada del checklist.

## Pendiente (siguientes fases)

- Recalibrar los pesos del recomendador con datos reales (tasa de reducción de errores y retención).
- Reporte mensual y evolución del ADN "antes → ahora" (Fase 9).
- Explicaciones con IA generativa según la personalidad del coach, validadas contra los hechos del motor.
