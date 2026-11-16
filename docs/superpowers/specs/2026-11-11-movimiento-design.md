# Movimiento y encuadre del ruedo

La versión pixel-art conserva controles, física, combate, catálogo, sonido y opción de regeneración. El proyecto original fuera de pixel-art no se modifica.

Los sprites deben mover partes internas: las gallinas alternan sus dos patas al caminar, flexionan al saltar y las recogen en vuelo; los jinetes reaccionan con sus extremidades y cara. Los ojos parpadean y las expresiones cambian al atacar, recibir daño, perder equilibrio o ganar. Se conservan los accesorios de cada personaje. Las animaciones visuales no alteran anclajes de golpe ni colisiones. Pausa congela las poses; movimiento reducido conserva las expresiones de estado sin bucles decorativos.

Durante combate y victoria la cámara debe incluir el límite y borde inferior del ruedo, también en pantallas estrechas, sin perder personajes en sus extremos. La introducción puede conservar sus primeros planos deliberados. Se comprueba la proyección geométrica además de capturas.

Entrega: código, pruebas de estados y cámara, revisión visual en navegador y ejecutable Linux reconstruido en el directorio existente de pixel-art.
