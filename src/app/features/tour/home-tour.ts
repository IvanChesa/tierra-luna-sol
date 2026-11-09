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
  /** El rótulo de la parada, a la vista: dónde se está y cuántas paradas hay (crítica de la 9c). */
  caption(text: string): void;
  /**
   * Trae por la red, sin subirlas, las texturas de primer plano de los cuerpos de las paradas que
   * vienen (propuesta de la fase 9b): al llegar a ellas, ya están en la caché.
   */
  prefetch(ids: readonly BodyId[]): void;
}

/** Un paso: cuándo (ms desde el principio) y qué hace. */
export interface TourStep {
  readonly at: number;
  readonly run: (host: TourHost) => void;
}

/** Los pasos y cuánto dura el recorrido (el último paso devuelve la vista general en marcha). */
export interface TourPlan {
  readonly steps: readonly TourStep[];
  readonly totalMs: number;
}

/**
 * Por debajo de esta fracción iluminada, la parada de la Luna se salta: su disco se vería casi negro
 * (crítica de la 9c: «la parada de la Luna es un disco negro durante 6 s»). La fecha no se toca.
 */
export const TOUR_MOON_MIN_LIT = 0.2;

/**
 * El rótulo de España. Los nombres de los lugares del cielo van en el mapa, junto a sus puntos (también
 * durante el recorrido: crítica de diseño de la fase 10); antes, la lista entera iba en el rótulo.
 */
export const SPAIN_CAPTION = 'España y los lugares del cielo';

/**
 * El recorrido de la portada (fase 9c, decisión 3 de Iván, D47): unos 30 s, la primera vez. Saturno
 * con sus anillos; la Tierra con la vista guiada «España»; la Luna, si se ve (`moon`); y vuelta a la
 * vista general, en reproducción. Cada parada, con su rótulo («1 de 4 · Saturno y sus anillos»).
 */
export function homeTourSteps(spain: GuidedView, { moon = true } = {}): TourPlan {
  const stops = moon ? 4 : 3;
  const label = (n: number, text: string) => `${n} de ${stops} · ${text}`;
  // Sin la Luna, la vuelta a la vista general llega 6 s antes.
  const back = moon ? 25_500 : 19_500;
  const totalMs = back + 3500;
  const bodies = moon ? 'Saturno, la Tierra y la Luna' : 'Saturno y la Tierra';
  const seconds = Math.round(totalMs / 5000) * 5;
  const steps: TourStep[] = [
    {
      at: 0,
      run: (host) => {
        host.announce(
          `Recorrido de unos ${seconds} segundos: ${bodies}. Pulsa «Saltar» o cualquier tecla para pararlo.`,
        );
        // Las texturas grandes de la Tierra (y de la Luna), mientras se ve Saturno.
        host.prefetch(moon ? ['tierra', 'luna'] : ['tierra']);
      },
    },
    {
      at: 1500,
      run: (host) => {
        host.select('saturno');
        host.closePanel();
        host.caption(label(1, 'Saturno y sus anillos'));
      },
    },
    {
      at: 9500,
      run: (host) => {
        host.goTo('earth');
        host.caption(label(2, 'La Tierra'));
      },
    },
    {
      at: 13_000,
      run: (host) => {
        host.showGuidedView(spain);
        host.caption(label(2, SPAIN_CAPTION));
      },
    },
  ];
  if (moon) {
    steps.push({
      at: 19_500,
      run: (host) => {
        host.goTo('moon');
        host.caption(label(3, 'La Luna'));
      },
    });
  }
  steps.push(
    {
      at: back,
      run: (host) => {
        host.goTo('system');
        host.caption(label(stops, 'El sistema solar, en marcha'));
      },
    },
    { at: back + 2000, run: (host) => host.play() },
  );
  return { steps, totalMs };
}

/** Lo que dura con la Luna (el recorrido completo). */
export const HOME_TOUR_MS = 29_000;

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
  plan: TourPlan,
  done: (completed: boolean) => void,
): RunningTour {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let finished = false;
  const finish = (completed: boolean) => {
    if (finished) return;
    finished = true;
    for (const timer of timers) clearTimeout(timer);
    done(completed);
  };
  for (const step of plan.steps) {
    timers.push(
      setTimeout(() => {
        if (!finished) step.run(host);
      }, step.at),
    );
  }
  timers.push(setTimeout(() => finish(true), plan.totalMs));
  return { stop: () => finish(false) };
}
