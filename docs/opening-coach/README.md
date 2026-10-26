# Opening Coach — Ruy Lopez curriculum

This directory defines the first static lesson pack for the chess-web Opening Coach. The three starter lessons are connected to the “Học khai cuộc” UI and do not require an AI API, a server, or a database.

## Goals

- Teach the Ruy Lopez from both White's and Black's perspective.
- Explain plans and trade-offs, not just memorized move sequences.
- Accept multiple sensible moves when the exercise is about choosing a plan.
- Keep lesson playback independent of Stockfish; use the engine only for optional analysis of positions outside the curated lines.
- Preserve the app's Node.js 24 LTS requirement.

## First three sample lessons

1. `lessons/ruy-lopez-01-foundations.json` — identify the opening and understand the pressure on e5.
2. `lessons/ruy-lopez-02-white-morphy.json` — White's choices after `3...a6`.
3. `lessons/ruy-lopez-03-black-after-castling.json` — Black chooses between a Closed setup and the Open Variation after `5.O-O`.

These are schema examples and starter lessons, not a claim to cover all Ruy Lopez theory. Move legality should be validated with chess.js before publishing the pack.

## Data contract

- Schema: `schema/lesson.schema.json`.
- Each lesson starts from a FEN and replays `introLine` as SAN.
- Branches are nested move trees. Each move stores SAN, a stable node ID, a short explanation, and optional child branches.
- Exercises identify their position by replaying `positionAfter` from the lesson start. This avoids stale or hand-copied FENs.
- `acceptedMoves` contains SAN moves accepted for the exercise position. `preferredMove` is pedagogical guidance, not the only legal move.
- Hints are progressive. Feedback is keyed by SAN and should explain the plan and trade-off.
- Unknown or out-of-book legal moves should not crash lesson playback. In static lesson mode, explain that the move leaves the curated line; in analysis mode, optionally ask Stockfish to evaluate the resulting position.

## Validation checklist

1. Parse every JSON file.
2. Validate each starting FEN.
3. Replay every `introLine`, branch path, and exercise `positionAfter` with chess.js.
4. Verify every branch move and accepted exercise move is legal at its exact position.
5. Ensure SAN in data matches chess.js SAN output.
6. Run the app's production build on Node.js 24.
7. Manually test answer feedback, progressive hints, lesson/exercise navigation, and keyboard/screen-reader usability. The current UI does not yet persist mistake history.

## Planned curriculum

The long-form plan is 48 core lessons across foundations, Closed/Morphy, Black's responses, Exchange, Berlin, Open, Marshall, important side lines, tactics, middlegame/endgame plans, and mixed-color practice. The three starter lessons deliberately test the data model before the remaining curriculum is authored.
