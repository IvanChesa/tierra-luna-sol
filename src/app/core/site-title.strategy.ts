import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { canonicalUrl, setCanonical } from './canonical';
import { pageMetaTags } from './page-meta';
import { SITE_CONFIG } from './site.config';

/** «Página · Tierra Luna Sol»; sin título de ruta, solo el nombre del sitio. */
export function formatPageTitle(pageTitle: string | undefined): string {
  return pageTitle ? `${pageTitle} · ${SITE_CONFIG.name}` : SITE_CONFIG.name;
}

/**
 * El título, la URL canónica y las etiquetas para compartir de cada página (D25). Se ejecuta al acabar
 * cada navegación, con la description que ha dejado en `data.description` el resolver de la ruta, y
 * también al prerenderizar: todo va en el HTML estático. Las rutas con `data.canonical: false` (las
 * páginas de error) no llevan canonical; con `data.noindex: true`, ni la 404 se indexa aunque el sitio
 * sí lo sea (revisión de la fase 0, hallazgo 5). Mientras `indexable` sea `false`, ninguna página.
 */
@Injectable()
export class SiteTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = formatPageTitle(this.buildTitle(snapshot));
    this.title.setTitle(title);
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const canonical = route.data['canonical'] === false ? null : canonicalUrl(snapshot.url);
    setCanonical(this.doc, canonical);
    const { tags, remove } = pageMetaTags({
      title,
      // La de la página, de su resolver (`app.routes.ts`); si no tiene, la del sitio.
      description: (route.data['description'] as string | undefined) || SITE_CONFIG.description,
      canonical,
      noindex: !SITE_CONFIG.indexable || route.data['noindex'] === true,
    });
    for (const { key, id, content } of tags) {
      this.meta.updateTag({ [key]: id, content }, `${key}='${id}'`);
    }
    for (const selector of remove) this.meta.removeTag(selector);
  }
}
