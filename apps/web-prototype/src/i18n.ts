/**
 * Multiidioma (brief §71): español e inglés desde el inicio, con claves y sin texto fijo en el
 * código de las pantallas traducidas. Añadir un idioma = añadir un diccionario con las mismas
 * claves (los tests comprueban que no falta ninguna). Las claves ausentes caen al español.
 */
export type Locale = 'es' | 'en';

const es = {
  'nav.home': 'Inicio', 'nav.learn': 'Aprender', 'nav.play': 'Jugar', 'nav.puzzles': 'Puzzles', 'nav.progress': 'Progreso',
  'nav.main': 'Navegación principal', 'nav.settings': 'Perfil y ajustes', 'nav.brand': 'Kavalo, inicio',
  'home.morning': 'Buenos días', 'home.afternoon': 'Buenas tardes', 'home.evening': 'Buenas noches',
  'home.level': 'Nivel: {level} · Rating {rating}', 'home.today': 'Hoy', 'home.why': '¿Por qué esto?',
  'home.plan': '{min} min · {blocks} bloques', 'home.seePlan': 'Ver plan', 'home.other': 'Otras opciones',
  'home.missions': 'Misiones de hoy', 'home.missionDone': '¡cumplida!', 'home.dna': 'Tu ADN ajedrecístico',
  'home.dnaBuilding': 'Perfil en construcción ({n}/5 partidas analizadas). Juega para descubrir tu estilo.',
  'home.dnaBased': 'basado en {n} partidas analizadas', 'home.week': 'Tu semana', 'home.report': 'Reporte de progreso',
  'home.achievements': 'Logros', 'home.ofTotal': '{a} de {b}', 'home.streak': 'Días seguidos aprendiendo',
  'home.kidsStory': 'Kavi el caballo te espera para una nueva aventura.',
  'settings.title': 'Perfil y ajustes', 'settings.profile': 'Perfil', 'settings.name': 'Nombre', 'settings.daily': 'Tiempo diario',
  'settings.coach': 'Entrenador', 'settings.language': 'Idioma', 'settings.mode': 'Experiencia',
  'settings.mode.adult': 'Adulto: limpia, técnica y con pocas animaciones', 'settings.mode.kids': 'Niños: explicaciones breves, historias y recompensas',
  'settings.pieces': 'Set de piezas', 'settings.piecesHelp': 'Todos los sets mantienen la misma silueta para que cada pieza sea reconocible. Los modelos 3D quedan para la presentación y la colección.',
  'settings.help': 'Ayudas', 'settings.board': 'Tablero', 'settings.a11y': 'Apariencia y accesibilidad', 'settings.privacy': 'Privacidad',
  'settings.partial': 'La interfaz principal está traducida; algunas lecciones y explicaciones aún se muestran en español.',
  'onb.audience': '¿Quién va a usar Kavalo?', 'onb.audience.adult': 'Un adulto', 'onb.audience.kids': 'Un niño o una niña',
  'onb.audienceHelp': 'Cambia el tono y el aspecto, nunca las reglas del ajedrez.',
  'onb.language': 'Idioma', 'common.continue': 'Continuar',
} as const;

export type MessageKey = keyof typeof es;

const en: Record<MessageKey, string> = {
  'nav.home': 'Home', 'nav.learn': 'Learn', 'nav.play': 'Play', 'nav.puzzles': 'Puzzles', 'nav.progress': 'Progress',
  'nav.main': 'Main navigation', 'nav.settings': 'Profile and settings', 'nav.brand': 'Kavalo, home',
  'home.morning': 'Good morning', 'home.afternoon': 'Good afternoon', 'home.evening': 'Good evening',
  'home.level': 'Level: {level} · Rating {rating}', 'home.today': 'Today', 'home.why': 'Why this?',
  'home.plan': '{min} min · {blocks} blocks', 'home.seePlan': 'See plan', 'home.other': 'Other options',
  'home.missions': "Today's missions", 'home.missionDone': 'done!', 'home.dna': 'Your chess DNA',
  'home.dnaBuilding': 'Profile in progress ({n}/5 analysed games). Play to discover your style.',
  'home.dnaBased': 'based on {n} analysed games', 'home.week': 'Your week', 'home.report': 'Progress report',
  'home.achievements': 'Achievements', 'home.ofTotal': '{a} of {b}', 'home.streak': 'Days in a row learning',
  'home.kidsStory': 'Kavi the knight is waiting for a new adventure.',
  'settings.title': 'Profile and settings', 'settings.profile': 'Profile', 'settings.name': 'Name', 'settings.daily': 'Daily time',
  'settings.coach': 'Coach', 'settings.language': 'Language', 'settings.mode': 'Experience',
  'settings.mode.adult': 'Adult: clean, technical, few animations', 'settings.mode.kids': 'Kids: short explanations, stories and rewards',
  'settings.pieces': 'Piece set', 'settings.piecesHelp': 'Every set keeps the same silhouette so each piece stays recognisable. 3D models are reserved for presentation and collection.',
  'settings.help': 'Help', 'settings.board': 'Board', 'settings.a11y': 'Appearance and accessibility', 'settings.privacy': 'Privacy',
  'settings.partial': 'The main interface is translated; some lessons and explanations are still shown in Spanish.',
  'onb.audience': 'Who will use Kavalo?', 'onb.audience.adult': 'An adult', 'onb.audience.kids': 'A child',
  'onb.audienceHelp': 'It changes the tone and look, never the rules of chess.',
  'onb.language': 'Language', 'common.continue': 'Continue',
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { es, en };

let locale: Locale = 'es';

export function setLocale(l: Locale): void {
  locale = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export const getLocale = () => locale;

/** Idioma inicial según el navegador. */
export const detectLocale = (): Locale => (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es');

export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  const text = MESSAGES[locale][key] ?? es[key];
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
