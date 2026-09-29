# 19 · Cobertura del brief (las 105 secciones)

Estado real de cada sección del brief al cerrar la Fase 12. Leyenda:
**✅ implementado** (en la app y con pruebas) · **🟡 parcial** (funciona, con huecos explícitos) ·
**📄 documentado** (diseñado, sin código todavía) · **⏳ futuro** (fases posteriores que el propio
brief sitúa después del MVP).

| # | Sección | Estado | Dónde / notas |
|---|---|---|---|
| 1 | Visión principal | ✅ | Coach que aprende, explica, hace practicar y comprueba: docs/01, pantallas de Coach y ADN |
| 2 | Filosofía central | ✅ | «Enseñar a pensar»: pistas progresivas, retirada de ayudas, explicaciones en 5 partes |
| 3 | Base pedagógica | ✅ | docs/05-pedagogia.md; métodos de referencia, contenido 100 % original |
| 4 | Principio de enseñanza (12 pasos) | ✅ | Lecciones: explicación, tablero, ejemplo correcto/incorrecto, ejercicio, puzzle, partida con objetivo, evaluación, consejo y repaso |
| 5 | Ruta completa de aprendizaje | ✅ | Mapa de 9 secciones de cero a maestría (`content/concepts.ts`, pantalla Aprender) |
| 6 | Nivel 0 – primer contacto | ✅ | 8 lecciones de fundamentos (tablero, piezas, jaque/mate, reglas especiales) con ejercicio tras cada concepto |
| 7 | Nivel principiante | 🟡 | Lecciones de centro, desarrollo, enroque, piezas indefensas, amenazas, horquilla, clavada, ensartada, descubierto; mates en 1 y 2. Falta lección propia de eliminación del defensor y sobrecarga |
| 8 | Nivel intermedio | 🟡 | Estructura de peones, actividad, posiciones de peón aislado, cadenas y columnas abiertas; faltan lecciones de alfil bueno/malo, caballo contra alfil, profilaxis y restricción |
| 9 | Nivel avanzado | 🟡 | Entrenamiento de cálculo y candidatas, ADN, análisis con motor; el currículo avanzado está diseñado (docs/05 §3) y tiene poco contenido propio |
| 10 | Rutina mental del jugador | ✅ | Checklist antes de mover con retirada progresiva; «¿Qué amenaza?» del coach tras cada jugada rival |
| 11 | Módulo de táctica | 🟡 | Mate, horquilla, clavada, ataque doble, rayos X, descubierto, promoción, red de mate y combinaciones en puzzles y lecciones; faltan desviación/atracción/interferencia/zwischenzug/perpetuo como series propias |
| 12 | Finales | 🟡 | R+D vs R, R+T vs R, oposición, regla del cuadrado, rey en sexta, peón pasado alejado, Lucena y Philidor (lecciones, posiciones y test); faltan zugzwang, triangulación y finales de dama y piezas menores |
| 13 | Aperturas | ✅ | 13 aperturas del brief con los 10 apartados, orden principios → variantes y práctica sin memorización |
| 14 | Motor de ajedrez | ✅ | Stockfish 19 (WASM, Web Worker) + motor propio para robots 1–6 y análisis táctico |
| 15 | Chess Explanation Engine | ✅ | `@kavalo/tactics`: hechos → explicación en 5 partes, por nivel |
| 16 | Chess Coach AI | ✅ | Recomendador explicable, plan diario, misiones, reportes y pantalla Coach |
| 17 | ADN ajedrecístico | ✅ | `@kavalo/dna`: 8 dimensiones medidas con Stockfish |
| 18 | Representación del ADN | ✅ | Radar, barras con intervalo, estilo y preferencias |
| 19 | Evolución del ADN | ✅ | Instantáneas semanales; cambios significativos si los intervalos no se solapan |
| 20 | Uso pedagógico del ADN | ✅ | `dnaAdvice` alimenta al recomendador |
| 21 | Estilo y aperturas | ✅ | `suggestOpenings` (blancas, contra 1.e4, contra 1.d4) |
| 22 | Detector de patrones de error | ✅ | Errores tácticos y posicionales, frecuencia, Error Reduction Rate |
| 23 | Partidas contra robot | ✅ | Niveles 1–10 (humanizados y con Elo de Stockfish) |
| 24 | Robots con personalidad | ✅ | Personalidades con estilo propio |
| 25 | Modo jugar y aprender | ✅ | Coach Mode: avisos, explicación inmediata y «intentar de nuevo» |
| 26 | Pistas progresivas | ✅ | Escalera de 5 pistas |
| 27 | Análisis post-partida | ✅ | Clasificación, precisión, gráfica, errores posicionales, ejercicios personales |
| 28 | Los 3 momentos | ✅ | Lo hiciste bien · aquí empezó el problema · esto debes aprender |
| 29 | Botón ¿Por qué? | ✅ | En análisis y en jugadas del robot |
| 30 | Botón ¿Qué pasaba si…? | ✅ | Jugada alternativa con respuesta y línea de Stockfish |
| 31 | Tablero interactivo | ✅ | Tocar/arrastrar, flechas y círculos, teclado, navegación, promoción |
| 32 | Identidad visual original | ✅ | docs/02, design system en `styles.css` |
| 33 | Piezas originales (Royal Modern) | ✅ | `assets/pieces/royal-modern` |
| 34 | Sets adicionales | 🟡 | 12 sets con los nombres del brief, generados como variantes de material de la misma silueta; siluetas propias de Medieval/Fantasy pendientes de ilustrador |
| 35 | Identidad de cada pieza | ✅ | docs/02 §3 |
| 36 | Pieza emblemática (caballo) | ✅ | Logo, favicon, avatar del coach, Kavi en modo niños |
| 37 | 2D y 3D | 🟡 | 2D y 2,5D (volumen con degradados); 3D reservado para presentación/colección |
| 38 | Animaciones | ✅ | Jaque, destellos, amenaza, mate, promoción; respetan «reducir animaciones» |
| 39 | Gamificación | ✅ | XP ligada a aprendizaje, logros, misiones, rachas sanas |
| 40 | Mapa de aprendizaje | ✅ | Pantalla Aprender con estados por nodo |
| 41 | Dominio de conceptos | ✅ | Modelo BKT con estados introducido → maestría |
| 42 | Repetición espaciada | ✅ | 1-3-7-14-30 días para lecciones, puzzles y errores propios |
| 43 | Puzzles adaptativos | ✅ | Selección por rating y concepto débil |
| 44 | Puzzles desde tus partidas | ✅ | Errores tácticos y momentos decisivos (MultiPV) |
| 45 | Entrenadores con personalidad | ✅ | Mentor, Master, Friend, Tactician, Motivator (+ Kavi) |
| 46 | Modo niños | ✅ | Kavi, explicaciones breves, historias, misiones, set Kids, celebraciones |
| 47 | Modo adulto | ✅ | Interfaz limpia, sin celebraciones |
| 48 | Dashboard | ✅ | Pantalla Progreso |
| 49 | Radar de habilidades | ✅ | 9 ejes |
| 50 | Rating interno | ✅ | Partidas, puzzles, táctica, estrategia, finales, aperturas, cálculo |
| 51 | Entrenamiento de visión | ✅ | `@kavalo/training` |
| 52 | Entrenamiento de cálculo | ✅ | Candidatas + línea, profundidad y errores |
| 53 | Entrenamiento de coordenadas | ✅ | Casillas, colores, caballo; récord |
| 54 | Partidas históricas | ✅ | 5 partidas de dominio público con «¿Qué jugarías?» |
| 55 | Base de datos del usuario | ✅ | Local + servidor de sincronización (SQLite; esquema PostgreSQL en docs/07) |
| 56 | UserChessProfile | ✅ | `state/store.ts`, docs/07 |
| 57 | Sistema de recomendación | ✅ | Con motivo y factores visibles |
| 58 | Plan diario | ✅ | Según tiempo, repasos, errores y objetivo |
| 59 | Objetivos personales | ✅ | Los 8 objetivos del brief |
| 60 | Modos de partida | ✅ | Los 10 modos |
| 61 | Control de tiempo | ✅ | Todos, incluido personalizado; recomendación de partidas lentas |
| 62 | Checklist antes de mover | ✅ | 6 comprobaciones |
| 63 | Progresión de ayudas | ✅ | Por nivel y retirada tras 5 partidas sin el error |
| 64 | Tecnología | ✅ | TypeScript, monorepo, WASM, PWA; docs/03 (móvil nativo: el diseño lo prevé, se publica como PWA) |
| 65 | Stockfish | ✅ | Local, sin servidor |
| 66 | IA generativa | 📄 | Diseñada como capa opcional de redacción sobre los hechos del motor (docs/03 §5); hoy las explicaciones salen de plantillas deterministas, verificables y sin enviar datos fuera |
| 67 | Flujo de inteligencia | ✅ | Motor → hechos → pedagogía → perfil → explicación |
| 68 | Clasificador de jugadas | ✅ | Por pérdida de probabilidad de victoria, brillantes, libro, victoria perdida |
| 69 | Explicación según nivel | ✅ | Principiante (palabras), intermedio, avanzado (números y líneas) |
| 70 | Accesibilidad | ✅ | Claro/oscuro, alto contraste, texto, daltonismo, sonidos, vibración, movimiento; auditoría automática |
| 71 | Multiidioma | 🟡 | Arquitectura es/en con test de paridad; navegación, inicio, ajustes y onboarding traducidos; lecciones y explicaciones aún en español |
| 72 | Offline | ✅ | Service worker; motor, lecciones, puzzles y partidas sin conexión; sincroniza al volver |
| 73 | Cuentas | 🟡 | Invitado y email (código) implementados; Google/Apple a falta de credenciales OAuth |
| 74 | Importar partidas | ✅ | PGN, FEN, copiar/pegar, subir archivo |
| 75 | Exportar | ✅ | PGN, FEN, imagen, reporte, estadísticas, plan |
| 76 | Reporte de progreso | ✅ | Semanal y mensual, con ADN |
| 77 | Privacidad | ✅ | Por defecto, mínima recopilación, exportación, borrado, consentimiento, protección infantil |
| 78 | Pantallas (22) | ✅ | Las 22 existen; el «registro» es la activación de cuenta en Privacidad (sin registro obligatorio) |
| 79 | Home inteligente | ✅ | Saludo, nivel, racha, rating, ADN, recomendación con motivo, un botón principal |
| 80 | Onboarding | ✅ | Idioma, público, experiencia (6 opciones), nombre, objetivo, tiempo, coach |
| 81 | Test inicial | ✅ | 13 ejercicios en 6 áreas |
| 82 | Sistema de progresión | ✅ | Novato → Master Training |
| 83 | Diseño UX | ✅ | Una pantalla = una decisión principal |
| 84 | Logotipo | ✅ | `assets/brand` |
| 85 | Nombre (30 propuestas) | ✅ | docs/01 §3; verificación de marca pendiente del titular |
| 86 | MVP | ✅ | Todo el alcance del MVP está implementado |
| 87 | Fase 2 del producto | ✅ | ADN avanzado, repaso espaciado, aperturas, finales, coach avanzado, ejercicios desde partidas, planes |
| 88 | Fase 3 (social) | ⏳ | Multijugador, amigos, clubes, torneos: roadmap (docs/09); requiere moderación y controles parentales |
| 89 | Fase 4 (cámara, AR, voz) | ⏳ | Roadmap exploratorio (docs/09) |
| 90 | Control de calidad | ✅ | docs/17 §3: cada punto con su prueba |
| 91 | Métricas de aprendizaje | ✅ | Conceptos, errores, retención, precisión, ratings, visión, cálculo, finales |
| 92 | Error Reduction Rate | ✅ | Progreso y reportes |
| 93 | Principio fundamental | ✅ | Qué, por qué, consecuencia, qué observar, concepto, cómo evitarlo y otra oportunidad |
| 94 | Memoria pedagógica | ✅ | Explicación → recordatorio → pregunta → sin ayuda |
| 95 | Sistema de dominio | ✅ | Inmediato, días después, en puzzles y en partidas |
| 96 | Experiencia ideal | ✅ | Error → explicación → puzzle personal → repaso → reconocimiento en partida (prueba e2e del coach) |
| 97 | Entrenamiento personalizado | ✅ | Plan distinto por errores, ADN y objetivo |
| 98 | Sistema de confianza | ✅ | Varias evidencias; intervalos en el ADN |
| 99 | Concepto diferenciador | 🟡 | Motor, pedagogía y perfil unidos; la capa de IA generativa está diseñada (§66) |
| 100 | Objetivo final | ✅ | Pantalla Coach responde a las 9 preguntas con datos reales |
| 101 | Entregables iniciales (25) | ✅ | README, tabla de entregables |
| 102 | Orden de desarrollo | ✅ | Fases 1–12 en ese orden (historial de commits) |
| 103 | Código | ✅ | Cada módulo documentado (objetivo, arquitectura, flujo, archivos) y con pruebas |
| 104 | Criterio final de éxito | 🟡 | Recorrido completo de cero a jugar, analizar y entrenar; faltan pruebas con usuarios reales y más contenido intermedio/avanzado |
| 105 | Visión del producto | ✅ | Entrenador que conoce, recuerda, descubre el estilo, enseña, hace practicar y comprueba |

## Resumen

- **✅ 91** secciones implementadas · **🟡 11** parciales · **📄 1** diseñada · **⏳ 2** futuras (105 en total).
- Los huecos son de **contenido** (lecciones intermedias/avanzadas, más patrones tácticos y
  finales, traducción de lecciones), de **diseño gráfico** (siluetas nuevas, 3D) y de
  **credenciales externas** (OAuth, email). Ninguno bloquea el uso de la app.

## Próximos pasos recomendados

1. Contenido: series tácticas (desviación, atracción, interferencia, zwischenzug, perpetuo),
   finales (zugzwang, triangulación, dama, piezas menores) y lecciones intermedias (alfil
   bueno/malo, caballo contra alfil, profilaxis). El formato de lección y la verificación con
   Stockfish ya existen: cada lección nueva es solo contenido.
2. Traducir lecciones y explicaciones al inglés con el mismo sistema de claves.
3. Capa opcional de IA generativa que redacte sobre los hechos verificados (nunca inventa
   jugadas), con consentimiento explícito.
4. Pruebas con usuarios reales (principiantes absolutos) y con lectores de pantalla.
5. Credenciales OAuth, proveedor de email, dominio, marca y licencia del código.
