/**
 * Configuración del sitio. Es la ÚNICA fuente del nombre, la URL base, el autor y la
 * indexabilidad: el resto del código (títulos, SEO, JSON-LD, sitemap) lo lee de aquí.
 */
export interface SiteConfig {
  readonly name: string;
  /** URL canónica del sitio, sin barra final. */
  readonly baseUrl: string;
  readonly lang: string;
  readonly locale: string;
  readonly author: {
    readonly name: string;
    readonly url: string;
  };
  /** Mientras sea `false`, todas las páginas llevan `noindex` (fase 5). */
  readonly indexable: boolean;
}

export const SITE_CONFIG: SiteConfig = {
  name: 'Tierra Luna Sol',
  // TODO(ivan): confirmar el subdominio definitivo (docs/PENDIENTES.md).
  baseUrl: 'https://tierra-luna-sol.ivanchesa.es',
  lang: 'es',
  locale: 'es-ES',
  author: {
    name: 'Iván Chesa Lapena',
    url: 'https://ivanchesa.es',
  },
  indexable: false,
};
