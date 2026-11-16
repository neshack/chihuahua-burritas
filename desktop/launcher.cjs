'use strict';

// Linux standalone launcher. The game itself is embedded as Node SEA assets.
const http = require('node:http');
const sea = require('node:sea');
const { spawn } = require('node:child_process');
const { existsSync, mkdirSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir, homedir } = require('node:os');
const { join, extname, isAbsolute } = require('node:path');

const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};
const assetKeys = new Set(sea.getAssetKeys());
const silent = process.argv.includes('--sin-abrir');
let profile;
let temporaryProfile = false;
let browser;
let shuttingDown = false;

function findBrowser() {
  const candidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'brave-browser', 'brave'];
  for (const name of candidates) {
    for (const directory of (process.env.PATH || '').split(':')) {
      if (directory && existsSync(join(directory, name))) return join(directory, name);
    }
  }
  return null;
}

function finish(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(() => {
    if (profile && temporaryProfile) {
      try { rmSync(profile, { recursive: true, force: true }); } catch {}
    }
    process.exit(code);
  });
  setTimeout(() => process.exit(code), 2500).unref();
}

const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
  catch { response.writeHead(400).end('Solicitud inválida'); return; }
  const key = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!assetKeys.has(key)) { response.writeHead(404).end('No encontrado'); return; }
  const asset = Buffer.from(sea.getRawAsset(key));
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(key).toLowerCase()] || 'application/octet-stream',
    'Content-Length': asset.length,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
  });
  if (request.method === 'HEAD') response.end(); else response.end(asset);
});

let triedFallbackPort = false;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && !triedFallbackPort) {
    triedFallbackPort = true; server.listen(0, '127.0.0.1'); return;
  }
  console.error(`No se pudo iniciar el juego: ${error.message}`);
  process.exitCode = 1;
});
server.on('listening', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Chihuahua Burritas: ${url}`);
  if (silent) return;
  const chrome = findBrowser();
  if (chrome) {
    try {
      const dataHome = process.env.XDG_DATA_HOME && isAbsolute(process.env.XDG_DATA_HOME)
        ? process.env.XDG_DATA_HOME : join(homedir(), '.local', 'share');
      profile = join(dataHome, 'chihuahua-burritas', 'chrome-profile');
      mkdirSync(profile, { recursive: true });
      if (existsSync(join(profile, 'SingletonLock'))) {
        profile = mkdtempSync(join(tmpdir(), 'chihuahua-burritas-'));
        temporaryProfile = true;
      }
      browser = spawn(chrome, [`--app=${url}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check'], { stdio: 'ignore' });
      browser.once('error', error => { console.error(`No se pudo abrir el navegador: ${error.message}`); finish(1); });
      browser.once('exit', code => finish(code || 0));
      console.log('Cierra la ventana del juego para salir.');
    } catch (error) {
      console.error(`No se pudo abrir el navegador: ${error.message}`); finish(1);
    }
  } else {
    browser = spawn('xdg-open', [url], { stdio: 'ignore' });
    browser.once('error', error => { console.error(`No se pudo abrir el navegador: ${error.message}`); finish(1); });
    browser.once('exit', code => { if (code) { console.error(`Abre ${url} en tu navegador.`); } });
    console.log('Cierra este proceso con Ctrl+C al terminar.');
  }
});
server.listen(silent ? 0 : 39217, '127.0.0.1');
process.on('SIGINT', () => { if (browser && profile) browser.kill(); finish(); });
process.on('SIGTERM', () => { if (browser && profile) browser.kill(); finish(); });
