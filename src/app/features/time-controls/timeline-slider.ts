import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { TimeZoneChoice, formatLongDate } from '../../core/format';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { CAPTURE_DATE } from '../viewer/viewer-params';
import {
  dateAtDay,
  dayOfYear,
  isTimelineKey,
  reachableDays,
  shiftYears,
  stepDate,
  yearOf,
} from './timeline';

/** Mantener ‹ o › más que esto pasa a décadas (crítica de la 9c: «pulsación larga»). */
const LONG_PRESS_MS = 500;
/** Cada cuánto avanza una década mientras se mantiene. */
const DECADE_REPEAT_MS = 350;

/**
 * Línea de tiempo de la barra (fase 3c, tarea 2): el año de la fecha mostrada, de enero a diciembre,
 * con el año a la vista y una marca en «hoy». El año, como mando del mismo control (crítica de la 9c:
 * «1900–2100» con mando en la barra): «‹ 2026 ›», con el ratón o el dedo un año y, mantenido, por
 * décadas; con el teclado, Mayús + RePág y AvPág en la línea (su descripción lo dice). Una sola parada
 * del tabulador: no suma controles a la barra (D47).
 *
 * Es un `input type="range"` nativo (ratón, táctil y teclado de serie) con `aria-valuetext` («17 de
 * marzo de 2026»). La pista solo llega a los días que caen entre 1900 y 2100 en la zona elegida.
 *
 * El teclado se lleva aquí (timeline.ts): las flechas, un día; RePág y AvPág, un mes (con Mayús, un
 * año); Inicio y Fin, el año, pasando de año en los extremos. Con el foco del teclado y el tiempo en marcha, lo que se
 * anuncia se queda quieto (el lector no anuncia cada día) y cada tecla parte de la fecha anunciada:
 * → es siempre el día siguiente al que se ha oído. Con el ratón o el dedo, la línea sigue a la fecha.
 */
@Component({
  selector: 'tls-timeline',
  template: `
    <span class="year" aria-hidden="true">
      <span
        class="year__step"
        title="Año anterior (Mayús + Av Pág)"
        (pointerdown)="holdYear($event, -1)"
        >‹</span
      >
      <span class="year__value">{{ year() }}</span>
      <span
        class="year__step"
        title="Año siguiente (Mayús + Re Pág)"
        (pointerdown)="holdYear($event, 1)"
        >›</span
      >
    </span>
    <div class="track">
      <input
        #line
        type="range"
        class="range"
        aria-label="Línea de tiempo"
        aria-describedby="timeline-keys"
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
    <span id="timeline-keys" class="visually-hidden"
      >Flechas, un día; Re Pág y Av Pág, un mes; con Mayús, un año; Inicio y Fin, el principio o el
      final del año.</span
    >
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
  /** ‹ o › mantenido: la espera hasta las décadas y su repetición. */
  private holdDelay: ReturnType<typeof setTimeout> | null = null;
  private holdRepeat: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopHold());
  }
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
    if (event.shiftKey && (event.key === 'PageUp' || event.key === 'PageDown')) {
      this.pointer = false;
      this.keyboard.set(true);
      this.go(shiftYears(this.shown(), event.key === 'PageUp' ? 1 : -1, this.zone()));
      return;
    }
    // Desde la fecha anunciada; desde aquí, el foco es del teclado aunque llegara con el ratón.
    const next = stepDate(this.shown(), event.key, this.zone());
    this.pointer = false;
    this.keyboard.set(true);
    this.go(next);
  }

  /**
   * ‹ o ›: un año al pulsar y, si se mantiene, una década cada `DECADE_REPEAT_MS` (el store lo deja
   * dentro de 1900–2100). Con el puntero capturado: soltar fuera también para.
   */
  protected holdYear(event: PointerEvent, direction: 1 | -1): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture?.(event.pointerId);
    this.stopHold();
    this.go(shiftYears(this.shown(), direction, this.zone()));
    this.holdDelay = setTimeout(() => {
      this.holdRepeat = setInterval(
        () => this.go(shiftYears(this.shown(), 10 * direction, this.zone())),
        DECADE_REPEAT_MS,
      );
    }, LONG_PRESS_MS);
    const release = () => {
      this.stopHold();
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        target.removeEventListener(type, release);
      }
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      target.addEventListener(type, release);
    }
  }

  private stopHold(): void {
    if (this.holdDelay !== null) clearTimeout(this.holdDelay);
    if (this.holdRepeat !== null) clearInterval(this.holdRepeat);
    this.holdDelay = null;
    this.holdRepeat = null;
  }

  /** Salta a ese instante (el store lo lleva a 1900–2100) y lo muestra, también con el foco. */
  private go(date: Date): void {
    this.sim.setTime(date);
    this.held.set(this.sim.time());
  }
}
