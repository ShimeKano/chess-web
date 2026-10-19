# Chess Web

A static-friendly chess app built with React, Vite, and chess.js.

## Features

- Play a local game against Stockfish in the browser.
- Stockfish 19 lite single-threaded WASM is copied into the static build; no engine server or runtime CDN is required.
- Engine loads on demand when the player requests a computer move or analysis. The JS + WASM engine assets are about 1.7 MB before transfer compression and can be cached by the browser.
- Choose White or Black, set Stockfish Skill Level from 0–20, undo a turn, flip the board, and analyse a position.
- Position editor: place/replace pieces, clear the board, reset to the initial position, validate/apply FEN, and start a game from a custom FEN.
- Responsive board and the 12 Neo piece images from the companion `covua/assneo` repository.
- Optional Firebase authentication and player leaderboard. These features require Firebase environment variables; the chess board and Stockfish remain usable without Firebase.

## Run locally

```bash
npm install
npm run dev
```

The `predev` script copies the Stockfish lite-single JavaScript and WASM files from `node_modules/stockfish/bin` to `public/stockfish`.

## Build for GitHub Pages

```bash
npm run build
npm run preview
```

The `prebuild` script stages the engine files before Vite builds the static site. The single-threaded build does not require cross-origin isolation headers, so it is suitable for GitHub Pages. The first computer move/analysis downloads the engine assets; subsequent visits can use the browser cache.

## Firebase (optional)

Configure the existing `VITE_FIREBASE_*` environment variables for authentication and leaderboard access. Without them, Firebase-dependent features are disabled and the local chess game still works.

## Stockfish license

Stockfish.js is distributed under GPL-3.0. The copy script also copies the upstream `Copying.txt` license into `public/stockfish` when it is present. See the upstream [Stockfish.js project](https://github.com/nmrugg/stockfish.js).
