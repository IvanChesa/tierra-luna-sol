import { Service } from '@angular/core';

/** El tiempo del explorador al salir de él: la fecha, si se reproducía y si iba hacia atrás. */
export interface ExplorerMoment {
  readonly timeMs: number;
  readonly playing: boolean;
  readonly reverse: boolean;
}

/**
 * Lo que deja el explorador al salir de él (a una ficha, con «Ficha completa», o a cualquier página
 * de lectura), para volver donde estaba: al volver de la ficha, la fecha ya no vuelve a hoy (crítica de
 * la fase 9c; revisión del bloque S, decisión 6). El explorador (su store y su sesión) vive lo que vive
 * su interfaz diferida y empieza otra vez desde la URL; esto vive en la raíz, sin dependencias, y solo
 * lo usa la sesión del explorador (no entra en el bundle inicial). Una URL con su fecha manda sobre lo
 * guardado (un enlace compartido dice su instante).
 */
@Service()
export class ExplorerMemory {
  private moment: ExplorerMoment | null = null;

  /** Lo guarda la sesión del explorador al destruirse. */
  save(moment: ExplorerMoment): void {
    this.moment = moment;
  }

  /** Lo recupera la sesión al empezar, una sola vez (lo guardado se borra). */
  take(): ExplorerMoment | null {
    const moment = this.moment;
    this.moment = null;
    return moment;
  }
}
