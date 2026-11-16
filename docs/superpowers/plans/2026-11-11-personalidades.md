# Personalidades y corral ampliado — Plan de implementación

Objetivo: mejorar la animación de los jinetes, permitir desactivar regeneración de equilibrio y ampliar el catálogo con ocho gallinas y ocho chihuahuas originales.
Arquitectura: conservar física y colisiones; extender metadatos de skins y hojas de sprites, añadir animación visual y una opción de partida persistente. Las armas tendrán identidades visuales distintas con las mismas reglas y alcance.
Stack técnico: Vite, Three.js, Canvas pixel art, Node SEA para Linux.
Especificación: petición del usuario del 11 de noviembre de 2026.

## Restricciones
- Trabajar solo en pixel-art; mantener el original.
- Regeneración activada por defecto. Al desactivarla se bloquean recuperación pasiva y curación por maíz, conservando el turbo; documentar este criterio.
- Nuevas formas y armas son visuales: no modificar daño, alcance ni colisiones.
- Respetar movimiento reducido y congelar animación durante pausa.

## Tareas y asignación
- [x] Luna (max): catálogo en src/world/skins.js. Añadir ocho gallinas y ocho perros con spriteAtlas extra, spriteIndex 0..7; perros con weapon, personality, taunt y tauntStyle. Conservar skins anteriores.
- [x] Terra (medium): configuración de regeneración en index.html, src/styles.css, src/ui/UI.js, src/game/game.js y src/game/dupla.js. Control accesible persistente; regresión de recuperación activada/desactivada.
- [x] Terra (medium): animación/armas en src/characters/chihuahua.js y nuevo módulo visual; conectar desde pixelSprites.js mediante instrucciones al coordinador. Pruebas de victoria, pausa, KO y movimiento reducido.
- [x] Coordinador: generar e integrar dos hojas extra; extender cargador según metadatos; incorporar animaciones; revisar UI renderizada y espaciado; ejecutar pruebas, compilar y regenerar ejecutable Linux.
- [x] Revisor independiente: verificar alcance, configuración, integración y fallos; corregir hallazgos graves.

## Criterios de aceptación
- 16 gallinas y 16 chihuahuas seleccionables, con retratos completos.
- Gallinas gordas, pequeñas y percheronas con siluetas diferentes; perros de colores y personalidades diferentes.
- El ganador realiza una burla visual; el perdedor conserva su KO.
- Ajuste conservado al reiniciar y al pedir revancha; sin regeneración ninguna fuente aumenta equilibrio.
- Pruebas y build:linux correctos; revisión Better Design sin hallazgos críticos/graves.

## Resultado de ejecución

Luna max: catálogo y pruebas. Terra medium: regeneración, animaciones/armas y revisión independiente. Coordinador: hojas originales con herramienta integrada de generación de imágenes, integración, pruebas visuales y ejecutable.

Correcciones de revisión: reloj de burla continuo con game.clock, eliminación de sobreescritura del arma, escala estática con movimiento reducido y área de checkbox ampliada.

Validación: 32 variantes, regeneración, armas y animaciones aprobadas. UI medida a 390/1440/1728: cero hallazgos críticos/graves; 21 moderados heredados de escala de espacios y controles pequeños. Persistencia comprobada tras recargar.
