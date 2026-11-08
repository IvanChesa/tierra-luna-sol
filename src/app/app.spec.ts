import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { MOCK_PLATFORM_LOCATION_CONFIG, MockPlatformLocation } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';

@Component({ template: '' })
class Blank {}

// Al navegar, la página sube arriba (`window.scrollTo`, en un `setTimeout` que puede llegar después
// del último test), que jsdom no implementa: sin el aviso. Para todo el archivo, sin restaurarlo: cada
// archivo de tests tiene su propio jsdom.
window.scrollTo = () => undefined;

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('muestra el nombre del sitio y la navegación principal', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.site-name')?.textContent).toContain('Tierra Luna Sol');
    expect(root.querySelector('nav[aria-label="Principal"]')).not.toBeNull();
  });

  it('la navegación: las páginas de lectura y «Explorar en 3D» (fase 9c, decisión 2 de Iván); los créditos y lo legal, aparte', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const main = [...root.querySelectorAll('.site-nav > ul:not(.site-nav__legal) a')];
    expect(main.map((a) => a.textContent?.trim())).toEqual([
      'Planetas',
      'Lunas',
      'Sol',
      'Eclipses',
      'Sobre el proyecto',
      'Explorar en 3D',
    ]);
    expect(main.map((a) => a.getAttribute('href'))).toEqual([
      '/planetas',
      '/lunas',
      '/sol',
      '/eclipses',
      '/sobre-el-proyecto',
      '/',
    ]);
    // El cielo es una vista del explorador (sus pestañas), no una página de la cabecera.
    expect(main.map((a) => a.getAttribute('href'))).not.toContain('/cielo');
    expect(root.querySelector('.site-nav a.site-nav__explore')?.textContent?.trim()).toBe(
      'Explorar en 3D',
    );
    const legal = [...root.querySelectorAll('.site-nav ul.site-nav__legal a')];
    expect(legal.map((a) => a.textContent?.trim())).toEqual([
      'Créditos',
      'Aviso legal',
      'Política de privacidad',
    ]);
  });
});

// Con el `Location` de verdad sobre una URL con consulta, como la de un lugar del cielo o un enlace
// compartido del explorador: con <base href="/">, un «#contenido» suelto llevaría a la portada, y la
// ruta sin la consulta cargaría otro documento (revisión de la fase 9, hallazgo 1; segunda ronda, 21).
describe('App: «Saltar al contenido»', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'eclipses', component: Blank },
          { path: 'cielo', component: Blank },
        ]),
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: PlatformLocation, useClass: MockPlatformLocation },
        {
          provide: MOCK_PLATFORM_LOCATION_CONFIG,
          useValue: { startUrl: 'http://localhost/eclipses?lugar=teide' },
        },
      ],
    }).compileComponents();
  });

  const skipHref = (root: HTMLElement) =>
    root.querySelector('a.skip-link')?.getAttribute('href') ?? null;

  it('lleva la URL de la página, con su consulta, desde antes de la primera navegación', async () => {
    // Al hidratar, la primera navegación espera al chunk de la página: hasta entonces, el enlace
    // no puede apuntar a la portada.
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(skipHref(root)).toBe('/eclipses?lugar=teide#contenido');
    expect(root.querySelector('main#contenido')).not.toBeNull();
  });

  it('sigue a la URL al navegar, también si solo cambia la consulta', async () => {
    const fixture = TestBed.createComponent(App);
    const root = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/cielo?lugar=fabra');
    await fixture.whenStable();
    expect(skipHref(root)).toBe('/cielo?lugar=fabra#contenido');
    await router.navigateByUrl('/cielo?lugar=teide');
    await fixture.whenStable();
    expect(skipHref(root)).toBe('/cielo?lugar=teide#contenido');
    await router.navigateByUrl('/eclipses');
    await fixture.whenStable();
    expect(skipHref(root)).toBe('/eclipses#contenido');
  });
});

// El enlace del menú de la sección de la página, marcado (con aria-current): también en sus páginas
// hijas y, en /luna, «Lunas» (la Luna es la primera de /lunas; decisión de Iván del 04-11).
describe('App: el enlace marcado del menú', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: Blank },
          { path: 'luna', component: Blank },
          { path: 'lunas', component: Blank },
          { path: 'lunas/:id', component: Blank },
          { path: 'eclipses', component: Blank },
          { path: 'cielo', component: Blank },
          { path: 'explorar/luna', component: Blank },
        ]),
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: PlatformLocation, useClass: MockPlatformLocation },
        { provide: MOCK_PLATFORM_LOCATION_CONFIG, useValue: { startUrl: 'http://localhost/luna' } },
      ],
    }).compileComponents();
  });

  const marked = (root: HTMLElement) =>
    [...root.querySelectorAll('.site-nav a.is-active')].map((a) => ({
      label: a.textContent?.trim(),
      current: a.getAttribute('aria-current'),
    }));

  it('en /luna, «Lunas», desde antes de la primera navegación (en el HTML prerenderizado)', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(marked(fixture.nativeElement as HTMLElement)).toEqual([
      { label: 'Lunas', current: 'page' },
    ]);
  });

  it('«Lunas» en /lunas y en una luna; «Explorar en 3D» en las vistas del explorador (fase 9c)', async () => {
    const fixture = TestBed.createComponent(App);
    const root = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    for (const [url, label] of [
      ['/lunas', 'Lunas'],
      ['/lunas/titan', 'Lunas'],
      ['/luna#fuente-1', 'Lunas'],
      ['/?cuerpo=saturno', 'Explorar en 3D'],
      ['/explorar/luna', 'Explorar en 3D'],
      ['/cielo?lugar=teide', 'Explorar en 3D'],
    ] as const) {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      expect(marked(root), url).toEqual([{ label, current: 'page' }]);
    }
    await router.navigateByUrl('/eclipses');
    await fixture.whenStable();
    expect(marked(root)).toEqual([{ label: 'Eclipses', current: 'page' }]);
  });
});
