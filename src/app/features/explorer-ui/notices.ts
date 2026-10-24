import { Component, computed, inject } from '@angular/core';
import { SimulationStore } from '../../state/simulation.store';
import { Icon } from '../viewer/icon';
import { ExplorerSession } from './explorer-session';

/**
 * Avisos discretos del explorador: los parámetros de la URL que se han ignorado (PLAN 3.d.9) y la
 * llegada a 1900 o a 2100 (3.b.4). Se pueden cerrar y no tapan el lienzo más de lo necesario.
 */
@Component({
  selector: 'tls-notices',
  imports: [Icon],
  template: `
    <div class="notices" role="status">
      @for (warning of session.warnings(); track warning; let i = $index) {
        <p class="notice">
          <span>{{ warning }}</span>
          <button
            type="button"
            class="notice__close"
            title="Cerrar el aviso"
            (click)="session.dismissWarning(i)"
          >
            <tls-icon name="close" />
            <span class="visually-hidden">Cerrar el aviso</span>
          </button>
        </p>
      }
      @if (limitText(); as text) {
        <p class="notice">
          <span>{{ text }}</span>
          <button
            type="button"
            class="notice__close"
            title="Cerrar el aviso"
            (click)="sim.dismissLimit()"
          >
            <tls-icon name="close" />
            <span class="visually-hidden">Cerrar el aviso</span>
          </button>
        </p>
      }
    </div>
  `,
  styles: `
    .notices {
      display: grid;
      gap: var(--space-2);
      justify-items: center;
    }

    .notice {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      max-width: 36rem;
      margin: 0;
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      background: var(--color-surface-raised);
      border: var(--border-width) solid var(--color-control);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
    }

    .notice__close {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      background: transparent;
      color: var(--color-text-muted);
      border: 0;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .notice__close:hover {
      color: var(--color-text);
    }
  `,
})
export class Notices {
  protected readonly session = inject(ExplorerSession);
  protected readonly sim = inject(SimulationStore);
  protected readonly limitText = computed(() => {
    const limit = this.sim.limit();
    if (!limit) return null;
    // El intervalo es en UTC: en hora local, el final de 2100 puede caer ya en 2101.
    const edge = limit === 'max' ? 'al final de 2100' : 'al principio de 1900';
    return `La simulación se ha parado ${edge} (UTC): el explorador calcula posiciones entre 1900 y 2100.`;
  });
}
