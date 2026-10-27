import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { canonicalUrl, setCanonical } from './canonical';
import { SITE_CONFIG } from './site.config';

/** «Página · Tierra Luna Sol»; sin título de ruta, solo el nombre del sitio. */
export function formatPageTitle(pageTitle: string | undefined): string {
  return pageTitle ? `${pageTitle} · ${SITE_CONFIG.name}` : SITE_CONFIG.name;
}

/**
 * El título y la URL canónica de cada página. Se ejecuta en cada navegación, también al prerenderizar,
 * así que el `<link rel="canonical">` va en el HTML estático. Las rutas con `data.canonical: false`
 * (las páginas de error) no lo llevan.
 */
@Injectable()
export class SiteTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly doc = inject(DOCUMENT);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(formatPageTitle(this.buildTitle(snapshot)));
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const canonical: unknown = route.data['canonical'];
    setCanonical(this.doc, canonical === false ? null : canonicalUrl(snapshot.url));
  }
}
