import { Service, signal } from '@angular/core';
import type { BodyId } from '../../data/body.model';

/** Lo que dice el título de la vista del sistema solar del cuerpo elegido. */
export interface FocusTitle {
  readonly id: BodyId;
  /** «Saturno». */
  readonly name: string;
  /** «Planeta», «Luna de Saturno». */
  readonly kind: string;
}

/**
 * El cuerpo elegido en la vista del sistema solar, para el título de la portada (fase 9c, decisión 2
 * de Iván: «el título sigue al cuerpo elegido», con «‹ Sistema solar» para volver). Lo escribe la
 * interfaz diferida del explorador (`ExplorerUi`, que tiene los stores) y lo lee la página de la
 * portada, que se prerenderiza con el título del sistema solar: sin cuerpo, el de siempre.
 *
 * Vive en la raíz, sin dependencias: lo importan solo las dos partes diferidas, nunca el bundle inicial.
 */
@Service()
export class ExplorerFocus {
  /** El cuerpo del título, o `null` (la vista general). */
  readonly body = signal<FocusTitle | null>(null);
  private backHandler: (() => void) | null = null;

  /** Lo que hace «‹ Sistema solar» (la vista general); lo pone la interfaz del explorador. */
  setBackHandler(handler: (() => void) | null): void {
    this.backHandler = handler;
  }

  /** «‹ Sistema solar»: vuelve a la vista general. */
  back(): void {
    this.backHandler?.();
  }
}
