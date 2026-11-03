/**
 * El cálculo de los datos «de hoy» de una ficha (fase 9). Lleva astronomy-engine (por
 * `data/solar-system.ts`), así que la ficha lo carga con un `import()` dinámico en el navegador
 * (`afterNextRender`): no entra en el JS inicial de ninguna página (PLAN §4.6).
 */
import type { BodyId } from '../../data/body.model';
import { bodyDistances, createSolarSystemModel } from '../../data/solar-system';
import { moonPhase } from '../../ephemeris/ephemeris';
import {
  TodayRow,
  calculatedNote,
  distanceCells,
  illuminatedText,
  parentDistanceCells,
  todayKeys,
} from './today-text';

export interface Today {
  readonly rows: readonly TodayRow[];
  readonly note: string;
}

const model = createSolarSystemModel(2);

/** Las distancias (y la fase, en la Luna) de un cuerpo en ese instante. */
export function todayOf(id: BodyId, date: Date): Today {
  const distances = bodyDistances(model.at(date), id);
  const rows = todayKeys(id).map(({ key, label }): TodayRow => {
    if (key === 'phase') {
      const phase = moonPhase(date);
      return { key, label, value: phase.name, detail: illuminatedText(phase.illuminatedFraction) };
    }
    const km =
      key === 'toSun'
        ? distances.toSunKm
        : key === 'toEarth'
          ? distances.toEarthKm
          : distances.toParentKm;
    if (km === null) return { key, label, value: '—', detail: '' };
    return { key, label, ...(key === 'toParent' ? parentDistanceCells(km) : distanceCells(km)) };
  });
  return { rows, note: calculatedNote(date) };
}
