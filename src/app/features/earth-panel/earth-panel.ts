import { Component, computed, inject } from '@angular/core';
import { SimulationStore } from '../../state/simulation.store';

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

/**
 * Panel de la vista Tierra (fase 5). «Luz del Sol»: un deslizador de la hora del día que cambia la
 * hora sin cambiar la fecha (en la hora local, como la barra de tiempo), para ver el día y la noche
 * recorrer la Tierra. Con el teclado, el del propio control (flechas: 5 minutos).
 */
@Component({
  selector: 'tls-earth-panel',
  template: `
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
        (input)="choose($event)"
      />
      <p class="earth__hint">Hora local, sin cambiar la fecha</p>
    </section>
  `,
  styleUrl: './earth-panel.css',
})
export class EarthPanel {
  private readonly sim = inject(SimulationStore);

  /** La hora del día, redondeada a los 5 minutos del control. */
  readonly minutes = computed(() => (Math.round(minutesOfDay(this.sim.time()) / 5) * 5) % 1440);
  readonly clock = computed(() => clockText(minutesOfDay(this.sim.time())));
  readonly valueText = computed(() => `${this.clock()}, hora local`);

  choose(event: Event): void {
    const minutes = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(minutes)) return;
    this.sim.setTime(atMinuteOfDay(this.sim.time(), minutes));
  }
}
