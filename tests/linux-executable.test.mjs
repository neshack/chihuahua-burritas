import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, access } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const executable = join(root, 'ejecutable', 'Chihuahua-Burritas');
try {
  await access(executable);
} catch {
  console.log('SKIP: no hay ejecutable local. Genera uno con npm run build:linux para comprobarlo.');
  process.exit(0);
}
const launcher = spawn(executable, ['--sin-abrir'], { stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
launcher.stderr.on('data', chunk => { stderr += chunk; });
try {
  const url = await new Promise((resolveUrl, reject) => {
    const timer = setTimeout(() => reject(new Error(`El ejecutable no arrancó: ${stderr}`)), 10000);
    launcher.once('error', reject);
    launcher.once('exit', code => reject(new Error(`El ejecutable terminó con ${code}: ${stderr}`)));
    launcher.stdout.on('data', chunk => {
      const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) { clearTimeout(timer); resolveUrl(match[0]); }
    });
  });
  let count = 0;
  async function check(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { await check(file); continue; }
      const key = relative(dist, file).split('\\').join('/');
      const response = await fetch(new URL(key, url));
      assert.equal(response.status, 200, key);
      const expected = await readFile(file);
      const actual = Buffer.from(await response.arrayBuffer());
      assert.equal(createHash('sha256').update(actual).digest('hex'), createHash('sha256').update(expected).digest('hex'), key);
      count++;
    }
  }
  await check(dist);
  assert.equal((await fetch(new URL('missing-file', url))).status, 404);
  console.log(`PASS: el ejecutable inicia y entrega ${count} archivos idénticos a la compilación, incluidos los sprites y el código de audio.`);
} finally {
  launcher.kill('SIGTERM');
}
