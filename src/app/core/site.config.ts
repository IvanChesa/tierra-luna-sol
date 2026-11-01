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
  /** Mientras sea `false`, todas las páginas llevan `noindex` (fase 9). */
  readonly indexable: boolean;
}

export const SITE_CONFIG: SiteConfig = {
  name: 'Tierra Luna Sol',
  // El dominio pasa de ivanchesa.es a ivanchesa.com (decisión de Iván del 31-10; revisión del bloque D,
  // D5): el subdominio definitivo, en la zona de ivanchesa.com de Cloudflare (fase 11).
  baseUrl: 'https://tierra-luna-sol.ivanchesa.com',
  lang: 'es',
  locale: 'es-ES',
  author: {
    name: 'Iván Chesa Lapena',
    url: 'https://ivanchesa.com',
  },
  indexable: false,
};
