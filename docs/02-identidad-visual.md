# 02 · Identidad visual y Design System

## 1. Universo visual

**Concepto: "La biblioteca nocturna del estratega".** Tinta azul profunda, marfil cálido y un acento latón. Sensación de estudio tranquilo, no de casino ni de videojuego ruidoso. Distinto deliberadamente de:

- verdes de tablero y botones verdes (Chess.com),
- marrón/madera plana (Lichess),
- verde lima y mascota búho (Duolingo),
- look editorial blanco (Chessable).

| Atributo | Sí | No |
|---|---|---|
| Tono | Sereno, sabio, cercano | Agresivo, gritón |
| Forma | Geometría limpia, curvas controladas, facetas sutiles | Ornamento excesivo |
| Movimiento | Breve, con propósito (≤ 250 ms) | Confeti constante |
| Color | Pocos acentos, semánticos | Arcoíris |

### Paleta base

| Token | Hex | Uso |
|---|---|---|
| `ink-900` | `#0F1B2D` | Fondo oscuro, texto principal en claro |
| `ink-700` | `#22324A` | Superficies oscuras |
| `ivory-50` | `#F7F3EA` | Fondo claro |
| `ivory-200` | `#E9E2D2` | Superficies claras |
| `brass-500` | `#C9A227` | Acento de marca, logros, CTA secundario |
| `insight-500` | `#1FA59A` | Acierto, aprendizaje, CTA principal |
| `ember-500` | `#E4572E` | Error grave, amenaza |
| `amber-400` | `#F2B134` | Imprecisión, atención |
| `sky-400` | `#5AA9E6` | Información, pistas |

**Accesibilidad de color:** el significado nunca depende solo del color (siempre icono + texto: ✓ ?! ? ??). Paleta alternativa para daltonismo (deuteranopía/protanopía): acierto `#3A86FF` (azul) y error `#FF8C00` (naranja); para tritanopía: acierto `#009E73`, error `#D55E00`.

### Tablero por defecto — "Slate & Ivory"

| Casilla | Hex |
|---|---|
| Clara | `#E9E4D8` |
| Oscura | `#6A7A93` |
| Última jugada | overlay `brass-500` 35 % |
| Movimiento legal | punto `ink-900` 25 % |
| Amenaza | anillo `ember-500` |
| Casilla sugerida | anillo `insight-500` |

Temas adicionales de tablero: Walnut, Marble, Ocean, Forest, High Contrast (negro/blanco puros + bordes), Print (sin relleno, para exportar).

### Tipografía

- **Títulos:** *Fraunces* (serif con carácter, variable) — evoca tradición.
- **UI y texto:** *Inter* — legibilidad en pantallas pequeñas.
- **Notación y datos:** *JetBrains Mono* — alineación de jugadas.

Todas con licencia SIL OFL, aptas para uso comercial.

## 2. Logo conceptual

Archivos (concepto, no arte final): [`logo.svg`](../assets/brand/logo.svg) (icono de app), [`logo-horizontal.svg`](../assets/brand/logo-horizontal.svg), [`favicon.svg`](../assets/brand/favicon.svg).

**Idea: "El caballo que piensa".** Una cabeza de caballo construida con trazos geométricos cuya crin se convierte en una **trayectoria en L** con tres nodos — el salto del caballo y, a la vez, un camino de aprendizaje (nodo = concepto dominado). El ojo es un punto latón: la *chispa* de comprensión.

Capas de significado:

| Elemento | Significado |
|---|---|
| Silueta de caballo | Pieza emblema: movimiento, inteligencia, carácter |
| Crin en L con nodos | Trayectoria de salto + mapa de aprendizaje + sinapsis |
| Punto latón (ojo) | Momento "¡ajá!" |
| Contenedor escudo‑casilla | Casilla del tablero; confianza |

Variantes requeridas:
- **Favicon 16/32 px:** solo cabeza + ojo, sin nodos.
- **Icono app:** caballo marfil sobre `ink-900`, esquinas iOS/Android.
- **Horizontal:** símbolo + wordmark en Fraunces 600.
- **Avatar del coach:** el caballo con expresiones (neutro, pensando, contento, alerta) mediante variaciones del ojo y la oreja — nunca una cara caricaturesca.
- **Monocromo:** para grabado, impresión, sello de logros.

## 3. Set inicial: Royal Modern

Archivos: [`assets/pieces/royal-modern/`](../assets/pieces/royal-modern/) — un SVG por pieza (`wK.svg` … `bP.svg`) y una lámina de presentación `sheet.svg`, generados por [`tools/gen_pieces.py`](../tools/gen_pieces.py) (editar ahí las formas y colores y regenerar).

**Principios de diseño**
1. **Silueta primero:** reconocible a 24 px en negro sólido.
2. **Base común:** todas comparten un zócalo elíptico → familia coherente.
3. **2.5D sutil:** una cara iluminada (facet highlight) a la izquierda y sombra suave a la derecha; nada de degradados complejos.
4. **Contraste blanco/negro:** blancas = marfil `#F7F3EA` con contorno `#0F1B2D`; negras = `#1B2638` con contorno `#0B1220` y highlights `#3A4B66`.
5. **Rejilla:** viewBox 45×45 (compatible con las convenciones de tableros web), peana en y = 39.

**Personalidad por pieza**

| Pieza | Personalidad | Rasgos de diseño |
|---|---|---|
| Rey | Autoridad, estabilidad | Cuerpo ancho, cruz geométrica corta, base más alta |
| Dama | Elegancia, poder | Cintura estrecha, corona de 5 esferas en arco |
| Torre | Fortaleza | Proporciones cuadradas, almenas con hueco central |
| Alfil | Precisión, velocidad | Silueta en gota con corte diagonal limpio |
| Caballo | Inteligencia, carácter | Cabeza de la marca, crin facetada, ojo latón |
| Peón | Sencillez, potencial | Esfera sobre cono corto; el más simple |

### Sets adicionales (Fase 2+)

| Set | Concepto | Notas |
|---|---|---|
| Classic Elite | Staunton refinado | Set "de torneo" por defecto para adultos |
| Natural Wood | Veta de madera | Textura sutil en SVG pattern |
| Crystal | Vidrio translúcido | Solo en 2.5D/3D |
| Cyber | Líneas de neón sobre oscuro | Contorno luminoso, relleno oscuro |
| Medieval | Figuras con armadura | Silueta clásica conservada |
| Fantasy | Criaturas | Caballo‑dragón, etc.; silueta legible |
| Kids | Personajes redondeados con ojos | Modo niños |
| Minimal | Glifos planos | Máxima velocidad/legibilidad |
| Dark | Monocromo nocturno | Para tema oscuro |
| Neon | Alto brillo | Accesible con alto contraste |
| Tournament | Staunton plano | Similar a diagramas de libro, uso en análisis |

Regla: **todo set conserva la silueta canónica** (test automatizado de reconocimiento con usuarios en cada set nuevo).

## 4. 2D, 2.5D y 3D

| Modo | Uso | Tecnología |
|---|---|---|
| 2D | Partidas, puzzles (por defecto, el más rápido) | SVG en DOM / canvas |
| 2.5D | Lecciones, home, presentaciones | SVG con facetas + sombra |
| 3D (opcional) | Colección, modo premium, demos, mate animado | Three.js / react-three-fiber; modelos glTF low‑poly (< 5k tris por pieza) |

## 5. Design System

### Tokens (extracto)

```json
{
  "color": {
    "bg":        { "light": "#F7F3EA", "dark": "#0F1B2D" },
    "surface":   { "light": "#FFFFFF", "dark": "#22324A" },
    "text":      { "light": "#0F1B2D", "dark": "#F7F3EA" },
    "textMuted": { "light": "#5A6475", "dark": "#A9B3C4" },
    "primary":   "#1FA59A",
    "accent":    "#C9A227",
    "danger":    "#E4572E",
    "warning":   "#F2B134",
    "info":      "#5AA9E6"
  },
  "radius": { "sm": 6, "md": 12, "lg": 20, "pill": 999 },
  "space":  [0, 4, 8, 12, 16, 24, 32, 48, 64],
  "font": {
    "display": "Fraunces", "ui": "Inter", "mono": "JetBrains Mono",
    "size": { "xs": 12, "sm": 14, "md": 16, "lg": 20, "xl": 24, "2xl": 32 }
  },
  "motion": { "fast": 120, "base": 200, "slow": 320, "easing": "cubic-bezier(.2,.8,.2,1)" },
  "elevation": { "1": "0 1px 2px rgba(15,27,45,.08)", "2": "0 4px 12px rgba(15,27,45,.12)" }
}
```

Tamaño de texto escalable (100 %–200 %) aplicado vía `rem`; objetivos táctiles ≥ 44×44 px.

### Componentes núcleo

| Componente | Descripción |
|---|---|
| `Board` | Tablero interactivo: arrastrar/tocar, flechas, resaltados, orientación, coordenadas, animación |
| `MoveList` | Lista de jugadas con iconos de clasificación y navegación |
| `CoachBubble` | Mensaje del coach con avatar, tono y botones **¿Por qué?** / **¿Qué pasaba si…?** |
| `HintLadder` | Escalera de 5 pistas; cada peldaño se revela a demanda |
| `ConceptChip` | Concepto + estado de dominio (🔒 ○ ◐ ● ★ ♛) |
| `MasteryRing` | Anillo de progreso del concepto |
| `DnaRadar` | Radar de ADN con banda de confianza y comparación antes/ahora |
| `PrimaryCTA` | Un único botón principal por pantalla |
| `Checklist` | Checklist antes de mover (plegable, se retira con el nivel) |
| `MomentCard` | Tarjeta de "Momento" del post‑partida |
| `StatTile` | KPI con tendencia |
| `PlanCard` | Bloque del plan diario (tiempo + actividad + motivo) |

### Iconografía de clasificación de jugadas

| Clase | Icono | Color |
|---|---|---|
| Brillante | ⭐ `!!` | brass |
| Mejor / Excelente | ✓ | insight |
| Buena | 👍 | insight 60 % |
| Libro | 📖 | sky |
| Imprecisión | `?!` | amber |
| Error | `?` | amber oscuro |
| Error grave | `??` | ember |
| Victoria perdida | ✗♔ | ember |

## 6. Animaciones

| Evento | Animación | Duración |
|---|---|---|
| Movimiento | Deslizamiento con easing | 150–200 ms |
| Jaque | Pulso de anillo rojo en el rey (1×) | 300 ms |
| Excelente jugada | Destello latón en la casilla | 250 ms |
| Error | Flecha roja mostrando la amenaza | persistente hasta cerrar |
| Mate | Rey inclinado + brillo radial suave | 800 ms |
| Promoción | La pieza "crece" desde el peón con destello | 400 ms |

Con `prefers-reduced-motion` o el ajuste *Reducir animaciones*: se sustituyen por cambios instantáneos de estado.

## 7. Accesibilidad

Claro · Oscuro · Alto contraste · Tamaño de texto · Modos daltónicos · Sonidos y vibración opcionales · Reducción de animaciones · Lector de pantalla (cada casilla anuncia "e4, caballo blanco"; entrada de jugada por texto/voz "caballo f3") · Navegación completa por teclado en web. Objetivo WCAG 2.2 AA.
