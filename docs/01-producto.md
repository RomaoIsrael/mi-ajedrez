# 01 · Producto

## 1. Concepto general

**Kavalo** es un entrenador personal digital de ajedrez. Lleva a una persona de *"no sé jugar"* a *"entiendo posiciones, táctica, estrategia, aperturas, medio juego y finales, y puedo analizar mis propias partidas"*.

La diferencia con una app de juego o de puzzles es el **bucle de aprendizaje cerrado**:

```
        ┌───────────────────────────────────────────────────────────┐
        ▼                                                           │
   JUGAR / RESOLVER ──► DETECTAR ERROR ──► DIAGNOSTICAR CONCEPTO     │
                                              │                     │
                                              ▼                     │
   ADAPTAR PLAN ◄── VERIFICAR DOMINIO ◄── PRACTICAR ◄── EXPLICAR ────┘
```

Cada interacción (una jugada, un puzzle, una lección) produce **evidencia** sobre lo que el jugador sabe. Esa evidencia alimenta tres modelos:

1. **Modelo de conocimiento** — estado de dominio de cada concepto (🔒 ○ ◐ ● ★ ♛).
2. **Modelo de errores** — patrones recurrentes y su tasa de reducción.
3. **ADN Ajedrecístico** — tendencias de estilo (no etiquetas fijas).

El **Coach** consulta los tres para responder siempre: *¿qué debería estudiar ahora y con qué ejercicio?*

## 2. Propuesta de valor

**Para** personas que quieren aprender ajedrez de verdad (desde cero o estancadas en un nivel),
**que** se frustran con apps que solo dan la mejor jugada o números de evaluación,
**Kavalo es** un entrenador personal
**que** convierte cada error en una lección explicada con palabras, lo transforma en un ejercicio y comprueba días después que lo has aprendido.
**A diferencia de** plataformas de juego y bases de puzzles genéricas,
**Kavalo** conoce tu historial, recuerda tus errores, descubre tu estilo y retira la ayuda a medida que mejoras.

### Propuesta en una frase
> *"No te dice la mejor jugada. Te enseña a encontrarla."*

### Pilares de valor

| Pilar | Qué recibe el usuario | Prueba tangible |
|---|---|---|
| Explicación humana | "Tu caballo quedó sin defensa" en vez de "-3.2" | Cero números de motor en modo principiante |
| Memoria pedagógica | La app recuerda que ya tuviste ese error | Tus errores reaparecen como puzzles días después |
| Personalización real | Plan distinto para cada jugador | Plan diario según tiempo, objetivo y debilidades |
| Progreso medible | "Piezas colgadas: 3,4 → 0,8 por partida (-76 %)" | Error Reduction Rate semanal |
| Autonomía | Ayudas que desaparecen | Índice de independencia (ver §6) |

## 3. 30 propuestas de nombre

Criterios: corto (≤ 8 letras idealmente), pronunciable en ES/EN/PT/FR, evocador de estrategia/aprendizaje, apto para dominio `.app`/`.com`.

| # | Nombre | Idea |
|---|---|---|
| 1 | **Kavalo** | Caballo (ES/PT/IT) estilizado; conecta con la pieza emblema |
| 2 | **Plyo** | *Ply* = media jugada; técnico y breve |
| 3 | Knightwise | Sabiduría del caballo |
| 4 | Ponderly | Pensar antes de mover |
| 5 | Chessence | Esencia del ajedrez |
| 6 | Candido | Jugadas *candidatas* |
| 7 | Zugly | Guiño a *zugzwang*, tono amable |
| 8 | Kingsight | Visión del rey / visión de tablero |
| 9 | Tempi | Plural de *tempo*; ritmo y tiempo |
| 10 | Fianko | Fianchetto; sonoro, internacional |
| 11 | Gambeo | Gambito + aprendizaje |
| 12 | Oppo | La oposición (finales) |
| 13 | Rookwise | Torre + sabiduría |
| 14 | Knightpath | La trayectoria del caballo |
| 15 | Tactiq | Táctica, sonido tecnológico |
| 16 | Stratia | Estrategia |
| 17 | Calcura | Cálculo + cura (corrige errores) |
| 18 | Movemind | Mover con la mente |
| 19 | Coachess | Coach + chess |
| 20 | Elevo | Elevar el nivel |
| 21 | Nodo | Nodos del árbol de variantes / mapa de aprendizaje |
| 22 | Echeq | Échec (FR) + check |
| 23 | Zwisch | *Zwischenzug*, la jugada intermedia |
| 24 | Pensa | "Piensa" (ES/PT/IT) |
| 25 | Vigil | Vigilancia de amenazas |
| 26 | Lumeo | Iluminar la posición |
| 27 | Cavali | Caballería; elegante |
| 28 | Mentoro | Mentor |
| 29 | Kasa64 | Las 64 casillas |
| 30 | Ajedra | Ajedrez + ágora |

**Recomendación provisional:** `Kavalo` (codename). Top‑5 para verificación: Kavalo, Plyo, Pensa, Knightpath, Fianko.

> ⚠️ **Antes de elegir el nombre definitivo** verificar: EUIPO / OEPM / USPTO / WIPO (clases 9, 41 y 42), dominios `.com`/`.app`/`.io`, handles en tiendas de apps y redes sociales, y connotaciones negativas en los idiomas objetivo. Ningún nombre de esta lista ha sido verificado aún.

## 4. Filosofía central

**No enseñar solamente qué jugar. Enseñar a pensar.**

Habilidades cognitivas que la app desarrolla (y mide):

| Habilidad | Cómo se entrena | Cómo se mide |
|---|---|---|
| Observar | Entrenamiento de visión (piezas atacadas, indefensas) | Precisión y tiempo en ejercicios de visión |
| Identificar amenazas | Pregunta "¿qué amenaza tu rival?" tras cada jugada rival | % de amenazas detectadas en partidas |
| Generar candidatas | Entrenamiento de cálculo (proponer 2–3 jugadas) | Nº de candidatas relevantes / top‑3 del motor |
| Calcular | Visualización sin mover piezas | Profundidad y exactitud de la línea declarada |
| Evaluar | "¿Quién está mejor y por qué?" | Coincidencia con evaluación y factores del motor |
| Planificar | Partidas temáticas con objetivo | Cumplimiento del objetivo |
| Aprender de errores | Puzzles desde partidas propias | Error Reduction Rate |
| Decidir solo | Retirada progresiva de ayudas | Índice de independencia |

## 5. Personas

| Persona | Perfil | Necesidad clave | Riesgo |
|---|---|---|---|
| **Lucía, 34** | Nunca jugó; quiere jugar con su hijo | Empezar sin sentirse tonta | Abandono por sobrecarga |
| **Mateo, 9** | Niño curioso | Historias, recompensas, pantallas visuales | Aburrimiento con texto |
| **Andrés, 27** | Juega online, estancado en ~1200 | Saber *por qué* pierde | Busca solo jugar, no estudiar |
| **Carmen, 45** | Jugadora de club ~1700 | Finales, planes, preparar torneos | Contenido demasiado básico |
| **Javier, 62** | Jugó de joven, retoma | Ritmo pausado, alto contraste | Accesibilidad |

## 6. Métricas norte

La app **no** optimiza tiempo de uso. Optimiza aprendizaje.

- **North Star:** *Conceptos dominados verificados por semana* (dominio demostrado en ≥ 2 contextos y ≥ 2 momentos distintos).
- **Error Reduction Rate (ERR)** por categoría: `1 − (tasa_actual / tasa_base)` con ventanas de 30 días y ≥ 5 partidas por ventana.
- **Índice de independencia:** `1 − (pistas usadas ponderadas / oportunidades de pista)`, tendencia a 4 semanas.
- **Retención de conceptos:** % de repasos espaciados resueltos correctamente al primer intento.
- **Reducción de blunders:** blunders por 40 jugadas.
- Métricas de salud del producto (secundarias): activación (primera lección completada), retención D7/D30, NPS.

## 7. Criterio de éxito final

Una persona que nunca ha jugado debe poder abrir la app **sin instrucciones externas** y progresivamente aprender a comprender el tablero, mover, detectar amenazas, pensar antes de mover, calcular, planificar, jugar aperturas por principios, resolver tácticas, jugar finales y reconocer sus errores de forma independiente.
