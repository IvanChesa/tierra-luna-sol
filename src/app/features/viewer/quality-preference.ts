/**
 * Preferencia de calidad del usuario, recordada en `localStorage` (D22). Es la única preferencia que
 * se guarda en la fase 2; siempre con try/catch (modo privado, almacenamiento bloqueado).
 */
import type { QualitySetting } from '../../scene';

const KEY = 'tls.calidad';
const VALID: readonly QualitySetting[] = ['auto', 'high', 'medium', 'low'];

export function readQualityPreference(storage: Storage | undefined): QualitySetting {
  try {
    const value = storage?.getItem(KEY);
    return VALID.find((v) => v === value) ?? 'auto';
  } catch {
    return 'auto';
  }
}

export function writeQualityPreference(storage: Storage | undefined, value: QualitySetting): void {
  try {
    if (value === 'auto') storage?.removeItem(KEY);
    else storage?.setItem(KEY, value);
  } catch {
    // Sin almacenamiento: la preferencia dura lo que dure la página.
  }
}
