# Chess Web

A lightweight static chess app built with React, Vite, and chess.js..

## Features

- Play against Stockfish in the browser.
- Choose White or Black and Stockfish Skill Level 0–20.
- Start a new game, undo a turn, and flip the board.
- Analyse a position with Stockfish.
- Position editor: place or remove pieces, reset the board, validate/apply FEN, and start from a custom FEN.
- Responsive board using the Neo piece images from `ShimeKano/covua/assneo`.
- No account, Firebase, database, leaderboard, or backend required.

## Run locally

```bash
npm install
npm run dev
```

## Build for GitHub Pages

```bash
npm run build
npm run preview
```

The build script copies the Stockfish JavaScript and WASM files from the installed `stockfish` package into `public/stockfish`. The engine loads when a move or analysis is requested.

## Stockfish license

Stockfish.js is distributed under GPL-3.0. The build script copies the upstream `Copying.txt` license into `public/stockfish` when available. See the [Stockfish.js project](https://github.com/nmrugg/stockfish.js).
