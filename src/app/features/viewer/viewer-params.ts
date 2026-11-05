/**
 * Parámetros de la URL del explorador (PLAN §2 y §4.5). Un parámetro no válido se ignora y se avisa
 * (PLAN 3.d.9): nunca rompe el visor.
 *
 * - `fecha=2030-01-01T00:00Z`: instante UTC (1900–2100). Con fecha, el explorador abre en pausa.
 * - `cuerpo=titan`: cuerpo elegido (solo en la vista del sistema solar).
 * - `escala=real|ilustrativa`.
 * - `calidad=alta|media|baja|auto`: se lee al abrir y sale de la URL (es del dispositivo, no del
 *   estado que se comparte: la elección del selector se recuerda en `localStorage`).
 * - `captura=1`: modo de captura determinista (fecha fija, calidad alta, sin animaciones).
 * - Solo en captura: `profundidad=logaritmica|invertida|estandar` (prueba de D13) y `detras=neptuno`
 *   (encuadre con ese cuerpo detrás del enfocado).
 * - Solo en captura, para comparar con fotos reales (fase 3b): `desde=tierra` (la geometría de una
 *   foto del Hubble en esa fecha), `fase=30` y `latitud=-17` (ángulo de fase y latitud de la cámara
 *   sobre el ecuador del cuerpo, en grados; con `sobre=ecliptica`, sobre la eclíptica, fase 7) y
 *   `tonemapping=neutral|agx|aces`.
 * - Solo en captura, para las miniaturas de las fichas (fase 3c): `aislado=1`, el cuerpo de
 *   `cuerpo=` solo y centrado.
 * - Solo en captura, para ver de cerca un sistema de lunas de la vista general (fase 9b):
 *   `marco=ilustrativo`, el cuerpo de `cuerpo=` enfocado sin pasar a su sistema local físico.
 * - Solo en captura, para medir el limbo del Sol (fase 9b): `medida=limbo`, el Sol sin halo, corona,
 *   bloom, granulación ni manchas, y con su fotosfera por debajo de la compresión del tone mapping.
 * - `lugar=teide` (fase 8): el lugar del cielo desde España (los del selector; por defecto, el
 *   Montsec, que no se escribe). «Mi ubicación» nunca va a la URL: no sale del navegador.
 * - Solo en captura, la cámara del cielo (fase 8): `rumbo=180` (desde el norte, hacia el este),
 *   `altura=25` y `campo=75` (grados).
 * - `sombra=1` (fase 8, «Ver en 3D» de un eclipse de Sol): con `fecha=`, la vista Tierra empieza con
 *   la cámara sobre la sombra de la Luna.
 */
import { findBody, isBodyId } from '../../data/body-index';
import { DEFAULT_PLACE_ID, PlaceId, SKY_PLACES } from '../../data/places';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import type {
  BodyId,
  DepthMode,
  QualitySetting,
  ScaleMode,
  SkyView,
  ToneMappingMode,
  ViewFrom,
} from '../../scene';

/** Fecha fija del modo de captura cuando la URL no trae otra (en `core/capture.ts`: la usan también las fichas). */
export { CAPTURE_DATE } from '../../core/capture';
const MIN_MS = MIN_DATE.getTime();
const MAX_MS = MAX_DATE.getTime();

export interface ViewerParams {
  readonly capture: boolean;
  readonly time: Date | null;
  readonly body: BodyId | null;
  readonly scale: ScaleMode | null;
  readonly quality: QualitySetting | null;
  readonly depth: DepthMode | null;
  readonly background: BodyId | null;
  readonly viewFrom: ViewFrom | null;
  readonly toneMapping: ToneMappingMode | null;
  /** Solo en captura: el cuerpo, solo y centrado (miniaturas). */
  readonly isolate: boolean;
  /** Solo en captura: el cuerpo enfocado en el marco de la vista general (`marco=ilustrativo`). */
  readonly illustrativeFocus: boolean;
  /** Solo en captura: el Sol para medir su limbo (`medida=limbo`). */
  readonly sunMeasure: boolean;
  /** El lugar del cielo desde España (`lugar=`), o `null` (el de por defecto). */
  readonly place: PlaceId | null;
  /** Solo en captura: hacia dónde mira la cámara del cielo. */
  readonly skyView: Partial<SkyView> | null;
  /** La cámara de la vista Tierra, sobre la sombra de la Luna (`sombra=1`, con fecha). */
  readonly shadow: boolean;
  /** Avisos de los parámetros que se han ignorado, ya redactados para la interfaz. */
  readonly warnings: readonly string[];
}

const QUALITY: Readonly<Record<string, QualitySetting>> = {
  alta: 'high',
  media: 'medium',
  baja: 'low',
  auto: 'auto',
};
const DEPTH: Readonly<Record<string, DepthMode>> = {
  logaritmica: 'logarithmic',
  invertida: 'reversed',
  estandar: 'standard',
};
const SCALE: Readonly<Record<string, ScaleMode>> = { real: 'real', ilustrativa: 'illustrative' };
const TONE_MAPPING: Readonly<Record<string, ToneMappingMode>> = {
  neutral: 'neutral',
  agx: 'agx',
  aces: 'aces',
};

/** Número de un parámetro dentro de [min, max], o `null`. */
function numberParam(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

/** Geometría de una foto de referencia (solo en captura). */
function parseViewFrom(params: URLSearchParams): ViewFrom | null {
  if (params.get('desde') === 'tierra') return { kind: 'earth' };
  const phaseDeg = numberParam(params.get('fase'), 0, 180);
  if (phaseDeg === null) return null;
  const latitudeDeg = numberParam(params.get('latitud'), -90, 90);
  const reference = params.get('sobre') === 'ecliptica' ? ({ reference: 'ecliptic' } as const) : {};
  return latitudeDeg === null
    ? { kind: 'phase', phaseDeg, ...reference }
    : { kind: 'phase', phaseDeg, latitudeDeg, ...reference };
}
const SCALE_PARAM: Readonly<Record<ScaleMode, string>> = {
  real: 'real',
  illustrative: 'ilustrativa',
};

/** Fecha ISO 8601 en UTC (con `Z`) dentro de 1900–2100, o `null`. */
export function parseUtcDate(value: string | null): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z)?$/);
  if (!value || !match) return null;
  const ms = Date.parse(value.includes('T') ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(ms) || ms < MIN_MS || ms > MAX_MS) return null;
  const date = new Date(ms);
  // Date.parse convierte el 31 de febrero en el 3 de marzo: la fecha tiene que existir.
  const sameDay =
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3]);
  return sameDay ? date : null;
}

/** El instante en el formato de la URL: `2030-01-01T00:00Z` (con segundos solo si los hay). */
export function formatUtcParam(date: Date): string {
  const iso = date.toISOString(); // 2030-01-01T00:00:00.000Z
  const seconds = iso.slice(17, 19);
  return seconds === '00' ? `${iso.slice(0, 16)}Z` : `${iso.slice(0, 19)}Z`;
}

const quoted = (value: string): string =>
  `«${value.length > 40 ? `${value.slice(0, 40)}…` : value}»`;

export function parseViewerParams(search: string): ViewerParams {
  const params = new URLSearchParams(search);
  const warnings: string[] = [];
  const capture = params.get('captura') === '1';

  const rawTime = params.get('fecha');
  const time = parseUtcDate(rawTime);
  if (rawTime !== null && !time)
    warnings.push(
      `La fecha ${quoted(rawTime)} no vale y se muestra el momento actual. Tiene que existir, ir en UTC (como 2030‑01‑01T00:00Z) y estar entre 1900 y 2100.`,
    );

  const rawBody = params.get('cuerpo');
  const body = rawBody !== null && isBodyId(rawBody) ? rawBody : null;
  if (rawBody !== null && !body)
    warnings.push(`El cuerpo ${quoted(rawBody)} no está en el explorador y se ha ignorado.`);

  const rawScale = params.get('escala');
  const scale = SCALE[rawScale ?? ''] ?? null;
  if (rawScale !== null && !scale)
    warnings.push(
      `La escala ${quoted(rawScale)} no existe y se usa la ilustrativa. Puede ser «real» o «ilustrativa».`,
    );

  const rawQuality = params.get('calidad');
  const quality = QUALITY[rawQuality ?? ''] ?? null;
  if (rawQuality !== null && !quality)
    warnings.push(
      `La calidad ${quoted(rawQuality)} no existe y se ha ignorado. Puede ser «alta», «media», «baja» o «auto».`,
    );

  const rawPlace = params.get('lugar');
  const place = SKY_PLACES.find((candidate) => candidate.id === rawPlace)?.id ?? null;
  if (rawPlace !== null && !place)
    warnings.push(
      `El lugar ${quoted(rawPlace)} no está en el selector del cielo y se muestra el del Montsec.`,
    );

  const background = capture ? params.get('detras') : null;
  return {
    capture,
    time,
    body,
    scale,
    quality,
    depth: capture ? (DEPTH[params.get('profundidad') ?? ''] ?? null) : null,
    background: background !== null && isBodyId(background) ? background : null,
    viewFrom: capture ? parseViewFrom(params) : null,
    toneMapping: capture ? (TONE_MAPPING[params.get('tonemapping') ?? ''] ?? null) : null,
    isolate: capture && params.get('aislado') === '1',
    illustrativeFocus: capture && params.get('marco') === 'ilustrativo',
    sunMeasure: capture && params.get('medida') === 'limbo',
    place: place as PlaceId | null,
    skyView: capture ? parseSkyView(params) : null,
    shadow: params.get('sombra') === '1' && time !== null,
    warnings,
  };
}

/** La cámara del cielo de una captura: `rumbo`, `altura` y `campo` (grados), los que vengan. */
function parseSkyView(params: URLSearchParams): Partial<SkyView> | null {
  const azimuthDeg = numberParam(params.get('rumbo'), 0, 360);
  const altitudeDeg = numberParam(params.get('altura'), -10, 90);
  const fovDeg = numberParam(params.get('campo'), 1, 180);
  const view: { azimuthDeg?: number; altitudeDeg?: number; fovDeg?: number } = {};
  if (azimuthDeg !== null) view.azimuthDeg = azimuthDeg;
  if (altitudeDeg !== null) view.altitudeDeg = altitudeDeg;
  if (fovDeg !== null) view.fovDeg = fovDeg;
  return Object.keys(view).length > 0 ? view : null;
}

/** Lo que se guarda en la URL del explorador (PLAN §4.5). `null` quita el parámetro. */
export interface UrlState {
  /** Solo en pausa: durante la reproducción no se escribe la fecha. */
  readonly time: Date | null;
  readonly body: BodyId | null;
  readonly scale: ScaleMode;
  /** El lugar del cielo, solo en la vista del cielo y si no es el de por defecto (`null`: sin él). */
  readonly place?: PlaceId | null;
}

/** `calidad` siempre sale: si no, la URL pisaría la preferencia guardada al recargar. */
export function viewerQueryParams(state: UrlState): Record<string, string | null> {
  return {
    fecha: state.time ? formatUtcParam(state.time) : null,
    cuerpo: state.body && findBody(state.body) ? state.body : null,
    escala: state.scale === 'illustrative' ? null : SCALE_PARAM[state.scale],
    lugar: state.place && state.place !== DEFAULT_PLACE_ID ? state.place : null,
    // Solo sirve al llegar: después, la cámara es de quien la mueve.
    sombra: null,
    calidad: null,
  };
}
