let worker = null;
let readyPromise = null;
let ready = false;
let activeResolve = null;
let activeReject = null;
let timeoutId = null;\nlet handshakeTimeout = null;

function boot() {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve, reject) => {
    try {
      // Vite copies the engine worker into the static build; no runtime CDN/backend.
      worker = new Worker(new URL(import.meta.env.BASE_URL + 'stockfish/stockfish-19-lite-single.js', window.location.href));
      worker.onmessage = (event) => {
        const line = String(event.data ?? '').trim();
        if (line === 'uciok') {
          worker.postMessage('isready');
          return;
        }
        if (line === 'readyok') {
          ready = true;
          resolve();
          return;
        }
        if (line.startsWith('bestmove ')) {
          const move = line.split(/\s+/)[1] || '(none)';
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = null;
          const done = activeResolve;
          activeResolve = null;
          activeReject = null;
          if (done) done(move);
        }
        if (line.startsWith('info string') && /error/i.test(line) && activeReject) {
          const fail = activeReject;
          activeResolve = null;
          activeReject = null;
          fail(new Error(line));
        }
      };
      worker.onerror = (event) => {
        const fail = activeReject;
        activeResolve = null;
        activeReject = null;
        if (fail) fail(new Error(event.message || 'Stockfish worker failed'));
        if (!ready) reject(new Error('Không tải được Stockfish WASM.'));
      };
      worker.postMessage('uci');
      const handshakeTimeout = setTimeout(() => {
        if (!ready) reject(new Error('Stockfish khởi động quá lâu.'));
      }, 20000);
      readyPromise.finally(() => clearTimeout(handshakeTimeout)).catch(() => {});
    } catch (error) {
      reject(error);
    }
  });
  return readyPromise;
}

async function search(fen, { skillLevel = 8, depth = null, moveTime = 1000 } = {}) {
  await boot();
  if (activeResolve) throw new Error('Stockfish đang xử lý một yêu cầu khác.');
  return new Promise((resolve, reject) => {
    activeResolve = resolve;
    activeReject = reject;
    timeoutId = setTimeout(() => {
      activeResolve = null;
      activeReject = null;
      reject(new Error('Stockfish hết thời gian chờ.'));
    }, Math.max(15000, moveTime + 10000));
    worker.postMessage('setoption name Skill Level value ' + Math.max(0, Math.min(20, Number(skillLevel) || 0));
    worker.postMessage('position fen ' + fen);
    worker.postMessage(depth == null ? 'go movetime ' + Math.max(100, moveTime) : 'go depth ' + Math.max(1, Math.min(40, depth)));
  });
}

export function bestMove(fen, skillLevel = 8, moveTime = 1000) {
  return search(fen, { skillLevel, moveTime });
}

export function analyse(fen, depth = 12) {
  return search(fen, { skillLevel: 20, depth });
}
