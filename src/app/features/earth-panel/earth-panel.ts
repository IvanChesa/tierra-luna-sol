import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { TimeZoneChoice, utcOffsetLabel } from '../../core/format';
import { GUIDED_VIEWS, localDay, utcDay } from '../../data/tours';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';

/** Minutos del día de una fecha, en la hora local del navegador o en UTC. */
export const minutesOfDay = (date: Date, zone: TimeZoneChoice = 'local'): number =>
  zone === 'utc'
    ? date.getUTCHours() * 60 + date.getUTCMinutes()
    : date.getHours() * 60 + date.getMinutes();

/**
 * La misma fecha (en la hora local o en UTC) a otra hora del día: `minutes` desde su medianoche. Con
 * los cambios de hora, `setHours` resuelve como el navegador las horas que no existen o se repiten.
 */
export function atMinuteOfDay(date: Date, minutes: number, zone: TimeZoneChoice = 'local'): Date {
  const result = new Date(date.getTime());
  if (zone === 'utc') result.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  else result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

/** «14:05». */
export const clockText = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Paso del deslizador de la hora del día (minutos). */
const STEP = 5;
const LAST_MINUTE = 24 * 60 - STEP;

/**
 * Hasta dónde llega el deslizador en el día que se ve: todo el día, salvo en el primero y el último
 * de 1900–2100, que se cortan en sus límites (en Madrid, el 1-1-1900 a las 00:00 UTC aún es el
 * 31-12-1899 a las 23:45, y el 31-12-2100 a las 23:59 UTC ya es el 1-1-2101).
 */
export function sliderRange(date: Date, zone: TimeZoneChoice): { min: number; max: number } {
  const day = zone === 'utc' ? utcDay : localDay;
  // Con los segundos: el 1-1-1900 a las 00:00 UTC son las 23:45:16 en Madrid (hora media local).
  const exact = (limit: Date) =>
    minutesOfDay(limit, zone) +
    (zone === 'utc' ? limit.getUTCSeconds() : limit.getSeconds()) / 60 +
    limit.getMilliseconds() / 60_000;
  const min = day(date) === day(MIN_DATE) ? Math.ceil(exact(MIN_DATE) / STEP) * STEP : 0;
  const max = day(date) === day(MAX_DATE) ? Math.floor(exact(MAX_DATE) / STEP) * STEP : LAST_MINUTE;
  return { min, max: Math.max(min, max) };
}

/** Segundos que se queda cada vista al recorrerlas. */
export const TOUR_STEP_MS = 9000;

/**
 * Panel de la vista Tierra (fase 5).
 * - «Vistas guiadas»: la Tierra completa, el Pacífico, el Himalaya, las luces de la noche y España
 *   (`data/tours.ts`). Cada una pausa, pone la hora del día a la que se ve, lleva la cámara y anuncia
 *   su subtítulo (`ExplorerSession.showGuidedView`); el subtítulo se queda escrito en el panel.
 *   «Recorrer las vistas» las pasa solo cada 9 s y se para al final o con el mismo botón. «Vista
 *   anterior» y «Vista siguiente» no dan la vuelta: en los extremos, no disponibles (`aria-disabled`,
 *   sin perder el foco).
 * - «Luz del Sol»: un deslizador de la hora del día que cambia la hora sin cambiar la fecha, en la
 *   zona de la barra de tiempo (la local o UTC, ESTILO §4). Con el teclado, el del propio control
 *   (flechas: 5 minutos). El reloj escrito no es una región viva: durante la reproducción cambia
 *   varias veces por segundo, y el valor ya lo da el control (`aria-valuetext`).
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
          [attr.aria-disabled]="atFirst() || null"
          (click)="step(-1)"
        >
          <tls-icon class="earth__back" name="chevron" />
        </button>
        <button type="button" class="control earth__tour" (click)="toggleTour()">
          <tls-icon [name]="touring() ? 'pause' : 'play'" />
          {{ touring() ? 'Pausar el recorrido' : 'Recorrer las vistas' }}
        </button>
        <button
          type="button"
          class="control control--icon"
          aria-label="Vista siguiente"
          [attr.aria-disabled]="atLast() || null"
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
        <span class="earth__clock">{{ clock() }}</span>
      </div>
      <input
        id="earth-sun-hour"
        class="earth__slider"
        type="range"
        [min]="range().min"
        [max]="range().max"
        step="5"
        [value]="minutes()"
        [attr.aria-valuetext]="valueText()"
        (input)="setHour($event)"
      />
      <p class="earth__hint">{{ zoneText() }}, sin cambiar la fecha</p>
    </section>
  `,
  styleUrl: './earth-panel.css',
})
export class EarthPanel {
  private readonly sim = inject(SimulationStore);
  private readonly session = inject(ExplorerSession);
  private readonly zone = inject(ExplorerStore).timeZone;

  readonly views = GUIDED_VIEWS;
  /** La vista guiada elegida (índice), o `null` antes de elegir ninguna. */
  readonly current = signal<number | null>(null);
  readonly touring = signal(false);
  readonly caption = computed(() => {
    const index = this.current();
    return index === null ? null : (this.views[index]?.text ?? null);
  });
  readonly atFirst = computed(() => this.current() === 0);
  readonly atLast = computed(() => this.current() === this.views.length - 1);

  /** El intervalo del deslizador en el día que se ve (recortado en el primero y el último). */
  readonly range = computed(() => sliderRange(this.sim.time(), this.zone()));
  /** La hora del día, redondeada a los 5 minutos del control y dentro de su intervalo. */
  readonly minutes = computed(() => {
    const { min, max } = this.range();
    const rounded = (Math.round(minutesOfDay(this.sim.time(), this.zone()) / STEP) * STEP) % 1440;
    return Math.min(Math.max(rounded, min), max);
  });
  readonly clock = computed(() => clockText(minutesOfDay(this.sim.time(), this.zone())));
  /** La zona (ESTILO §4): «Hora local, UTC+2» o «UTC». */
  readonly zoneText = computed(() =>
    this.zone() === 'utc' ? 'UTC' : `Hora local, ${utcOffsetLabel(this.sim.time())}`,
  );
  /** «18:00, hora local, UTC+2» o «18:00, UTC». */
  readonly valueText = computed(() =>
    this.zone() === 'utc'
      ? `${this.clock()}, UTC`
      : `${this.clock()}, hora local, ${utcOffsetLabel(this.sim.time())}`,
  );

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTour());
  }

  /** Una vista elegida a mano: para el recorrido. */
  choose(index: number): void {
    this.stopTour();
    this.show(index);
  }

  /** La anterior o la siguiente (sin dar la vuelta; en los extremos, nada): para el recorrido. */
  step(delta: -1 | 1): void {
    if ((delta < 0 && this.atFirst()) || (delta > 0 && this.atLast())) return;
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
    this.sim.setTime(atMinuteOfDay(this.sim.time(), minutes, this.zone()));
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
