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
