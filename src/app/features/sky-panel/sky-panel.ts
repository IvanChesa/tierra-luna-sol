import {
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatNumber } from '../../core/format';
import { SKY_PLACES } from '../../data/places';
import type { NightSky } from '../../ephemeris/night';
import { SKY_BODY_IDS, SkyBodyId, skyBodies } from '../../ephemeris/sky';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import type { SkyPlace } from '../../data/sky-place';
import { ExplorerSession, LocationResult } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';
import { mediaQuery } from '../viewer/media';
import { placeShortLabel } from './place-label';
import { SkyBar } from './sky-bar';
import { skyPlaceShortLabel } from './sky-place-label';
import { sliderNight, sliderNightHolds, sliderRange } from './night-slider';
import {
  BODY_NAMES,
  clockAt,
  darkStart,
  daySummary,
  lookLabel,
  moonNightText,
  moonPhaseText,
  nowCell,
  placePhrase,
  nowSpoken,
  skySummary,
  planetNightText,
  twilightTexts,
  zoneText,
} from './sky-text';

const MINUTE_MS = 60_000;
/** En escritorio, «Esta noche» abierto al entrar; en móvil, plegado (el cielo se ve encima). */
const COMPACT_MEDIA = '(max-width: 63.99rem)';

interface TableRow {
  readonly id: SkyBodyId;
  readonly name: string;
  /** La altura ahora (grados): ordena el resumen. */
  readonly altitudeDeg: number;
  /** «35° SE» (lo que se ve) y «35° de altura, hacia el sureste» (lo que se lee en voz alta). */
  readonly now: string;
  readonly nowSpoken: string;
  readonly up: boolean;
  readonly rise: string;
  readonly set: string;
  /** «Mirar al Sol»: el nombre del botón que lleva la cámara. */
  readonly look: string;
}

/**
 * Panel de la vista del cielo (fase 8, `/cielo`).
 * - **Lugar:** el selector de los siete lugares (el Montsec por defecto) y «Usar mi ubicación», que
 *   pide la ubicación al navegador solo al pulsarlo; si se rechaza o falla, se dice y todo sigue con el
 *   lugar elegido. La ubicación no sale del navegador.
 * - **Hora:** un deslizador de la noche (de la puesta a la salida del Sol, con media hora más a cada
 *   lado), en la hora del lugar con su zona (ESTILO §4). Moverlo pausa la reproducción.
 * - **Esta noche:** los crepúsculos, la Luna y qué planetas se ven y hacia dónde mirar, en frases
 *   (`sky-text.ts`), y la **tabla** del cielo: lo mismo que dibuja la vista (el Sol, la Luna y los
 *   planetas, con su altura y su rumbo ahora), con la salida y la puesta y «Mirar», que lleva la cámara.
 * - Las constelaciones, con un interruptor.
 *
 * «Esta noche» se calcula una vez por noche y lugar (unos 8 ms), no en cada tic del reloj; la tabla, con
 * cada tic (≤ 5 por segundo, §4.5), con 9 posiciones.
 */
@Component({
  selector: 'tls-sky-panel',
  imports: [Icon, RouterLink, SkyBar],
  host: {
    '[class.is-open]': 'open()',
    '(document:keydown)': 'onKeydown($event)',
  },
  templateUrl: './sky-panel.html',
  styleUrl: './sky-panel.css',
})
export class SkyPanel {
  private readonly sim = inject(SimulationStore);
  private readonly explorer = inject(ExplorerStore);
  private readonly session = inject(ExplorerSession);
  private readonly doc = inject(DOCUMENT);

  protected readonly places = SKY_PLACES;
  /** «Montsec (Lleida)»: corto, para que quepa entero en el selector (fase 9c). */
  protected readonly optionLabel = placeShortLabel;
  protected readonly place = this.explorer.skyPlace;
  protected readonly constellations = this.explorer.constellations;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  /** El móvil y la tableta: en reposo, solo la barra del cielo (decisión de Iván del 08-11). */
  private readonly compact = mediaQuery(COMPACT_MEDIA);
  /** En el móvil y la tableta, el panel entero, abierto desde la barra. */
  protected readonly open = signal(false);
  /** El lugar en la barra: corto («Montsec (Lleida)»). */
  protected readonly placeName = computed(() => skyPlaceShortLabel(this.place()));
  protected readonly locating = signal(false);
  protected readonly locationMessage = signal<string | null>(null);
  protected readonly tonightOpen = signal(
    !(this.doc.defaultView?.matchMedia?.(COMPACT_MEDIA).matches ?? false),
  );

  /**
   * «Esta noche» del lugar: la del deslizador (`night-slider.ts`), una función del instante y del lugar.
   * Se reutiliza la anterior mientras siga siendo la misma noche: no se recalcula con cada tic.
   */
  protected readonly night = linkedSignal<{ time: number; place: SkyPlace }, NightSky>({
    source: () => ({ time: this.sim.time().getTime(), place: this.place() }),
    computation: ({ time, place }, previous) =>
      previous && previous.source.place === place && sliderNightHolds(previous.value, time)
        ? previous.value
        : sliderNight(time, place),
  });

  /** El deslizador: su comienzo (la puesta menos media hora) y su recorrido en minutos. */
  protected readonly range = computed(() => sliderRange(this.night(), this.sim.time().getTime()));
  protected readonly minutes = computed(() => {
    const { start, max } = this.range();
    const value = Math.round((this.sim.time().getTime() - start) / MINUTE_MS);
    return Math.min(Math.max(value, 0), max);
  });
  /** Ahora es de día (antes de la noche del deslizador): se dice, para que se arrastre. */
  protected readonly daytime = computed(
    () => this.night().kind === 'night' && this.sim.time().getTime() < this.range().start,
  );
  protected readonly clock = computed(() => clockAt(this.sim.time(), this.place()));
  protected readonly zone = computed(() => zoneText(this.sim.time(), this.place()));
  protected readonly valueText = computed(() => `${this.clock()}, hora del lugar (${this.zone()})`);

  protected readonly placeLabel = computed(() => placePhrase(this.place()));

  /** La barra abre o cierra el panel: abierto, el foco va a su contenido; cerrado, a la barra. */
  protected toggled(open: boolean): void {
    this.focusSheet(open);
  }

  /**
   * Esc, con el panel abierto en el móvil: se cierra y el foco vuelve a la barra. Después de la interfaz
   * (que cierra antes la ficha, el índice o «Controles», si están abiertos, y marca la tecla).
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented || !this.open() || !this.compact()) return;
    event.preventDefault();
    this.open.set(false);
    this.focusSheet(false);
  }

  private focusSheet(open: boolean): void {
    afterNextRender(
      () => {
        const target = this.host.nativeElement.querySelector<HTMLElement>(
          open ? '#sky-now' : 'tls-sky-bar .bar',
        );
        target?.focus();
      },
      { injector: this.injector },
    );
  }
  /** `/eclipses?lugar=…` (sin el parámetro para el Montsec, el de por defecto). */
  protected readonly eclipsesQuery = computed(() => {
    const id = this.place().id;
    return id === 'montsec' || id === 'user' ? {} : { lugar: id };
  });

  protected readonly twilights = computed(() => {
    const night = this.night();
    return night.kind === 'night' ? twilightTexts(night, this.place()) : [];
  });
  protected readonly polarText = computed(() => {
    const night = this.night();
    if (night.kind === 'midnight-sun') return 'El Sol no se pone estos días: no hay noche.';
    if (night.kind === 'polar-night') return 'El Sol no sale estos días: es de noche todo el día.';
    return null;
  });
  protected readonly moonText = computed(() => {
    const night = this.night();
    if (night.kind !== 'night') return null;
    return `La Luna, ${moonPhaseText(night.moon.phase).toLowerCase()}. ${moonNightText(night.moon, this.place())}`;
  });
  protected readonly planetTexts = computed(() => {
    const night = this.night();
    if (night.kind !== 'night') return [];
    const entries: { id: SkyBodyId; text: string }[] = [];
    for (const planet of night.planets) {
      const text = planetNightText(planet, this.place());
      if (text) entries.push({ id: planet.id, text });
    }
    return entries;
  });

  /** La tabla: lo que dibuja la vista, ahora (≤ 5 veces por segundo durante la reproducción). */
  protected readonly rows = computed<readonly TableRow[]>(() => {
    const place = this.place();
    const time = this.sim.time();
    const night = this.night();
    const bodies = skyBodies(time, place);
    return SKY_BODY_IDS.map((id) => {
      const body = bodies.find((b) => b.id === id);
      const az = body?.azimuthDeg ?? 0;
      const alt = body?.altitudeDeg ?? -90;
      const events = this.events(id, night, place);
      return {
        id,
        name: BODY_NAMES[id],
        altitudeDeg: alt,
        look: lookLabel(id),
        now: nowCell(az, alt),
        nowSpoken: nowSpoken(az, alt),
        up: alt > -0.5,
        ...events,
      };
    });
  });

  /** La línea de resumen del panel (fase 9c): lo que está ahora sobre el horizonte. */
  /** De día, que es de día y cuándo empieza la noche cerrada; de noche, lo que está arriba. */
  protected readonly summary = computed(() => {
    const night = this.night();
    return this.daytime() && night.kind === 'night'
      ? daySummary(night, this.place())
      : skySummary(this.rows());
  });

  protected readonly tableCaption = computed(
    () => `El cielo desde ${this.placeLabel()} a las ${this.clock()} (${this.zone()})`,
  );

  // --- Órdenes ------------------------------------------------------------------------------------

  protected choosePlace(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value;
    if (!value || value === 'user') return;
    this.locationMessage.set(null);
    this.session.setSkyPlace(value);
  }

  protected async locate(): Promise<void> {
    if (this.locating()) return;
    this.locating.set(true);
    this.locationMessage.set('Pidiendo tu ubicación al navegador…');
    const result = await this.session.useMyLocation();
    this.locating.set(false);
    this.locationMessage.set(this.locationText(result));
  }

  /**
   * «Ver el cielo de esta noche», de día (crítica de la fase 10: en el móvil, el cielo de día era un
   * azul vacío): la hora, al comienzo de la noche cerrada, en pausa, como al mover el deslizador.
   */
  protected showTonight(): void {
    const night = this.night();
    if (night.kind !== 'night') return;
    this.sim.setPlaying(false);
    this.sim.setTime(darkStart(night));
  }

  protected setHour(event: Event): void {
    const value = Number((event.target as HTMLInputElement | null)?.value);
    if (!Number.isFinite(value)) return;
    this.sim.setPlaying(false);
    this.sim.setTime(new Date(this.range().start + value * MINUTE_MS));
  }

  protected toggleConstellations(event: Event): void {
    this.session.setConstellations((event.target as HTMLInputElement | null)?.checked ?? true);
  }

  protected lookAt(id: SkyBodyId): void {
    this.session.lookAtBody(id);
  }

  protected toggleTonight(event: Event): void {
    this.tonightOpen.set((event.target as HTMLDetailsElement | null)?.open ?? false);
  }

  // --- Textos ---------------------------------------------------------------------------------------

  private events(
    id: SkyBodyId,
    night: NightSky,
    place: SkyPlace,
  ): { readonly rise: string; readonly set: string } {
    if (night.kind !== 'night') return { rise: '—', set: '—' };
    if (id === 'sol')
      return { rise: clockAt(night.sunrise, place), set: clockAt(night.sunset, place) };
    const body = id === 'luna' ? night.moon : night.planets.find((p) => p.id === id);
    return {
      rise: body?.rise ? clockAt(body.rise, place) : '—',
      set: body?.set ? clockAt(body.set, place) : '—',
    };
  }

  private locationText(result: LocationResult): string {
    const place = this.place();
    if (result === 'ok') {
      const lat = `${formatNumber(Math.abs(place.latDeg), 2, true)}° ${place.latDeg >= 0 ? 'N' : 'S'}`;
      const lon = `${formatNumber(Math.abs(place.lonDeg), 2, true)}° ${place.lonDeg >= 0 ? 'E' : 'O'}`;
      return `Con tu ubicación (${lat}, ${lon}) y la hora de tu navegador (${place.timeZone}). No sale de tu navegador.`;
    }
    const where = `Sigues viendo el cielo desde ${placePhrase(place)}.`;
    if (result === 'denied') return `No has dado permiso para usar tu ubicación. ${where}`;
    if (result === 'unsupported') return `Tu navegador no puede dar tu ubicación. ${where}`;
    return `No se ha podido saber tu ubicación. ${where}`;
  }
}
