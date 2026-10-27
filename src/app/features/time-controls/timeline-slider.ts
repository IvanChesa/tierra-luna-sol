import { Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { TimeZoneChoice, formatLongDate } from '../../core/format';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { CAPTURE_DATE } from '../viewer/viewer-params';
import { Icon } from '../viewer/icon';
import {
  dateAtDay,
  dayOfYear,
  isTimelineKey,
  reachableDays,
  shiftYears,
  stepDate,
  yearOf,
} from './timeline';

/**
 * Línea de tiempo de la barra (fase 3c, tarea 2): el año de la fecha mostrada, de enero a diciembre,
 * con el año a la vista, botones para pasar al anterior o al siguiente y una marca en «hoy».
 *
 * Es un `input type="range"` nativo (ratón, táctil y teclado de serie) con `aria-valuetext` («17 de
 * marzo de 2026»). La pista solo llega a los días que caen entre 1900 y 2100 en la zona elegida.
 *
 * El teclado se lleva aquí (timeline.ts): las flechas, un día; RePág y AvPág, un mes; Inicio y Fin,
 * el año, pasando de año en los extremos. Con el foco del teclado y el tiempo en marcha, lo que se
 * anuncia se queda quieto (el lector no anuncia cada día) y cada tecla parte de la fecha anunciada:
 * → es siempre el día siguiente al que se ha oído. Con el ratón o el dedo, la línea sigue a la fecha.
 */
@Component({
  selector: 'tls-timeline',
  imports: [Icon],
  template: `
    <div class="year">
      <button
        type="button"
        class="step"
        [disabled]="year() <= firstYear()"
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
        [disabled]="year() >= lastYear()"
        title="Año siguiente"
        (click)="shiftYear(1)"
      >
        <tls-icon name="chevron" />
        <span class="visually-hidden">Año siguiente</span>
      </button>
    </div>
    <div class="track">
      <input
        #line
        type="range"
        class="range"
        aria-label="Línea de tiempo"
        [min]="range().first"
        [max]="range().last"
        step="1"
        [value]="day()"
        [attr.aria-valuetext]="valueText()"
        (pointerdown)="pointerFocus()"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (input)="onInput(line)"
        (keydown)="onKeydown($event)"
      />
      @if (todayMark(); as mark) {
        <span class="today" [class.is-near]="mark.near" aria-hidden="true" [style.left]="mark.left"
          >hoy</span
        >
      }
    </div>
  `,
  styleUrl: './timeline-slider.css',
})
export class TimelineSlider {
  readonly zone = input.required<TimeZoneChoice>();

  private readonly sim = inject(SimulationStore);
  /** El día de hoy, una vez; en el modo de captura, el de las capturas (deterministas). */
  private readonly today = inject(ExplorerSession).capture ? CAPTURE_DATE : new Date();

  /** El foco ha llegado con el ratón o el dedo (la línea sigue a la fecha). */
  private pointer = false;
  /** El foco es del teclado: con el tiempo en marcha, lo anunciado se queda quieto. */
  private readonly keyboard = signal(false);
  /** Lo que se muestra con el foco del teclado y el tiempo en marcha (sin anuncios a cada día). */
  private readonly held = linkedSignal({
    source: () => ({ keyboard: this.keyboard(), playing: this.sim.playing() }),
    computation: () => untracked(this.sim.time),
  });
  private readonly shown = computed(() =>
    this.keyboard() && this.sim.playing() ? this.held() : this.sim.time(),
  );

  protected readonly year = computed(() => yearOf(this.shown(), this.zone()));
  /** El primer y el último año del rango en la zona (en Madrid, 1899 y 2101: timeline.ts). */
  protected readonly firstYear = computed(() => yearOf(MIN_DATE, this.zone()));
  protected readonly lastYear = computed(() => yearOf(MAX_DATE, this.zone()));
  /** Los días de la pista: los del año que caen dentro de 1900–2100. */
  protected readonly range = computed(() =>
    reachableDays(this.year(), this.zone(), MIN_DATE, MAX_DATE),
  );
  protected readonly day = computed(() => dayOfYear(this.shown(), this.zone()));
  protected readonly valueText = computed(() => formatLongDate(this.shown(), this.zone()));
  /**
   * La marca de «hoy», bajo la pista, si cae en ella: dónde va (el centro del tirador recorre la
   * pista desde medio tirador hasta el final menos medio tirador, `--thumb` en el CSS) y si el
   * tirador está tan cerca que su rótulo sobra (queda la raya).
   */
  protected readonly todayMark = computed(() => {
    const zone = this.zone();
    const { first, last } = this.range();
    const today = dayOfYear(this.today, zone);
    if (yearOf(this.today, zone) !== this.year() || last <= first || today < first) return null;
    const fraction = Math.min((today - first) / (last - first), 1);
    return {
      left: `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${fraction.toFixed(4)})`,
      near: Math.abs(this.day() - today) <= (last - first) * 0.06,
    };
  });

  protected pointerFocus(): void {
    this.pointer = true;
  }

  /** El foco llega: si es del teclado, lo anunciado es el instante de ahora (no el de la próxima lectura). */
  protected onFocus(): void {
    this.keyboard.set(!this.pointer);
    this.held.set(this.sim.time());
  }

  protected onBlur(): void {
    this.pointer = false;
    this.keyboard.set(false);
  }

  /**
   * Ratón o táctil: el día de la línea, a la hora del día que se muestra. Si el store lo recorta
   * (fuera de 1900–2100), el tirador vuelve a la fecha: `[value]` no se reescribe si no cambia.
   */
  protected onInput(line: HTMLInputElement): void {
    this.go(dateAtDay(this.shown(), Number(line.value), this.zone()));
    line.value = String(this.day());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!isTimelineKey(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    // Desde la fecha anunciada; desde aquí, el foco es del teclado aunque llegara con el ratón.
    const next = stepDate(this.shown(), event.key, this.zone());
    this.pointer = false;
    this.keyboard.set(true);
    this.go(next);
  }

  protected shiftYear(years: number): void {
    this.go(shiftYears(this.shown(), years, this.zone()));
  }

  /** Salta a ese instante (el store lo lleva a 1900–2100) y lo muestra, también con el foco. */
  private go(date: Date): void {
    this.sim.setTime(date);
    this.held.set(this.sim.time());
  }
}
