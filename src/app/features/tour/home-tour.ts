import type { BodyId } from '../../data/body.model';
import type { GuidedView } from '../../data/tours';
import type { ExplorerView } from '../../scene';

/**
 * Lo que el recorrido necesita del explorador: las mismas órdenes que la interfaz (la API pública del
 * motor, a través de la sesión). El recorrido no toca el motor ni los stores directamente.
 */
export interface TourHost {
  /** Elige un cuerpo en la vista del sistema solar (lo enfoca, lo anuncia y pone su título). */
  select(id: BodyId): void;
  /** Cierra la ficha del cuerpo (el recorrido se ve sin ella, el 3D entero). */
  closePanel(): void;
  /** Va a una vista del explorador (con su viaje de cámara). */
  goTo(view: ExplorerView): void;
  /** Una vista guiada de la Tierra (lleva la hora a la que se ve y la cámara). */
  showGuidedView(view: GuidedView): void;
  /** Reproduce, a la velocidad del contexto (D33). */
  play(): void;
  /** Una frase para la región viva. */
  announce(text: string): void;
}

/** Un paso: cuándo (ms desde el principio) y qué hace. */
export interface TourStep {
  readonly at: number;
  readonly run: (host: TourHost) => void;
}

/** Cuánto dura (el último paso devuelve la vista general en marcha). */
export const HOME_TOUR_MS = 29_000;

/**
 * El recorrido de la portada (fase 9c, decisión 3 de Iván, D47): unos 30 s, la primera vez. Saturno
 * con sus anillos; la Tierra con la vista guiada «España»; la Luna; y vuelta a la vista general, en
 * reproducción. El título de cada vista (y el del cuerpo, que sigue al elegido) dice dónde se está.
 */
export function homeTourSteps(spain: GuidedView): readonly TourStep[] {
  return [
    {
      at: 0,
      run: (host) =>
        host.announce(
          'Recorrido de 30 segundos: Saturno, la Tierra y la Luna. Pulsa «Saltar» o cualquier tecla para pararlo.',
        ),
    },
    {
      at: 1500,
      run: (host) => {
        host.select('saturno');
        host.closePanel();
      },
    },
    { at: 9500, run: (host) => host.goTo('earth') },
    { at: 13_000, run: (host) => host.showGuidedView(spain) },
    { at: 19_500, run: (host) => host.goTo('moon') },
    { at: 25_500, run: (host) => host.goTo('system') },
    { at: 27_500, run: (host) => host.play() },
  ];
}

/** Un recorrido en marcha: `stop()` lo para donde esté (la escena se queda como está). */
export interface RunningTour {
  stop(): void;
}

/**
 * Pone en marcha los pasos con temporizadores. `done` se llama una vez, al acabar o al pararlo (con
 * `true` si ha llegado al final).
 */
export function runTour(
  host: TourHost,
  steps: readonly TourStep[],
  done: (completed: boolean) => void,
  totalMs = HOME_TOUR_MS,
): RunningTour {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let finished = false;
  const finish = (completed: boolean) => {
    if (finished) return;
    finished = true;
    for (const timer of timers) clearTimeout(timer);
    done(completed);
  };
  for (const step of steps) {
    timers.push(
      setTimeout(() => {
        if (!finished) step.run(host);
      }, step.at),
    );
  }
  timers.push(setTimeout(() => finish(true), totalMs));
  return { stop: () => finish(false) };
}
