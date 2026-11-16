const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const targets = document.querySelectorAll('.reveal');

// La clase se añade desde JS: si el script no carga, el contenido nunca se oculta.
document.body.classList.add('reveal-ready');

if (reduceMotion || !('IntersectionObserver' in window)) {
  targets.forEach((node) => node.classList.add('is-in'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  targets.forEach((node) => observer.observe(node));
}

// Mantiene el enlace activo de la navegación alineado con la sección visible.
const navLinks = new Map(
  [...document.querySelectorAll('.nav a')].map((link) => [link.getAttribute('href').slice(1), link]),
);

if ('IntersectionObserver' in window && navLinks.size > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((link) => link.removeAttribute('aria-current'));
        navLinks.get(entry.target.id)?.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );

  for (const id of navLinks.keys()) {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  }
}
