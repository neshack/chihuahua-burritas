# Cómo contribuir

Gracias por querer entrar al corral. Este documento explica el flujo para reportar fallos, proponer cambios
y enviar código sin romper la física, el arte ni la accesibilidad.

## Antes de abrir un issue

- Revisa que no exista un issue abierto con el mismo tema.
- Prueba en la versión publicada y en `npm run dev`.
- Anota sistema operativo, navegador, versión y si usas movimiento reducido.
- Si es un fallo visual, adjunta una captura y el tamaño de ventana.

## Propuesta de cambio

1. Abre un issue con el problema y el resultado esperado.
2. Espera confirmación si el cambio toca física, combate o economía de equilibrio: son reglas del juego,
   no detalles de presentación.
3. Crea una rama corta: `fix/camera-movil`, `feat/burla-nueva`, `docs/controles`.
4. Haz commits convencionales y pequeños: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
5. Ejecuta `npm test` y `npm run build` antes de abrir el pull request.
6. Describe qué cambia, cómo probarlo y qué no se tocó.

## Reglas del proyecto

- **No cambies la física por estética.** Daño, alcance, recarga y colisiones son parte del equilibrio del juego.
- **Conserva los anclajes.** Si mueves un sprite, revisa montura, arma y colisión.
- **Respeta el movimiento reducido.** Toda animación nueva debe tener una pose estática legible.
- **No agregues dependencias** si el navegador ya resuelve el problema.
- **Mantén el arte original.** Los atlas se recortan por transparencia; no los reescales ni los filtres.
- **Documentación en español, código en inglés.** Los identificadores y comentarios técnicos van en inglés.

## Estilo de código

- Módulos ES, sin `var`.
- Funciones pequeñas con una responsabilidad.
- Nombres descriptivos; evita abreviaturas opacas.
- Comentarios solo cuando explican una decisión, no lo que el código ya dice.
- CSS con tokens en `:root`; no inventes colores fuera de la paleta.

## Pruebas

```bash
npm test
```

Si tu cambio toca cámara, expresión, patas o armas, agrega o ajusta la prueba correspondiente. La prueba del
ejecutable requiere `npm run build:linux`; si el binario no existe, se omite.

## Arte

- Los atlas son PNG transparentes de 4 columnas y 2 filas.
- Conserva el orden documentado en [Personajes](docs/PERSONAJES.md).
- Los prompts y el método viven en [Arte de personajes](docs/pixel-art.md).
- Si generas una variante nueva, actualiza el catálogo, el atlas y la prueba de catálogo.

## Pull requests

Un pull request debe poder revisarse en una sentada. Si trae varios cambios independientes, sepáralos.
Incluye capturas antes y después cuando el cambio sea visual.

## Licencia

Al contribuir aceptas que tu aporte se publique bajo la licencia [MIT](LICENSE) del proyecto.
