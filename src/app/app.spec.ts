import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('enlaza al contenido principal antes de la navegación', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const skipLink = root.querySelector('a');
    // Con la ruta delante: con <base href="/">, un «#contenido» suelto llevaría a la portada.
    expect(skipLink?.getAttribute('href')).toBe('/#contenido');
    expect(root.querySelector('main#contenido')).not.toBeNull();
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
