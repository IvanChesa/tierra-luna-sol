/**
 * Constantes sin dependencias: se pueden importar (por ejemplo, desde una ficha, desde los stores o
 * desde `scale.ts`) sin arrastrar astronomy-engine.
 */

/** Unidad astronómica en km, valor exacto por definición (IAU 2012, resolución B2). */
export const KM_PER_AU = 149_597_870.7;
export const KM_PER_AU_SOURCE = 'https://www.iau.org/static/resolutions/IAU2012_English.pdf';

/**
 * Rango de fechas del explorador (PLAN §0.2: «cualquier fecha, 1900–2100»), en UTC. `time.ts` los
 * reexporta; están aquí para que la interfaz los use sin cargar astronomy-engine.
 */
export const MIN_DATE = new Date(Date.UTC(1900, 0, 1, 0, 0, 0));
export const MAX_DATE = new Date(Date.UTC(2100, 11, 31, 23, 59, 59));
