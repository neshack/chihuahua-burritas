# Personajes

El catálogo tiene **16 gallinas** y **16 chihuahuas**. Cada pelea combina una gallina y un jinete, así que hay
256 duplas posibles. Todas comparten física, daño, alcance y recarga: lo que cambia es la silueta, la paleta,
el accesorio, el arma y la burla.

## Gallinas

| # | Nombre | Rasgo | Hoja |
| --- | --- | --- | --- |
| 1 | Clásica | La reina del corral | Base |
| 2 | Guerrera | Acero y plumas | Base |
| 3 | Robot | Modo gallina 2.0 | Base |
| 4 | Pirata | Al abordaje, pollo | Base |
| 5 | Maga | Hechizos y cacareos | Base |
| 6 | Zombi | Medio desplumada | Base |
| 7 | Astronauta | Un pequeño paso por el corral | Base |
| 8 | Cyberpunk | Pollo del futuro | Base |
| 9 | Gorda | Redondita y veloz hacia el maíz | Extra |
| 10 | Enana | Pequeña, pero con mucho pico | Extra |
| 11 | Percherona | Cuello largo, mirada de jefa | Extra |
| 12 | Sedosa | Suave como nube, dura como pico | Extra |
| 13 | Corredora | Patas rápidas, excusas lentas | Extra |
| 14 | Coqueta | Guiña un ojo y gana el asalto | Extra |
| 15 | Vaquera | Pico firme y sombrero imaginario | Extra |
| 16 | Emperatriz | El corral se inclina al cacarear | Extra |

## Chihuahuas

| # | Nombre | Rasgo | Arma | Personalidad | Burla |
| --- | --- | --- | --- | --- | --- |
| 1 | Clásico | Fiel, valiente y chillón | Guante | Valiente y fiel, siempre listo para otra ronda. | ¡Una ronda más y luego vamos por croquetas! |
| 2 | Mexicano | Orgullo de Jalisco | Martillo | Fiestero, ingenioso y orgulloso de su tierra. | ¡Este golpe viene con mariachi incluido! |
| 3 | Guerrero | Sangre de vikingo | Sable | Serio, disciplinado y fanático de los duelos. | ¡Tu armadura no aguanta mi mejor estocada! |
| 4 | Pirata | Ladrón de croquetas | Gancho | Tramposo, aventurero y experto en botines. | ¡Ese trofeo ya tiene dueño, grumete! |
| 5 | Mago | Hechicero de bolsillo | Varita | Misterioso y teatral, incluso al pedir croquetas. | ¡Por el poder del ladrido, quedas mareado! |
| 6 | Astronauta | Perro espacial | Láser | Curioso, valiente y siempre mirando las estrellas. | ¡Despegue de victoria en tres, dos, guau! |
| 7 | Zombi | Buen chico podrido | Hueso | Lento para pensar, rapidísimo para hallar huesos. | ¡Grrr... ese hueso y ese punto son míos! |
| 8 | Cyberpunk | Perro 2077 | Katana | Frío, brillante y actualizado a la última versión. | ¡Te falta una actualización para seguirme el paso! |
| 9 | Diva | Brilla hasta en el calentamiento | Sartén | Dramática, elegante y convencida de que ya ganó. | ¡Tiembla ante mi mejor perfil! |
| 10 | Chispa | No se queda quieto ni para la foto | Maraca | Eléctrico, ruidoso y amigo de todo el mundo. | ¡Que empiece el ruido y que siga la fiesta! |
| 11 | Gruñón | No gruñe: comenta con pasión | Hueso | Gruñón por fuera, buen compañero por dentro. | ¡Ese hueso y ese podio son míos! |
| 12 | Bombón | Dulce sonrisa, mordida de campeona | Chupeta | Cariñosa y dulce, hasta que suena la campana. | ¡Te voy a ganar con una sonrisa! |
| 13 | Churro | Crujiente por fuera, veloz por dentro | Chancla | Astuto, travieso y experto en escaparse. | ¡Corre, que ya voló la chancla! |
| 14 | Lenteja | Pequeño relámpago de orejas | Pescado | Tranquilo, listo y mucho más rápido de lo que parece. | ¡Ni me viste pasar! |
| 15 | Capitán | A la orden, croqueta marinera | Pollo | Mandón, valiente y listo para liderar la ronda. | ¡A formar y a volar, tripulación! |
| 16 | DJ | Mezcla ladridos con bajos potentes | Megáfono | Rítmico, bromista y siempre en control de la pista. | ¡Sube el volumen, que llegó el campeón! |

## Cómo se generan los retratos

Cada variante tiene una celda en su atlas. Al arrancar, el juego recorta la celda, elimina el margen transparente
y la escala a 160 px de alto. El retrato del menú y el HUD reutiliza esa misma imagen; no se renderiza dos veces.

## Arte

- Cuatro hojas PNG transparentes de 1774×887, con cuadrícula de 4 columnas y 2 filas.
- `assets/art/chicken-atlas.png` y `dog-atlas.png`: la primera tanda.
- `assets/art/chicken-extra-atlas.png` y `dog-extra-atlas.png`: la ampliación del 11 de noviembre.
- Prompts y método en [Arte de personajes](pixel-art.md).

Las armas no vienen en los atlas: se dibujan en píxeles por código, así que se pueden recolorear sin tocar
las ilustraciones originales.

## Identidad visual

Las gallinas usan cuerpo redondo, ojos saltones, patas finas y silla de montar. Los chihuahuas usan cabeza grande,
orejas enormes, hocico crema y lengua fuera. Los accesorios definen la variante: casco vikingo, parche pirata,
visor neón, gafas de sol, auriculares, corona o sombrero.

Todo el catálogo se puede ver en el menú del juego y en la captura
[`site/assets/menu.webp`](../site/assets/menu.webp).
