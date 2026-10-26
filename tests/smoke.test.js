import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import foundations from '../docs/opening-coach/lessons/ruy-lopez-01-foundations.json' with { type: 'json' };
import whiteMorphy from '../docs/opening-coach/lessons/ruy-lopez-02-white-morphy.json' with { type: 'json' };
import blackAfterCastling from '../docs/opening-coach/lessons/ruy-lopez-03-black-after-castling.json' with { type: 'json' };

const lessons = [foundations, whiteMorphy, blackAfterCastling];

test('core chess rules: legal moves update FEN and undo restores the position', () => {
  const game = new Chess();
  const startFen = game.fen();
  assert.equal(game.move('e4').san, 'e4');
  assert.equal(game.move('e5').san, 'e5');
  assert.notEqual(game.fen(), startFen);
  game.undo();
  game.undo();
  assert.equal(game.fen(), startFen);
});

test('core chess rules: illegal SAN is rejected', () => {
  const game = new Chess();
  assert.throws(() => game.move('Qh5'), /Invalid move|Invalid move in PGN|Invalid SAN/i);
});

test('core chess rules: PGN export can be loaded back with the same move history', () => {
  const game = new Chess();
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) game.move(san);
  const copy = new Chess();
  copy.loadPgn(game.pgn());
  assert.deepEqual(copy.history(), game.history());
  assert.equal(copy.fen(), game.fen());
});

test('opening lesson data has unique IDs and required exercise content', () => {
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, lessons.length);
  for (const lesson of lessons) {
    assert.ok(lesson.title, lesson.id + ': missing title');
    assert.ok(Array.isArray(lesson.exercises) && lesson.exercises.length > 0, lesson.id + ': no exercises');
    assert.ok(Array.isArray(lesson.objectives) && lesson.objectives.length > 0, lesson.id + ': no objectives');
  }
});

for (const lesson of lessons) {
  test('opening lesson exercises use legal positions and answer moves: ' + lesson.id, () => {
    for (const [index, exercise] of lesson.exercises.entries()) {
      const game = new Chess(lesson.startFen);
      for (const san of exercise.positionAfter) {
        assert.doesNotThrow(() => game.move(san), lesson.id + ' exercise ' + (index + 1) + ': invalid position move ' + san);
      }
      const legalMoves = game.moves();
      assert.ok(Array.isArray(exercise.acceptedMoves) && exercise.acceptedMoves.length > 0,
        lesson.id + ' exercise ' + (index + 1) + ': acceptedMoves is empty');
      for (const san of [...exercise.acceptedMoves, ...Object.keys(exercise.wrongMoveFeedback || {})]) {
        assert.ok(legalMoves.includes(san),
          lesson.id + ' exercise ' + (index + 1) + ': answer is not legal in position: ' + san);
      }
    }
  });
}
