import { Component, output } from '@angular/core';
import type { BodyId } from '../../data/body.model';
import { BodyPicker } from '../body-picker/body-picker';
import { Icon } from '../viewer/icon';

/**
 * Panel «Índice» (fase 3c, tarea 4b): el árbol de los 30 cuerpos con sus distancias, la alternativa
 * accesible completa a las fichas. Cerrado al entrar; lo abre el botón «Índice» de la franja de abajo
 * (patrón de divulgación: el botón dice si está abierto). En escritorio flota a la izquierda, encima
 * del botón, y el encuadre se aparta (`--chrome-edge: left`); en móvil es una hoja inferior.
 *
 * El anfitrión es el panel: una región con su título, en el área «index» de la rejilla del layout.
 */
@Component({
  selector: 'tls-index-panel',
  imports: [BodyPicker, Icon],
  host: {
    id: 'explorer-index',
    role: 'region',
    tabindex: '-1',
    'aria-labelledby': 'index-title',
    'data-chrome': '',
  },
  template: `
    <header class="head">
      <h2 id="index-title" class="title">Índice</h2>
      <button
        type="button"
        class="close"
        aria-label="Cerrar el índice"
        title="Cerrar el índice (Esc)"
        (click)="closed.emit()"
      >
        <tls-icon name="close" />
      </button>
    </header>
    <tls-body-picker class="tree" (chosen)="chosen.emit($event)" />
  `,
  styles: `
    :host {
      --chrome-edge: left;
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      grid-area: index;
      min-height: 0;
      margin: 0 0 var(--space-2) var(--space-4);
      background: var(--color-surface);
      border: var(--border-width) solid var(--color-line);
      border-radius: var(--radius-md);
      box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
      transition:
        opacity var(--duration-base) var(--ease-standard),
        translate var(--duration-base) var(--ease-standard);
    }

    @starting-style {
      :host {
        opacity: 0;
        translate: 0 0.75rem;
      }
    }

    :host([hidden]) {
      display: none;
    }

    /* El foco llega al panel si no hay fila a la que llevarlo: el anillo, por dentro. */
    :host(:focus-visible) {
      outline-offset: calc(-1 * var(--focus-ring-width));
    }

    .head {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-2) var(--space-1) var(--space-4);
    }

    .title {
      margin: 0;
      font-size: var(--text-lg);
    }

    .close {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      background: transparent;
      color: var(--color-text-muted);
      border: var(--border-width) solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
    }

    .close:hover {
      border-color: var(--color-control);
      color: var(--color-text);
    }

    .tree {
      flex: 1;
    }

    @media (pointer: coarse) {
      .close {
        width: var(--tap-target);
        height: var(--tap-target);
      }
    }

    /* Móvil: una hoja inferior sobre el lienzo y la franja de abajo (como la ficha). */
    @media (max-width: 63.99rem) {
      :host {
        --chrome-edge: bottom;
        z-index: 3;
        grid-area: view / 1 / -1 / -1;
        align-self: end;
        max-height: 80%;
        margin: 0;
        border: 0;
        border-top: var(--border-width) solid var(--color-control);
        border-radius: var(--radius-md) var(--radius-md) 0 0;
        box-shadow: 0 -12px 32px rgb(0 0 0 / 0.4);
      }

      @starting-style {
        :host {
          translate: 0 2rem;
        }
      }
    }
  `,
})
export class IndexPanel {
  /** El botón de cerrar del panel. */
  readonly closed = output<void>();
  /** Se ha elegido un cuerpo en el árbol. */
  readonly chosen = output<BodyId>();
}
