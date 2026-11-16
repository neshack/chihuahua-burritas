import { readdir, mkdir, mkdtemp, rename, writeFile, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

if (process.platform !== 'linux' || process.arch !== 'x64') {
  throw new Error('Este paquete se construye en Linux x86-64.');
}
const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const output = join(root, 'ejecutable', 'Chihuahua-Burritas');
await mkdir(join(root, 'ejecutable'), { recursive: true });
const buildDirectory = await mkdtemp(join(root, 'ejecutable', '.build-'));
const configFile = join(buildDirectory, 'sea-config.json');
const stagedOutput = join(buildDirectory, 'Chihuahua-Burritas');
const assets = {};
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile()) assets[relative(dist, path).split('\\').join('/')] = path;
  }
}
await walk(dist);
if (!assets['index.html'] || !assets['art/chicken-atlas.png'] || !assets['art/dog-atlas.png']) {
  throw new Error('Faltan archivos del juego; ejecuta primero npm run build.');
}
await writeFile(configFile, JSON.stringify({ main: join(root, 'desktop', 'launcher.cjs'), output: stagedOutput, disableExperimentalSEAWarning: true, assets }, null, 2));
try {
  const result = spawnSync(process.execPath, ['--build-sea', configFile], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('No se pudo crear el ejecutable Linux. Revisa la salida anterior.');
  await rename(stagedOutput, output);
} finally {
  await rm(buildDirectory, { recursive: true, force: true });
}
console.log(`Ejecutable creado: ${output}`);
