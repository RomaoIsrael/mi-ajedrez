/**
 * Cliente UCI independiente del transporte: sirve igual para Stockfish en un Web Worker
 * (navegador) que en un proceso hijo (Node, servidor de análisis y tests).
 *
 * UCI es un protocolo en serie: las búsquedas se encolan y se ejecutan de una en una.
 */

export interface Transport {
  send(command: string): void;
  onLine(listener: (line: string) => void): void;
  terminate?(): void;
}

export interface SearchOptions {
  depth?: number;
  movetime?: number;
  nodes?: number;
  /** Número de variantes principales (MultiPV). */
  multipv?: number;
  /** Skill Level de Stockfish (0–20). */
  skill?: number;
  /** Fuerza limitada por Elo (UCI_LimitStrength + UCI_Elo). */
  elo?: number;
  /** Jugadas a analizar exclusivamente (UCI). */
  searchmoves?: string[];
  /** Límite de seguridad en ms (por defecto 30 s). */
  timeoutMs?: number;
}

/** Puntuación desde el punto de vista del bando que mueve. */
export interface Score {
  cp?: number;
  mate?: number;
}

export interface AnalysisLine extends Score {
  multipv: number;
  depth: number;
  pv: string[];
}

export interface Analysis {
  fen: string;
  depth: number;
  lines: AnalysisLine[];
  bestmove: string | null;
}

interface Job {
  fen: string;
  opts: SearchOptions;
  resolve: (a: Analysis) => void;
  reject: (e: Error) => void;
}

const DEFAULTS = { MultiPV: '1', 'Skill Level': '20', UCI_LimitStrength: 'false', UCI_Elo: '1500' };

/** Interpreta una línea «info …» de UCI. Devuelve null si no es una variante con puntuación. */
export function parseInfo(line: string): AnalysisLine | null {
  if (!line.startsWith('info ') || !line.includes(' pv ') || !line.includes(' score ')) return null;
  const t = line.split(/\s+/);
  const num = (key: string) => {
    const i = t.indexOf(key);
    return i >= 0 ? Number(t[i + 1]) : undefined;
  };
  const si = t.indexOf('score');
  const kind = t[si + 1];
  const value = Number(t[si + 2]);
  if (t[si + 3] === 'lowerbound' || t[si + 3] === 'upperbound') return null;
  const pv = t.slice(t.indexOf('pv') + 1);
  return {
    multipv: num('multipv') ?? 1,
    depth: num('depth') ?? 0,
    ...(kind === 'mate' ? { mate: value } : { cp: value }),
    pv,
  };
}

export class UciEngine {
  name = 'desconocido';
  private readonly queue: Job[] = [];
  private busy = false;
  private listeners: ((line: string) => void)[] = [];
  private options: Record<string, string> = { ...DEFAULTS };
  private ready: Promise<string> | null = null;

  constructor(private readonly transport: Transport) {
    transport.onLine((raw) => {
      for (const line of raw.split('\n')) {
        const l = line.trim();
        if (l) this.listeners.forEach((fn) => fn(l));
      }
    });
  }

  private waitFor(predicate: (line: string) => boolean, timeoutMs: number, onLine?: (line: string) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter((l) => l !== fn);
        reject(new Error('El motor no respondió a tiempo'));
      }, timeoutMs);
      const fn = (line: string) => {
        onLine?.(line);
        if (predicate(line)) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter((l) => l !== fn);
          resolve(line);
        }
      };
      this.listeners.push(fn);
    });
  }

  /** Arranca el motor (uci → uciok, isready → readyok). Idempotente. */
  init(timeoutMs = 20_000): Promise<string> {
    this.ready ??= (async () => {
      const done = this.waitFor((l) => l === 'uciok', timeoutMs, (l) => {
        if (l.startsWith('id name ')) this.name = l.slice(8);
      });
      this.transport.send('uci');
      await done;
      await this.isReady(timeoutMs);
      return this.name;
    })();
    return this.ready;
  }

  private async isReady(timeoutMs = 10_000): Promise<void> {
    const p = this.waitFor((l) => l === 'readyok', timeoutMs);
    this.transport.send('isready');
    await p;
  }

  /** Nueva partida: limpia la tabla hash. */
  async newGame(): Promise<void> {
    await this.init();
    this.transport.send('ucinewgame');
    await this.isReady();
  }

  analyse(fen: string, opts: SearchOptions = {}): Promise<Analysis> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fen, opts, resolve, reject });
      void this.pump();
    });
  }

  private async setOption(name: string, value: string): Promise<boolean> {
    if (this.options[name] === value) return false;
    this.options[name] = value;
    this.transport.send(`setoption name ${name} value ${value}`);
    return true;
  }

  private async pump(): Promise<void> {
    if (this.busy) return;
    const job = this.queue.shift();
    if (!job) return;
    this.busy = true;
    try {
      await this.init();
      job.resolve(await this.search(job));
    } catch (e) {
      job.reject(e instanceof Error ? e : new Error(String(e)));
    } finally {
      this.busy = false;
      void this.pump();
    }
  }

  private async search({ fen, opts }: Job): Promise<Analysis> {
    const multipv = Math.max(1, Math.min(10, opts.multipv ?? 1));
    let changed = await this.setOption('MultiPV', String(multipv));
    changed = (await this.setOption('Skill Level', String(opts.skill ?? 20))) || changed;
    changed = (await this.setOption('UCI_LimitStrength', opts.elo ? 'true' : 'false')) || changed;
    if (opts.elo) changed = (await this.setOption('UCI_Elo', String(Math.round(opts.elo)))) || changed;
    if (changed) await this.isReady();

    const lines = new Map<number, AnalysisLine>();
    const limits = [
      opts.depth ? `depth ${opts.depth}` : '',
      opts.movetime ? `movetime ${opts.movetime}` : '',
      opts.nodes ? `nodes ${opts.nodes}` : '',
      opts.searchmoves?.length ? `searchmoves ${opts.searchmoves.join(' ')}` : '',
    ].filter(Boolean).join(' ') || 'depth 12';
    const done = this.waitFor((l) => l.startsWith('bestmove'), opts.timeoutMs ?? 30_000, (l) => {
      const info = parseInfo(l);
      if (info) lines.set(info.multipv, info);
    });
    this.transport.send(`position fen ${fen}`);
    this.transport.send(`go ${limits}`);
    const best = (await done).split(/\s+/)[1] ?? null;
    const sorted = [...lines.values()].sort((a, b) => a.multipv - b.multipv);
    return {
      fen,
      depth: Math.max(0, ...sorted.map((l) => l.depth)),
      lines: sorted,
      bestmove: best && best !== '(none)' ? best : null,
    };
  }

  quit(): void {
    try {
      this.transport.send('quit');
    } finally {
      this.transport.terminate?.();
    }
  }
}
