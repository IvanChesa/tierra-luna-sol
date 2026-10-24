import { Component, computed, inject } from '@angular/core';
import { formatDateTime, utcOffsetLabel } from '../../core/format';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { SimulationStore } from '../../state/simulation.store';
import { Icon } from '../viewer/icon';
import { ExplorerSession } from './explorer-session';

/**
 * Avisos discretos del explorador: los parámetros de la URL que se han ignorado (PLAN 3.d.9), todos
 * en una caja, y la llegada a 1900 o a 2100 (3.b.4). Dicen qué ha pasado, qué ha hecho el explorador
 * y qué puedes hacer (ESTILO §2); se pueden cerrar.
 */
@Component({
  selector: 'tls-notices',
  imports: [Icon],
  template: `
    <div class="notices" role="status">
      @if (session.warnings().length > 0) {
        <div class="notice">
          <ul class="notice__list">
            @for (warning of session.warnings(); track warning) {
              <li>{{ warning }}</li>
            }
          </ul>
          <button
            type="button"
            class="notice__close"
            title="Cerrar el aviso"
            (click)="session.dismissWarnings()"
          >
            <tls-icon name="close" />
            <span class="visually-hidden">Cerrar el aviso</span>
          </button>
        </div>
      }
      @if (limitText(); as text) {
        <div class="notice">
          <p class="notice__text">{{ text }}</p>
          <button
            type="button"
            class="notice__close"
            title="Cerrar el aviso"
            (click)="sim.dismissLimit()"
          >
            <tls-icon name="close" />
            <span class="visually-hidden">Cerrar el aviso</span>
          </button>
        </div>
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
      align-items: flex-start;
      gap: var(--space-2);
      max-width: 36rem;
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      background: var(--color-surface-raised);
      border: var(--border-width) solid var(--color-control);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
    }

    .notice__text,
    .notice__list {
      margin: 0;
      padding: var(--space-1) 0;
    }

    .notice__list {
      display: grid;
      gap: var(--space-2);
      list-style: none;
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

    @media (pointer: coarse) {
      .notice__close {
        width: var(--tap-target);
        height: var(--tap-target);
      }
    }
  `,
})
export class Notices {
  protected readonly session = inject(ExplorerSession);
  protected readonly sim = inject(SimulationStore);
  /**
   * El límite, en UTC (el intervalo del explorador) y en tu hora local, que puede caer en otro día:
   * el final de 2100 es el 1 de enero de 2101 en Madrid.
   */
  protected readonly limitText = computed(() => {
    const limit = this.sim.limit();
    if (!limit) return null;
    const edge = limit === 'max' ? MAX_DATE : MIN_DATE;
    const utc = `${formatDateTime(edge, 'utc', false)} UTC`;
    const local =
      utcOffsetLabel(edge) === 'UTC'
        ? ''
        : ` (${formatDateTime(edge, 'local', false)} en tu hora local)`;
    const next = limit === 'max' ? 'una fecha anterior' : 'una fecha posterior';
    return `La simulación se ha parado en el límite del explorador: ${utc}${local}. Elige ${next} o vuelve a «Ahora».`;
  });
}
