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
    expect(radius?.querySelector('.card__unit')?.textContent).toBe(' km');
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
    // Las lunas aún no tienen ficha completa (fase 9): sin pie.
    expect(render('titan').querySelector('.card__foot')).toBeNull();
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
});
