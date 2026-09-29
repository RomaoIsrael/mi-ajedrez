# 06 · Inteligencia: ADN, Coach, errores y recomendación

## 1. ADN Ajedrecístico (Chess DNA)

**Qué es:** un perfil de **tendencias actuales** de juego, calculado a partir de rasgos medibles en las partidas del usuario. No es una etiqueta permanente ni un juicio de valor.

### 1.1 Dimensiones y cómo se miden

Cada dimensión es un índice 0–100 derivado de *features* objetivas por partida (con motor + detectores), agregadas con ventana móvil ponderada (últimas 30 partidas, peso exponencial a favor de las recientes, solo partidas ≥ 15 jugadas y ritmo ≥ 3 min).

| Dimensión | Features principales |
|---|---|
| Ataque | Jugadas que aumentan presión sobre el rey rival (atacantes cerca del rey), avances de peones hacia el enroque rival, % partidas con ofensiva sostenida |
| Defensa | Precisión en posiciones con eval en contra (< −1), amenazas neutralizadas / amenazas recibidas, partidas salvadas |
| Táctica | Tácticas encontradas / oportunidades tácticas (detectadas por motor), Tactical Rating |
| Estrategia / Control posicional | Precisión en posiciones tranquilas (sin táctica en MultiPV), mejora de peor pieza, respeto de estructura |
| Cálculo | Precisión en posiciones forzadas (secuencias de jaques/capturas), resultados del entrenamiento de cálculo |
| Intuición | Precisión en jugadas rápidas (< mediana de tiempo) en posiciones no forzadas |
| Finales | Precisión y conversión en fase final (material ≤ umbral), Endgame Rating |
| Dinámico ↔ Sólido | Desequilibrios creados, sacrificios, asimetría de estructuras vs cambios y simplificación |
| Agresivo ↔ Paciente | Tiempo hasta el primer ataque, ofensivas prematuras |
| Técnico | Conversión de ventaja ≥ +2 en victoria |

**Preferencias** (distribuciones, no puntuación): posiciones abiertas vs cerradas (nº de peones centrales bloqueados), sacrificios por partida, propensión a cambiar piezas, comportamiento con ventaja (conversión / relajación), bajo presión (precisión cuando el reloj < 20 % o eval en contra), uso del tiempo (distribución y apuros), actividad de piezas (movilidad media), seguridad del rey (enroque, jugadas de peón delante del rey), capacidad defensiva.

### 1.2 Confianza y honestidad

- Cada dimensión lleva **intervalo de confianza** (bootstrap sobre partidas). Si < 10 partidas válidas → se muestra "Perfil en construcción" y rangos amplios.
- Texto siempre contextual: *"Basado en tus últimas 30 partidas."*
- Lenguaje de tendencia: "tiendes a", "últimamente", nunca "eres".

### 1.3 Evolución

Snapshots semanales en `dna_snapshots`. Visualización **ANTES → AHORA** (radar superpuesto y flechas ▲▼) con resumen generado sobre los deltas significativos (fuera del intervalo de confianza):
> *"Hace 3 meses: muy agresivo, poca defensa. Ahora: ataque alto y defensa +18 puntos."*

### 1.4 Uso pedagógico

El ADN modifica el entrenamiento mediante reglas explicables:

| Patrón de ADN | Acción del coach |
|---|---|
| Táctica alta + Finales bajos | Semana de finales y conversión de ventaja |
| Ataque alto + Defensa baja | Posiciones de defensa, profilaxis, bots "Leo" para defender |
| Intuición alta + Cálculo bajo | Entrenamiento de cálculo sin mover |
| Sólido + pocas tácticas encontradas | Puzzles tácticos desde posiciones tranquilas |
| Precisión cae con reloj bajo | Partidas con incremento, gestión del tiempo |

Mensaje ejemplo: *"Tu fortaleza principal es crear ataques. Sin embargo, pierdes parte de tus ventajas al llegar al final. Durante esta semana vamos a reforzar finales y conversión de ventaja."*

### 1.5 Compatibilidad estilo ↔ aperturas

Cada apertura tiene un vector de carácter (dinamismo, apertura de posición, complejidad táctica, teoría requerida). Se recomienda por similitud coseno con el ADN + nivel (evita aperturas de mucha teoría a principiantes). Siempre como sugerencia:
> *"La Siciliana puede resultarte interesante por las posiciones dinámicas que normalmente disfrutas jugar."*

## 2. Clasificador de jugadas

Basado en **pérdida de probabilidad de victoria** (más robusto que centipeones en posiciones decididas):

`W(cp) = 1 / (1 + e^(−0.00368·cp))` desde el punto de vista del jugador; `ΔW = W(mejor) − W(jugada)`.

| Clase | Regla (umbral base) |
|---|---|
| Book | En el libro de aperturas del contenido |
| Best | Coincide con la mejor jugada |
| Excellent | ΔW < 2 % |
| Good | ΔW < 5 % |
| Inaccuracy `?!` | 5 % ≤ ΔW < 10 % |
| Mistake `?` | 10 % ≤ ΔW < 20 % |
| Blunder `??` | ΔW ≥ 20 % |
| Missed Win | W(mejor) ≥ 90 % y W(jugada) < 70 % |
| Brilliant `!!` | Best/Excellent **y** sacrificio de material (SEE < 0) **y** no obvia (la jugada no está en el top‑1 a baja profundidad) **y** la posición no estaba ya totalmente ganada |

**Ajuste por nivel:** para principiantes los umbrales se relajan (x1,5) y solo se destacan los errores que el usuario *podía* ver (p.ej. pieza colgada en 1 jugada) → evita saturar con matices posicionales. La **precisión** mostrada es humana ("buena", "muy buena") y el número exacto solo a partir de Intermedio.

## 3. Chess Coach AI

### 3.1 Qué sabe
Nivel, historial, errores, fortalezas, debilidades, aperturas, tácticas, finales, estilo (ADN), velocidad de aprendizaje (media de sesiones hasta ● por concepto), objetivo personal y tiempo disponible.

### 3.2 Decisión "¿qué debería aprender ahora?"

Tras cada sesión se puntúa cada candidato (concepto o actividad):

```
score(c) =  w1·urgenciaSRS(c)          // repasos vencidos
          + w2·impactoError(c)         // frecuencia del error × coste medio (ΔW) en partidas
          + w3·brechaPrerrequisito(c)  // desbloquea nodos del objetivo
          + w4·ajusteObjetivo(c)       // objetivo personal (torneo, finales, …)
          + w5·ajusteADN(c)            // reglas §1.4
          + w6·zonaDesarrollo(c)       // P(dominio) entre 0,3 y 0,8 = zona óptima
          − w7·fatiga(c)               // mismo tema demasiadas sesiones seguidas
          − w8·sobrecarga(c)           // demasiados conceptos nuevos abiertos (>3)
```

Pesos iniciales definidos por expertos; ajuste posterior con datos (A/B sobre ERR y retención).

Ejemplo de decisión explicable (botón **¿Por qué?** en la recomendación):
> *"No recomendamos aprender otra apertura todavía. La mayoría de tus derrotas recientes vienen de errores tácticos básicos (7 de 10). Entrenamiento: 15 min táctica · 10 min visión · 1 partida lenta · 5 min revisión."*

### 3.3 Personalidades del coach
La información técnica es **idéntica**; cambia el tono (plantillas + instrucción de estilo al LLM).

| Coach | Tono | Ejemplo ante un error |
|---|---|---|
| Mentor (defecto) | Calmado, reflexivo | "Pasa a menudo. Veamos juntos qué quedó sin proteger." |
| Master | Técnico, preciso | "Ce5?? deja la pieza indefensa: Axe5 gana material." |
| Friend | Cercano, informal | "¡Uy! Se te escapó el caballo. Miremos por qué." |
| Tactician | Directo, breve | "Caballo colgado. Busca siempre piezas solas." |
| Motivator | Enérgico | "¡Buen intento! Este patrón lo vas a dominar esta semana." |

### 3.4 Coach Mode en partida
Interviene según nivel de ayuda: tras jugadas rivales con amenaza (pregunta de la rutina), al detectar táctica disponible (pista 1), antes de confirmar una jugada que cuelga material (solo niveles bajos). Nunca revela la solución sin que el usuario suba la escalera de pistas.

### 3.5 ¿Por qué? y ¿Qué pasaba si…?
- **¿Por qué X?** → lista de efectos verificados (desarrolla, controla e5/d4, prepara enroque, mejora actividad) con flechas; los efectos se calculan comparando posición antes/después (control de casillas, movilidad, enroque posible, amenazas).
- **¿Qué pasaba si Y?** → el usuario elige una alternativa; se muestra la PV del motor (3–5 plies en principiante, ampliable) traducida por el ExplanationEngine.

## 4. Detector de patrones de error

Categorías (taxonomía `error_category`):

| Código | Categoría | Detección |
|---|---|---|
| `hanging_piece` | Piezas colgadas | Tras la jugada, pieza propia con SEE < 0 capturable y el motor lo castiga |
| `missed_threat` | No detectar amenazas | El rival tenía amenaza (táctica en su MultiPV) y la jugada no la atiende |
| `missed_tactic` | Tácticas falladas | Táctica ganadora disponible (ΔW ≥ 15 %) no jugada; subtipo por motivo |
| `poor_development` | Desarrollo deficiente | Piezas menores sin desarrollar tras jugada 10, dama temprana, pieza repetida |
| `king_safety` | Rey inseguro | Sin enrocar tras jugada 12 con centro abierto, avances de peones del enroque sin motivo |
| `pawn_overmoving` | Exceso de movimientos de peones | Jugadas de peón / total en apertura > umbral |
| `bad_trade` | Intercambios inadecuados | Cambio que empeora eval (p.ej. buena pieza por mala) |
| `calculation` | Errores de cálculo | Error en posición forzada tras secuencia iniciada por el usuario |
| `time_management` | Mala gestión del tiempo | Apuro (< 10 % reloj) con posición no crítica, o jugada crítica jugada en < 2 s |
| `endgame_technique` | Finales deficientes | Pérdida de ΔW en fase final, ventaja no convertida |
| `weak_structure` | Estructuras débiles | Creación innecesaria de peones aislados/doblados/atrasados |
| `wrong_plan` | Planes incorrectos | Serie de jugadas en posición tranquila con pérdida acumulada sin error único |
| `impulsive` | Precipitación | Error grave jugado muy rápido en posición con amenaza visible |
| `passivity` | Pasividad | Jugadas de espera cuando el motor muestra plan activo claro |

Salida periódica:
> *"En tus últimas 10 partidas dejaste piezas sin defender en 6 ocasiones. Entrenamiento sugerido: visión táctica y piezas indefensas."*

### Error Reduction Rate
`ERR_cat = 1 − tasa_actual / tasa_base`, con tasa = errores de la categoría por partida (o por 40 jugadas). Ventana base: primeros 30 días (o 30 días previos), actual: últimos 30 días; mínimo 5 partidas por ventana. Se muestra solo si la diferencia es estadísticamente significativa (test de Poisson), para no celebrar ruido.
> *Piezas colgadas: hace un mes 3,4/partida → ahora 0,8/partida · **mejora 76 %***

## 5. Sistema de confianza

Distinguir *"no sabes el concepto"* de *"lo sabes pero fallaste"*:
- `P(dominio)` BKT por concepto (ver [05-pedagogia §5](05-pedagogia.md#5-estados-de-dominio)).
- Un error aislado con `P(dominio) ≥ 0,85` se registra como **desliz**: recordatorio breve, sin reprogramar la lección.
- Reprogramación solo si hay ≥ 2 errores del concepto en las últimas 5 oportunidades o fallo en repaso SRS.
- El texto del coach refleja la confianza: "Esto ya lo dominas; seguramente fue un despiste" vs "Vamos a repasar este patrón".

## 6. Puzzles adaptativos y generación desde partidas

### Selector
Mezcla por sesión (ajustable por objetivo): 40 % concepto débil actual · 25 % repasos SRS · 20 % puzzles personales · 15 % intercalado de conceptos dominados (mantener). Dificultad objetivo: rating del puzzle ≈ Puzzle Rating + 50 (tasa de acierto esperada ~ 70–75 %). Excluye puzzles vistos en 30 días salvo repasos.

### Generador desde partidas del usuario
1. `review-deep` marca jugadas `Mistake/Blunder/Missed Win` del usuario.
2. Candidata a puzzle si: la mejor jugada gana ≥ 150 cp o fuerza mate, y es **única** (`puzzle-verify`: gap ≥ 150 cp con la segunda).
3. Se etiqueta el motivo (packages/tactics) y concepto; se estima dificultad.
4. Se programa en SRS: primer intento 1–3 días después.
5. Presentación: *"Esta posición viene de tu partida de hace tres días contra Max. ¿Encuentras ahora la jugada correcta?"*
6. Si se resuelve y luego el patrón se aplica en partida real → evidencia de máxima calidad para ★.

## 7. Plan diario

| Tiempo | Composición ejemplo |
|---|---|
| 5 min | 3 repasos SRS + 1 puzzle personal |
| 10 min | 5 min táctica + 5 min concepto |
| 20 min | 5 táctica · 5 concepto · 5 partida temática corta · 5 revisión |
| 30 min | 10 táctica · 10 concepto/lección · 10 partida temática |
| 45 min | 10 táctica · 10 concepto · 20 partida lenta · 5 revisión |
| 60 min | 10 repasos/táctica · 15 lección · 25 partida lenta · 10 análisis guiado |

Los bloques se rellenan con el recomendador (§3.2). Si el usuario tiene objetivo "Jugar con amigos", hay más partidas; si "Prepararse para torneos", más cálculo y aperturas.

## 8. Robots con personalidad

La personalidad modifica la puntuación de candidatas antes del softmax de humanización:

| Bot | Estilo | Sesgo |
|---|---|---|
| **Leo** · Atacante | Ataques rápidos | + jugadas hacia el rey rival, + sacrificios especulativos, menos profilaxis |
| **Sofía** · Posicional | Pequeñas ventajas | + mejora de piezas, + estructuras sanas, − complicaciones |
| **Max** · Táctico | Complicaciones | + posiciones con alta varianza en MultiPV, + capturas/jaques |
| **Arthur** · Defensivo | Difícil de atacar | + seguridad del rey, + cambios cuando está atacado |
| **Nova** · Universal | Equilibrado | Sin sesgo |

Cada bot × nivel 1–10. Los bots tienen repertorio de aperturas coherente con su estilo (Leo: gambitos; Sofía: Londres/Caro‑Kann…).

## 9. Los 3 momentos del post‑partida

Selección automática entre jugadas del usuario:

- **Momento 1 – Lo hiciste muy bien:** jugada Best/Brilliant de mayor dificultad (no obvia, ΔW alternativas altas) o táctica de concepto recién aprendido aplicada. Si no hay, la mejor decisión relativa.
- **Momento 2 – Aquí empezó el problema:** primera jugada desde la que W cae de forma sostenida (punto de inflexión), no necesariamente el blunder final.
- **Momento 3 – Esto debes aprender:** el error cuyo concepto tiene mayor `impactoError × (1 − P(dominio))` y es enseñable al nivel del usuario → enlaza a lección + puzzle personal.

Además: resultado, precisión humana, tiempo, errores importantes (máx. 3 listados), buenas decisiones, oportunidad principal y concepto a estudiar.

## 10. Reportes de progreso

Semanal y mensual:
> **Esta semana** · Rating +45 · Precisión +4 % · Táctica mejoró · Finales requieren atención · Error más frecuente: piezas indefensas · Nuevo punto fuerte: detección de ataques dobles.

Exportables en PDF y JSON.
