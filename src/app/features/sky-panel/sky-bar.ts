import { Component, input, model } from '@angular/core';
import { Icon } from '../viewer/icon';

/**
 * La barra del cielo en el móvil y la tableta (decisión de Iván del 08-11: el cielo, «muy invasor»). En
 * reposo, solo ella, en la fila de la barra de tiempo y en lugar de la fecha: el lugar, la hora y lo que
 * hay sobre el horizonte. Es un botón con `aria-expanded` que abre el panel entero (el lugar, «Usar mi
 * ubicación», la hora, «Esta noche» y las constelaciones). En escritorio no se ve: el panel, siempre.
 */
@Component({
  selector: 'tls-sky-bar',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="bar"
      aria-controls="sky-now sky-tonight"
      [attr.aria-expanded]="open()"
      (click)="open.set(!open())"
    >
      <span class="bar__place">{{ place() }} · {{ clock() }}</span>
      <tls-icon class="bar__chevron" name="chevron" />
      <span class="bar__summary">{{ summary() }}</span>
    </button>
  `,
  styleUrl: './sky-bar.css',
})
export class SkyBar {
  /** «Montsec (Lleida)». */
  readonly place = input.required<string>();
  /** La hora del lugar: «19:04». */
  readonly clock = input.required<string>();
  /** Lo que hay sobre el horizonte: «Ahora: Urano, 66° SE · Saturno, 38° SO · y 2 más». */
  readonly summary = input.required<string>();
  /** El panel, abierto. */
  readonly open = model(false);
}
