import { Component, DOCUMENT, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatNumber } from '../../core/format';
import { SKY_PLACES } from '../../data/places';
import { NightSky, nightSky } from '../../ephemeris/night';
import { SKY_BODY_IDS, SkyBodyId, skyBodies } from '../../ephemeris/sky';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import type { SkyPlace } from '../../data/sky-place';
import { ExplorerSession, LocationResult } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';
import {
  BODY_NAMES,
  clockAt,
  moonNightText,
  moonPhaseText,
  nowCell,
  placePhrase,
  nowSpoken,
  planetNightText,
  twilightTexts,
  zoneText,
} from './sky-text';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** El deslizador abarca la noche y media hora de luz a cada lado (los crepúsculos se ven enteros). */
const MARGIN_MS = 30 * MINUTE_MS;
/** Paso del deslizador (minutos). */
const STEP_MINUTES = 5;
/** En escritorio, «Esta noche» abierto al entrar; en móvil, plegado (el cielo se ve encima). */
const COMPACT_MEDIA = '(max-width: 63.99rem)';

interface TableRow {
  readonly id: SkyBodyId;
  readonly name: string;
  /** «35° SE» (lo que se ve) y «35° de altura, hacia el sureste» (lo que se lee en voz alta). */
  readonly now: string;
  readonly nowSpoken: string;
  readonly up: boolean;
  readonly rise: string;
  readonly set: string;
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
  imports: [Icon, RouterLink],
  templateUrl: './sky-panel.html',
  styleUrl: './sky-panel.css',
})
export class SkyPanel {
  private readonly sim = inject(SimulationStore);
  private readonly explorer = inject(ExplorerStore);
  private readonly session = inject(ExplorerSession);
  private readonly doc = inject(DOCUMENT);

  protected readonly places = SKY_PLACES;
  protected readonly place = this.explorer.skyPlace;
  protected readonly constellations = this.explorer.constellations;
  protected readonly locating = signal(false);
  protected readonly locationMessage = signal<string | null>(null);
  protected readonly tonightOpen = signal(
    !(this.doc.defaultView?.matchMedia?.(COMPACT_MEDIA).matches ?? false),
  );

  private nightCache: { key: string; night: NightSky; from: number; to: number } | null = null;

  /** «Esta noche» del lugar: se recalcula al cambiar de noche o de lugar, no con cada tic. */
  protected readonly night = computed(() => {
    const t = this.sim.time().getTime();
    const place = this.place();
    const key = `${place.id}|${place.latDeg}|${place.lonDeg}`;
    const cached = this.nightCache;
    if (cached && cached.key === key && t >= cached.from && t < cached.to) return cached.night;
    const night = nightSky(new Date(t), place);
    // Vale desde el día anterior a la puesta (de día, `nightSky` da la noche que viene) hasta la
    // salida del Sol. Si el instante se sale, se recalcula (y da la noche correcta).
    const range =
      night.kind === 'night'
        ? { from: night.sunset.getTime() - 12 * HOUR_MS, to: night.sunrise.getTime() }
        : { from: t - HOUR_MS, to: t + HOUR_MS };
    this.nightCache = { key, night, ...range };
    return night;
  });

  /** El deslizador: los minutos desde su comienzo (la puesta menos media hora). */
  protected readonly range = computed(() => {
    const night = this.night();
    const t = this.sim.time().getTime();
    // Alineado a 5 minutos: cada paso del deslizador cae en una hora redonda (22:00, 22:05…).
    const step = STEP_MINUTES * MINUTE_MS;
    const from = night.kind === 'night' ? night.sunset.getTime() - MARGIN_MS : t - 12 * HOUR_MS;
    const start = Math.floor(from / step) * step;
    const end = night.kind === 'night' ? night.sunrise.getTime() + MARGIN_MS : t + 12 * HOUR_MS;
    const max = Math.floor((end - start) / MINUTE_MS / STEP_MINUTES) * STEP_MINUTES;
    return { start, max };
  });
  protected readonly minutes = computed(() => {
    const { start, max } = this.range();
    const value = Math.round((this.sim.time().getTime() - start) / MINUTE_MS);
    return Math.min(Math.max(value, 0), max);
  });
  /** Ahora es de día (antes de la noche del deslizador): se dice, para que se arrastre. */
  protected readonly daytime = computed(() => {
    const night = this.night();
    return night.kind === 'night' && this.sim.time().getTime() < night.sunset.getTime() - MARGIN_MS;
  });
  protected readonly clock = computed(() => clockAt(this.sim.time(), this.place()));
  protected readonly zone = computed(() => zoneText(this.sim.time(), this.place()));
  protected readonly valueText = computed(() => `${this.clock()}, hora del lugar (${this.zone()})`);

  protected readonly placeLabel = computed(() => placePhrase(this.place()));
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
        now: nowCell(az, alt),
        nowSpoken: nowSpoken(az, alt),
        up: alt > -0.5,
        ...events,
      };
    });
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
