import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'node_modules', 'stockfish', 'bin');
const destination = join(root, 'public', 'stockfish');
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

await mkdir(destination, { recursive: true });
for (const file of files) {
  const from = join(source, file);
  if (!existsSync(from)) {
    throw new Error(`Stockfish file not found: ${from}. Check that npm install completed successfully.`);
  }
  await copyFile(from, join(destination, file));
}

const license = join(root, 'node_modules', 'stockfish', 'Copying.txt');
if (existsSync(license)) await copyFile(license, join(destination, 'Copying.txt'));
console.log('Stockfish lite-single WASM copied to public/stockfish.');
