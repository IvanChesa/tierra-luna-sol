import { Service, Signal, computed, signal } from '@angular/core';
import type { TimeZoneChoice } from '../core/format';
import type { ExplorerView } from '../scene';

/** Estado de un recorrido guiado (fase 6). */
export interface TourState {
  readonly id: string;
  readonly step: number;
  readonly playing: boolean;
}

/** Qué viaje de cámara está en curso: un vuelo a un cuerpo o un viaje entre vistas. */
export type TravelKind = 'focus' | 'view';

/**
 * Estado del explorador (PLAN §4.5): la vista, la vista limpia, el viaje de cámara en curso, si la
 * ficha resumida y el índice están abiertos y el recorrido (fase 6). La vista no se guarda aquí: sale de la ruta
 * (`connectView`), así que no puede desincronizarse de la URL.
 *
 * Como `SimulationStore`, lo provee la interfaz diferida del explorador.
 */
@Service({ autoProvided: false })
export class ExplorerStore {
  private readonly viewSource = signal<Signal<ExplorerView>>(signal<ExplorerView>('system'));
  /** Vista activa (sistema solar, Tierra o Luna). */
  readonly view = computed(() => this.viewSource()());
  /** Interfaz oculta: solo el 3D y el botón para recuperarla. */
  readonly cleanView = signal(false);
  /** Viaje de cámara en curso (la interfaz muestra «Saltar» en los viajes entre vistas). */
  readonly travelling = signal<TravelKind | null>(null);
  /** Ficha resumida abierta (se abre al elegir un cuerpo; se cierra con «Cerrar» o `Esc`). */
  readonly panelOpen = signal(false);
  /** Panel «Índice» abierto (fase 3c, 4b): cerrado al entrar, para que el 3D ocupe la pantalla. */
  readonly indexOpen = signal(false);
  /** Diálogo de atajos de teclado abierto. */
  readonly helpOpen = signal(false);
  /** Atajos de una sola tecla activos (WCAG 2.1.4: se pueden desactivar en el diálogo de atajos). */
  readonly singleKeyShortcuts = signal(true);
  /**
   * La zona en la que la interfaz dice las fechas y las horas: la local del navegador o UTC (se elige
   * en «Controles +»). La comparten la barra de tiempo, el panel de la Tierra y sus vistas guiadas.
   */
  readonly timeZone = signal<TimeZoneChoice>('local');
  readonly tour = signal<TourState | null>(null);

  /** La vista la decide la ruta: el layout del explorador pasa aquí la señal que la lleva. */
  connectView(source: Signal<ExplorerView>): void {
    this.viewSource.set(source);
  }
}
