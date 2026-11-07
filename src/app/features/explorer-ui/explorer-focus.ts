import { Service, Signal, computed, signal } from '@angular/core';
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
 * de Iván: «el título sigue al cuerpo elegido», con «‹ Sistema solar» para volver). La interfaz
 * diferida del explorador (`ExplorerUi`, que tiene los stores) conecta su señal y la página de la
 * portada, que se prerenderiza con el título del sistema solar, la lee: sin cuerpo, el de siempre.
 *
 * Vive en la raíz, sin dependencias: lo importan solo las dos partes diferidas, nunca el bundle inicial.
 */
@Service()
export class ExplorerFocus {
  private readonly source = signal<Signal<FocusTitle | null> | null>(null);
  /** El cuerpo del título, o `null` (la vista general o sin explorador). */
  readonly body = computed(() => this.source()?.() ?? null);
  private backHandler: (() => void) | null = null;

  /** La interfaz del explorador conecta el cuerpo de su vista (y `null` al destruirse). */
  connect(source: Signal<FocusTitle | null> | null): void {
    this.source.set(source);
  }

  /** Lo que hace «‹ Sistema solar» (la vista general); lo pone la interfaz del explorador. */
  setBackHandler(handler: (() => void) | null): void {
    this.backHandler = handler;
  }

  /** «‹ Sistema solar»: vuelve a la vista general. */
  back(): void {
    this.backHandler?.();
  }
}
