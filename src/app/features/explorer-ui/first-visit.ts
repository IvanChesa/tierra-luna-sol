/**
 * Lo que el explorador enseña solo la primera vez (fase 9c, D47): las pistas de uso y el recorrido de
 * la portada. Se recuerda en `localStorage` como una preferencia más (como la calidad y los atajos),
 * siempre con try/catch: sin almacenamiento (modo privado, bloqueado), no se sabe (`null`).
 */
export type FirstVisitKey = 'tls.pistas' | 'tls.recorrido';

/** El almacenamiento del navegador, si se puede usar. */
export function safeStorage(win: Window | null | undefined): Storage | undefined {
  try {
    return win?.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/** ¿Ya se ha visto? `null` si no se puede saber (sin almacenamiento). */
export function hasSeen(storage: Storage | undefined, key: FirstVisitKey): boolean | null {
  try {
    if (!storage) return null;
    return storage.getItem(key) === 'visto';
  } catch {
    return null;
  }
}

export function markSeen(storage: Storage | undefined, key: FirstVisitKey): void {
  try {
    storage?.setItem(key, 'visto');
  } catch {
    // Sin almacenamiento: se olvida al cerrar la página.
  }
}
