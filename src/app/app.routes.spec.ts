import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { SiteTitleStrategy } from './core/site-title.strategy';

describe('rutas', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: TitleStrategy, useClass: SiteTitleStrategy },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  const h1 = () => (harness.routeNativeElement as HTMLElement).querySelector('h1')?.textContent;
  const title = () => TestBed.inject(Title).getTitle();

  it.each([
    ['/', 'Tierra Luna Sol', 'Tierra Luna Sol'],
    ['/planetas', 'Planetas', 'Planetas · Tierra Luna Sol'],
    ['/planetas/marte', 'Marte', 'Marte · Tierra Luna Sol'],
    ['/planetas/jupiter', 'Júpiter', 'Júpiter · Tierra Luna Sol'],
    ['/planetas/neptuno', 'Neptuno', 'Neptuno · Tierra Luna Sol'],
    ['/sol', 'Sol', 'Sol · Tierra Luna Sol'],
    ['/luna', 'Luna', 'Luna · Tierra Luna Sol'],
    ['/creditos', 'Créditos', 'Créditos · Tierra Luna Sol'],
    ['/sobre-el-proyecto', 'Sobre el proyecto', 'Sobre el proyecto · Tierra Luna Sol'],
    ['/404', 'Página no encontrada', 'Página no encontrada · Tierra Luna Sol'],
  ])('%s muestra su página y su título', async (url, heading, pageTitle) => {
    await harness.navigateByUrl(url);
    expect(h1()).toBe(heading);
    expect(title()).toBe(pageTitle);
  });

  it.each(['/no-existe', '/planetas/pluton', '/planetas/luna', '/planetas/marte/extra'])(
    '%s muestra la página 404 en el cliente',
    async (url) => {
      await harness.navigateByUrl(url);
      expect(h1()).toBe('Página no encontrada');
      expect(title()).toBe('Página no encontrada · Tierra Luna Sol');
    },
  );
});
