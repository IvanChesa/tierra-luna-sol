import { Component, DestroyRef, computed, inject, model, output, signal } from '@angular/core';
import { TimeZoneChoice, utcOffsetLabel } from '../../core/format';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import type { QualitySetting } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import { SPEED_STEPS } from '../../state/speeds';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';
import { fromInputValues, toDateInputValue, toTimeInputValue } from './time-input';

const MIN_MS = MIN_DATE.getTime();
const MAX_MS = MAX_DATE.getTime();
/**
 * Mientras se escribe en un campo, el navegador lanza `change` en cuanto los números forman una
 * fecha (a medio escribir el año: 0002, 0020, 0203…). La fecha se aplica al dejar de teclear este
 * rato, al pulsar Intro o al salir del campo, y el error solo se dice entonces.
 */
export const TYPING_PAUSE_MS = 700;

const QUALITY_OPTIONS: readonly { readonly value: QualitySetting; readonly label: string }[] = [
  { value: 'auto', label: 'Automática' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

/**
 * «Controles +» (fase 3c, tarea 4): lo menos usado de la barra de tiempo, en un panel que se
 * despliega (un `popover` del navegador: se cierra con `Esc` o al pulsar fuera, y el foco vuelve a su
 * botón). La fecha y la hora con inputs nativos en la hora local con su zona o en UTC, «Ahora», la
 * calidad, la vista limpia y los atajos; en móvil, también la velocidad y la fuente de los datos.
 *
 * Los inputs no se actualizan mientras tienen el foco: se puede escribir aunque el tiempo corra.
 */
@Component({
  selector: 'tls-time-menu',
  imports: [Icon],
  templateUrl: './time-menu.html',
  styleUrl: './time-menu.css',
})
export class TimeMenu {
  /** La zona de las fechas y las horas: la comparte con la barra. */
  readonly zone = model.required<TimeZoneChoice>();
  /** Se cierra el panel (su botón de cerrar, la vista limpia o los atajos): lo cierra la barra. */
  readonly done = output<void>();

  protected readonly sim = inject(SimulationStore);
  private readonly explorer = inject(ExplorerStore);
  private readonly session = inject(ExplorerSession);

  protected readonly speeds = SPEED_STEPS;
  protected readonly qualities = QUALITY_OPTIONS;
  /** Los límites del campo de fecha, en la zona elegida (el final de 2100 es 2101 en Madrid). */
  protected readonly minDate = computed(() => toDateInputValue(MIN_DATE, this.zone()));
  protected readonly maxDate = computed(() => toDateInputValue(MAX_DATE, this.zone()));
  /** Valor congelado de los inputs mientras se editan. */
  private readonly editing = signal<{ date: string; time: string } | null>(null);
  protected readonly invalid = signal(false);
  /** Lo escrito que aún no se ha aplicado (se aplica al dejar de teclear). */
  private pending: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelPending());
  }

  protected readonly dateValue = computed(
    () => this.editing()?.date ?? toDateInputValue(this.sim.time(), this.zone()),
  );
  protected readonly timeValue = computed(
    () => this.editing()?.time ?? toTimeInputValue(this.sim.time(), this.zone()),
  );
  /** La etiqueta del campo ya dice «Zona»: «Local (UTC+2)» o «UTC». */
  protected readonly localZoneLabel = computed(() => `Local (${utcOffsetLabel(this.sim.time())})`);
  protected readonly speedId = computed(() => this.sim.speedStep()?.id ?? 'real');

  protected changeZone(event: Event): void {
    this.zone.set((event.target as HTMLSelectElement).value === 'utc' ? 'utc' : 'local');
  }

  protected changeSpeed(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const step = SPEED_STEPS.find((s) => s.id === id);
    if (step) this.sim.setSpeed((this.sim.reverse() ? -1 : 1) * step.seconds);
  }

  protected changeQuality(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const setting = QUALITY_OPTIONS.find((option) => option.value === value)?.value ?? 'auto';
    this.session.setQuality(setting);
  }

  protected cleanView(): void {
    this.done.emit();
    this.session.setCleanView(true);
  }

  protected openHelp(): void {
    this.done.emit();
    this.explorer.helpOpen.set(true);
  }

  protected startEditing(date: HTMLInputElement, time: HTMLInputElement): void {
    this.editing.set({ date: date.value, time: time.value });
  }

  /** Al salir de un campo: lo escrito que faltaba se aplica (o se explica por qué no). */
  protected stopEditing(date: HTMLInputElement, time: HTMLInputElement): void {
    if (this.dirty) this.commit(date, time, true);
    this.editing.set(null);
  }

  /**
   * `change` de un input. Con el foco en él (se está escribiendo o eligiendo en el calendario), la
   * fecha se aplica al dejar de teclear; sin el foco, ya.
   */
  protected changed(date: HTMLInputElement, time: HTMLInputElement): void {
    this.cancelPending();
    this.dirty = true;
    if (this.editing() === null) {
      this.commit(date, time, true);
      return;
    }
    this.pending = setTimeout(() => {
      this.pending = null;
      this.commit(date, time, false);
    }, TYPING_PAUSE_MS);
  }

  /** Intro en un campo: aplicar ya. */
  protected confirm(date: HTMLInputElement, time: HTMLInputElement): void {
    if (this.dirty) this.commit(date, time, true);
  }

  /**
   * Salta al instante de los inputs si existe y está entre 1900 y 2100 (en UTC: en la hora local,
   * el intervalo empieza el 31-12-1899 y acaba el 01-01-2101 en Madrid). Si no, solo lo explica con
   * `report` (al confirmar, nunca a medio escribir).
   */
  private commit(date: HTMLInputElement, time: HTMLInputElement, report: boolean): void {
    this.cancelPending();
    const instant = fromInputValues(date.value, time.value, this.zone());
    const ms = instant?.getTime() ?? Number.NaN;
    if (instant === null || ms < MIN_MS || ms > MAX_MS) {
      if (report) this.invalid.set(true);
      return;
    }
    this.dirty = false;
    this.invalid.set(false);
    this.sim.setTime(instant);
    if (this.editing()) this.editing.set({ date: date.value, time: time.value });
  }

  private cancelPending(): void {
    if (this.pending !== null) clearTimeout(this.pending);
    this.pending = null;
  }

  protected now(): void {
    this.cancelPending();
    this.dirty = false;
    this.invalid.set(false);
    this.sim.now();
  }
}
