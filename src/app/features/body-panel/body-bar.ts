import { Component, input, model, output } from '@angular/core';
import { Icon } from '../viewer/icon';

/** Lo que hay que deslizar la barra hacia arriba (px) para abrir la hoja. */
const SWIPE_UP_PX = 40;
/** Y hacia abajo para cerrarla (o, con la hoja cerrada, la ficha). */
const SWIPE_DOWN_PX = 72;

/**
 * La barra fina de la ficha en el móvil y la tableta (decisión de Iván del 08-11: la hoja, al elegir un
 * cuerpo, era «muy invasora»). Al elegir un cuerpo, solo esto encima de la barra de tiempo: el nombre,
 * el tipo y un dato clave, «Ver ficha» y ×. Es un botón con `aria-expanded` que abre y cierra la hoja
 * (la descripción, los datos y «Ficha completa»), también al deslizarla hacia arriba o hacia abajo.
 * En escritorio no se ve: la tarjeta lo enseña todo.
 */
@Component({
  selector: 'tls-body-bar',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="bar__toggle"
      aria-controls="card-body"
      [attr.aria-expanded]="open()"
      (click)="toggle($event)"
      (pointerdown)="press($event)"
      (pointerup)="release($event)"
      (pointercancel)="cancel()"
    >
      <span class="bar__name">{{ name() }}</span>
      <span class="bar__more"
        >{{ open() ? 'Ver menos' : 'Ver ficha' }}<tls-icon class="bar__chevron" name="chevron"
      /></span>
      <span class="bar__meta">{{ meta() }}</span>
    </button>
    <button
      type="button"
      class="bar__close"
      aria-label="Cerrar la ficha"
      title="Cerrar la ficha (Esc)"
      (click)="closed.emit()"
    >
      <tls-icon name="close" />
    </button>
  `,
  styleUrl: './body-bar.css',
})
export class BodyBar {
  /** «Saturno». */
  readonly name = input.required<string>();
  /** El tipo y un dato clave: «Planeta · Radio ecuatorial: 60.268 km». */
  readonly meta = input.required<string>();
  /** La hoja, abierta. */
  readonly open = model(false);
  readonly closed = output<void>();

  /** Dónde empezó el gesto (px), mientras dura. */
  private startY: number | null = null;
  /** Lo último fue deslizar: el clic que el navegador manda al soltar no cuenta. */
  private swiped = false;

  protected toggle(event: MouseEvent): void {
    // El clic de un gesto (`detail` > 0) que ya ha abierto o cerrado; el del teclado (0), siempre.
    if (this.swiped && event.detail > 0) {
      this.swiped = false;
      return;
    }
    this.open.set(!this.open());
  }

  protected press(event: PointerEvent): void {
    this.startY = event.clientY;
    this.swiped = false;
    // Soltar fuera de la barra también cuenta (el gesto la deja atrás).
    (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
  }

  protected release(event: PointerEvent): void {
    if (this.startY === null) return;
    const dy = event.clientY - this.startY;
    this.startY = null;
    if (dy < -SWIPE_UP_PX) {
      this.swiped = true;
      this.open.set(true);
    } else if (dy > SWIPE_DOWN_PX) {
      this.swiped = true;
      if (this.open()) this.open.set(false);
      else this.closed.emit();
    }
  }

  protected cancel(): void {
    this.startY = null;
  }
}
