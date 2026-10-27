import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { TimeZoneChoice, formatDateTime, utcOffsetLabel } from '../../core/format';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { SimulationStore } from '../../state/simulation.store';
import { SPEED_STEPS } from '../../state/speeds';
import { Icon } from '../viewer/icon';
import { fromInputValues, toDateInputValue, toTimeInputValue } from './time-input';
import { TimeMenu } from './time-menu';
import { TimelineSlider } from './timeline-slider';

const NBSP = ' ';
/** Espacios duros dentro de un trozo de texto: la línea solo se parte entre trozos. */
const unbreakable = (text: string): string => text.replaceAll(' ', NBSP);

/**
 * Barra de tiempo compacta (fase 3c, tarea 2; D31): reproducir y pausar (lo primero de la barra,
 * WCAG 2.2.2), la fecha legible con su calendario, la línea de tiempo del año, la velocidad (9
 * escalones, también hacia atrás) y «Controles +», que despliega lo menos usado (`TimeMenu`). En
 * móvil, en dos filas, y la velocidad dentro de «Controles +».
 */
@Component({
  selector: 'tls-time-controls',
  imports: [Icon, TimelineSlider, TimeMenu],
  templateUrl: './time-controls.html',
  styleUrl: './time-controls.css',
})
export class TimeControls {
  protected readonly sim = inject(SimulationStore);

  protected readonly speeds = SPEED_STEPS;
  /** La zona de las fechas: la hora local del navegador o UTC (se elige en «Controles +»). */
  protected readonly zone = signal<TimeZoneChoice>('local');
  protected readonly minDate = computed(() => toDateInputValue(MIN_DATE, this.zone()));
  protected readonly maxDate = computed(() => toDateInputValue(MAX_DATE, this.zone()));
  /** «Controles +» desplegado (lo dice el propio panel con su evento `toggle`). */
  protected readonly menuOpen = signal(false);
  private readonly menu = viewChild.required<TimeMenu, ElementRef<HTMLElement>>(TimeMenu, {
    read: ElementRef,
  });

  /** «24 oct 2026, 21:40»: la fecha no se parte por dentro. */
  protected readonly readout = computed(() => {
    const [date = '', time = ''] = formatDateTime(this.sim.time(), this.zone(), false).split(', ');
    return `${unbreakable(date)}, ${time}`;
  });
  /** La zona de la hora (ESTILO §4): «Hora local, UTC+2» o «UTC». */
  protected readonly zoneText = computed(() =>
    unbreakable(this.zone() === 'utc' ? 'UTC' : `Hora local, ${utcOffsetLabel(this.sim.time())}`),
  );
  /** En móvil, la velocidad y el sentido van en la lectura (el selector está en «Controles +»). */
  protected readonly speedText = computed(() => {
    const step = this.sim.speedStep();
    if (!step) return '';
    const direction = this.sim.reverse() ? `, ${unbreakable('hacia atrás')}` : '';
    return `${NBSP}· ${unbreakable(step.label.toLowerCase())}${direction}`;
  });
  protected readonly dateValue = computed(() => toDateInputValue(this.sim.time(), this.zone()));
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

  /**
   * El icono del calendario abre el selector nativo de fechas (`showPicker`). Donde no existe, abre
   * «Controles +», donde está el campo de la fecha.
   */
  protected openCalendar(picker: HTMLInputElement): void {
    try {
      picker.showPicker();
    } catch {
      this.menu().nativeElement.showPopover?.();
    }
  }

  /** Una fecha elegida en el calendario: ese día, a la misma hora. */
  protected pickDate(picker: HTMLInputElement): void {
    const time = toTimeInputValue(this.sim.time(), this.zone());
    const instant = fromInputValues(picker.value, time, this.zone());
    if (instant) this.sim.setTime(instant);
  }

  /**
   * El panel se abre o se cierra. Al abrirse, el foco entra en su primer campo; al cerrarse (con su
   * botón, `Esc` o un clic fuera), el navegador lo devuelve al botón «Controles».
   */
  protected onMenuToggle(event: Event): void {
    const open = (event as ToggleEvent).newState === 'open';
    this.menuOpen.set(open);
    if (open)
      this.menu().nativeElement.querySelector<HTMLElement>('input, select, button')?.focus();
  }

  protected closeMenu(): void {
    const menu = this.menu().nativeElement;
    if (menu.matches?.(':popover-open')) menu.hidePopover();
  }
}
