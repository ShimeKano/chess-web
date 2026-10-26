import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Chess } from "chess.js";

const root = path.resolve("docs/opening-coach/lessons");
const files = (await readdir(root)).filter((name) => name.endsWith(".json")).sort();
if (files.length === 0) throw new Error("No opening lesson JSON files found.");

function replay(startFen, moves, context) {
  const chess = new Chess(startFen);
  for (let i = 0; i < moves.length; i += 1) {
    const san = moves[i];
    try {
      const result = chess.move(san);
      if (!result) throw new Error("Move was not applied");
    } catch (error) {
      throw new Error(`${context}: illegal/invalid SAN "${san}" at ply ${i + 1}: ${error.message}`);
    }
  }
  return chess;
}

function validateBranch(baseFen, nodes, lessonId, pathLabel = "branches") {
  for (const node of nodes ?? []) {
    const chess = new Chess(baseFen);
    try {
      chess.move(node.san);
    } catch (error) {
      throw new Error(`${lessonId} ${pathLabel}/${node.id}: invalid SAN "${node.san}": ${error.message}`);
    }
    validateBranch(chess.fen(), node.children, lessonId, `${pathLabel}/${node.id}`);
  }
}

for (const file of files) {
  const fullPath = path.join(root, file);
  const lesson = JSON.parse(await readFile(fullPath, "utf8"));
  const label = lesson.id ?? file;
  for (const key of ["schemaVersion", "id", "title", "startFen", "introLine", "objectives", "sections", "branches", "exercises", "completion", "tags"]) {
    if (!(key in lesson)) throw new Error(`${file}: missing required field ${key}`);
  }
  if (lesson.schemaVersion !== 1) throw new Error(`${file}: unsupported schemaVersion`);
  const introPosition = replay(lesson.startFen, lesson.introLine, `${label} introLine`);
  validateBranch(introPosition.fen(), lesson.branches, label);
  for (const exercise of lesson.exercises) {
    const chess = replay(lesson.startFen, exercise.positionAfter, `${label} exercise ${exercise.id}`);
    for (const san of exercise.acceptedMoves) {
      const test = new Chess(chess.fen());
      try {
        test.move(san);
      } catch (error) {
        throw new Error(`${label} exercise ${exercise.id}: invalid accepted SAN "${san}": ${error.message}`);
      }
    }
    if (!exercise.acceptedMoves.includes(exercise.preferredMove)) {
      throw new Error(`${label} exercise ${exercise.id}: preferredMove must be in acceptedMoves`);
    }
    for (const san of exercise.acceptedMoves) {
      if (!exercise.feedback?.[san]) {
        throw new Error(`${label} exercise ${exercise.id}: missing feedback for accepted move "${san}"`);
      }
    }
  }
  console.log(`Validated ${file}`);
}
console.log(`Validated ${files.length} lesson file(s).`);
