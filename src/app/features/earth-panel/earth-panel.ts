import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { GUIDED_VIEWS } from '../../data/tours';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';

/** Minutos del día (hora local) de una fecha. */
export const minutesOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

/**
 * La misma fecha (local) a otra hora del día: `minutes` desde la medianoche local. Con los cambios de
 * hora, `setHours` resuelve como el navegador las horas que no existen o se repiten.
 */
export function atMinuteOfDay(date: Date, minutes: number): Date {
  const result = new Date(date.getTime());
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

/** «14:05». */
export const clockText = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Segundos que se queda cada vista al recorrerlas. */
export const TOUR_STEP_MS = 9000;

/**
 * Panel de la vista Tierra (fase 5).
 * - «Vistas guiadas»: la Tierra completa, el Pacífico, el Himalaya, las luces de la noche y España
 *   (`data/tours.ts`). Cada una pausa, pone la hora del día a la que se ve, lleva la cámara y anuncia
 *   su subtítulo (`ExplorerSession.showGuidedView`); el subtítulo se queda escrito en el panel.
 *   «Recorrer las vistas» las pasa solo cada 9 s y se para al final o con el mismo botón.
 * - «Luz del Sol»: un deslizador de la hora del día que cambia la hora sin cambiar la fecha (en la
 *   hora local, como la barra de tiempo). Con el teclado, el del propio control (flechas: 5 minutos).
 */
@Component({
  selector: 'tls-earth-panel',
  imports: [Icon],
  template: `
    <section class="earth" aria-labelledby="earth-tours-title">
      <h2 id="earth-tours-title" class="earth__title">Vistas guiadas</h2>
      <div class="earth__views" role="group" aria-labelledby="earth-tours-title">
        @for (view of views; track view.id; let i = $index) {
          <button
            type="button"
            class="control earth__view"
            [attr.aria-pressed]="current() === i"
            (click)="choose(i)"
          >
            {{ view.title }}
          </button>
        }
      </div>
      <div class="earth__player">
        <button
          type="button"
          class="control control--icon"
          aria-label="Vista anterior"
          (click)="step(-1)"
        >
          <tls-icon class="earth__back" name="chevron" />
        </button>
        <button
          type="button"
          class="control earth__tour"
          [attr.aria-pressed]="touring()"
          (click)="toggleTour()"
        >
          <tls-icon [name]="touring() ? 'pause' : 'play'" />
          {{ touring() ? 'Pausar el recorrido' : 'Recorrer las vistas' }}
        </button>
        <button
          type="button"
          class="control control--icon"
          aria-label="Vista siguiente"
          (click)="step(1)"
        >
          <tls-icon name="chevron" />
        </button>
      </div>
      @if (caption(); as text) {
        <p class="earth__caption">{{ text }}</p>
      }
    </section>

    <section class="earth" aria-labelledby="earth-sun-title">
      <h2 id="earth-sun-title" class="earth__title">Luz del Sol</h2>
      <div class="earth__row">
        <label class="earth__label" for="earth-sun-hour">Hora del día</label>
        <output class="earth__clock" for="earth-sun-hour">{{ clock() }}</output>
      </div>
      <input
        id="earth-sun-hour"
        class="earth__slider"
        type="range"
        min="0"
        max="1435"
        step="5"
        [value]="minutes()"
        [attr.aria-valuetext]="valueText()"
        (input)="setHour($event)"
      />
      <p class="earth__hint">Hora local, sin cambiar la fecha</p>
    </section>
  `,
  styleUrl: './earth-panel.css',
})
export class EarthPanel {
  private readonly sim = inject(SimulationStore);
  private readonly session = inject(ExplorerSession);

  readonly views = GUIDED_VIEWS;
  /** La vista guiada elegida (índice), o `null` antes de elegir ninguna. */
  readonly current = signal<number | null>(null);
  readonly touring = signal(false);
  readonly caption = computed(() => {
    const index = this.current();
    return index === null ? null : (this.views[index]?.text ?? null);
  });

  /** La hora del día, redondeada a los 5 minutos del control. */
  readonly minutes = computed(() => (Math.round(minutesOfDay(this.sim.time()) / 5) * 5) % 1440);
  readonly clock = computed(() => clockText(minutesOfDay(this.sim.time())));
  readonly valueText = computed(() => `${this.clock()}, hora local`);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTour());
  }

  /** Una vista elegida a mano: para el recorrido. */
  choose(index: number): void {
    this.stopTour();
    this.show(index);
  }

  /** La anterior o la siguiente (sin dar la vuelta): para el recorrido. */
  step(delta: -1 | 1): void {
    this.stopTour();
    const index = Math.min(
      Math.max((this.current() ?? (delta > 0 ? -1 : 1)) + delta, 0),
      this.views.length - 1,
    );
    this.show(index);
  }

  toggleTour(): void {
    if (this.touring()) {
      this.stopTour();
      return;
    }
    this.touring.set(true);
    const start = this.current();
    this.show(start === null || start === this.views.length - 1 ? 0 : start + 1);
    this.schedule();
  }

  setHour(event: Event): void {
    const minutes = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(minutes)) return;
    this.sim.setTime(atMinuteOfDay(this.sim.time(), minutes));
  }

  private show(index: number): void {
    const view = this.views[index];
    if (!view) return;
    this.current.set(index);
    this.session.showGuidedView(view);
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      const index = (this.current() ?? -1) + 1;
      if (index >= this.views.length) {
        this.stopTour();
        return;
      }
      this.show(index);
      this.schedule();
    }, TOUR_STEP_MS);
  }

  private stopTour(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.touring.set(false);
  }
}
