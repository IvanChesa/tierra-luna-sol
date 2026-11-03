/**
 * Configuración del sitio. Es la ÚNICA fuente del nombre, la URL base, el autor, los enlaces legales y
 * la indexabilidad: el resto del código (títulos, etiquetas para compartir, pie) lo lee de aquí.
 */
export interface SiteConfig {
  readonly name: string;
  /** URL canónica del sitio, sin barra final. */
  readonly baseUrl: string;
  readonly lang: string;
  readonly locale: string;
  /** La description de las páginas que no dicen la suya (D25). */
  readonly description: string;
  readonly author: {
    readonly name: string;
    readonly url: string;
  };
  /** El aviso legal y la privacidad, los de la web del autor (D24, D37). */
  readonly legal: {
    readonly notice: string;
    readonly privacy: string;
  };
  /** El código del proyecto (público, MIT: D32). */
  readonly repository: string;
  /** La imagen para compartir, global (D25): `scripts/render-body-images.mjs`. */
  readonly ogImage: {
    readonly path: string;
    readonly width: number;
    readonly height: number;
    readonly alt: string;
  };
  /** Mientras sea `false`, todas las páginas llevan `noindex` (fase 9); `/404`, siempre. */
  readonly indexable: boolean;
}

export const SITE_CONFIG: SiteConfig = {
  name: 'Tierra Luna Sol',
  // El dominio pasa de ivanchesa.es a ivanchesa.com (decisión de Iván del 31-10; revisión del bloque D,
  // D5): el subdominio definitivo, en la zona de ivanchesa.com de Cloudflare (fase 11).
  baseUrl: 'https://tierra-luna-sol.ivanchesa.com',
  lang: 'es',
  locale: 'es-ES',
  description:
    'El Sol, los ocho planetas y veintiuna lunas en 3D, en sus posiciones reales para cualquier fecha entre 1900 y 2100, calculadas en tu navegador.',
  author: {
    name: 'Iván Chesa Lapena',
    url: 'https://ivanchesa.com',
  },
  // TODO(ivan): ivanchesa.com aún no resuelve (03-11); en ivanchesa.es, las dos páginas están en
  // /aviso-legal/ y /privacidad/. Cuando el dominio responda, comprobarlas (PENDIENTES.md).
  legal: {
    notice: 'https://ivanchesa.com/aviso-legal/',
    privacy: 'https://ivanchesa.com/privacidad/',
  },
  repository: 'https://github.com/IvanChesa/tierra-luna-sol',
  ogImage: {
    path: '/img/og.jpg',
    width: 1200,
    height: 630,
    alt: 'El Sol, la Tierra y la Luna, con el aspecto que tienen en el explorador.',
  },
  indexable: false,
};
