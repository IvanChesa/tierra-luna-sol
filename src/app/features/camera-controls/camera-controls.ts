import { Component, inject } from '@angular/core';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';

/** Cuánto acerca o aleja cada pulsación (botones y teclas `+`/`−`). */
export const ZOOM_STEP = 1.4;

/**
 * Controles de cámara (PLAN 3.c.6; fase 9c, D47): acercar y alejar, la alternativa de un solo puntero
 * a la rueda y al pellizco (WCAG 2.5.1), cada una con su atajo. En escritorio, en una esquina de la
 * parte visible del lienzo y sin marco hasta pasar el ratón o llegar con el foco; en el móvil y la
 * tableta no ocupan el 3D: están en «Controles», con la vista general y la vista limpia.
 */
@Component({
  selector: 'tls-camera-controls',
  imports: [Icon],
  template: `
    <div class="camera" role="group" aria-label="Cámara">
      <button type="button" class="camera__button" title="Acercar (+)" (click)="zoom(1 / step)">
        <tls-icon name="plus" />
        <span class="visually-hidden">Acercar</span>
      </button>
      <button type="button" class="camera__button" title="Alejar (−)" (click)="zoom(step)">
        <tls-icon name="minus" />
        <span class="visually-hidden">Alejar</span>
      </button>
    </div>
  `,
  styles: `
    .camera {
      display: grid;
      gap: var(--space-1);
    }

    /*
     * Sin marco: el icono, en el color del texto sobre un círculo del fondo casi transparente, que se
     * lee sobre las estrellas (más de 3:1 sobre cualquier fondo oscuro); el marco y la superficie, al
     * pasar el ratón o con el foco.
     */
    .camera__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      background: color-mix(in srgb, var(--color-bg) 55%, transparent);
      color: var(--color-text);
      border: var(--border-width) solid transparent;
      border-radius: 50%;
      cursor: pointer;
      transition:
        background var(--duration-fast) var(--ease-standard),
        border-color var(--duration-fast) var(--ease-standard);
    }

    .camera__button:hover,
    .camera__button:focus-visible {
      background: var(--color-surface);
      border-color: var(--color-control);
    }
  `,
})
export class CameraControls {
  protected readonly session = inject(ExplorerSession);
  protected readonly step = ZOOM_STEP;

  protected zoom(factor: number): void {
    this.session.zoom(factor);
  }
}
