import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
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

describe('SiteTitleStrategy', () => {
  const canonical = () =>
    document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'planetas',
            children: [{ path: ':id', title: 'Marte', component: Blank }],
          },
          {
            path: '404',
            title: 'Página no encontrada',
            data: { canonical: false },
            component: Blank,
          },
          {
            path: '**',
            title: 'Página no encontrada',
            data: { canonical: false },
            component: Blank,
          },
        ]),
        { provide: TitleStrategy, useClass: SiteTitleStrategy },
      ],
    });
  });

  afterEach(() => document.head.querySelector('link[rel="canonical"]')?.remove());

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
});
