import { Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { TimeZoneChoice, formatLongDate } from '../../core/format';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { SimulationStore } from '../../state/simulation.store';
import { Icon } from '../viewer/icon';
import {
  dateAtDay,
  dayOfYear,
  daysInYear,
  isTimelineKey,
  shiftYears,
  stepDate,
  yearOf,
} from './timeline';

/**
 * Línea de tiempo de la barra (fase 3c, tarea 2): el año de la fecha mostrada, de enero a diciembre,
 * con el año a la vista, botones para pasar al anterior o al siguiente y una marca en «hoy».
 *
 * Es un `input type="range"` nativo (ratón, táctil y teclado de serie) con `aria-valuetext` («17 de
 * marzo de 2026»). El teclado se lleva aquí (timeline.ts): las flechas, un día; RePág y AvPág, un mes;
 * Inicio y Fin, el año; desde el instante actual y pasando de año en los extremos. Mientras tiene el
 * foco y el tiempo corre, lo que muestra no cambia (el lector no anuncia cada día): se pone al día al
 * pulsar una tecla, al pausar o al salir.
 */
@Component({
  selector: 'tls-timeline',
  imports: [Icon],
  template: `
    <div class="year">
      <button
        type="button"
        class="step"
        [disabled]="year() <= minYear"
        title="Año anterior"
        (click)="shiftYear(-1)"
      >
        <tls-icon class="back" name="chevron" />
        <span class="visually-hidden">Año anterior</span>
      </button>
      <span class="year__label">{{ year() }}</span>
      <button
        type="button"
        class="step"
        [disabled]="year() >= maxYear"
        title="Año siguiente"
        (click)="shiftYear(1)"
      >
        <tls-icon name="chevron" />
        <span class="visually-hidden">Año siguiente</span>
      </button>
    </div>
    <div class="track">
      <input
        type="range"
        class="range"
        aria-label="Línea de tiempo"
        min="0"
        [max]="lastDay()"
        step="1"
        [value]="day()"
        [attr.aria-valuetext]="valueText()"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
        (focus)="focused.set(true)"
        (blur)="focused.set(false)"
      />
      @if (todayAt(); as left) {
        <span class="today" aria-hidden="true" title="Hoy" [style.left]="left"></span>
      }
    </div>
  `,
  styleUrl: './timeline-slider.css',
})
export class TimelineSlider {
  readonly zone = input.required<TimeZoneChoice>();

  private readonly sim = inject(SimulationStore);
  protected readonly minYear = MIN_DATE.getUTCFullYear();
  protected readonly maxYear = MAX_DATE.getUTCFullYear();
  /** El día de hoy, una vez (la marca no necesita moverse a medianoche). */
  private readonly today = new Date();

  protected readonly focused = signal(false);
  /** Lo que se muestra mientras el foco está en la línea y el tiempo corre (sin anuncios). */
  private readonly held = linkedSignal({
    source: () => ({ focused: this.focused(), playing: this.sim.playing() }),
    computation: () => untracked(this.sim.time),
  });
  private readonly shown = computed(() =>
    this.focused() && this.sim.playing() ? this.held() : this.sim.time(),
  );

  protected readonly year = computed(() => yearOf(this.shown(), this.zone()));
  protected readonly lastDay = computed(() => daysInYear(this.year()) - 1);
  protected readonly day = computed(() => dayOfYear(this.shown(), this.zone()));
  protected readonly valueText = computed(() => formatLongDate(this.shown(), this.zone()));
  /**
   * Dónde va la marca de «hoy» si cae en el año a la vista: el centro del tirador recorre la pista
   * desde medio tirador hasta el final menos medio tirador (`--thumb`, en el CSS).
   */
  protected readonly todayAt = computed(() => {
    const zone = this.zone();
    if (yearOf(this.today, zone) !== this.year()) return null;
    const fraction = dayOfYear(this.today, zone) / this.lastDay();
    return `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${fraction.toFixed(4)})`;
  });

  /** Ratón o táctil: el día de la línea, a la hora del día que se muestra. */
  protected onInput(event: Event): void {
    const day = Number((event.target as HTMLInputElement).value);
    this.go(dateAtDay(this.shown(), day, this.zone()));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!isTimelineKey(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    this.go(stepDate(this.sim.time(), event.key, this.zone()));
  }

  protected shiftYear(years: number): void {
    this.go(shiftYears(this.sim.time(), years, this.zone()));
  }

  /** Salta a ese instante (el store lo lleva a 1900–2100) y lo muestra, también con el foco. */
  private go(date: Date): void {
    this.sim.setTime(date);
    this.held.set(this.sim.time());
  }
}
