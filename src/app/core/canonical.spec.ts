import { canonicalUrl, setCanonical } from './canonical';

describe('canonicalUrl', () => {
  const base = 'https://tierra-luna-sol.ivanchesa.es';

  it('es la base y la ruta, sin barra final (D9)', () => {
    expect(canonicalUrl('/planetas/marte', base)).toBe(`${base}/planetas/marte`);
    expect(canonicalUrl('/planetas/marte/', base)).toBe(`${base}/planetas/marte`);
  });

  it('sin la consulta ni el fragmento (los parámetros del explorador)', () => {
    expect(canonicalUrl('/explorar/tierra?fecha=2030-01-01T00:00Z&cuerpo=luna', base)).toBe(
      `${base}/explorar/tierra`,
    );
    expect(canonicalUrl('/creditos#texturas', base)).toBe(`${base}/creditos`);
  });

  it('la raíz es la base con su barra', () => {
    expect(canonicalUrl('/', base)).toBe(`${base}/`);
    expect(canonicalUrl('/?captura=1', base)).toBe(`${base}/`);
  });

  it('usa la URL del sitio por defecto', () => {
    expect(canonicalUrl('/sol')).toBe('https://tierra-luna-sol.ivanchesa.es/sol');
  });
});

describe('setCanonical', () => {
  afterEach(() => document.head.querySelector('link[rel="canonical"]')?.remove());

  it('crea el enlace una vez y lo actualiza en cada navegación', () => {
    setCanonical(document, 'https://ejemplo.es/a');
    setCanonical(document, 'https://ejemplo.es/b');
    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0]?.getAttribute('href')).toBe('https://ejemplo.es/b');
  });

  it('lo quita con null (las páginas de error)', () => {
    setCanonical(document, 'https://ejemplo.es/a');
    setCanonical(document, null);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
