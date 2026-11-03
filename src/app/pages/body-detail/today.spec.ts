import { KM_PER_AU } from '../../ephemeris/constants';
import { BODY_INDEX } from '../../data/body-index';
import { todayOf } from './today';
import {
  PENDING_NOTE,
  calculatedNote,
  distanceCells,
  pendingRows,
  positionNote,
  todayKeys,
} from './today-text';

const DATE = new Date('2026-11-03T18:00:00Z');

describe('today: los datos «de hoy» de las fichas (fase 9)', () => {
  it('qué filas lleva cada cuerpo', () => {
    expect(todayKeys('sol').map((r) => r.label)).toEqual(['A la Tierra']);
    expect(todayKeys('marte').map((r) => r.label)).toEqual(['Al Sol', 'A la Tierra']);
    expect(todayKeys('tierra').map((r) => r.label)).toEqual(['Al Sol']);
    expect(todayKeys('luna').map((r) => r.label)).toEqual(['A la Tierra', 'Fase']);
    expect(todayKeys('titan').map((r) => r.label)).toEqual(['A Saturno', 'A la Tierra']);
  });

  it('sin calcular, las mismas filas con «—» (el HTML prerenderizado)', () => {
    for (const { id } of BODY_INDEX) {
      const pending = pendingRows(id);
      expect(pending.map((r) => r.key)).toEqual(todayOf(id, DATE).rows.map((r) => r.key));
      expect(pending.every((r) => r.value === '—' && r.detail === '')).toBe(true);
    }
    expect(PENDING_NOTE).toMatch(/astronomy-engine/);
  });

  it('las distancias de hoy, en km cerca y en UA lejos (con los km debajo)', () => {
    expect(distanceCells(384_400)).toEqual({ value: '384.400\u00a0km', detail: '' });
    expect(distanceCells(KM_PER_AU)).toEqual({
      value: '1,00\u00a0UA',
      detail: '149,6\u00a0millones de km',
    });
    const mars = todayOf('marte', DATE);
    expect(mars.rows[0]?.value).toMatch(/^1,\d\d\u00a0UA$/);
    expect(mars.rows[1]?.detail).toMatch(/millones de km$/);
    // La Luna, a unos 360.000–406.000 km, y su fase con la fracción iluminada.
    const moon = todayOf('luna', DATE);
    const km = Number(moon.rows[0]?.value.replace(/\D/g, ''));
    expect(km).toBeGreaterThan(355_000);
    expect(km).toBeLessThan(407_000);
    expect(moon.rows[1]?.detail).toMatch(/^\d{1,3}\u00a0% iluminada$/);
    // Titán, a su planeta en km enteros (de 1.186.000 a 1.257.000 km), como en su tabla.
    expect(todayOf('titan', DATE).rows[0]?.value).toMatch(/^1\.(1[89]|2[0-5])\d\.\d{3}\u00a0km$/);
  });

  it('dice cuándo y con qué se ha calculado; las lunas de elementos medios, de dónde sale su posición', () => {
    expect(calculatedNote(DATE)).toMatch(
      /^Calculado en tu navegador el 3 de noviembre de 2026 a las \d{2}:\d{2}, hora local \(.+, UTC.*\), con astronomy-engine\.$/,
    );
    // Tan larga como la nota de antes del cálculo (unas líneas más y la página se movería).
    expect(Math.abs(calculatedNote(DATE).length - PENDING_NOTE.length)).toBeLessThan(25);
    expect(positionNote('titan')).toBe(
      'La posición de Titán respecto a Saturno sale de elementos orbitales ajustados a las efemérides del JPL.',
    );
    // Las galileanas y la Luna salen directamente de astronomy-engine; los planetas, también.
    expect(positionNote('io')).toBeNull();
    expect(positionNote('luna')).toBeNull();
    expect(positionNote('marte')).toBeNull();
  });
});
