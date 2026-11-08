import { Service, Signal, computed, signal } from '@angular/core';
import type { BodyId } from '../data/body.model';

/** Lo que dice el título de la vista del sistema solar del cuerpo elegido. */
export interface FocusTitle {
  readonly id: BodyId;
  /** «Saturno». */
  readonly name: string;
  /** «Planeta», «Luna de Saturno». */
  readonly kind: string;
}

/** Lo que dice la franja de arriba del cielo en el móvil (decisión de Iván del 08-11): su lugar. */
export interface SkyTitle {
  /** «Montsec (Lleida)». */
  readonly place: string;
}

/**
 * El cuerpo elegido en la vista del sistema solar, para el título de la portada (fase 9c, decisión 2
 * de Iván: «el título sigue al cuerpo elegido», con «‹ Sistema solar» para volver). La interfaz
 * diferida del explorador (`ExplorerUi`, que tiene los stores) conecta su señal y la página de la
 * portada, que se prerenderiza con el título del sistema solar, la lee: sin cuerpo, el de siempre.
 *
 * Vive en la raíz y en `core/`, sin dependencias: lo importan las dos partes diferidas y la cabecera
 * del sitio (`app.ts`, la franja del cuerpo elegido en el móvil: decisión de Iván del 08-11). En el
 * bundle inicial pesa poco y no arrastra nada del visor.
 */
@Service()
export class ExplorerFocus {
  private readonly source = signal<Signal<FocusTitle | null> | null>(null);
  /** El cuerpo del título, o `null` (la vista general o sin explorador). */
  readonly body = computed(() => this.source()?.() ?? null);
  private backHandler: (() => void) | null = null;
  private readonly skySource = signal<Signal<SkyTitle | null> | null>(null);
  /** En la vista del cielo, su lugar (la franja de arriba del móvil); fuera de ella, `null`. */
  readonly sky = computed(() => this.skySource()?.() ?? null);
  private readonly sheetSource = signal<Signal<boolean> | null>(null);
  /** La ficha del cuerpo, abierta: el `aria-expanded` de «ⓘ», en la franja de arriba del móvil. */
  readonly sheetOpen = computed(() => this.sheetSource()?.() ?? false);
  private sheetHandler: (() => void) | null = null;

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

  /**
   * La ficha del cuerpo elegido, que en el móvil se abre desde la franja de arriba («ⓘ»; decisión de
   * Iván del 08-11): la interfaz del explorador conecta si está abierta y lo que hace el botón.
   */
  connectSheet(open: Signal<boolean> | null, toggle: (() => void) | null): void {
    this.sheetSource.set(open);
    this.sheetHandler = toggle;
  }

  /** La interfaz del explorador conecta el lugar del cielo (y `null` al destruirse). */
  connectSky(source: Signal<SkyTitle | null> | null): void {
    this.skySource.set(source);
  }

  /** «ⓘ»: abre o cierra la ficha del cuerpo elegido. */
  toggleSheet(): void {
    this.sheetHandler?.();
  }
}
