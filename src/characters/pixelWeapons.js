import * as THREE from 'three';

// Each weapon is painted on the same small pixel grid and shares the glove's rig.
const designs = {
  guante: ['....KKKKKKKK....','..KKRRRRRRRRKK..','.KRRRLLLRRRRRRK.','.KRRRRRRRRRRRRK.','KRRRRRRRRRRRRRK.','KRRRRRRRRRRRRRK.','.KRRRRRRRRRRRK..','..KKWWWWWWWWK...','...KKKKKKKKK....'],
  sarten: ['......KKKKKK....','....KKSSSSSSKK..','...KSSSSLLSSSSK.','...KSSSSSSSSSSK.','....KKSSSSSSKK..','......KKKKKK....','.....KK.........','...KK...........','.KK.............'],
  maraca: ['......KKKK......','....KKOOROKK....','...KOOYYOOOOK...','...KOORROOOOK...','....KKOOOOKK....','......KKKK......','......KK........','.....KK.........','....KK..........'],
  hueso: ['..WW........WW..','.WLLW......WLLW.','WLLLLWWWWWWLLLLW','.WLLLLLLLLLLLLW.','..WLLLLLLLLLLW..','.WLLW......WLLW.','..WW........WW..'],
  chupeta: ['......PPPP......','....PPRRRRPP....','...PRRWWRRRRP...','...PRRWWRRRRP...','....PPRRRRPP....','......PPPP......','.......WW.......','......WWW.......','.....WWW........'],
  chancla: ['.....KKKKKKK....','...KKBBBBBBBK...','..KBBBBWBBBBBK..','..KBBBWBWBBBBK..','..KBBBWBBBWWBK..','...KBBBBBBBBK...','....KKBBBBKK....','......KKKK......'],
  pescado: ['..KK.......KK...','.KBBKKKKKKKBBK..','KBBBBBBBBBBBBBK.','KBBWWBBBBBBBBBK.','KBBWKBBBBBBBBBK.','.KBBBBBBBBBBBK..','..KKKKKKKKKKK...','.....KK..KK.....'],
  pollo: ['.....KKKKK......','...KKOOOORKK....','..KOOOOWOOOOK...','..KOOOOOOOOOK...','...KKOOOOOKK....','.....KKKKK......','.....WW.........','....WWWW........','...WW..WW.......'],
  megafono: ['.........KKKKK..','......KKKRRRRK..','...KKKRRRRRRRK..','.KKWWRRRRRRRRK..','.KKWWRRRRRRRRK..','...KKKRRRRRRRK..','.....KRRKKKKKK..','.....KRRK.......','......KK........'],
  martillo: ['....KKKKKKKKKK..','...KSSSSSSSSSSK.','...KSSLLSSSSSSK.','...KSSSSSSSSSSK.','....KKKKKKKKKK..','.......OOK......','......OOK.......','.....OOK........','....OOK.........'],
  sable: ['............WW..','...........WBB..','..........WBB...','.........WBB....','........WBB.....','.......WBB......','....KKKBBKKK....','.....KKOOKK.....','....OOK.........'],
  varita: ['............YY..','..........YYYYY.','...........YYY..','.........O..Y...','........O.......','.......O........','......O.........','.....O..........','....O...........'],
  gancho: ['.......KKKKK....','.....KKSSSSSK...','....KSSK....K...','....KSSK........','.....KSSK.......','......KSSKK.....','.......KKSSK....','......OOKKK.....','.....OOK........'],
  katana: ['............WW..','...........WSS..','..........WSS...','.........WSS....','........WSS.....','.......WSS......','....KKKKSKKK....','.....KKRRKK.....','....RRK.........'],
  laser: ['............BB..','..........BBBB..','........BBBB....','......BBBB......','....BBBB........','...KBBBBK.......','..KKWWKK........','.KKKKK..........','..KK............'],
};
const colors = { K:'#291b2c', R:'#e74448', L:'#ffaf8c', W:'#fff0d6', S:'#8492a6', O:'#b76b32', Y:'#ffd34f', P:'#ad3b80', B:'#3ca9df' };
const cache = new Map();
export function makeWeaponTexture(kind = 'guante') {
  const key = Object.hasOwn(designs, kind) ? kind : 'guante';
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 24;
  const ctx = canvas.getContext('2d');
  designs[key].forEach((row, y) => [...row].forEach((pixel, x) => {
    if (colors[pixel]) { ctx.fillStyle = colors[pixel]; ctx.fillRect(x * 2, y * 2 + 2, 2, 2); }
  }));
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false;
  cache.set(key, texture); return texture;
}
