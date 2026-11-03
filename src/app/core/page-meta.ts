import { DestroyRef, Service, inject, signal } from '@angular/core';
import { SITE_CONFIG } from './site.config';

/**
 * La description de la página activa (fase 9, D25). La registra cada página al crearse, con su texto
 * (que así va en su chunk diferido, no en el bundle inicial), y la lee `SiteTitleStrategy` al acabar
 * cada navegación, que es después de crear la página, también al prerenderizar. Si la página se
 * reutiliza con otros datos (de /planetas/marte a /planetas/jupiter), la función se vuelve a evaluar.
 */
@Service()
export class PageDescription {
  private readonly source = signal<(() => string) | null>(null);

  /** La description de la página, o la del sitio si la página no ha dicho ninguna. */
  current(): string {
    return this.source()?.() ?? SITE_CONFIG.description;
  }

  set(text: () => string, destroyRef: DestroyRef): void {
    this.source.set(text);
    destroyRef.onDestroy(() => {
      if (this.source() === text) this.source.set(null);
    });
  }
}

/** Registra la description de la página (en su constructor o en un campo: contexto de inyección). */
export function describePage(text: string | (() => string)): void {
  inject(PageDescription).set(typeof text === 'string' ? () => text : text, inject(DestroyRef));
}

/** Una etiqueta `<meta>`: por `name` o por `property` (Open Graph). */
export interface MetaTag {
  readonly key: 'name' | 'property';
  readonly id: string;
  readonly content: string;
}

/**
 * Las etiquetas de una página (D25): la description, Open Graph (una imagen global, el render del
 * motor de `scripts/render-body-images.mjs`), la tarjeta grande de las redes y, mientras el sitio no
 * sea indexable o en las páginas de error, `noindex`. Sin canonical (la 404), sin `og:url`.
 */
export function pageMetaTags(page: {
  readonly title: string;
  readonly description: string;
  readonly canonical: string | null;
  readonly noindex: boolean;
}): { readonly tags: MetaTag[]; readonly remove: string[] } {
  const { ogImage, baseUrl, name, locale } = SITE_CONFIG;
  const property = (id: string, content: string): MetaTag => ({ key: 'property', id, content });
  const tags: MetaTag[] = [
    { key: 'name', id: 'description', content: page.description },
    property('og:type', 'website'),
    property('og:site_name', name),
    property('og:locale', locale.replace('-', '_')),
    property('og:title', page.title),
    property('og:description', page.description),
    property('og:image', `${baseUrl}${ogImage.path}`),
    property('og:image:type', 'image/jpeg'),
    property('og:image:width', String(ogImage.width)),
    property('og:image:height', String(ogImage.height)),
    property('og:image:alt', ogImage.alt),
    { key: 'name', id: 'twitter:card', content: 'summary_large_image' },
  ];
  const remove: string[] = [];
  if (page.canonical) tags.push(property('og:url', page.canonical));
  else remove.push("property='og:url'");
  if (page.noindex) tags.push({ key: 'name', id: 'robots', content: 'noindex' });
  else remove.push("name='robots'");
  return { tags, remove };
}
