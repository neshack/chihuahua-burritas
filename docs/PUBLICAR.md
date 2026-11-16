# Publicar en GitHub

Guía para dejar el repositorio público, activar el sitio y distribuir el ejecutable.

El proyecto asume esta URL:

```text
Repositorio: https://github.com/neshack/chihuahua-burritas
Sitio:       https://neshack.github.io/chihuahua-burritas/
```

Si cambias el nombre del repositorio, actualiza `canonical`, `og:url` y `og:image` en `site/index.html`, además
de los enlaces del README y de la landing.

## 1. Revisar antes de publicar

```bash
npm install
npm test
npm run build
npm run site
```

Comprueba que:

- no haya credenciales ni rutas personales en el código;
- `ejecutable/Chihuahua-Burritas` no esté versionado (pesa unos 152 MB);
- las capturas de `site/assets/` estén actualizadas;
- la licencia sea la correcta.

## 2. Crear el repositorio

Con GitHub CLI autenticado:

```bash
git init
git add .
git commit -m "feat: publicar Chihuahua Burritas"
gh repo create chihuahua-burritas --public --source=. --remote=origin --push
```

Sin GitHub CLI:

```bash
git init
git add .
git commit -m "feat: publicar Chihuahua Burritas"
git branch -M main
git remote add origin git@github.com:USUARIO/chihuahua-burritas.git
git push -u origin main
```

## 3. Activar GitHub Pages

El flujo `.github/workflows/pages.yml` compila el juego, arma `_site/` y publica la landing con el juego en
`/jugar/`.

1. Entra a **Settings → Pages**.
2. En **Build and deployment**, elige **GitHub Actions**.
3. Haz un push a `main` o ejecuta el flujo a mano desde **Actions → Publicar sitio → Run workflow**.
4. La primera publicación tarda un par de minutos. La URL aparece en el resumen del flujo.

La landing queda en la raíz y el juego en `https://USUARIO.github.io/chihuahua-burritas/jugar/`.

### Probar el sitio en local

```bash
npm run site
npx serve _site
```

También puedes abrir `_site/index.html` con un servidor estático. El botón **Jugar** apunta a `jugar/`, así que
necesita el servidor, no `file://`.

## 4. Publicar el ejecutable

GitHub rechaza archivos de más de 100 MB. Por eso el binario no se versiona y se adjunta a un release:

```bash
npm run build:linux
cd ejecutable
zip Chihuahua-Burritas-linux-x64.zip Chihuahua-Burritas LEEME.txt
gh release create v1.0.0 Chihuahua-Burritas-linux-x64.zip \
  --title "Chihuahua Burritas 1.0.0" \
  --notes "Primera versión pública. Ejecutable para Linux x86-64."
```

El límite por asset de un release es de 2 GB, así que el ZIP de 152 MB entra sin problema.

El README y la landing enlazan a `releases`. Cuando cambies de versión, sube un asset nuevo en lugar de
reemplazar el anterior.

## 5. Revisar la publicación

- Abre la landing en escritorio y en móvil.
- Prueba **Jugar ahora**: debe cargar el juego desde `/jugar/`.
- Revisa que los enlaces de documentación apunten a `blob/main/docs/...`.
- Comprueba la tarjeta social con el validador de Open Graph o pegando la URL en una red social.
- Descarga el ejecutable desde otro equipo Linux y ábrelo.

## 6. Dominio propio (opcional)

1. Crea un archivo `site/CNAME` con el dominio, por ejemplo `burritas.midominio.com`.
2. Configura un registro `CNAME` en tu DNS hacia `USUARIO.github.io`.
3. En **Settings → Pages → Custom domain**, escribe el dominio y activa HTTPS.

`scripts/build-site.mjs` copia `site/` completo, así que el `CNAME` viaja al sitio publicado.

## 7. Mantenimiento

- Cada push a `main` vuelve a publicar el sitio.
- Las capturas de la landing se generan a mano y se guardan en `site/assets/`.
- La tarjeta social se regenera desde `scripts/og.html` con un navegador a 1200×630.
- Si cambias el nombre del repositorio, actualiza las URLs absolutas de `site/index.html` y del README.

## Lista de verificación

- [ ] `npm test` pasa.
- [ ] `npm run build` pasa.
- [ ] `npm run site` genera `_site/` con `index.html`, `jugar/` y `.nojekyll`.
- [ ] `ejecutable/Chihuahua-Burritas` está ignorado por git.
- [ ] GitHub Pages está en modo **GitHub Actions**.
- [ ] El release tiene el ZIP y las notas de versión.
- [ ] La licencia MIT está en la raíz.
- [ ] La URL del sitio y la del repositorio coinciden con las de la landing.
