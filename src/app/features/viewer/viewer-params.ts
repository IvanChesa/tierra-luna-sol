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
 *   sobre el ecuador del cuerpo, en grados) y `tonemapping=neutral|agx|aces`.
 */
import { findBody, isBodyId } from '../../data/body-index';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import type {
  BodyId,
  DepthMode,
  QualitySetting,
  ScaleMode,
  ToneMappingMode,
  ViewFrom,
} from '../../scene';

/** Fecha fija del modo de captura cuando la URL no trae otra. */
export const CAPTURE_DATE = new Date('2026-10-24T00:00:00Z');
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
  return latitudeDeg === null
    ? { kind: 'phase', phaseDeg }
    : { kind: 'phase', phaseDeg, latitudeDeg };
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
    warnings,
  };
}

/** Lo que se guarda en la URL del explorador (PLAN §4.5). `null` quita el parámetro. */
export interface UrlState {
  /** Solo en pausa: durante la reproducción no se escribe la fecha. */
  readonly time: Date | null;
  readonly body: BodyId | null;
  readonly scale: ScaleMode;
}

/** `calidad` siempre sale: si no, la URL pisaría la preferencia guardada al recargar. */
export function viewerQueryParams(state: UrlState): Record<string, string | null> {
  return {
    fecha: state.time ? formatUtcParam(state.time) : null,
    cuerpo: state.body && findBody(state.body) ? state.body : null,
    escala: state.scale === 'illustrative' ? null : SCALE_PARAM[state.scale],
    calidad: null,
  };
}
