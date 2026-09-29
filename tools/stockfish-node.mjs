/**
 * Stockfish en Node: lanza el motor WASM de vendor/stockfish en un proceso hijo y lo expone
 * como `UciEngine` de @kavalo/engine. Se usa en pruebas, scripts de verificación de
 * contenido y el servidor de análisis.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { UciEngine } from '@kavalo/engine';

const ENGINE = fileURLToPath(new URL('../vendor/stockfish/stockfish-19-lite-single.js', import.meta.url));

export function createNodeEngine() {
  const child = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '';
  const listeners = [];
  const onData = (chunk) => {
    buffer += chunk.toString();
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      listeners.forEach((fn) => fn(line));
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  return new UciEngine({
    send: (cmd) => child.stdin.write(`${cmd}\n`),
    onLine: (fn) => listeners.push(fn),
    terminate: () => child.kill(),
  });
}
