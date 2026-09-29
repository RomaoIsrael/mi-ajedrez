# 15 · ADN Ajedrecístico (Fase 9)

**Objetivo.** Describir cómo juega el usuario *ahora*, con datos medidos por Stockfish, para
personalizar el entrenamiento (brief §17–21). El ADN nunca es una etiqueta: se expresa como
tendencia («últimamente tiendes a…»), con rango de confianza, y cambia cuando el jugador mejora.

## Arquitectura

```
Partida terminada ──► state/review.ts (segundo plano, en serie)
                        ├─ computeEvals: Stockfish depth 11, una vez por partida (se guarda)
                        ├─ reviewGame (@kavalo/tactics): clase y pérdida de cada jugada
                        ├─ recordEngineFindings: errores posicionales + ejercicios personales
                        ├─ extractFeatures (@kavalo/dna): rasgos medibles de la partida
                        └─ snapshotDna: instantánea semanal para «antes → ahora»
Perfil.games[].features ─► computeDna ─► pantalla ADN · tarjeta Inicio · recomendador · reporte
```

| Archivo | Función |
|---|---|
| `packages/dna/src/features.ts` | `extractFeatures(review, history, {userColor, result, moveTimes, clockFractions})` |
| `packages/dna/src/dna.ts` | `computeDna`, `compareDna`, `describeDna`, `dnaAdvice`, `suggestOpenings` |
| `packages/coach/src/recommend.ts` | candidata «Plan según tu ADN» (puntuación 58, con su motivo) |
| `packages/coach/src/report.ts` | `weeklyReport`, `monthlyReport` con `dnaChanges` |
| `apps/web-prototype/src/state/review.ts` | `ensureReviewed`, `reviewInBackground`, `snapshotDna` |
| `apps/web-prototype/src/screens/dna.ts` | radar ahora/antes, intervalos, estilo, plan y aperturas |

Dependencias: `@kavalo/chess-core`, `@kavalo/tactics`, `@kavalo/content` (aperturas). El paquete
es puro (sin DOM ni motor): recibe revisiones ya hechas, por lo que se prueba sin navegador.

## Qué se mide (rasgos por partida)

| Rasgo | Definición |
|---|---|
| Precisión tranquila / forzada | precisión (curva tipo lichess) cuando la mejor jugada es o no captura/jaque |
| Oportunidades tácticas | el rival pierde ≥ 10 % de probabilidad; se aprovecha si tu pérdida < 5 % |
| Defensa / ventaja | precisión con evaluación ≤ −1,5 / ≥ +1,5 |
| Finales | precisión con ≤ 4 piezas (sin peones ni reyes) |
| Ataque | jaques, piezas a ≤ 2 casillas del rey rival, peones avanzados ante su enroque |
| Sacrificios (y correctos) | entrega de material clasificada como buena por el motor |
| Rápidas / lentas | precisión según la mediana de tiempo por jugada de la partida |
| Presión / apuros | reloj < 20 % (o < 10 %) o posición claramente peor |
| Estilo | posiciones abiertas (≤ 12 peones), cambios, enroque |

## Las 8 dimensiones

Ataque, Defensa, Táctica, Control posicional, Cálculo, Intuición, Finales y Técnica (convertir
ventajas). Cada una exige un mínimo de muestras (6 jugadas, 4 oportunidades, 20 jugadas para el
ataque); si no se alcanza se muestra «sin datos» en vez de inventar un número.

- **Ventana:** últimas 30 partidas analizadas. **Mínimo:** 5 (antes, «perfil en construcción» con
  un ejemplo marcado como tal).
- **Confianza:** baja (< 12), media (< 25), alta.
- **Intervalo:** percentiles 10–90 por *bootstrap* de partidas (200 remuestreos, semilla
  determinista: los mismos datos dan siempre el mismo ADN).
- **Evolución:** un cambio es significativo solo si |Δ| ≥ 5 **y** los intervalos no se solapan.
  «Antes» es la instantánea de hace ≥ 3 semanas (o la primera de más de una semana).

## Uso pedagógico

`dnaAdvice` aplica reglas explicables, por ejemplo: *táctica o ataque altos y finales/técnica
bajos* → «pierdes parte de tus ventajas al llegar al final» → lección Rey y dama contra rey.
Otras reglas: atacar bien y defender mal, intuición ≫ cálculo, buen criterio posicional con
poca táctica, apuros de tiempo frecuentes. El recomendador del coach recibe el primer consejo
como candidata con su motivo; así el ADN cambia el plan diario, no solo una gráfica.

`suggestOpenings` compara el perfil (dinamismo, apertura, agresividad) con el carácter de cada
apertura y filtra por nivel y color (blancas, negras contra 1.e4 y contra 1.d4). Siempre se
presenta como sugerencia.

## Flujo en la app

1. Al terminar una partida se lanza `reviewInBackground` (la cola en serie evita competir por el
   motor). Al arrancar, las 30 partidas más recientes sin rasgos se revisan igual.
2. `play.ts` registra el tiempo de cada jugada del usuario y la fracción de reloj restante
   (deshacer elimina esas entradas).
3. El análisis post-partida reutiliza `ensureReviewed`, de modo que nada se evalúa dos veces.
4. Sin Stockfish el ADN no se inventa: la pantalla lo explica y la app sigue con el análisis táctico.

## Pruebas

- `packages/dna/test/dna.test.mjs` (6): rasgos de una miniatura real, mínimo de partidas,
  intervalos, evolución significativa, consejos y aperturas.
- `packages/coach/test/coach.test.mjs`: candidata del ADN con su motivo y reporte mensual con
  la evolución del ADN.
- `tests/e2e/dna.e2e.cjs`: 6 partidas reales analizadas en segundo plano con Stockfish,
  instantánea, radar antes → ahora, 8 barras con intervalo, estilo, aperturas y reporte mensual.

## Limitaciones

- Las precisiones dependen de la profundidad 11 del motor Lite: bastan para tendencias, no para
  evaluar partidas de maestros.
- Con menos de 12 partidas los rangos son anchos; la interfaz lo dice.
