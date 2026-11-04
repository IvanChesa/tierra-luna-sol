/**
 * Las tablas de datos de la ficha de un cuerpo (fase 9, tarea 2): las filas de los datos físicos, de la
 * órbita y, en Saturno, de los anillos, cada una con su cifra en el formato de ESTILO §3, su aclaración
 * (la `note` del dato) y su fuente, numerada para la lista del final (ESTILO §5). Funciones puras, con
 * tests: ninguna cifra sin fuente.
 *
 * Las cifras se copian con los decimales de su fuente (`formatExact`); las masas y la luminosidad, en
 * notación científica; los periodos, en horas, días o años con un decimal (ESTILO §3) y la cifra de la
 * fuente al lado si se ha convertido; las distancias de los planetas,
 * en millones de km con las UA al lado, y las de las lunas, en km enteros.
 */
import {
  decimalsOf,
  formatAu,
  formatDistanceKm,
  formatExact,
  formatNumber,
  formatScientific,
} from '../../core/format';
import { findBody } from '../../data/body-index';
import type { Body, Range, RingRegion, Sourced } from '../../data/body.model';
import { SOURCES, Source, SourceId } from '../../data/sources';

/** Espacio duro entre la cifra y la unidad (ESTILO §3). */
const NBSP = ' ';

export interface FactValue {
  /** La cifra o el texto («Síncrona», «Sí»). */
  readonly number: string;
  /** El exponente, si la cifra va en notación científica («23» en 6,4171 × 10²³). */
  readonly exponent?: string;
  /** La unidad (en el color secundario), o vacía. */
  readonly unit: string;
  /** Cómo la lee un lector de pantalla, si no basta con el texto («6,4171 por 10 elevado a 23 kg»). */
  readonly spoken?: string;
}

export interface FactRow {
  /** El campo del dato (para los tests y el `track` de la plantilla). */
  readonly key: string;
  readonly label: string;
  readonly value: FactValue;
  /** La misma cifra en otra unidad («1,52 UA») o un matiz («retrógrada»). */
  readonly detail?: string;
  /** La aclaración del dato (`Sourced.note`), si no repite la etiqueta. */
  readonly note?: string;
  readonly source: SourceId;
}

export interface FactGroup {
  readonly id: 'fisicos' | 'orbita' | 'anillos';
  readonly title: string;
  readonly rows: readonly FactRow[];
}

/** Una fuente de la lista del final, con su número. */
export interface Citation {
  readonly number: number;
  readonly id: SourceId;
  readonly source: Source;
}

/** Separa la unidad que `core/format.ts` une con un espacio duro («227,9 millones de km»). */
function split(text: string): FactValue {
  const at = text.indexOf(NBSP);
  return at < 0
    ? { number: text, unit: '' }
    : { number: text.slice(0, at), unit: text.slice(at + 1) };
}

/** La aclaración, salvo si solo repite la etiqueta («Radio medio.» en «Radio medio»). */
function noteOf(label: string, data: Sourced<unknown>): string | undefined {
  const note = data.note?.trim();
  if (!note) return undefined;
  const plain = (text: string) => text.replace(/\.$/, '').toLocaleLowerCase('es');
  return plain(note) === plain(label) ? undefined : note;
}

function row(
  key: string,
  label: string,
  data: Sourced<unknown>,
  value: FactValue,
  detail?: string,
): FactRow {
  return { key, label, value, detail, note: noteOf(label, data), source: data.source };
}

const exact = (value: number, unit: string): FactValue => ({ number: formatExact(value), unit });

function scientific(value: number, unit: string, unitSpoken: string): FactValue {
  const s = formatScientific(value);
  return { number: s.mantissa, exponent: s.exponent, unit, spoken: `${s.spoken} ${unitSpoken}` };
}

const yesNo = (value: boolean): FactValue => ({ number: value ? 'Sí' : 'No', unit: '' });

/** «0,05–0,35»: un intervalo de la fuente, con la raya corta de los intervalos. */
const range = ([min, max]: Range): FactValue => ({
  number: `${formatExact(min)}–${formatExact(max)}`,
  unit: '',
});

/**
 * Un periodo con las reglas de ESTILO §3, con un decimal: horas hasta 48 h; después, días y, desde
 * 1000 días, años. Si la cifra que se ve no es la de la fuente (convertida o redondeada), la de la
 * fuente va al lado, con todos sus decimales («58,7 días» y «1407,6 h»; «11,9 años» y «4331 días»;
 * revisión de la fase 9, sugerencia 18). En su unidad y con un decimal o ninguno, la cifra que se ve
 * ya es la de la fuente: la NASA da «88.0» días para Mercurio, que el dato guarda como 88, y
 * «88,0 días» no lleva «88 días» al lado (segunda ronda, hallazgo 23).
 */
export function periodCells(
  hours: number,
  sourceUnit: 'h' | 'días',
): {
  value: FactValue;
  source?: string;
} {
  const h = Math.abs(hours);
  const days = h / 24;
  const [shown, unit]: [number, string] =
    h < 48 ? [h, 'h'] : days < 1000 ? [days, 'días'] : [days / 365.25, 'años'];
  const original = sourceUnit === 'h' ? h : days;
  // Sin el ruido de la coma flotante del paso a horas y vuelta (como `formatExact`).
  const same = unit === sourceUnit && decimalsOf(Number(original.toPrecision(12))) <= 1;
  return {
    value: split(`${formatNumber(shown, 1, true)}${NBSP}${unit}`),
    // Mimas: 0,9424218 días, siete decimales (el tope de `formatExact` es seis).
    source: same ? undefined : `${formatExact(original, 12)}${NBSP}${sourceUnit}`,
  };
}

/** «5832,5 h · retrógrada»: lo que va al lado de la cifra, sin lo que falte. */
const detailOf = (...parts: (string | undefined)[]): string | undefined =>
  parts.filter(Boolean).join(' · ') || undefined;

/** El radio: ecuatorial en los planetas (la mitad del diámetro de la ficha), medio en el resto. */
function radiusLabel(body: Body): string {
  if (body.kind === 'planet') return 'Radio ecuatorial';
  return body.kind === 'star' ? 'Radio' : 'Radio medio';
}

function physicalRows(body: Body): FactRow[] {
  const p = body.physical;
  const rows: FactRow[] = [
    row('radiusKm', radiusLabel(body), p.radiusKm, exact(p.radiusKm.value, 'km')),
    row('massKg', 'Masa', p.massKg, scientific(p.massKg.value, 'kg', 'kilogramos')),
    row('densityKgM3', 'Densidad media', p.densityKgM3, exact(p.densityKgM3.value, 'kg/m³')),
  ];
  if (p.surfaceGravityMS2) {
    rows.push(
      row(
        'surfaceGravityMS2',
        'Gravedad en la superficie',
        p.surfaceGravityMS2,
        exact(p.surfaceGravityMS2.value, 'm/s²'),
      ),
    );
  }
  if (p.escapeVelocityKmS) {
    rows.push(
      row(
        'escapeVelocityKmS',
        'Velocidad de escape',
        p.escapeVelocityKmS,
        exact(p.escapeVelocityKmS.value, 'km/s'),
      ),
    );
  }
  if (p.rotationPeriodH) {
    const hours = p.rotationPeriodH.value;
    const cells = periodCells(hours, 'h');
    rows.push(
      row(
        'rotationPeriodH',
        'Periodo de rotación',
        p.rotationPeriodH,
        cells.value,
        detailOf(cells.source, hours < 0 ? 'retrógrada' : undefined),
      ),
    );
  }
  if (p.synchronousRotation?.value) {
    rows.push(
      row('synchronousRotation', 'Rotación', p.synchronousRotation, {
        number: 'Síncrona',
        unit: '',
      }),
    );
  }
  if (p.lengthOfDayH) {
    const cells = periodCells(p.lengthOfDayH.value, 'h');
    rows.push(row('lengthOfDayH', 'Día solar', p.lengthOfDayH, cells.value, cells.source));
  }
  if (p.axialTiltDeg) {
    rows.push(
      row('axialTiltDeg', 'Inclinación del eje', p.axialTiltDeg, {
        number: `${formatExact(p.axialTiltDeg.value)}°`,
        unit: '',
      }),
    );
  }
  if (p.flatteningRatio) {
    rows.push(
      row('flatteningRatio', 'Achatamiento', p.flatteningRatio, exact(p.flatteningRatio.value, '')),
    );
  }
  if (p.meanTemperatureC) {
    rows.push(
      row(
        'meanTemperatureC',
        'Temperatura media',
        p.meanTemperatureC,
        exact(p.meanTemperatureC.value, '°C'),
      ),
    );
  }
  if (p.effectiveTemperatureK) {
    rows.push(
      row(
        'effectiveTemperatureK',
        'Temperatura efectiva',
        p.effectiveTemperatureK,
        exact(p.effectiveTemperatureK.value, 'K'),
      ),
    );
  }
  if (p.surfacePressureBar) {
    rows.push(
      row(
        'surfacePressureBar',
        'Presión en la superficie',
        p.surfacePressureBar,
        // La de la Luna, 3 × 10⁻¹⁵ bar: en notación científica, como las masas.
        p.surfacePressureBar.value > 0 && p.surfacePressureBar.value < 1e-3
          ? scientific(p.surfacePressureBar.value, 'bar', 'bares')
          : exact(p.surfacePressureBar.value, 'bar'),
      ),
    );
  }
  if (p.luminosityW) {
    rows.push(
      row(
        'luminosityW',
        'Luminosidad',
        p.luminosityW,
        scientific(p.luminosityW.value, 'W', 'vatios'),
      ),
    );
  }
  if (p.spectralType) {
    rows.push(
      row('spectralType', 'Tipo espectral', p.spectralType, {
        number: p.spectralType.value,
        unit: '',
      }),
    );
  }
  if (p.geometricAlbedo) {
    rows.push(
      row(
        'geometricAlbedo',
        'Albedo geométrico',
        p.geometricAlbedo,
        exact(p.geometricAlbedo.value, ''),
      ),
    );
  }
  if (p.globalMagneticField) {
    rows.push(
      row(
        'globalMagneticField',
        'Campo magnético global',
        p.globalMagneticField,
        yesNo(p.globalMagneticField.value),
      ),
    );
  }
  if (p.ringSystem) {
    rows.push(row('ringSystem', 'Anillos', p.ringSystem, yesNo(p.ringSystem.value)));
  }
  return rows;
}

/**
 * Una distancia de la órbita: la de los planetas, en millones de km con las UA al lado; la de las
 * lunas, en km enteros (se comparan entre ellas, como en el índice del explorador, ESTILO §3).
 */
function orbitDistance(body: Body, km: number): { value: FactValue; detail?: string } {
  if (body.kind === 'planet') return { value: split(formatDistanceKm(km)), detail: formatAu(km) };
  return { value: { number: formatNumber(km, 0), unit: 'km' } };
}

function orbitRows(body: Body): FactRow[] {
  const o = body.orbit;
  if (!o) return [];
  const planet = body.kind === 'planet';
  const near = planet ? 'Perihelio' : 'Perigeo';
  const far = planet ? 'Afelio' : 'Apogeo';
  const distance = (key: string, label: string, data: Sourced<number>): FactRow => {
    const { value, detail } = orbitDistance(body, data.value);
    return row(key, label, data, value, detail);
  };
  const rows: FactRow[] = [distance('semiMajorAxisKm', 'Distancia media', o.semiMajorAxisKm)];
  if (o.periapsisKm) rows.push(distance('periapsisKm', near, o.periapsisKm));
  if (o.apoapsisKm) rows.push(distance('apoapsisKm', far, o.apoapsisKm));
  const period = periodCells(o.periodDays.value * 24, 'días');
  rows.push(
    row(
      'periodDays',
      planet ? 'Año (periodo orbital)' : 'Periodo orbital',
      o.periodDays,
      period.value,
      period.source,
    ),
  );
  if (o.meanOrbitalVelocityKmS) {
    rows.push(
      row(
        'meanOrbitalVelocityKmS',
        'Velocidad orbital media',
        o.meanOrbitalVelocityKmS,
        exact(o.meanOrbitalVelocityKmS.value, 'km/s'),
      ),
    );
  }
  rows.push(
    row('inclinationDeg', 'Inclinación de la órbita', o.inclinationDeg, {
      number: `${formatExact(o.inclinationDeg.value)}°`,
      unit: '',
    }),
    row('eccentricity', 'Excentricidad', o.eccentricity, exact(o.eccentricity.value, '')),
  );
  if (o.retrograde?.value) {
    rows.push(
      row('retrograde', 'Sentido de la órbita', o.retrograde, { number: 'Retrógrado', unit: '' }),
    );
  }
  return rows;
}

/** Los anillos de Saturno: sus bordes y la profundidad óptica y el albedo de cada región. */
function ringRows(body: Body): FactRow[] {
  const r = body.rings;
  if (!r) return [];
  const edge = (key: string, label: string, data: Sourced<number>): FactRow =>
    row(key, label, data, { number: formatNumber(data.value, 0), unit: 'km' });
  const regions: [keyof typeof r.regions, string][] = [
    ['c', 'anillo C'],
    ['b', 'anillo B'],
    ['cassini', 'división de Cassini'],
    ['a', 'anillo A'],
  ];
  const regionRows = regions.flatMap(([key, name]) => {
    const region: RingRegion = r.regions[key];
    return [
      row(
        `${key}.opticalDepth`,
        `Profundidad óptica normal del ${name}`,
        region.opticalDepth,
        range(region.opticalDepth.value),
      ),
      row(`${key}.albedo`, `Albedo del ${name}`, region.albedo, range(region.albedo.value)),
    ];
  });
  return [
    edge('innerRadiusKm', 'Borde interior del anillo C', r.innerRadiusKm),
    edge('bInnerKm', 'Borde interior del anillo B', r.bInnerKm),
    edge('cassiniInnerKm', 'Borde exterior del anillo B', r.cassiniInnerKm),
    edge('cassiniOuterKm', 'Borde interior del anillo A', r.cassiniOuterKm),
    edge('outerRadiusKm', 'Borde exterior del anillo A', r.outerRadiusKm),
    ...regionRows,
  ];
}

/** «alrededor del Sol», «alrededor de la Tierra», «alrededor de Saturno». */
function aroundOf(body: Body): string {
  if (!body.parent) return '';
  if (body.parent === 'sol') return 'alrededor del Sol';
  if (body.parent === 'tierra') return 'alrededor de la Tierra';
  return `alrededor de ${findBody(body.parent)?.name ?? body.parent}`;
}

/** Las tablas de la ficha: los datos físicos, la órbita (si tiene) y los anillos (Saturno). */
export function bodyFacts(body: Body): FactGroup[] {
  const groups: FactGroup[] = [{ id: 'fisicos', title: 'Datos físicos', rows: physicalRows(body) }];
  const title = `Órbita ${aroundOf(body)}`;
  // «Respecto a la Tierra.» en la órbita de la Luna: ya lo dice el título («alrededor de la Tierra»).
  const implied = (note: string | undefined) =>
    note !== undefined && title.endsWith(note.replace(/^Respecto a /, '').replace(/\.$/, ''));
  const orbit = orbitRows(body).map((row) =>
    implied(row.note) ? { ...row, note: undefined } : row,
  );
  if (orbit.length) groups.push({ id: 'orbita', title, rows: orbit });
  const rings = ringRows(body);
  if (rings.length) groups.push({ id: 'anillos', title: 'Anillos', rows: rings });
  return groups;
}

/** Las fuentes de las tablas, numeradas por orden de aparición (la nota de cada fila lleva su número). */
export function citations(groups: readonly FactGroup[]): Citation[] {
  const order: SourceId[] = [];
  for (const group of groups) {
    for (const { source } of group.rows) if (!order.includes(source)) order.push(source);
  }
  return order.map((id, k) => ({ number: k + 1, id, source: SOURCES[id] }));
}
