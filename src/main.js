import '@fontsource/lilita-one/400.css';
import '@fontsource-variable/nunito/index.css';
import './styles.css';
import { Game } from './game/game.js';
import { loadPixelSprites } from './characters/pixelSprites.js';

const canvas = document.getElementById('gameCanvas');
if (!canvas) {
  throw new Error('The game canvas is missing.');
}

try {
  await loadPixelSprites();
  window.game = new Game(canvas);
} catch (error) {
  const status = document.querySelector('#loadingScreen p');
  if (status) status.textContent = 'No se pudo cargar el arte. Recarga la página para volver a intentarlo.';
  console.error(error);
}
