import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { getBody } from '../../data/bodies';
import type { BodyId } from '../../data/body.model';
import { SOURCES } from '../../data/sources';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { BodyPanel } from './body-panel';

/** Una ficha por cuerpo, en el mismo módulo de pruebas (se configura una vez por test). */
function render(id: BodyId) {
  const fixture = TestBed.createComponent(BodyPanel);
  fixture.componentRef.setInput('bodyId', id);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('BodyPanel: ficha resumida', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BodyPanel],
      providers: [provideRouter([]), SimulationStore, SystemPositions],
    });
    TestBed.inject(SimulationStore).init({
      time: new Date('2030-01-01T00:00:00Z'),
      playing: false,
    });
  });

  it('cifra y unidad por separado (la unidad, en el color secundario), con espacio duro', () => {
    const root = render('jupiter');
    const radius = [...root.querySelectorAll('.card__row')].find((row) =>
      row.textContent?.includes('Radio ecuatorial'),
    );
    expect(radius?.querySelector('.card__number')?.textContent).toBe('71.492');
    expect(radius?.querySelector('.card__unit')?.textContent).toBe('\u00a0km');
    // La rotación síncrona no tiene unidad.
    const moon = render('io');
    const rotation = [...moon.querySelectorAll('.card__row')].find((row) =>
      row.textContent?.includes('Rotación'),
    );
    expect(rotation?.querySelector('.card__number')?.textContent).toBe('Síncrona');
    expect(rotation?.querySelector('.card__unit')).toBeNull();
  });

  it('el enlace a la ficha completa va en un pie fijo, fuera de la parte que se desplaza', () => {
    const root = render('saturno');
    const link = root.querySelector<HTMLAnchorElement>('.card__foot .card__link');
    expect(link?.textContent?.trim()).toBe('Ficha completa de Saturno');
    expect(root.querySelector('.card__body .card__link')).toBeNull();
    // Desde la fase 9, también las lunas tienen ficha completa: /lunas/:id.
    const moon = render('titan').querySelector<HTMLAnchorElement>('.card__foot .card__link');
    expect(moon?.textContent?.trim()).toBe('Ficha completa de Titán');
    expect(moon?.getAttribute('href')).toBe('/lunas/titan');
  });

  it('cita la fuente de cada dato de la ficha y, si son varias, qué respalda cada una', () => {
    for (const id of ['titan', 'luna', 'saturno', 'sol', 'fobos'] as const) {
      const body = getBody(id);
      const rotation = body.physical.synchronousRotation?.value
        ? body.physical.synchronousRotation
        : body.physical.rotationPeriodH;
      const expected = new Set(
        [body.physical.radiusKm.source, rotation?.source, body.orbit?.periodDays.source]
          .filter((source) => source !== undefined)
          .map((source) => new URL(SOURCES[source].url).href),
      );
      const links = [...render(id).querySelectorAll<HTMLAnchorElement>('.card__source a')];
      expect(new Set(links.map((link) => link.href))).toEqual(expected);
    }
    const text = (id: BodyId) =>
      (render(id).querySelector('.card__source')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(text('titan')).toMatch(
      /^Radio: NASA\/JPL, Solar System Dynamics\. Rotación y órbita: NASA, NSSDCA [^.]+\. Las distancias/,
    );
    expect(text('saturno')).toMatch(/^Datos de NASA, NSSDCA [^.]+\. Las distancias/);
  });

  it('dice con qué se calculan las distancias (ESTILO §5)', () => {
    const planet = render('marte').querySelector('.card__source')?.textContent ?? '';
    expect(planet).toContain('Las distancias se calculan en tu navegador con astronomy-engine.');
    const moon = render('titan').querySelector('.card__source')?.textContent ?? '';
    expect(moon).toContain(
      'la posición de Titán respecto a Saturno, con elementos orbitales ajustados a las efemérides del JPL.',
    );
  });

  it('Venus «Bajo las nubes» (fase 9b, D44): el botón, con aria-pressed y el aviso de que es una imagen de radar', () => {
    // Sin estado (otro cuerpo, otra vista o sin 3D), no hay botón.
    expect(render('venus').querySelector('.card__radar')).toBeNull();
    const fixture = TestBed.createComponent(BodyPanel);
    fixture.componentRef.setInput('bodyId', 'venus');
    fixture.componentRef.setInput('radar', 'off');
    const asked: boolean[] = [];
    fixture.componentInstance.radarChange.subscribe((on) => asked.push(on));
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = () => root.querySelector<HTMLButtonElement>('.card__radar-toggle');
    const note = () => root.querySelector('#card-radar-note')?.textContent?.trim();
    expect(button()?.textContent?.trim()).toBe('Bajo las nubes');
    expect(button()?.getAttribute('aria-pressed')).toBe('false');
    expect(button()?.getAttribute('aria-describedby')).toBe('card-radar-note');
    // Junto al resumen: en el móvil, a la vista también con la hoja en reposo (fuera de «card__rest»).
    expect(root.querySelector('.card__rest .card__radar')).toBeNull();
    button()?.click();
    expect(asked).toEqual([true]);
    // Mientras llega, pulsado; ya con el radar, el aviso visible.
    fixture.componentRef.setInput('radar', 'loading');
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-pressed')).toBe('true');
    expect(note()).toBe('Cargando la imagen de radar…');
    fixture.componentRef.setInput('radar', 'on');
    fixture.detectChanges();
    expect(note()).toBe(
      'Imagen de radar de la sonda Magellan, con el color de las fotos de las Venera 13 y 14: no es lo que verían tus ojos.',
    );
    button()?.click();
    expect(asked).toEqual([true, false]);
    // Si no llega, se dice y el botón vuelve a no estar pulsado.
    fixture.componentRef.setInput('radar', 'error');
    fixture.detectChanges();
    expect(button()?.getAttribute('aria-pressed')).toBe('false');
    expect(note()).toMatch(/No se ha podido cargar la imagen de radar/);
  });

  it('el Sol, en color realzado (fase 9b, D46): lo dice su ficha, con su fuente y «Lo que es ilustrativo»; los demás cuerpos, no', () => {
    const sun = render('sol').querySelector('.card__note');
    expect(sun?.textContent).toMatch(/color realzado/);
    const links = [...(sun?.querySelectorAll('a') ?? [])];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['NASA', 'Lo que es ilustrativo']);
    expect(links[0]?.getAttribute('href')).toMatch(/^https:\/\/svs\.gsfc\.nasa\.gov\//);
    expect(links[1]?.getAttribute('href')).toBe('/sobre-el-proyecto#ilustrativo');
    for (const id of ['tierra', 'triton', 'venus'] as const) {
      expect(render(id).querySelector('.card__note'), id).toBeNull();
    }
  });
});
