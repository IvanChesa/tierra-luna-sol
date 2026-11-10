import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MOON_TOUR, MOON_VIEWS, MoonStop } from '../../data/tours';
import { lunarEclipsePhase } from '../../ephemeris/eclipse';
import { moonPhase } from '../../ephemeris/ephemeris';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';
import { RevealFocus } from '../viewer/reveal-focus';

/** Por debajo de esta fracción iluminada, la Luna está «casi nueva» (la nota del panel). */
export const NEARLY_NEW = 0.05;

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
  imports: [Icon, RevealFocus],
  host: { '[class.is-more]': 'more()' },
  template: `
    <section class="moon" aria-labelledby="moon-views-title">
      <div class="moon__row">
        <h2 id="moon-views-title" class="moon__title">Vistas</h2>
        <p class="moon__phase">{{ phaseText() }}</p>
      </div>
      <div class="moon__strip">
        <div
          class="moon__views scroll-hint"
          tlsRevealFocus
          role="group"
          aria-labelledby="moon-views-title"
        >
          @for (view of views; track view.id; let i = $index) {
            <!-- Su texto, también antes de elegirla («Luz rasante»: crítica de la 9c). -->
            <button
              type="button"
              class="control moon__view"
              [attr.aria-pressed]="isShown('view', i)"
              [title]="view.text"
              (click)="chooseView(i)"
            >
              {{ view.title }}
            </button>
          }
        </div>
        <!-- Solo en el móvil: la fase y el recorrido, plegados para que la Luna se vea (fase 9c). -->
        <button
          type="button"
          class="control moon__toggle"
          aria-label="Más: la fase y el recorrido"
          aria-controls="moon-tour"
          [attr.aria-expanded]="more()"
          (click)="more.set(!more())"
        >
          Más
        </button>
      </div>
      @if (viewCaption(); as text) {
        <p class="moon__caption">{{ text }}</p>
        <!-- Lo que la vista ha hecho con el tiempo, a la vista (crítica de la 9c). -->
        @if (session.moonNotice(); as notice) {
          <p class="moon__notice">{{ notice }}</p>
        }
      }
      <!-- Con la Luna casi nueva, por qué casi no se ve (fase 9c, 9c.7); también con el panel plegado. -->
      @if (nearlyNew()) {
        <p class="moon__new">
          La Luna está casi nueva: la cara que mira a la Tierra apenas recibe luz del Sol. «Cara
          visible» la enseña en luna llena.
        </p>
      }
    </section>

    <section class="moon moon--tour" id="moon-tour" aria-labelledby="moon-tour-title">
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
        @if (session.moonNotice(); as notice) {
          <p class="moon__notice">{{ notice }}</p>
        }
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
  protected readonly session = inject(ExplorerSession);
  private readonly explorer = inject(ExplorerStore);

  readonly views = MOON_VIEWS;
  readonly stops = MOON_TOUR;
  /** Con movimiento reducido, el recorrido no avanza solo. */
  readonly stepByStep = this.session.reducedMotion;
  readonly shown = signal<Shown | null>(null);
  /** En el móvil, la fase, los subtítulos y el recorrido desplegados (en reposo, la fila de las vistas). */
  readonly more = signal(false);
  readonly touring = signal(false);

  /**
   * «Gibosa creciente · 87 % iluminada». En un eclipse de Luna, lo que se ve (crítica de la fase 10: la
   * Luna roja del eclipse total decía «Luna llena · 100 % iluminada»).
   */
  readonly phaseText = computed(() => {
    const time = this.sim.time();
    const phase = moonPhase(time);
    const eclipse = lunarEclipsePhase(time);
    if (eclipse === 'total') return `${phase.name} · eclipse total: en la sombra de la Tierra`;
    if (eclipse === 'partial')
      return `${phase.name} · eclipse parcial: entra en la sombra de la Tierra`;
    if (eclipse === 'penumbral') return `${phase.name} · eclipse penumbral: apenas se oscurece`;
    // Con el espacio duro antes del % (ESTILO §3), como en el cielo y en «Hoy».
    return `${phase.name} · ${Math.round(phase.illuminatedFraction * 100)}\u00a0% iluminada`;
  });
  /** Menos del 5 % iluminada: la cara visible, casi a oscuras (con la fase que ya se calcula). */
  readonly nearlyNew = computed(() => moonPhase(this.sim.time()).illuminatedFraction < NEARLY_NEW);
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
