import { SITE_CONFIG } from './site.config';

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
