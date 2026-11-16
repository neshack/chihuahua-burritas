# Controles y reglas

## Controles

| Acción | Jugador 1 | Jugador 2 local |
| --- | --- | --- |
| Mover | `W` `A` `S` `D` | Flechas |
| Saltar / riendas | `Espacio` | `Shift` |
| Atacar con el arma | `J` o clic | `Enter` |
| Pausa | `Esc` o `P` | `Esc` o `P` |
| Silencio | `M` | `M` |
| Saltar introducción | `Espacio` | `Espacio` |

El ratón solo sirve para el ataque del jugador 1 y para pulsar botones del menú.
No hay controles táctiles: la pelea necesita teclado.

## Modos

- **1 jugador**: el jugador 1 elige su dupla; la CPU recibe una dupla rival sorteada.
- **2 jugadores**: el jugador 1 elige su dupla y el jugador 2 juega con la dupla rival.
- **Dupla al azar**: sortea gallina y chihuahua para la dupla que estés personalizando.
- **Regenerar equilibrio**: activado por defecto. Al desmarcarlo se bloquean la recuperación pasiva y la
  curación por maíz; el maíz sigue dando turbo.

El ajuste de regeneración se conserva al recargar la página, al pedir revancha y al reiniciar la pelea.

## Equilibrio

No hay barra de vida. Cada dupla tiene **equilibrio** de 0 a 100 y el HUD muestra el valor exacto.

Bajan el equilibrio:

- los golpes del rival;
- chocar contra la valla a buena velocidad;
- el pisotón del rival al aterrizar encima;
- fallar un ataque, que cuesta 10%.

Al llegar a 0, el chihuahua sale volando, la gallina corre asustada y la ronda termina.

## Ataque

- El arma recarga en 1.5 segundos.
- El golpe tiene una ventana activa de 0.46 segundos.
- Golpear por el flanco o la espalda duplica el daño y no devuelve retroceso al atacante.
- Un golpe por la espalda con el equilibrio bajo puede terminar la ronda.
- Fallar deja al atacante vulnerable un instante y le resta 10% de equilibrio.

Todas las armas comparten daño, alcance y recarga. El guante, el martillo, la chancla, el pescado y el megáfono
son identidades visuales, no ventajas mecánicas.

## Movimiento

- **Aleteo**: reduce la fricción y permite frenar o derrapar con más control.
- **Saltar**: las gallinas se elevan y pueden pisar al rival al caer.
- **Riendas**: mantener el salto abre las alas y cambia la caída.
- **Vallas y pacas**: a buena velocidad rebotan y restan equilibrio a quien choca.
- **Maíz**: recupera equilibrio y activa turbo. Con la regeneración desactivada, solo da turbo.

## Rondas

- Formato **mejor de 3**: gana quien consiga dos rondas.
- La primera introducción dura 5.2 segundos; las siguientes, 2.4.
- La revancha mantiene los estilos elegidos.
- Cambiar personajes vuelve al menú y reinicia el marcador.

## Pausa y sonido

- `Esc` o `P` pausan y reanudan. La pausa congela el reloj del juego.
- `M` silencia o restaura el sonido. El icono del HUD refleja el estado.
- La preferencia de silencio se guarda en `localStorage`.
- El audio necesita una primera interacción del usuario para arrancar.

## Lectura del HUD

- **Izquierda**: dupla del jugador 1, nombre de la gallina y del chihuahua, equilibrio y estado.
- **Centro**: marcador de rondas, ronda actual y pips de victoria.
- **Derecha**: dupla rival. En modo CPU la etiqueta dice `CPU`.
- **Abajo**: recordatorio de controles. Se desvanece a los segundos para no tapar la acción.

## Accesibilidad

- Foco visible en todos los controles.
- Anuncios de ronda y KO por `aria-live`.
- Contraste alto en HUD y menús.
- Movimiento reducido: se apagan rebotes, giros y sacudida de cámara; se mantienen las expresiones de estado.
