import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MOON_TOUR, MOON_VIEWS, MoonStop } from '../../data/tours';
import { moonPhase } from '../../ephemeris/ephemeris';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';

/** Segundos que se queda cada parada del recorrido. */
export const MOON_TOUR_STEP_MS = 12_000;

/** Lo que se ve: una de las vistas o una parada del recorrido. */
interface Shown {
  readonly kind: 'view' | 'stop';
  readonly index: number;
}

/**
 * Panel de la vista Luna (fase 6).
 * - La fase de la Luna en la fecha que se ve, con la misma función que la ficha (`moonPhase`).
 * - «Vistas»: la cara visible, la cara oculta, el polo sur y la luz rasante (`data/tours.ts`). Cada
 *   una pausa, lleva la fecha a la luz con la que se ve (`ExplorerSession.showMoonStop`), mueve la
 *   cámara y anuncia su subtítulo, que se queda escrito.
 * - «Recorrido»: cinco lugares con nombre. «Recorrer la Luna» los pasa solo cada 12 s y se para al
 *   final, con el mismo botón o al abrir el índice (que tapa el panel); «Parada siguiente» salta a la
 *   siguiente. Con movimiento reducido va paso a paso: el botón («Seguir el recorrido») muestra la
 *   parada siguiente y no avanza solo (PLAN, fase 6). En la última parada, el botón dice «Volver a
 *   empezar», que es lo que hace. En los extremos, «Parada anterior» y «Parada siguiente» no están
 *   disponibles (`aria-disabled`, sin perder el foco).
 */
@Component({
  selector: 'tls-moon-panel',
  imports: [Icon],
  template: `
    <section class="moon" aria-labelledby="moon-views-title">
      <div class="moon__row">
        <h2 id="moon-views-title" class="moon__title">Vistas</h2>
        <p class="moon__phase">{{ phaseText() }}</p>
      </div>
      <div class="moon__views" role="group" aria-labelledby="moon-views-title">
        @for (view of views; track view.id; let i = $index) {
          <button
            type="button"
            class="control moon__view"
            [attr.aria-pressed]="isShown('view', i)"
            (click)="chooseView(i)"
          >
            {{ view.title }}
          </button>
        }
      </div>
      @if (viewCaption(); as text) {
        <p class="moon__caption">{{ text }}</p>
      }
    </section>

    <section class="moon" aria-labelledby="moon-tour-title">
      <h2 id="moon-tour-title" class="moon__title">Recorrido</h2>
      <div class="moon__player">
        <button
          type="button"
          class="control control--icon"
          aria-label="Parada anterior"
          [attr.aria-disabled]="atFirst() || null"
          (click)="step(-1)"
        >
          <tls-icon class="moon__back" name="chevron" />
        </button>
        <button type="button" class="control moon__tour" (click)="toggleTour()">
          <tls-icon [name]="touring() ? 'pause' : 'play'" />
          {{ tourLabel() }}
        </button>
        <button
          type="button"
          class="control control--icon"
          aria-label="Parada siguiente"
          [attr.aria-disabled]="atLast() || null"
          (click)="step(1)"
        >
          <tls-icon name="chevron" />
        </button>
      </div>
      @if (stop(); as current) {
        <p class="moon__caption">
          <strong>{{ current.position }} de {{ stops.length }} · {{ current.stop.title }}.</strong>
          {{ current.stop.text }}
        </p>
      }
      @if (stepByStep) {
        <p class="moon__hint">Con movimiento reducido, el recorrido va paso a paso.</p>
      }
    </section>
  `,
  styleUrl: './moon-panel.css',
})
export class MoonPanel {
  private readonly sim = inject(SimulationStore);
  private readonly session = inject(ExplorerSession);
  private readonly explorer = inject(ExplorerStore);

  readonly views = MOON_VIEWS;
  readonly stops = MOON_TOUR;
  /** Con movimiento reducido, el recorrido no avanza solo. */
  readonly stepByStep = this.session.reducedMotion;
  readonly shown = signal<Shown | null>(null);
  readonly touring = signal(false);

  /** «Gibosa creciente · 87 % iluminada». */
  readonly phaseText = computed(() => {
    const phase = moonPhase(this.sim.time());
    return `${phase.name} · ${Math.round(phase.illuminatedFraction * 100)} % iluminada`;
  });
  readonly viewCaption = computed(() => {
    const shown = this.shown();
    return shown?.kind === 'view' ? (this.views[shown.index]?.text ?? null) : null;
  });
  /** La parada que se ve, con su número (de 1 a 5), o `null`. */
  readonly stop = computed(() => {
    const shown = this.shown();
    const stop = shown?.kind === 'stop' ? this.stops[shown.index] : undefined;
    return shown && stop ? { stop, position: shown.index + 1 } : null;
  });
  readonly atFirst = computed(() => this.stopIndex() === 0);
  readonly atLast = computed(() => this.stopIndex() === this.stops.length - 1);
  /**
   * El botón grande, con un nombre distinto del chevrón «Parada siguiente» (revisión de la fase 6): en
   * la última parada vuelve a la primera, y paso a paso sigue con la siguiente.
   */
  readonly tourLabel = computed(() => {
    if (this.touring()) return 'Pausar el recorrido';
    const index = this.stopIndex();
    if (index === this.stops.length - 1) return 'Volver a empezar';
    return this.stepByStep && index !== null ? 'Seguir el recorrido' : 'Recorrer la Luna';
  });

  private readonly stopIndex = computed(() => {
    const shown = this.shown();
    return shown?.kind === 'stop' ? shown.index : null;
  });
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTour());
  }

  isShown(kind: Shown['kind'], index: number): boolean {
    const shown = this.shown();
    return shown?.kind === kind && shown.index === index;
  }

  /** Una vista elegida a mano: para el recorrido. */
  chooseView(index: number): void {
    this.stopTour();
    this.show({ kind: 'view', index });
  }

  /** La parada anterior o la siguiente (sin dar la vuelta; en los extremos, nada): para el recorrido. */
  step(delta: -1 | 1): void {
    if ((delta < 0 && this.atFirst()) || (delta > 0 && this.atLast())) return;
    this.stopTour();
    const current = this.stopIndex();
    const index = current === null ? (delta > 0 ? 0 : this.stops.length - 1) : current + delta;
    this.show({ kind: 'stop', index: Math.min(Math.max(index, 0), this.stops.length - 1) });
  }

  toggleTour(): void {
    if (this.touring()) {
      this.stopTour();
      return;
    }
    const current = this.stopIndex();
    const next = current === null || current === this.stops.length - 1 ? 0 : current + 1;
    this.show({ kind: 'stop', index: next });
    // Paso a paso: cada pulsación, la parada siguiente; sin temporizador.
    if (this.stepByStep) return;
    this.touring.set(true);
    this.schedule();
  }

  private show(shown: Shown): void {
    const stop: MoonStop | undefined = (shown.kind === 'view' ? this.views : this.stops)[
      shown.index
    ];
    if (!stop) return;
    this.shown.set(shown);
    this.session.showMoonStop(stop);
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      const index = (this.stopIndex() ?? -1) + 1;
      // Con el índice abierto, el panel no se ve: el recorrido se para en vez de mover la cámara y
      // anunciar paradas sin un botón de pausa a mano.
      if (index >= this.stops.length || this.explorer.indexOpen()) {
        this.stopTour();
        return;
      }
      this.show({ kind: 'stop', index });
      this.schedule();
    }, MOON_TOUR_STEP_MS);
  }

  private stopTour(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.touring.set(false);
  }
}
