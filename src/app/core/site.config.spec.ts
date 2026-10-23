import indexHtml from '../../index.html' with { loader: 'text' };
import { SITE_CONFIG } from './site.config';

describe('SITE_CONFIG', () => {
  it('tiene una URL base absoluta en HTTPS y sin barra final', () => {
    const url = new URL(SITE_CONFIG.baseUrl);
    expect(url.protocol).toBe('https:');
    expect(SITE_CONFIG.baseUrl.endsWith('/')).toBe(false);
  });

  it('no es indexable hasta el lanzamiento', () => {
    expect(SITE_CONFIG.indexable).toBe(false);
  });

  it('está en español y enlaza con la web del autor', () => {
    expect(SITE_CONFIG.lang).toBe('es');
    expect(SITE_CONFIG.author.url).toBe('https://ivanchesa.es');
  });

  // El idioma está en dos sitios (aquí y en el <html> estático de index.html): este test los
  // mantiene sincronizados.
  it('index.html declara el mismo idioma que la configuración', () => {
    const page = new DOMParser().parseFromString(indexHtml, 'text/html');
    expect(page.documentElement.lang).toBe(SITE_CONFIG.lang);
  });
});
