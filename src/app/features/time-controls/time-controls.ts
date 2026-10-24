import { Component, computed, inject, signal } from '@angular/core';
import { TimeZoneChoice, formatDateTime, utcOffsetLabel } from '../../core/format';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import type { QualitySetting } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import { SPEED_STEPS } from '../../state/speeds';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';
import { fromInputValues, toDateInputValue, toTimeInputValue } from './time-input';

const QUALITY_OPTIONS: readonly { readonly value: QualitySetting; readonly label: string }[] = [
  { value: 'auto', label: 'Automática' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

/**
 * Barra de tiempo (PLAN 3.b.4): reproducir y pausar, la velocidad (6 escalones, también hacia
 * atrás), la fecha y la hora con inputs nativos en la hora local con su zona o en UTC, «Ahora», y
 * los ajustes (calidad y atajos). Los inputs no se actualizan mientras tienen el foco: se puede
 * escribir aunque el tiempo corra. En móvil, una fila compacta que se despliega.
 */
@Component({
  selector: 'tls-time-controls',
  imports: [Icon],
  templateUrl: './time-controls.html',
  styleUrl: './time-controls.css',
})
export class TimeControls {
  protected readonly sim = inject(SimulationStore);
  private readonly explorer = inject(ExplorerStore);
  private readonly session = inject(ExplorerSession);

  protected readonly speeds = SPEED_STEPS;
  protected readonly qualities = QUALITY_OPTIONS;
  protected readonly minDate = toDateInputValue(MIN_DATE, 'utc');
  protected readonly maxDate = toDateInputValue(MAX_DATE, 'utc');
  protected readonly zone = signal<TimeZoneChoice>('local');
  /** Móvil: los controles de fecha, velocidad y ajustes, desplegados. */
  protected readonly expanded = signal(false);
  /** Valor congelado de los inputs mientras se editan. */
  private readonly editing = signal<{ date: string; time: string } | null>(null);
  protected readonly invalid = signal(false);

  protected readonly dateValue = computed(
    () => this.editing()?.date ?? toDateInputValue(this.sim.time(), this.zone()),
  );
  protected readonly timeValue = computed(
    () => this.editing()?.time ?? toTimeInputValue(this.sim.time(), this.zone()),
  );
  protected readonly readout = computed(() => formatDateTime(this.sim.time(), this.zone()));
  protected readonly zoneLabel = computed(() =>
    this.zone() === 'utc' ? 'UTC' : utcOffsetLabel(this.sim.time()),
  );
  protected readonly localZoneLabel = computed(
    () => `Hora local (${utcOffsetLabel(this.sim.time())})`,
  );
  protected readonly speedId = computed(() => this.sim.speedStep()?.id ?? 'real');
  protected readonly playLabel = computed(() => (this.sim.playing() ? 'Pausar' : 'Reproducir'));

  protected togglePlaying(): void {
    this.sim.togglePlaying();
  }

  protected changeSpeed(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const step = SPEED_STEPS.find((s) => s.id === id);
    if (step) this.sim.setSpeed((this.sim.reverse() ? -1 : 1) * step.seconds);
  }

  protected toggleReverse(): void {
    this.sim.toggleReverse();
  }

  protected changeZone(event: Event): void {
    this.zone.set((event.target as HTMLSelectElement).value === 'utc' ? 'utc' : 'local');
  }

  protected changeQuality(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const setting = QUALITY_OPTIONS.find((option) => option.value === value)?.value ?? 'auto';
    this.session.setQuality(setting);
  }

  protected openHelp(): void {
    this.explorer.helpOpen.set(true);
  }

  protected startEditing(date: HTMLInputElement, time: HTMLInputElement): void {
    this.editing.set({ date: date.value, time: time.value });
  }

  protected stopEditing(): void {
    this.editing.set(null);
  }

  /**
   * Al confirmar un input (`change`): salta a ese instante si existe y su año está entre 1900 y
   * 2100 (el store lo lleva al límite exacto si cae unos minutos fuera por la zona horaria).
   */
  protected commit(date: HTMLInputElement, time: HTMLInputElement): void {
    const instant = fromInputValues(date.value, time.value, this.zone());
    const year = Number(date.value.slice(0, 4));
    const valid = instant !== null && year >= 1900 && year <= 2100;
    this.invalid.set(!valid);
    if (!valid) return;
    this.sim.setTime(instant);
    if (this.editing()) this.editing.set({ date: date.value, time: time.value });
  }

  protected now(): void {
    this.invalid.set(false);
    this.sim.now();
  }
}
