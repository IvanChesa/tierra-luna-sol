/**
 * Preferencia de los atajos de una sola tecla, recordada en `localStorage` como la de la calidad.
 * WCAG 2.1.4 (A) pide que se puedan desactivar: con ellos activos, un programa de control por voz
 * que «teclea» palabras dispararía órdenes sin querer. Siempre con try/catch (modo privado,
 * almacenamiento bloqueado).
 */
const KEY = 'tls.atajos';

export function readSingleKeyShortcuts(storage: Storage | undefined): boolean {
  try {
    return storage?.getItem(KEY) !== 'no';
  } catch {
    return true;
  }
}

export function writeSingleKeyShortcuts(storage: Storage | undefined, enabled: boolean): void {
  try {
    if (enabled) storage?.removeItem(KEY);
    else storage?.setItem(KEY, 'no');
  } catch {
    // Sin almacenamiento: la preferencia dura lo que dure la página.
  }
}
