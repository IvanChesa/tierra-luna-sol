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
    expect(skipLink?.getAttribute('href')).toBe('#contenido');
    expect(root.querySelector('main#contenido')).not.toBeNull();
  });

  it('muestra el nombre del sitio y la navegación principal', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.site-name')?.textContent).toContain('Tierra Luna Sol');
    expect(root.querySelector('nav[aria-label="Principal"]')).not.toBeNull();
  });
});
