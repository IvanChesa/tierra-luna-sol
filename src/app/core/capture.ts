/**
 * El modo de captura (`?captura=1`, PLAN §2): fecha, cámara y estado deterministas para las capturas y
 * la regresión visual. Sin dependencias: lo usan el explorador y las fichas (sus datos «de hoy»).
 */

/** Fecha fija del modo de captura cuando la URL no trae otra. */
export const CAPTURE_DATE = new Date('2026-10-24T00:00:00Z');

/** ¿Pide la URL el modo de captura? (`captura=1` en la consulta). */
export const isCaptureQuery = (value: string | null | undefined): boolean => value === '1';
