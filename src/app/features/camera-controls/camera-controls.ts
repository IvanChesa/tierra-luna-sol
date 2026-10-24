import { Component, inject } from '@angular/core';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';

/** Cuánto acerca o aleja cada pulsación (botones y teclas `+`/`−`). */
export const ZOOM_STEP = 1.4;

/**
 * Controles de cámara (PLAN 3.c.6): acercar, alejar, la vista general y la vista limpia. El mismo
 * trabajo que los gestos sobre el lienzo, con botones y con el teclado (cada uno con su atajo).
 */
@Component({
  selector: 'tls-camera-controls',
  imports: [Icon],
  template: `
    <div class="camera" role="group" aria-label="Cámara">
      <button
        type="button"
        class="control control--icon"
        title="Acercar (+)"
        (click)="zoom(1 / step)"
      >
        <tls-icon name="plus" />
        <span class="visually-hidden">Acercar</span>
      </button>
      <button type="button" class="control control--icon" title="Alejar (−)" (click)="zoom(step)">
        <tls-icon name="minus" />
        <span class="visually-hidden">Alejar</span>
      </button>
      <button
        type="button"
        class="control control--icon"
        title="Vista general (G)"
        (click)="session.overview()"
      >
        <tls-icon name="overview" />
        <span class="visually-hidden">Vista general</span>
      </button>
      <button
        type="button"
        class="control control--icon"
        title="Vista limpia: ocultar la interfaz (V)"
        (click)="session.setCleanView(true)"
      >
        <tls-icon name="clean" />
        <span class="visually-hidden">Vista limpia</span>
      </button>
    </div>
  `,
  styles: `
    .camera {
      display: grid;
      gap: var(--space-1);
    }

    .control {
      background: var(--color-surface);
    }

    /* Móvil: en dos columnas, para que quepa en un lienzo bajo. */
    @media (max-width: 63.99rem) {
      .camera {
        grid-template-columns: repeat(2, auto);
      }
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
