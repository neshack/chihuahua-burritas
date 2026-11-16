# Arte de personajes

Método: generación integrada de imágenes, dos PNG transparentes originales; no se reutilizaron renderizados de los modelos voxel. Las imágenes de `referencias/` orientan las variantes y el tono humorístico.

## Prompt — gallinas

Hoja de sprites 2D pixel art de 16 bits, cuadrícula regular de cuatro columnas y dos filas, fondo transparente, sin texto, pedestales ni escenario. Ocho gallinas mirando a la derecha en tres cuartos, cuerpo redondo, patas finas, ojos saltones, expresión cómica y pequeña silla de montar. Contornos oscuros escalonados, grupos de colores sólidos, sin cubos voxel ni suavizado. Orden: clásica blanca, guerrera vikinga, robot plateada, pirata marrón, maga violeta, zombi verde, astronauta blanca, cyberpunk oscura con magenta y cian.

## Prompt — chihuahuas

Hoja de sprites 2D pixel art de 16 bits, cuadrícula regular de cuatro columnas y dos filas, fondo transparente y sin texto. Ocho chihuahuas completos mirando a la derecha en tres cuartos, cabeza grande, orejas enormes rosadas, ojos brillantes, hocico crema, cuerpo pequeño y lengua fuera. Siluetas graciosas, contornos escalonados y paleta limitada; sin voxel, sin guantes incorporados. Orden: vaquero clásico, mexicano con sombrero y sarape, guerrero vikingo, pirata, mago, astronauta, zombi y cyberpunk.

## Integración

- Los modelos visibles se sustituyen por sprites orientados hacia la cámara.
- Las transformaciones vacías conservan los puntos de montura y de colisión del arma.
- El guante y el resorte son gráficos de píxeles independientes.
- Los retratos reutilizan las ilustraciones de combate.
- El movimiento incorpora rebote por pasos, inclinación al golpear, destello de daño y giro en KO; la preferencia de movimiento reducido elimina el rebote decorativo.
- Los archivos de física, CPU, audio y reglas no se modifican.

## Verificación

- `npm run build`: correcto.
- `node tests/pixel-rig.test.mjs`: correcto; recorre las 16 variantes, prueba anclajes del arma, golpe, KO, movimiento reducido y reinicio usando la física real con un lienzo simulado. La lectura de PNG y WebGL se revisaron por separado en navegador.
- Navegador: selección con personajes completos, duplas montadas y ausencia de errores al cargar la escena.
- Better Design: comprensión aprobada; espaciado del menú medido a 390, 1440 y 1728 px sin hallazgos críticos o graves. Permanecen 18 moderados del diseño existente.
- Captura de integración en escena fija: `shots/personajes-pixel-art.png`.
- `tests/visual.html?state=still` permite inspeccionar las duplas sin moverlas. Es una herramienta de desarrollo; no forma parte de la entrada de producción.

## Ampliación del 11 de noviembre

Hoja extra de gallinas: PNG transparente 4x2, pixel art de 16 bits, ocho monturas originales mirando a la derecha con ojos exagerados y silla: gorda amarilla redonda, enana moteada, percherona castaña robusta con patas emplumadas, sedosa blanca, corredora estilizada, coqueta violeta, vaquera naranja y emperatriz negra/dorada.

Hoja extra de chihuahuas: PNG transparente 4x2, cabezas grandes y manos libres, ocho personalidades: Diva rosa, Chispa cian/amarilla, Gruñón gris, Bombón chocolate pastelero, Churro dorado luchador, Lenteja verde con gafas, Capitán moteado marinero, DJ violeta con bigote y auriculares. Se corrigió el fondo de esta hoja con la misma herramienta integrada para asegurar transparencia real.

Las armas son pixel art por código independiente. Fuente nueva: public/art/chicken-extra-atlas.png y dog-extra-atlas.png.

## Articulación y encuadre

Los dibujos se componen ahora en un canvas propio de cada combatiente. Las patas se separan del cuerpo para alternar apoyo y elevación, recogerlas durante un salto y plantarlas al frenar o aterrizar. El canvas conserva un margen transparente para que las extremidades no se corten. Los retratos siguen usando la ilustración original completa.

El módulo de expresiones modifica regiones de la cara según el estado del combate. El reloj del juego gobierna las poses y el parpadeo, de modo que la pausa congela el movimiento. La preferencia de movimiento reducido mantiene las expresiones de estado.

La cámara de combate calcula el espacio necesario a partir del perímetro y la base del ruedo después de aplicar el zoom y la sacudida. Esto mantiene visible el borde inferior. En formato vertical, mostrar toda la arena reduce el tamaño de los personajes; las tomas cercanas de la introducción se conservan.

Herramientas de revisión de desarrollo:

- `tests/visual.html?state=walk`: partida fija con pasos. También admite `still`, `jump`, `hit`, `danger`, `attack`, `ko`, `taunt` y `edge`; `time=0.1` fija un cuadro y `reduced=1` comprueba movimiento reducido.
- `tests/visual.html?state=walk&metrics=1`: mide 120 cuadros y las actualizaciones de textura por combatiente.
- `tests/motion.html?kind=chicken&sheet=extra&state=walk`: compara original y dos fases para ocho personajes. `kind=dog`, `sheet=base` y los estados de expresión permiten revisar los demás.

Estas páginas no se empaquetan como entradas del ejecutable. El plan y sus criterios están en `docs/superpowers/plans/2026-11-11-movimiento.md`.

### Resultado de la revisión de movimiento

- Catálogo completo revisado en hojas comparativas de cuadros; unión de patas restaurada sin desplazar el vientre ni la ropa. Ojos cubiertos usan marcas dentro del visor; Churro conserva su máscara.
- Siete archivos de pruebas pasan: catálogo, regeneración, animación del jinete, rig/anclajes y caché, patas, expresiones y cámara. La cámara cubre 390×844, 1440×900, 1728×1080 y 2560×1080, incluidos extremos y sacudida.
- Revisión independiente con Terra: sin hallazgos importantes o críticos pendientes. Luna se encargó de expresiones; Terra de patas, cámara y revisión.
- Better Design: comprensión aprobada por panel; geometría del HUD medida a 390, 1440 y 1728. Cero críticos y cero serios; nueve moderados del espaciado y tamaño de botones existentes.
- La captura final `shots/ruedo-completo.png` muestra el borde inferior y ambas duplas. `shots/patas-articuladas.png` compara la ilustración original con dos fases opuestas del paso.
- Rendimiento en el navegador de automatización: 120 cuadros con animación tardaron 7.69–8.11 s; sin actualizar sprites, 6.70 s. Son muestras aisladas de la escena 3D completa, no una garantía de FPS en el ejecutable local. La actualización de las cuatro texturas se limita a 12 Hz y no ocurre al avanzar el reloj con movimiento reducido. El contexto de canvas solicita almacenamiento adecuado para lecturas frecuentes; estas muestras no demuestran una mejora de rendimiento por esa opción.
