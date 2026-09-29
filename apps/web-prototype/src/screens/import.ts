/**
 * Importar partidas y posiciones (brief §74): pegar PGN o FEN, o subir un archivo .pgn.
 * Un PGN se guarda como partida analizable (no cuenta para el rating); una FEN se puede
 * ver, exportar como imagen o jugar contra la IA.
 */
import { Game, pgnHeaders, Position, splitPgn } from '@kavalo/chess-core';
import { Board } from '../components/board.js';
import { boardToPng, download } from '../components/board-image.js';
import { button, h, navigate, primaryButton, screen } from '../dom.js';
import { reviewInBackground } from '../state/review.js';
import { profile, save, uid, type GameRecord } from '../state/store.js';
import { presetGame } from './play.js';

export type ParsedInput =
  | { kind: 'fen'; position: Position }
  | { kind: 'pgn'; game: Game; headers: Record<string, string>; count: number }
  | { kind: 'error'; message: string };

/** Detecta si el texto es una FEN o un PGN y lo valida. */
export function parseImport(text: string): ParsedInput {
  const t = text.trim();
  if (!t) return { kind: 'error', message: 'Pega un PGN o una FEN.' };
  if (/^[pnbrqkPNBRQK1-8]+(\/[pnbrqkPNBRQK1-8]+){7}\s/.test(t) && !t.includes('\n')) {
    try { return { kind: 'fen', position: Position.fromFen(t) }; } catch (e) { return { kind: 'error', message: (e as Error).message }; }
  }
  try {
    const games = splitPgn(t);
    const game = Game.fromPgn(games[0] ?? t);
    if (!game.history.length) return { kind: 'error', message: 'El PGN no contiene jugadas.' };
    return { kind: 'pgn', game, headers: pgnHeaders(t), count: games.length };
  } catch (e) {
    return { kind: 'error', message: (e as Error).message };
  }
}

export function renderImport(root: HTMLElement): void {
  const area = h('textarea', { class: 'input import-area', rows: 8, 'aria-label': 'PGN o FEN', placeholder: 'Pega aquí un PGN (partida) o una FEN (posición)…' }) as HTMLTextAreaElement;
  const file = h('input', { type: 'file', accept: '.pgn,.txt,application/x-chess-pgn,text/plain', 'aria-label': 'Subir archivo PGN' }) as HTMLInputElement;
  const result = h('div', {});
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { result.replaceChildren(h('p', { class: 'msg msg-bad' }, 'Archivo demasiado grande (máx. 2 MB).')); return; }
    area.value = await f.text();
    check();
  });

  const check = () => {
    const r = parseImport(area.value);
    if (r.kind === 'error') { result.replaceChildren(h('p', { class: 'msg msg-bad' }, r.message)); return; }
    const board = new Board({ coordinates: profile.settings.coordinates, reduceMotion: true });
    if (r.kind === 'fen') {
      board.setPosition(r.position, null, false);
      result.replaceChildren(h('p', { class: 'msg msg-good' }, `Posición válida · juegan ${r.position.turn === 'w' ? 'blancas' : 'negras'}.`),
        h('div', { class: 'board-holder' }, board.el),
        h('div', { class: 'cta' },
          primaryButton('JUGAR DESDE AQUÍ CONTRA LA IA', () => { presetGame({ mode: 'training', customFen: r.position.toFen() }); navigate('#/play'); }),
          button('Descargar imagen (PNG)', () => void boardToPng(r.position).then((b) => download('kavalo-posicion.png', b)))));
      return;
    }
    const hd = r.headers;
    const last = r.game.history.at(-1)!;
    board.setPosition(last.after, { from: last.move.from, to: last.move.to }, false);
    const name = profile.name.trim().toLowerCase();
    let color: 'w' | 'b' = name && (hd.Black ?? '').toLowerCase().includes(name) ? 'b' : 'w';
    const colorBtns = h('div', { class: 'seg' });
    const renderColor = () => colorBtns.replaceChildren(...(['w', 'b'] as const).map((c) => {
      const b = h('button', { class: `seg-btn ${color === c ? 'on' : ''}`, 'aria-pressed': String(color === c) }, c === 'w' ? `Blancas${hd.White ? ` (${hd.White})` : ''}` : `Negras${hd.Black ? ` (${hd.Black})` : ''}`);
      b.addEventListener('click', () => { color = c; renderColor(); });
      return b;
    }));
    renderColor();
    result.replaceChildren(
      h('p', { class: 'msg msg-good' }, `Partida válida · ${r.game.history.length} medias jugadas${r.count > 1 ? ` · el archivo tiene ${r.count} partidas: se importa la primera` : ''}.`),
      h('div', { class: 'board-holder' }, board.el),
      h('fieldset', { class: 'group' }, h('legend', {}, '¿Con qué color jugabas?'), colorBtns),
      h('div', { class: 'cta' }, primaryButton('IMPORTAR Y ANALIZAR', () => {
        // Si la partida termina en el tablero (mate, ahogado…), manda el tablero sobre la etiqueta.
        const st = r.game.status();
        const res = st.over ? st.result : hd.Result ?? st.result;
        const userResult: GameRecord['userResult'] = res === '1/2-1/2' ? 'draw' : res === '*' ? 'draw' : (res === '1-0') === (color === 'w') ? 'win' : 'loss';
        const record: GameRecord = {
          id: uid(), at: Date.now(), pgn: r.game.pgn({ ...pick(hd, ['Event', 'Site', 'Date', 'White', 'Black']), Result: res }), userColor: color,
          bot: { personality: 'import', level: 0 }, result: res, userResult, timeControl: hd.TimeControl ?? 'none', hintsUsed: 0, mode: 'import',
        };
        profile.games.push(record);
        save();
        void reviewInBackground(record);
        navigate(`#/analysis/${record.id}`);
      })));
  };

  root.append(screen('Importar',
    h('p', { class: 'muted' }, 'Analiza tus partidas de torneo o de otras webs: pega el PGN o sube el archivo. También puedes pegar una FEN para estudiar una posición.'),
    area, h('label', { class: 'field' }, h('span', { class: 'small' }, 'O sube un archivo .pgn'), file),
    h('div', { class: 'cta' }, primaryButton('COMPROBAR', check)), result,
    h('p', { class: 'muted small' }, 'Las partidas importadas se analizan con Stockfish y alimentan tu ADN, pero no cambian tu rating interno. La conexión con otras webs llegará cuando sus APIs lo permitan.')));
}

function pick(o: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.filter((k) => o[k]).map((k) => [k, o[k]!]));
}
