# Movimiento de personajes y ruedo Plan de implementación

> **Para agentes:** usa subagent-driven-development; ejecuta en la sesión actual como pidió el usuario.

**Objetivo:** Animar patas y expresiones reales dentro del dibujo y mantener visible el ruedo.

**Arquitectura:** Composición de regiones de los sprites originales en canvas por personaje, conservando billboard y anclajes de combate. Un módulo facial recibe estado determinista; el encuadre usa límites proyectados del ruedo.

**Stack técnico:** Three.js, Canvas 2D, Vite, Node SEA Linux.

**Especificación:** ../specs/2026-11-11-movimiento-design.md

## Restricciones globales

- Modificar solamente pixel-art; conservar las mecánicas y el arte existente.
- Sin dependencias nuevas; sin modificar los anclajes de física, armas o colisiones.
- Animación determinista con reloj del juego; pausa y movimiento reducido respetados.
- Inspección visual de ambos atlas de cada especie; sin duplicar patas ni ojos.
- Reconstruir y comprobar ejecutable Linux con sonidos incluidos.

### Tarea 1: Articulación de patas — Terra medium

**Archivos:** src/characters/pixelSprites.js, src/characters/pixelMotion.js (nuevo), tests/pixel-motion.test.mjs.

**Interfaz:** módulo facial `paintPixelExpression(ctx, source, {kind,id,time,reducedMotion,dupla,celebration})`; source es el canvas original recortado de altura160. Se llama tras componer las extremidades. Luna es dueño exclusivo del módulo facial.

- [x] Inspeccionar atlas y crear recortes de patas por personaje; reservar margen para movimiento sin cortar extremidades.
- [x] Implementar alternancia con apoyo y elevación al andar, flexión en salto y poses estáticas en reducido. Animar patas de jinete sin cambiar anclajes.
- [x] Integrar texturas individuales actualizadas a frecuencia pixelart, sin asignaciones continuas de canvas/texturas. Importar el módulo facial al integrar.
- [x] Verificar estados reposo, carrera, salto, frenado, golpe, KO, pausa, reducido y reinicio; adaptar mocks existentes sólo cuando sea necesario.

### Tarea 2: Expresiones — Luna max

**Archivos:** src/characters/pixelExpressions.js (nuevo), tests/pixel-expressions.test.mjs.

**Interfaz:** exportar `paintPixelExpression(ctx, source, {kind,id,time,reducedMotion,dupla,celebration})`. Coordenadas en canvas original de altura160; no cambiar tamaño ni dibujar fuera. Sin modificar pixelSprites.js ni pixelMotion.js.

- [x] Inspeccionar 32 personajes y calibrar regiones de ojos/pico/hocico sin borrar accesorios.
- [x] Crear parpadeo asincrónico y expresiones de concentración, golpe, peligro, KO y victoria. Mantener gafas, parches y máscaras.
- [x] Expresiones estáticas legibles con movimiento reducido y determinismo con reloj congelado.
- [x] Pruebas de prioridad y cronología de estados; documentar interfaz para integración.

### Tarea 3: Encuadre — Terra medium

**Archivos:** src/game/game.js, src/game/arenaFraming.js (nuevo si necesario), tests/camera-framing.test.mjs.

- [x] Identificar límite del ruedo y motivos de recorte con cámara dinámica.
- [x] Ajustar distancia o posición para incluir borde inferior y laterales con margen útil de HUD, sin cambios a física.
- [x] Probar proyección de límites a 390x844, 1440x900, 1728x1080 y formato ultrapanorámico, posiciones de extremos y KO.

### Tarea 4: Integración, revisión y ejecutable — coordinador y revisor independiente

**Archivos:** tests/visual.html, docs/pixel-art.md, ejecutable/Chihuahua-Burritas.

- [x] Capturar poses en navegador y comparar cuadros con patas y ojos en distintas fases; comprobar ruedo completo en escritorio y móvil.
- [x] Revisión independiente de requisitos y calidad sobre cambios respecto a /tmp/chihuahua-motion-review/before-src.
- [x] Ejecutar todas las pruebas afectadas y build:linux; probar activos servidos por el ejecutable.
- [x] Better Design: reglas, comprensión y geometría DOM; resolver hallazgos críticos o serios.

## Registro

El usuario pidió ejecutar con subagentes; no se añade otra aprobación. El repositorio no tiene historial utilizable: revisión mediante copias previas en /tmp, sin commits ni limpieza destructiva.

| Tareas | Interfaz o archivo compartido | Comprobación |
| --- | --- | --- |
| 1 y 2 | paintPixelExpression(ctx, source, options) | Contrato explícito; archivos separados, integración por tarea1. |
| 1 y 3 | Ninguno | Articulación y cámara independientes. |
| 1, 2, 3 y 4 | Pruebas y visual | Coordinador revisa después de integración. |
| 1 | Recortes/textura y pruebas | Modifica representación, conserva anclajes. |
| 2 | Expresiones y pruebas | Coordenadas originales160px, sin mover canvas. |
| 3 | Cámara/proyección y pruebas | Sólo combate/KO; conservar primeros planos deliberados. |
| 4 | Evidencia y entrega | Ejecutable sólo después de revisión y pruebas. |

## Cierre de ejecución

- Tarea 1: completa con Terra medium; pasos alternos, unión fija, salto, frenado, aterrizaje y caché comprobados.
- Tarea 2: completa con Luna max; 32 variantes con expresiones, incluidos visores y máscara.
- Tarea 3: completa con Terra medium; proyección de ruedo y siluetas en cuatro resoluciones.
- Tarea 4: completa; revisión independiente sin importantes/críticos pendientes, revisión visual, comprensión y espaciado del HUD terminados.
- Verificación final: siete archivos de pruebas aprobados; build:linux correcto; ejecutable inicia y sirve 14 archivos idénticos a dist, incluidos arte y código de audio.
- Limitación documentada: mostrar el ruedo completo en vertical reduce el tamaño de los personajes. Las mediciones de rendimiento del navegador automatizado no garantizan FPS locales; detalles en docs/pixel-art.md.
