import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { MOCK_PLATFORM_LOCATION_CONFIG, MockPlatformLocation } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';

@Component({ template: '' })
class Blank {}

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

  it('la navegación: «Cielo» en lugar de «Luna» (decisión de Iván del 03-11) y, solo en el menú del móvil, los créditos y lo legal', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const main = [...root.querySelectorAll('.site-nav li:not(.site-nav__extra) a')];
    expect(main.map((a) => a.textContent?.trim())).toEqual([
      'Planetas',
      'Lunas',
      'Sol',
      'Cielo',
      'Eclipses',
      'Sobre el proyecto',
    ]);
    expect(main.map((a) => a.getAttribute('href'))).toEqual([
      '/planetas',
      '/lunas',
      '/sol',
      '/cielo',
      '/eclipses',
      '/sobre-el-proyecto',
    ]);
    const extra = [...root.querySelectorAll('.site-nav li.site-nav__extra a')];
    expect(extra.map((a) => a.textContent?.trim())).toEqual([
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
          { path: 'luna', component: Blank },
          { path: 'lunas', component: Blank },
          { path: 'lunas/:id', component: Blank },
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

  it('«Lunas» en /lunas y en una luna; «Cielo» con su consulta; ninguno en el explorador', async () => {
    const fixture = TestBed.createComponent(App);
    const root = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    for (const [url, label] of [
      ['/lunas', 'Lunas'],
      ['/lunas/titan', 'Lunas'],
      ['/cielo?lugar=teide', 'Cielo'],
      ['/luna#fuente-1', 'Lunas'],
    ] as const) {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      expect(marked(root), url).toEqual([{ label, current: 'page' }]);
    }
    await router.navigateByUrl('/explorar/luna');
    await fixture.whenStable();
    expect(marked(root)).toEqual([]);
    expect(root.querySelector('.site-nav a[aria-current]')).toBeNull();
  });
});
