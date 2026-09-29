/**
 * Exportaciones del usuario (brief §75): estadísticas (CSV) y plan de entrenamiento (Markdown).
 * PGN, FEN e imagen se exportan desde el análisis; el reporte, desde su pantalla.
 */
import { dailyPlan, recommendations } from './insights.js';
import { profile } from './store.js';

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Evita la inyección de fórmulas al abrir el CSV en una hoja de cálculo.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function statsCsv(): string {
  const header = ['fecha', 'modo', 'color', 'rival', 'nivel', 'resultado', 'motivo', 'reloj', 'pistas', 'errores', 'jugadas'];
  const rows = profile.games.map((g) => [
    new Date(g.at).toISOString(), g.mode ?? 'ai', g.userColor === 'w' ? 'blancas' : 'negras', g.bot.personality, g.bot.level,
    g.userResult === 'win' ? 'victoria' : g.userResult === 'draw' ? 'tablas' : 'derrota', g.reason ?? '', g.timeControl, g.hintsUsed,
    profile.mistakes.filter((m) => m.gameId === g.id).length, g.features?.moves ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function planMarkdown(now = new Date()): string {
  const plan = dailyPlan();
  const recs = recommendations();
  return [
    `# Plan de entrenamiento${profile.name ? ` de ${profile.name}` : ''}`,
    now.toLocaleDateString('es'),
    '',
    `Objetivo: ${profile.goal} · ${profile.dailyMinutes} min al día · rating ${profile.gameRating} (partidas) / ${profile.puzzleRating} (puzzles)`,
    '',
    '## Hoy',
    ...plan.map((b) => `- **${b.minutes} min** · ${b.label} — ${b.why}`),
    '',
    '## Recomendaciones',
    ...recs.slice(0, 4).map((r, i) => `${i + 1}. **${r.title}** — ${r.reason}`),
  ].join('\n') + '\n';
}
