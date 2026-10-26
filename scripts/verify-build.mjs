import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const htmlPath = resolve(dist, 'index.html');

function fail(message) {
  console.error('[verify-build] FAIL: ' + message);
  process.exitCode = 1;
}

if (!existsSync(htmlPath)) {
  fail('dist/index.html is missing. Did Vite build run successfully?');
  process.exit();
}


const html = readFileSync(htmlPath, 'utf8');

// A successful Vite build must publish compiled assets, never raw source JSX.
if (/src\\s*=\\s*["'][^"']*src\\/main\\.jsx/i.test(html)) {
  fail('Built index.html still references src/main.jsx instead of a compiled bundle.');
}
if (/text\\/jsx/i.test(html)) {
  fail('Built index.html contains a text/jsx reference.');
}

const moduleScripts = [...html.matchAll(/<script\\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1]);

if (moduleScripts.length === 0) {
  fail('No external type=module script was found in dist/index.html.');
}

for (const source of moduleScripts) {
  if (/^https?:\\/\\//i.test(source) || source.startsWith('//')) continue;
  const pathname = source.split(/[?#]/, 1)[0];
  const withoutBase = pathname.replace(/^\\/chess-web\\//, '');
  const assetPath = resolve(dist, withoutBase.replace(/^\\/+/, ''));
  const rel = relative(dist, assetPath);

  if (rel.startsWith('..') || isAbsolute(rel)) {
    fail('Module script points outside dist/: ' + source);
    continue;
  }
  if (!existsSync(assetPath) || !statSync(assetPath).isFile()) {
    fail('Module script asset does not exist in build output: ' + source + ' -> ' + assetPath);
  }
}

if (!/assets\\/[^"']+\\.js(?:[?#][^"']*)?/i.test(html)) {
  fail('Built index.html does not reference a compiled JS file under assets/.');
}


for (const engineFile of [
  'stockfish/stockfish-19-lite-single.js',
  'stockfish/stockfish-19-lite-single.wasm'
]) {
  const enginePath = resolve(dist, engineFile);
  if (!existsSync(enginePath) || !statSync(enginePath).isFile()) {
    fail('Required Stockfish runtime asset is missing from dist/: ' + engineFile);
  } else if (statSync(enginePath).size === 0) {
    fail('Required Stockfish runtime asset is empty in dist/: ' + engineFile);
  }
}


if (/src\s*=\s*["'][^"']*src\/main\.jsx/i.test(html)) {
  fail('Built index.html still references src/main.jsx instead of a compiled bundle.');
}
if (/text\/jsx/i.test(html)) {
  fail('Built index.html contains a text/jsx reference.');
}

const moduleScripts = [...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1]);

if (moduleScripts.length === 0) {
  fail('No external type=module script was found in dist/index.html.');
}

for (const source of moduleScripts) {
  if (/^https?:\/\//i.test(source) || source.startsWith('//')) continue;
  const pathname = source.split(/[?#]/, 1)[0];
  const withoutBase = pathname.replace(/^\/chess-web\//, '');
  const assetPath = resolve(dist, withoutBase.replace(/^\/+/, ''));
  const rel = relative(dist, assetPath);

  if (rel.startsWith('..') || isAbsolute(rel)) {
    fail('Module script points outside dist/: ' + source);
    continue;
  }
  if (!existsSync(assetPath) || !statSync(assetPath).isFile()) {
    fail('Module script asset does not exist in build output: ' + source + ' -> ' + assetPath);
  }
}

if (!/assets\/[^"']+\.js(?:[?#][^"']*)?/i.test(html)) {
  fail('Built index.html does not reference a compiled JS file under assets/.');
}

if (process.exitCode) {
  console.error('[verify-build] Deployment will be blocked until the build output is corrected.');
} else {
  console.log('[verify-build] PASS: built HTML references compiled JS assets and does not point to source JSX.');
}
