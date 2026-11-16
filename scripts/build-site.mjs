import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, '_site');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// La landing es la portada del sitio.
await cp(resolve(root, 'site'), out, { recursive: true });

// El juego compilado se sirve en /jugar con rutas relativas.
await cp(resolve(root, 'dist'), resolve(out, 'jugar'), { recursive: true });

// GitHub Pages no necesita Jekyll para estos archivos.
await writeFile(resolve(out, '.nojekyll'), '');

console.log(`Sitio listo en ${out}`);
