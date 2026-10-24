/**
 * Parámetros de la URL del explorador (PLAN §2). En la fase 2 solo los que necesitan el modo de
 * captura y las pruebas; la fase 3 los completa (validación con aviso, sincronización de la URL).
 * Un parámetro no válido se ignora: nunca rompe el visor.
 *
 * - `captura=1`: modo de captura determinista (fecha fija, calidad alta, sin animaciones).
 * - `fecha=2030-01-01T00:00Z`: instante UTC (1900–2100).
 * - `cuerpo=titan`: cuerpo enfocado al empezar.
 * - `escala=real|ilustrativa`.
 * - `calidad=alta|media|baja|auto`.
 * - Solo en captura: `profundidad=logaritmica|invertida|estandar` (prueba de D13) y `detras=neptuno`
 *   (encuadre con ese cuerpo detrás del enfocado).
 */
import { isBodyId } from '../../data/body-index';
import type { BodyId, DepthMode, QualitySetting, ScaleMode } from '../../scene';

/** Fecha fija del modo de captura cuando la URL no trae otra. */
export const CAPTURE_DATE = new Date('2026-10-24T00:00:00Z');
const MIN_MS = Date.UTC(1900, 0, 1);
const MAX_MS = Date.UTC(2100, 11, 31, 23, 59, 59);

export interface ViewerParams {
  readonly capture: boolean;
  readonly time: Date | null;
  readonly body: BodyId | null;
  readonly scale: ScaleMode | null;
  readonly quality: QualitySetting | null;
  readonly depth: DepthMode | null;
  readonly background: BodyId | null;
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

const bodyOrNull = (value: string | null): BodyId | null =>
  value !== null && isBodyId(value) ? value : null;

export function parseViewerParams(search: string): ViewerParams {
  const params = new URLSearchParams(search);
  const capture = params.get('captura') === '1';
  return {
    capture,
    time: parseUtcDate(params.get('fecha')),
    body: bodyOrNull(params.get('cuerpo')),
    scale: SCALE[params.get('escala') ?? ''] ?? null,
    quality: QUALITY[params.get('calidad') ?? ''] ?? null,
    depth: capture ? (DEPTH[params.get('profundidad') ?? ''] ?? null) : null,
    background: capture ? bodyOrNull(params.get('detras')) : null,
  };
}
