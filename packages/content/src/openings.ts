/**
 * Aperturas (brief §13, docs/05-pedagogia.md §3): se enseñan en el orden
 * PRINCIPIOS → ESTRUCTURAS → PLANES → JUGADAS TÍPICAS → VARIANTES.
 * Texto original. Las líneas (SAN inglés) sirven también como libro para el clasificador.
 */

export interface OpeningCharacter {
  /** 0 = cerrada/estratégica, 1 = abierta/táctica. */
  dynamism: number;
  /** 0 = posiciones cerradas, 1 = abiertas. */
  openness: number;
  /** Cantidad de teoría necesaria (0–1). */
  theory: number;
  /** Riesgo / desequilibrio (0–1). */
  risk: number;
}

export interface Opening {
  id: string;
  name: string;
  color: 'w' | 'b';
  /** Respuesta a (solo negras): '1.e4' o '1.d4'. */
  against?: '1.e4' | '1.d4';
  /** Línea principal en SAN inglés, desde la posición inicial. */
  line: string[];
  /** Otras líneas del libro. */
  variations?: string[][];
  character: OpeningCharacter;
  minLevel: 'beginner' | 'intermediate' | 'advanced';
  objective: string;
  structure: string;
  keyPieces: string;
  keySquares: string[];
  plans: string[];
  breaks: string[];
  commonMistakes: string[];
  traps: string[];
  middlegame: string;
  endgame: string;
}

export const OPENINGS: Opening[] = [
  {
    id: 'italian', name: 'Italiana', color: 'w',
    line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'],
    variations: [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O']],
    character: { dynamism: 0.55, openness: 0.5, theory: 0.3, risk: 0.35 }, minLevel: 'beginner',
    objective: 'Desarrollar rápido, apuntar el alfil a f7 (el punto débil del enroque negro) y preparar d4 para ganar el centro.',
    structure: 'Peones en e4 y d3 (o d4 más tarde) con c3 de apoyo: centro flexible y sólido.',
    keyPieces: 'El alfil de c4 en la diagonal a2–g8 y el caballo de f3, que puede reubicarse por d2–f1–g3.',
    keySquares: ['f7', 'd4', 'f5', 'g5'],
    plans: ['Preparar d4 con c3 para conquistar el centro.', 'Maniobra Cbd2–f1–g3 buscando f5.', 'Ataque en el flanco de rey con h3, g4 si el rival se pasiva.'],
    breaks: ['d3–d4', 'f2–f4 en algunas posiciones'],
    commonMistakes: ['Jugar Cg5 prematuro sin preparación y perder tiempos.', 'Olvidar el enroque por perseguir f7.', 'Cambiar el alfil de c4 sin motivo.'],
    traps: ['Si las negras juegan …Cd4?! demasiado pronto, capturar el peón de e5 puede costar la dama por una trampa de mate: ¡verifica antes de capturar!'],
    middlegame: 'Maniobras lentas: el bando que prepare mejor d4 (o …d5 para negras) toma la iniciativa.',
    endgame: 'Finales equilibrados; la mayoría de peones en el flanco de dama suele favorecer al que la tenga.',
  },
  {
    id: 'spanish', name: 'Española (Ruy López)', color: 'w',
    line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'],
    character: { dynamism: 0.45, openness: 0.4, theory: 0.8, risk: 0.3 }, minLevel: 'intermediate',
    objective: 'Presionar al caballo de c6, defensor de e5, para ganar la batalla del centro a largo plazo.',
    structure: 'Centro e4 contra e5, con posibles d4 (blancas) y cadena …c5–d6 (negras).',
    keyPieces: 'El alfil «español» que acaba en b3/c2 y las torres, que maniobran detrás de los peones.',
    keySquares: ['e5', 'd5', 'f5'],
    plans: ['c3 y d4 para dominar el centro.', 'Maniobra Cbd2–f1–g3 hacia f5.', 'Juego en el flanco de dama con a4 contra …b5.'],
    breaks: ['d3–d4', 'a2–a4'],
    commonMistakes: ['Capturar en e5 al principio: Axc6 y Cxe5 no gana un peón porque las negras lo recuperan.', 'Retirar el alfil demasiado tarde y encerrarlo tras …c5–c4.'],
    traps: ['Trampa del arca de Noé: el alfil de b3 puede quedar atrapado por …c5–c4 si se descuida.'],
    middlegame: 'Lucha estratégica prolongada: maniobras de piezas detrás de las cadenas de peones.',
    endgame: 'A menudo se llega con estructuras simétricas; la actividad del rey decide.',
  },
  {
    id: 'london', name: 'Sistema Londres', color: 'w',
    line: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
    variations: [['d4', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'Nf3', 'O-O', 'Be2', 'd6', 'h3']],
    character: { dynamism: 0.25, openness: 0.3, theory: 0.15, risk: 0.15 }, minLevel: 'beginner',
    objective: 'Montar siempre la misma estructura sólida (d4, e3, c3, Af4) y jugar con planes claros.',
    structure: 'Triángulo de peones c3–d4–e3 con el alfil de casillas oscuras fuera de la cadena.',
    keyPieces: 'El alfil de f4 (sale antes de jugar e3) y el caballo que llega a e5.',
    keySquares: ['e5', 'd4', 'h7'],
    plans: ['Caballo a e5 apoyado con f4.', 'Ataque directo con Ad3, Dc2 y h4 si las negras enrocan pronto.', 'Expansión en el flanco de dama con b4 contra …c5.'],
    breaks: ['e3–e4', 'c3–c4'],
    commonMistakes: ['Jugar e3 antes de sacar el alfil de f4 y dejarlo encerrado.', 'Descuidar b2: …Db6 ataca b2 y d4 a la vez.'],
    traps: ['Tras …Db6, responder con Db3 o Cbd2 en vez de dejar b2 colgado.'],
    middlegame: 'Posiciones tranquilas donde gana quien mejora mejor sus piezas.',
    endgame: 'Estructura sana y fácil de manejar en finales.',
  },
  {
    id: 'queens-gambit', name: 'Gambito de Dama', color: 'w',
    line: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4'],
    variations: [['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O']],
    character: { dynamism: 0.45, openness: 0.45, theory: 0.6, risk: 0.3 }, minLevel: 'intermediate',
    objective: 'Ofrecer el peón de c4 para desviar el peón negro de d5 y dominar el centro con e4.',
    structure: 'Peones d4 y c4 contra d5 y e6: tensión central que define el medio juego.',
    keyPieces: 'El alfil de g5 que presiona al caballo de f6, defensor de d5.',
    keySquares: ['d5', 'e4', 'c5'],
    plans: ['Ataque de minorías (b4–b5) contra la cadena de peones negra.', 'Ruptura central e3–e4.', 'Presión en la columna c.'],
    breaks: ['e3–e4', 'b4–b5'],
    commonMistakes: ['Intentar defender el peón de c4 a toda costa en el Gambito aceptado.', 'Dejar el alfil de c1 fuera de juego.'],
    traps: ['Trampa de la clavada: tras Ag5, capturar en d5 con el caballo puede perder material por la clavada sobre la dama negra.'],
    middlegame: 'Juego posicional rico: estructuras con peón aislado o colgante son frecuentes.',
    endgame: 'Los finales con ataque de minorías dejan debilidades duraderas en el flanco de dama negro.',
  },
  {
    id: 'catalan', name: 'Catalana', color: 'w',
    line: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'dxc4', 'Qc2'],
    character: { dynamism: 0.35, openness: 0.4, theory: 0.7, risk: 0.2 }, minLevel: 'advanced',
    objective: 'Combinar el Gambito de Dama con el fianchetto: el alfil de g2 presiona la gran diagonal hacia b7 y a8.',
    structure: 'd4–c4 con g3; a menudo las blancas recuperan el peón de c4 con calma.',
    keyPieces: 'El alfil de g2, la pieza estrella de la apertura.',
    keySquares: ['b7', 'c6', 'e5'],
    plans: ['Recuperar c4 y presionar el flanco de dama.', 'Ruptura e4 con apoyo del alfil.'],
    breaks: ['e2–e4', 'c4–c5'],
    commonMistakes: ['Cambiar el alfil de g2: pierde su mejor pieza.', 'Precipitarse a recuperar c4 perdiendo desarrollo.'],
    traps: ['Las negras que liberan con …c5 sin preparar pueden perder material en la gran diagonal.'],
    middlegame: 'Presión posicional prolongada sobre el flanco de dama negro.',
    endgame: 'El alfil de g2 suele ser superior en los finales.',
  },
  {
    id: 'open-games', name: '1…e5 (juegos abiertos)', color: 'b', against: '1.e4',
    line: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4'],
    variations: [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6']],
    character: { dynamism: 0.55, openness: 0.6, theory: 0.5, risk: 0.35 }, minLevel: 'beginner',
    objective: 'Responder a e4 ocupando también el centro y desarrollar con naturalidad.',
    structure: 'Centro simétrico e4/e5 que se abre con d4 o …d5.',
    keyPieces: 'El caballo de c6 (defiende e5) y el alfil de c5 o e7.',
    keySquares: ['e5', 'd5', 'f7'],
    plans: ['Preparar …d5 para liberar el juego.', 'Enrocar pronto y proteger f7.'],
    breaks: ['…d7–d5', '…f7–f5'],
    commonMistakes: ['Descuidar f7 ante Ac4 y Cg5.', 'Mover la dama pronto a h4 o f6 sin motivo.'],
    traps: ['Mate del pastor: tras Ac4 y Dh5, defiende f7 con …g6 o …De7, nunca con …Cf6?? si la dama está en h5.'],
    middlegame: 'Posiciones abiertas donde la actividad de las piezas y la táctica son clave.',
    endgame: 'Estructuras simétricas: finales igualados donde decide la técnica.',
  },
  {
    id: 'sicilian', name: 'Siciliana', color: 'b', against: '1.e4',
    line: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    variations: [['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'g6'], ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6']],
    character: { dynamism: 0.9, openness: 0.6, theory: 0.9, risk: 0.8 }, minLevel: 'intermediate',
    objective: 'Crear un desequilibrio desde la primera jugada: cambiar un peón lateral (c) por uno central (d).',
    structure: 'Mayoría central negra (d y e) contra ventaja de espacio blanca.',
    keyPieces: 'La torre en la columna c semiabierta y el caballo de f6.',
    keySquares: ['d5', 'c4', 'e5'],
    plans: ['Contraataque en el flanco de dama con …b5 y presión en la columna c.', 'Ruptura …d5 cuando esté bien preparada.'],
    breaks: ['…d6–d5', '…b7–b5'],
    commonMistakes: ['Retrasar el desarrollo por jugar solo con peones.', 'Enrocar en el mismo lado donde las blancas atacan sin contrajuego.'],
    traps: ['Si las blancas enrocan largo, cuidado con el sacrificio en b5 o e6 que abre el rey negro.'],
    middlegame: 'Ataques en flancos opuestos: gana quien sea más rápido. Muy táctico.',
    endgame: 'La mayoría central negra suele dar buenos finales si se sobrevive al ataque.',
  },
  {
    id: 'french', name: 'Francesa', color: 'b', against: '1.e4',
    line: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'e5', 'Nfd7', 'f4', 'c5', 'Nf3', 'Nc6'],
    variations: [['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6']],
    character: { dynamism: 0.5, openness: 0.25, theory: 0.6, risk: 0.45 }, minLevel: 'intermediate',
    objective: 'Construir una defensa sólida (e6–d5) y atacar después la base de la cadena de peones blanca.',
    structure: 'Cadenas de peones enfrentadas: blancas d4–e5, negras d5–e6.',
    keyPieces: 'El alfil de c8, que queda encerrado y hay que activar (…b6 y …Aa6).',
    keySquares: ['d4', 'e5', 'f6', 'c5'],
    plans: ['Presionar d4 con …c5, …Cc6 y …Db6.', 'Ruptura …f6 contra e5.'],
    breaks: ['…c7–c5', '…f7–f6'],
    commonMistakes: ['Dejar el alfil de c8 encerrado toda la partida.', 'Olvidar la presión sobre d4.'],
    traps: ['En la variante del avance, capturar en d4 prematuramente puede dejar la dama expuesta en b6.'],
    middlegame: 'Juego de cadenas: blancas atacan en el flanco de rey, negras en el de dama.',
    endgame: 'El alfil «malo» de c8 puede ser un problema en los finales.',
  },
  {
    id: 'caro-kann', name: 'Caro-Kann', color: 'b', against: '1.e4',
    line: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
    variations: [['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6']],
    character: { dynamism: 0.3, openness: 0.4, theory: 0.5, risk: 0.2 }, minLevel: 'beginner',
    objective: 'Disputar el centro con …d5 apoyado por c6, sacando el alfil de c8 antes de cerrar con …e6.',
    structure: 'Estructura sólida c6–d5 (o c6–e6 tras el cambio en e4).',
    keyPieces: 'El alfil de casillas claras, activo fuera de la cadena de peones.',
    keySquares: ['d5', 'e4', 'f5'],
    plans: ['Desarrollo armónico y ruptura …c5.', 'Buscar finales favorables gracias a la estructura sana.'],
    breaks: ['…c6–c5', '…e6–e5'],
    commonMistakes: ['Jugar …e6 antes de sacar el alfil de c8.', 'Ser demasiado pasivo y permitir un ataque sin contrajuego.'],
    traps: ['Tras Cxe4, …Cd7 y …Cgf6 sin cuidado permite el sacrificio Cg5 con amenazas sobre f7.'],
    middlegame: 'Solidez y paciencia: posiciones estratégicas con pocas debilidades.',
    endgame: 'La estructura sana suele dar ventaja en los finales.',
  },
  {
    id: 'qgd', name: 'Gambito de Dama (con negras)', color: 'b', against: '1.d4',
    line: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6'],
    character: { dynamism: 0.35, openness: 0.4, theory: 0.6, risk: 0.2 }, minLevel: 'intermediate',
    objective: 'Mantener el punto d5 con …e6 y liberar el juego más tarde con …c5 o …e5.',
    structure: 'd5–e6 sólido; el alfil de c8 es el problema a resolver.',
    keyPieces: 'El caballo de f6 (defiende d5) y el alfil de c8.',
    keySquares: ['d5', 'e4', 'c5'],
    plans: ['Liberación …dxc4 seguida de …c5.', 'Maniobra …Ce4 para cambiar piezas.'],
    breaks: ['…c7–c5', '…e6–e5'],
    commonMistakes: ['Dejar el alfil de c8 sin salida.', 'Capturar en c4 demasiado pronto sin plan.'],
    traps: ['Tras Ag5, …Cbd7 y capturar en d5 con el caballo puede perder una pieza por la clavada.'],
    middlegame: 'Juego estratégico; aparecen estructuras con peón aislado o de dama colgante.',
    endgame: 'Finales con ataque de minorías contra el flanco de dama negro.',
  },
  {
    id: 'kings-indian', name: 'India de Rey', color: 'b', against: '1.d4',
    line: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
    character: { dynamism: 0.85, openness: 0.35, theory: 0.8, risk: 0.75 }, minLevel: 'advanced',
    objective: 'Ceder el centro al principio para atacarlo después con …e5 o …c5 y lanzar un ataque sobre el rey blanco.',
    structure: 'Fianchetto de rey y cadena …d6–e5 frente al centro blanco c4–d4–e4.',
    keyPieces: 'El alfil de g7 y los caballos que atacan por f5 y g4.',
    keySquares: ['f5', 'e5', 'd4'],
    plans: ['Ataque en el flanco de rey con …f5, …f4 y …g5.', 'Presión sobre d4 con …c5 y …Cc6.'],
    breaks: ['…f7–f5', '…c7–c5'],
    commonMistakes: ['Atacar sin cerrar primero el centro.', 'Olvidar la defensa del flanco de dama mientras se ataca.'],
    traps: ['Si las blancas juegan d5 sin cuidado, …Ce4 aprovecha la diagonal del alfil de g7.'],
    middlegame: 'Ataques en flancos opuestos; posiciones muy dinámicas y arriesgadas.',
    endgame: 'El alfil de g7 puede quedar malo tras bloquear el centro.',
  },
  {
    id: 'nimzo-indian', name: 'Nimzoindia', color: 'b', against: '1.d4',
    line: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5', 'Nf3', 'c5'],
    character: { dynamism: 0.6, openness: 0.45, theory: 0.7, risk: 0.45 }, minLevel: 'advanced',
    objective: 'Controlar e4 clavando el caballo de c3; cambiar el alfil por caballo para dañar la estructura blanca.',
    structure: 'Tras …Axc3 las blancas suelen quedarse con peones doblados en la columna c.',
    keyPieces: 'El alfil de b4 y los caballos negros, que prefieren posiciones cerradas.',
    keySquares: ['e4', 'c4', 'c3'],
    plans: ['Atacar los peones doblados de c3 y c4.', 'Bloquear el centro para que los caballos superen a los alfiles.'],
    breaks: ['…c7–c5', '…e6–e5'],
    commonMistakes: ['Cambiar en c3 sin conseguir debilidades duraderas.', 'Abrir el juego cuando el rival tiene la pareja de alfiles.'],
    traps: ['Si las blancas juegan Dc2 y e4 sin preparar, …d5 abre líneas contra su rey sin enrocar.'],
    middlegame: 'Lucha de caballos contra alfiles y de estructura contra actividad.',
    endgame: 'Los peones doblados blancos son objetivos claros en los finales.',
  },
  {
    id: 'slav', name: 'Eslava', color: 'b', against: '1.d4',
    line: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5'],
    character: { dynamism: 0.35, openness: 0.4, theory: 0.55, risk: 0.25 }, minLevel: 'intermediate',
    objective: 'Defender d5 con …c6 sin encerrar el alfil de c8, que sale antes de jugar …e6.',
    structure: 'Estructura c6–d5 (similar a la Caro-Kann) muy sólida.',
    keyPieces: 'El alfil de c8, activo en f5 o g4.',
    keySquares: ['d5', 'e4', 'b5'],
    plans: ['Tomar en c4 y mantener el peón con …b5 si es posible.', 'Desarrollo con …e6 y ruptura …c5.'],
    breaks: ['…c6–c5', '…e6–e5'],
    commonMistakes: ['Jugar …e6 antes de desarrollar el alfil de c8.', 'Aferrarse al peón de c4 perdiendo desarrollo.'],
    traps: ['Tras …dxc4, a4 impide …b5; capturar el peón de a4 con la dama puede quedar atrapada.'],
    middlegame: 'Posiciones sólidas con juego en el flanco de dama.',
    endgame: 'Estructura sana y alfil activo: buenos finales.',
  },
];

/** Posiciones del libro: cada prefijo de cada línea, en SAN. */
const BOOK: string[][] = OPENINGS.flatMap((o) => [o.line, ...(o.variations ?? [])]);

/** ¿La secuencia de jugadas (SAN inglés, desde la posición inicial) sigue alguna línea del libro? */
export function inBook(sans: string[]): boolean {
  if (!sans.length) return true;
  return BOOK.some((line) => sans.length <= line.length && sans.every((s, i) => line[i] === s.replace(/[+#]$/, '')));
}

/** Apertura reconocida (la de mayor coincidencia) para una partida. */
export function detectOpening(sans: string[]): Opening | null {
  let best: { o: Opening; n: number } | null = null;
  for (const o of OPENINGS) for (const line of [o.line, ...(o.variations ?? [])]) {
    let n = 0;
    while (n < sans.length && n < line.length && line[n] === sans[n]!.replace(/[+#]$/, '')) n++;
    if (n >= 3 && (!best || n > best.n)) best = { o, n };
  }
  return best?.o ?? null;
}
