import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { pageMetaTags } from './page-meta';
import { SITE_CONFIG } from './site.config';
import { SiteTitleStrategy, formatPageTitle } from './site-title.strategy';

describe('formatPageTitle', () => {
  it('añade el nombre del sitio al título de la página', () => {
    expect(formatPageTitle('Marte')).toBe('Marte · Tierra Luna Sol');
  });

  it('usa solo el nombre del sitio si la ruta no tiene título', () => {
    expect(formatPageTitle(undefined)).toBe('Tierra Luna Sol');
    expect(formatPageTitle('')).toBe('Tierra Luna Sol');
  });
});

@Component({ template: '' })
class Blank {}

describe('pageMetaTags (D25)', () => {
  const page = {
    title: 'Marte · Tierra Luna Sol',
    description: 'Marte.',
    canonical: `${SITE_CONFIG.baseUrl}/planetas/marte`,
    noindex: false,
  };
  const content = (tags: ReturnType<typeof pageMetaTags>['tags'], id: string) =>
    tags.find((tag) => tag.id === id)?.content;

  it('la description, Open Graph con la imagen global (absoluta) y la tarjeta grande', () => {
    const { tags, remove } = pageMetaTags(page);
    expect(content(tags, 'description')).toBe('Marte.');
    expect(content(tags, 'og:title')).toBe('Marte · Tierra Luna Sol');
    expect(content(tags, 'og:url')).toBe(page.canonical);
    expect(content(tags, 'og:locale')).toBe('es_ES');
    expect(content(tags, 'og:image')).toBe(`${SITE_CONFIG.baseUrl}/img/og.jpg`);
    expect(content(tags, 'og:image:width')).toBe('1200');
    expect(content(tags, 'og:image:height')).toBe('630');
    expect(content(tags, 'og:image:alt')).toBe(SITE_CONFIG.ogImage.alt);
    expect(content(tags, 'twitter:card')).toBe('summary_large_image');
    // Indexable: sin robots.
    expect(content(tags, 'robots')).toBeUndefined();
    expect(remove).toContain("name='robots'");
  });

  it('sin canonical, sin og:url; con noindex, la etiqueta robots', () => {
    const { tags, remove } = pageMetaTags({ ...page, canonical: null, noindex: true });
    expect(content(tags, 'og:url')).toBeUndefined();
    expect(remove).toContain("property='og:url'");
    expect(content(tags, 'robots')).toBe('noindex');
  });
});

describe('SiteTitleStrategy', () => {
  const canonical = () =>
    document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'planetas',
            children: [
              {
                path: ':id',
                title: 'Marte',
                // Como las de verdad: la description, de un resolver de la ruta.
                resolve: {
                  description: () => Promise.resolve('Marte, el cuarto planeta desde el Sol.'),
                },
                component: Blank,
              },
            ],
          },
          { path: 'creditos', title: 'Créditos', component: Blank },
          {
            path: '404',
            title: 'Página no encontrada',
            data: { canonical: false, noindex: true },
            component: Blank,
          },
          {
            path: '**',
            title: 'Página no encontrada',
            data: { canonical: false, noindex: true },
            component: Blank,
          },
        ]),
        { provide: TitleStrategy, useClass: SiteTitleStrategy },
      ],
    });
  });

  afterEach(() => {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    for (const meta of document.head.querySelectorAll('meta[name], meta[property]')) meta.remove();
  });

  const meta = (key: 'name' | 'property', id: string) =>
    document.head.querySelector(`meta[${key}="${id}"]`)?.getAttribute('content') ?? null;

  it('pone el título y el canonical de la ruta más profunda, sin la consulta', async () => {
    await TestBed.inject(Router).navigateByUrl('/planetas/marte?fecha=2030-01-01T00:00Z');
    expect(document.title).toBe('Marte · Tierra Luna Sol');
    expect(canonical()).toBe(`${SITE_CONFIG.baseUrl}/planetas/marte`);
  });

  it('las páginas de error no lo llevan, y vuelve al salir de ellas', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/planetas/marte');
    await router.navigateByUrl('/no-existe');
    expect(document.title).toBe('Página no encontrada · Tierra Luna Sol');
    expect(canonical()).toBeNull();
    await router.navigateByUrl('/404');
    expect(canonical()).toBeNull();
    await router.navigateByUrl('/planetas/marte');
    expect(canonical()).toBe(`${SITE_CONFIG.baseUrl}/planetas/marte`);
  });

  it('la description de la página (la de su resolver) y, si no tiene, la del sitio', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/planetas/marte');
    expect(meta('name', 'description')).toBe('Marte, el cuarto planeta desde el Sol.');
    expect(meta('property', 'og:description')).toBe('Marte, el cuarto planeta desde el Sol.');
    expect(meta('property', 'og:url')).toBe(`${SITE_CONFIG.baseUrl}/planetas/marte`);
    // La siguiente no hereda la de Marte.
    await harness.navigateByUrl('/creditos');
    expect(meta('name', 'description')).toBe(SITE_CONFIG.description);
  });

  it('noindex en todas mientras el sitio no sea indexable, y siempre en la 404 (sin og:url)', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/planetas/marte');
    expect(meta('name', 'robots')).toBe(SITE_CONFIG.indexable ? null : 'noindex');
    await router.navigateByUrl('/no-existe');
    expect(meta('name', 'robots')).toBe('noindex');
    expect(meta('property', 'og:url')).toBeNull();
    await router.navigateByUrl('/404');
    expect(meta('name', 'robots')).toBe('noindex');
  });
});
