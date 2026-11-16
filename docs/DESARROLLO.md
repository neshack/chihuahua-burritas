# Desarrollo

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Navegador con WebGL 2 y audio habilitado.
- Para el ejecutable: Linux x86-64 y Node.js 25.5 o posterior.

## Instalación

```bash
npm install
npm run dev
```

Vite imprime la URL local (por defecto `http://localhost:5173`). El servidor escucha en `0.0.0.0`, así que
también se puede abrir desde otro equipo de la red.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Compila a `dist/` con rutas relativas. |
| `npm run preview` | Sirve `dist/` para revisar la compilación. |
| `npm run site` | Compila y arma `_site/` con la landing y el juego en `jugar/`. |
| `npm test` | Ejecuta las ocho pruebas. |
| `npm run build:linux` | Compila y genera el ejecutable con Node SEA. |

## Estructura

```text
.
├── index.html              entrada del juego
├── src/                    código del juego
├── public/art/             atlas PNG de gallinas y chihuahuas
├── tests/                  pruebas y páginas de inspección
├── site/                   landing pública
│   ├── index.html
│   ├── styles.css
│   ├── main.js
│   └── assets/             imágenes, fuentes y tarjeta social
├── scripts/
│   ├── build-site.mjs      arma _site/
│   └── og.html             fuente de la tarjeta social
├── desktop/                lanzador y empaquetado Linux
├── docs/                   documentación
├── shots/                  capturas de referencia
└── .github/workflows/      publicación en GitHub Pages
```

## Pruebas

```bash
npm test
```

| Archivo | Cubre |
| --- | --- |
| `catalog.test.mjs` | 32 variantes, identificadores, atlas y metadatos. |
| `regeneration.test.mjs` | Regla de regeneración activada y desactivada. |
| `pixel-animation.test.mjs` | Poses del jinete y armas. |
| `pixel-motion.test.mjs` | Fases de patas y articulación. |
| `pixel-expressions.test.mjs` | Prioridad y línea de tiempo de expresiones. |
| `pixel-rig.test.mjs` | Anclajes, golpe, KO, movimiento reducido y reinicio. |
| `camera-framing.test.mjs` | Proyección del ruedo en cuatro resoluciones. |
| `linux-executable.test.mjs` | El binario sirve los archivos de `dist/` sin cambios. |

La última prueba se omite con un mensaje claro si `ejecutable/Chihuahua-Burritas` no existe, para que el
repositorio funcione sin el binario de 152 MB.

### Páginas de inspección

Son herramientas de desarrollo; no se empaquetan en la compilación de producción ni en el ejecutable.

- `tests/visual.html?state=walk`: partida fija. Acepta `still`, `jump`, `hit`, `danger`, `attack`, `ko`,
  `taunt` y `edge`. `time=0.1` congela un cuadro y `reduced=1` prueba movimiento reducido.
- `tests/visual.html?state=walk&metrics=1`: mide 120 cuadros y las actualizaciones de textura.
- `tests/motion.html?kind=chicken&sheet=extra&state=walk`: compara la ilustración original con dos fases
  del paso. `kind=dog`, `sheet=base` y los estados de expresión permiten revisar el resto.
- `tests/responsive.html`: revisa el encuadre en varios tamaños de ventana.

## Empaquetado Linux

```bash
npm install
npm run build:linux
```

`desktop/build-linux.mjs` incorpora `dist/` como assets de Node SEA y produce
`ejecutable/Chihuahua-Burritas`. El lanzador:

1. levanta un servidor HTTP en `127.0.0.1` sobre un puerto libre;
2. busca Chrome, Chromium o Brave;
3. abre una ventana de aplicación con el juego;
4. cierra el servidor y el perfil temporal al salir.

El binario no se versiona. Se publica como asset de GitHub Releases.

## Convenciones

- Documentación y textos de interfaz en español.
- Código, nombres de archivos y comentarios técnicos en inglés.
- Commits convencionales: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Sin dependencias nuevas si el navegador ya resuelve el problema.
- Cambios de arte: conservar el tamaño de celda, la transparencia y el orden del atlas.

## Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Pantalla negra | WebGL deshabilitado o GPU bloqueada | Activa aceleración por hardware y revisa `chrome://gpu`. |
| No suena nada | El navegador exige interacción | Haz clic o pulsa una tecla antes de juzgar el audio. |
| Sprites cortados | Atlas con márgenes distintos | Revisa el recorte por transparencia en `pixelSprites.js`. |
| No carga el arte | Ruta base incorrecta | Usa `npm run build` y verifica que `BASE_URL` sea relativa. |
| El ejecutable no abre | No hay Chrome, Chromium ni Brave | Instala uno o ejecuta el binario desde una terminal. |
| Las pruebas del ejecutable fallan | El binario no coincide con `dist/` | Vuelve a ejecutar `npm run build:linux`. |

## Rendimiento

- Evita reasignar canvas o texturas en cada cuadro; las texturas se actualizan a 12 Hz.
- Mantén la geometría del escenario fusionada por material.
- Mide con `tests/visual.html?state=walk&metrics=1` antes y después de un cambio.
- El público y las partículas usan instancing: no los conviertas en mallas individuales.
