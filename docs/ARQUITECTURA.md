# Arquitectura

Chihuahua Burritas es una aplicación estática: Vite empaqueta el código, Three.js dibuja el corral y
Canvas 2D compone a los luchadores. No hay servidor, base de datos ni servicios externos en tiempo de ejecución.

## Capas

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| Entrada | `src/main.js` | Carga fuentes y estilos, espera los atlas y arranca `Game`. |
| Juego | `src/game/game.js` | Máquina de estados, rondas, cámara, combate global y puntaje. |
| Juego | `src/game/dupla.js` | Física de la dupla, entrada, ataque, daño, KO y animación. |
| Juego | `src/game/ai.js` | Máquina de estados de la CPU. |
| Juego | `src/game/arenaFraming.js` | Ajuste de cámara para que el ruedo quepa en pantalla. |
| Personajes | `src/characters/*` | Atlas, patas, expresiones, armas, retratos y billboards. |
| Mundo | `src/world/arena.js` | Corral, gradas, público, vallas, pacas y papel picado. |
| Mundo | `src/world/voxel.js` | Constructor de cubos y fusión de geometría. |
| Mundo | `src/world/skins.js` | Paletas, nombres, armas y accesorios de las 32 variantes. |
| Núcleo | `src/core/audio.js` | Sintetizador Web Audio para efectos y música. |
| Núcleo | `src/core/particles.js` | Sistema de partículas instanciado. |
| Núcleo | `src/core/input.js` | Teclado y clic. |
| Núcleo | `src/core/utils.js` | Interpolación y utilidades matemáticas. |
| Interfaz | `src/ui/UI.js` | Menú, HUD, anuncios, pausa y pantalla final. |
| Interfaz | `src/styles.css` | Sistema visual de fiesta y diseño responsive. |

## Flujo de estados

```text
loading → menu → intro → fight → ko → (intro | matchEnd)
                    ↑        ↓
                 paused ←────┘
```

- **loading**: se cargan los cuatro atlas y se generan los retratos.
- **menu**: selección de gallina, chihuahua, dupla rival y modo. La cámara hace un encuadre de presentación.
- **intro**: presentación de la ronda. La primera dura 5.2 s; las siguientes, 2.4 s. `Espacio` la salta.
- **fight**: entrada habilitada, reloj de ronda, ataques y colisiones activos.
- **ko**: el perdedor sale volando y la cámara se abre. Se anota la ronda y se decide si hay revancha o final.
- **matchEnd**: pantalla de victoria con revancha y cambio de personajes.
- **paused**: congela el reloj del juego y la entrada. La música baja de volumen.

## Física de la dupla

La dupla se modela como un cuerpo con aceleración, fricción, salto y rebote. No se usa un motor de física externo.

| Constante | Valor | Efecto |
| --- | --- | --- |
| `GRAVITY` | 23 | Caída y aterrizaje. |
| `MAX_SPEED` | 9.2 | Velocidad máxima normal. |
| `CORN_BOOST_SPEED` | 11.4 | Velocidad con turbo de maíz. |
| `PUNCH_COOLDOWN` | 1.5 s | Recarga del guante. |
| `PUNCH_DURATION` | 0.46 s | Ventana activa del golpe. |
| `ARENA_LIMIT` | 9.28 | Radio máximo antes de chocar con la valla. |

Reglas de combate:

- El daño depende del ángulo de impacto. Flanco y espalda duplican el daño y no aplican retroceso al atacante.
- Un ataque fallido cuesta 10% de equilibrio y deja al atacante vulnerable.
- El rebote contra la valla y el pisotón desde el aire también restan equilibrio.
- Al llegar a cero, el perdedor entra en estado KO y el ganador ejecuta su burla.

## Máquina de estados de la CPU

```text
PATROL → ALIGN → CHARGE → RECOVER → PATROL
```

- **PATROL**: se mueve alrededor del ruedo y busca maíz.
- **ALIGN**: corrige el ángulo para quedar de frente al rival.
- **CHARGE**: acelera y ataca cuando la distancia y la orientación son útiles.
- **RECOVER**: se retira después de un golpe o de un fallo para evitar el contraataque.

La CPU comparte exactamente la misma física y los mismos tiempos de recarga que el jugador.

## Render de los luchadores

1. `loadPixelSprites()` recorta cada celda del atlas con un canvas temporal.
2. Cada sprite se recorta por transparencia y se escala a 160 px de alto, sin suavizado.
3. Se crea un canvas propio por combatiente con margen transparente para las patas.
4. Cada cuadro se compone en este orden: patas, cuerpo, arma y expresión facial.
5. El canvas se sube a una textura de Three.js y se dibuja como billboard orientado a cámara.

Las texturas se actualizan a 12 Hz, no en cada cuadro, para no reasignar canvas ni texturas a 60 fps.
El reloj del juego gobierna las poses: la pausa congela patas y expresiones.

## Cámara

`fitArenaInCamera()` proyecta 128 puntos del perímetro del ruedo y retrocede la cámara hasta que todos entran
en el área segura. Los márgenes reservan espacio para el HUD arriba, el borde inferior y los laterales.

- Combate y KO incluyen el borde del ruedo en 390×844, 1440×900, 1728×1080 y 2560×1080.
- La introducción conserva primeros planos deliberados.
- La sacudida de cámara se aplica antes del ajuste y se reduce con `prefers-reduced-motion`.

## Audio

Todo el sonido se sintetiza en `src/core/audio.js` con osciladores, ruido y filtros de Web Audio:

- cacareos, ladridos, golpes, madera y claxon de resorte;
- cuenta regresiva, mariachi procedural y fanfarria de victoria;
- música de menú y de combate con capas que se atenúan en pausa.

El audio se activa con la primera interacción, como exige el navegador. `M` y el botón del HUD silencian;
la preferencia se guarda en `localStorage`.

## Accesibilidad y movimiento reducido

- El menú y los overlays usan roles `dialog`, `aria-modal`, `aria-live` y etiquetas en español.
- Los botones tienen área mínima de 44 px y foco visible.
- `prefers-reduced-motion` elimina rebotes decorativos, giros y sacudida de cámara, y conserva las expresiones
  de estado y la información de combate.
- El HUD no depende solo del color: muestra el valor numérico de equilibrio y el estado textual.

## Rendimiento

- Geometría del escenario fusionada por material para reducir draw calls.
- Partículas y público instanciados.
- Retratos renderizados una sola vez y reutilizados como imágenes.
- Carga diferida de la música hasta la primera interacción.

En el navegador de automatización, 120 cuadros con animación tardaron entre 7.69 y 8.11 s; sin actualizar
sprites, 6.70 s. Son muestras aisladas de la escena completa, no una garantía de FPS en cada equipo.

## Decisiones y compromisos

| Decisión | Ganancia | Costo |
| --- | --- | --- |
| Sprites 2D sobre escenario 3D | Silueta legible y arte expresivo sin perder profundidad. | Dos sistemas de render que hay que coordinar. |
| Física propia | Control exacto de rebotes, pisotones y KO. | Más código que un motor genérico. |
| Atlas generados con IA | 32 variantes con identidad propia en poco tiempo. | Hay que recortar, limpiar y verificar transparencia. |
| Texturas a 12 Hz | Menos trabajo por cuadro. | Animación de sprites menos fluida que a 60 Hz. |
| Sin backend | Se despliega como sitio estático. | Sin marcadores, cuentas ni multijugador en línea. |
