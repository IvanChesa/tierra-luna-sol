import { SITE_CONFIG } from './site.config';

/**
 * URL canónica de una ruta (D9): la base del sitio y la ruta, sin barra final, consulta ni fragmento
 * (`/planetas/marte?fecha=…` → `…/planetas/marte`; la raíz, `…/`). Es la URL en la que Cloudflare
 * Pages sirve cada página: `/ruta/` y `/ruta.html` redirigen a ella (fase 4).
 */
export function canonicalUrl(url: string, base = SITE_CONFIG.baseUrl): string {
  const path = (url.split(/[?#]/, 1)[0] ?? '').replace(/\/+$/, '');
  return `${base}${path || '/'}`;
}

/** Pone el `<link rel="canonical">` de la página, o lo quita con `null` (las páginas de error). */
export function setCanonical(doc: Document, href: string | null): void {
  let link = doc.head.querySelector('link[rel="canonical"]');
  if (href === null) {
    link?.remove();
    return;
  }
  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    doc.head.appendChild(link);
  }
  link.setAttribute('href', href);
}
