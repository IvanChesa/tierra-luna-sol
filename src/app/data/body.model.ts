/**
 * Modelo del catálogo de cuerpos: el Sol, los 8 planetas y 21 lunas (la nuestra y 20 más).
 * Cada dato numérico lleva su fuente (`Sourced.source`, id de `SOURCES`) y cada texto, la URL de
 * la página que lo respalda y si Iván ya lo ha revisado.
 */
import type { GalileanId, PlanetId } from '../ephemeris/ids';
import type { MeanElementsMoonId } from './moon-elements';
import type { SourceId } from './sources';

export type MoonId = 'luna' | GalileanId | MeanElementsMoonId;
/** Id del cuerpo: es también el segmento de su URL (`/planetas/marte`, `/lunas/titan`). */
export type BodyId = 'sol' | PlanetId | MoonId;
export type BodyKind = 'star' | 'planet' | 'moon';

export interface BodyIndexEntry {
  readonly id: BodyId;
  /** Nombre en español. */
  readonly name: string;
  readonly kind: BodyKind;
  /** Cuerpo alrededor del que gira: `null` para el Sol. */
  readonly parent: BodyId | null;
}

export interface Sourced<T> {
  readonly value: T;
  readonly source: SourceId;
  /** Aclaración del dato (qué mide exactamente, de dónde sale si se ha derivado…). */
  readonly note?: string;
}

export interface PhysicalData {
  /** Radio en km: ecuatorial en los planetas (la mitad del diámetro de la NASA), medio en el resto. */
  readonly radiusKm: Sourced<number>;
  readonly massKg: Sourced<number>;
  readonly densityKgM3: Sourced<number>;
  readonly surfaceGravityMS2?: Sourced<number>;
  readonly escapeVelocityKmS?: Sourced<number>;
  /** Periodo de rotación sidéreo en horas; negativo si es retrógrado. */
  readonly rotationPeriodH?: Sourced<number>;
  /** Duración del día solar en horas. */
  readonly lengthOfDayH?: Sourced<number>;
  /** Inclinación del eje respecto a la órbita (oblicuidad), en grados. */
  readonly axialTiltDeg?: Sourced<number>;
  /**
   * Achatamiento f = (a − c) / a, con a y c los radios ecuatorial y polar. Solo en los planetas:
   * la escena los dibuja como elipsoides (Saturno ≈ 0,1).
   */
  readonly flatteningRatio?: Sourced<number>;
  readonly meanTemperatureC?: Sourced<number>;
  readonly surfacePressureBar?: Sourced<number>;
  readonly globalMagneticField?: Sourced<boolean>;
  readonly ringSystem?: Sourced<boolean>;
  readonly geometricAlbedo?: Sourced<number>;
  /** Rotación síncrona: siempre muestra la misma cara a su planeta. */
  readonly synchronousRotation?: Sourced<boolean>;
  readonly effectiveTemperatureK?: Sourced<number>;
  readonly luminosityW?: Sourced<number>;
  readonly spectralType?: Sourced<string>;
}

export interface OrbitData {
  /** Semieje mayor (distancia media) en km, alrededor del Sol o del planeta. */
  readonly semiMajorAxisKm: Sourced<number>;
  readonly periapsisKm?: Sourced<number>;
  readonly apoapsisKm?: Sourced<number>;
  /** Periodo orbital sidéreo en días. */
  readonly periodDays: Sourced<number>;
  readonly meanOrbitalVelocityKmS?: Sourced<number>;
  /** Inclinación: respecto a la eclíptica (planetas y Luna) o al ecuador del planeta (lunas). */
  readonly inclinationDeg: Sourced<number>;
  readonly eccentricity: Sourced<number>;
  /** Órbita retrógrada (en sentido contrario a la rotación del planeta). */
  readonly retrograde?: Sourced<boolean>;
}

/** Intervalo [mínimo, máximo] de una magnitud, tal como lo da la fuente. */
export type Range = readonly [number, number];

/** Profundidad óptica normal y albedo de un anillo o una división (intervalos de la ficha). */
export interface RingRegion {
  readonly opticalDepth: Sourced<Range>;
  readonly albedo: Sourced<Range>;
}

/** Bordes de los anillos principales de Saturno, en km desde el centro del planeta. */
export interface RingData {
  /** Borde interior del anillo C. */
  readonly innerRadiusKm: Sourced<number>;
  /** Borde interior del anillo B (el exterior del C). */
  readonly bInnerKm: Sourced<number>;
  /** Borde exterior del anillo B, donde empieza la división de Cassini. */
  readonly cassiniInnerKm: Sourced<number>;
  /** Borde interior del anillo A, donde acaba la división de Cassini. */
  readonly cassiniOuterKm: Sourced<number>;
  /** Borde exterior del anillo A. */
  readonly outerRadiusKm: Sourced<number>;
  /** Profundidad óptica y albedo de los anillos C, B y A y de la división de Cassini (fase 3b). */
  readonly regions: {
    readonly c: RingRegion;
    readonly b: RingRegion;
    readonly cassini: RingRegion;
    readonly a: RingRegion;
  };
}

export interface BodyData {
  readonly physical: PhysicalData;
  /** Sin órbita para el Sol. */
  readonly orbit?: OrbitData;
  /** Solo Saturno: los anillos que dibuja la escena. */
  readonly rings?: RingData;
}

export interface SourcedText {
  readonly text: string;
  /** URL de la página que respalda el texto. */
  readonly source: string;
  /** `false` hasta que Iván lo revise. */
  readonly reviewed: boolean;
}

export interface BodyTexts {
  /** Resumen de 2–3 frases. */
  readonly summary: SourcedText;
  /** Tres curiosidades. */
  readonly facts: readonly [SourcedText, SourcedText, SourcedText];
}

export interface Body extends BodyIndexEntry, BodyData, BodyTexts {}
