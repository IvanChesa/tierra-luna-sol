import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatLongDateInZone } from '../../core/format';
import { EclipseEntry, toEclipseEntry } from '../../data/eclipse-entry';
import { ECLIPSES_BY_PLACE, ECLIPSES_FROM } from '../../data/eclipses';
import { DEFAULT_PLACE_ID, SKY_PLACES } from '../../data/places';
import { skyPlaceOf } from '../../data/sky-place';
import { placeShortLabel } from '../../features/sky-panel/place-label';
import {
  amountText,
  eclipseDate,
  eclipseTitle,
  peakText,
  view3dLabel,
  view3dLink,
  visibilityText,
} from './eclipse-text';

const DAY_MS = 86_400_000;
/** Años de la lista (los mismos que la generada). */
const YEARS = 10;

interface Row {
  readonly key: string;
  readonly title: string;
  readonly date: string;
  readonly peak: string;
  readonly amount: string;
  readonly visibility: string;
  readonly link: ReturnType<typeof view3dLink>;
  readonly label: string;
}

/**
 * Próximos eclipses visibles desde España (fase 8, `/eclipses`): los de Sol y de Luna de los próximos
 * diez años que se ven desde el lugar elegido (el Montsec por defecto, `?lugar=`), con su hora local.
 *
 * - **Prerenderizada:** la lista sale de `data/eclipses.ts` (generada con las mismas funciones), así que
 *   la página se lee sin JavaScript y su JS inicial no carga astronomy-engine (PLAN §4.6).
 * - **Recalculada en el navegador** (`import()` dinámico en `afterNextRender`), desde el día de hoy y
 *   eclipse a eclipse, cediendo el hilo entre uno y otro (sin tareas largas): la lista no envejece.
 * - «Ver en 3D» lleva a la vista Tierra en el máximo con la cámara sobre la sombra de la Luna
 *   (`?sombra=1`) o a la vista Luna, que se ve desde la Tierra (enrojecida en los totales).
 */
@Component({
  selector: 'tls-eclipses-page',
  host: { class: 'page' },
  imports: [RouterLink],
  templateUrl: './eclipses-page.html',
  styleUrl: './eclipses-page.css',
})
export class EclipsesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly places = SKY_PLACES;
  /** «Montsec (Lleida)»: corto, para que quepa entero en el selector (fase 9c). */
  protected readonly optionLabel = placeShortLabel;
  protected readonly placeId = signal<string>(this.initialPlace());
  protected readonly place = computed(() => skyPlaceOf(this.placeId()));
  /** La lista que se ve: la generada hasta que el navegador la recalcula. */
  private readonly entries = signal<readonly EclipseEntry[]>(
    ECLIPSES_BY_PLACE[this.placeId()] ?? [],
  );
  /**
   * Lo que dice el HTML prerenderizado: el día en que se generó la lista (`ECLIPSES_FROM`, de
   * `scripts/build-eclipses.mjs`; el build no la regenera), dicho como el de la lista y no como el de
   * hoy (fase 9c, 9c.7 y revisión, hallazgo 13). En el navegador, la de hoy.
   */
  protected readonly calculated = signal(
    `Lista calculada el ${formatLongDateInZone(new Date(`${ECLIPSES_FROM}T12:00:00Z`), 'Europe/Madrid')} con astronomy-engine.`,
  );
  protected readonly busy = signal(false);
  private run = 0;

  protected readonly rows = computed<readonly Row[]>(() => {
    const zone = this.place().timeZone;
    return this.entries().map((entry) => ({
      key: `${entry.kind}-${entry.peak}`,
      title: eclipseTitle(entry),
      date: eclipseDate(entry, zone),
      peak: peakText(entry, zone),
      amount: amountText(entry),
      visibility: visibilityText(entry, zone),
      link: view3dLink(entry),
      label: view3dLabel(entry, zone),
    }));
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.run++);
    afterNextRender(() => {
      // Lo que ya ha pasado sale de la lista ya; después, la lista nueva.
      const now = Date.now();
      this.entries.update((list) => list.filter((entry) => Date.parse(entry.visibleTo) > now));
      void this.recalculate();
    });
  }

  protected choosePlace(event: Event): void {
    const id = (event.target as HTMLSelectElement | null)?.value;
    if (!id || id === this.placeId()) return;
    this.placeId.set(id);
    const now = Date.now();
    this.entries.set(
      (ECLIPSES_BY_PLACE[id] ?? []).filter((entry) => Date.parse(entry.visibleTo) > now),
    );
    void this.router.navigate([], {
      queryParams: { lugar: id === DEFAULT_PLACE_ID ? null : id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    void this.recalculate();
  }

  /** Recalcula la lista del lugar desde hoy, eclipse a eclipse, cediendo el hilo entre uno y otro. */
  private async recalculate(): Promise<void> {
    const token = ++this.run;
    const place = this.place();
    this.busy.set(true);
    try {
      const { nextLunarEclipse, nextSolarEclipse } = await import('../../ephemeris/eclipse-search');
      const observer = { latDeg: place.latDeg, lonDeg: place.lonDeg, altitudeM: place.altitudeM };
      const now = new Date();
      const until = new Date(now);
      until.setUTCFullYear(until.getUTCFullYear() + YEARS);
      const list: EclipseEntry[] = [];
      for (const next of [nextSolarEclipse, nextLunarEclipse]) {
        let after = now;
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (token !== this.run) return;
          const eclipse = next(after, until, observer);
          if (!eclipse) break;
          list.push(toEclipseEntry(eclipse));
          after = new Date(eclipse.peak.getTime() + DAY_MS);
        }
      }
      list.sort((a, b) => Date.parse(a.peak) - Date.parse(b.peak));
      if (token !== this.run) return;
      this.entries.set(list);
      this.calculated.set(
        `Calculado en tu navegador el ${formatLongDateInZone(now, place.timeZone)} con astronomy-engine.`,
      );
    } finally {
      if (token === this.run) this.busy.set(false);
    }
  }

  private initialPlace(): string {
    const id = this.route.snapshot.queryParamMap.get('lugar');
    return SKY_PLACES.some((place) => place.id === id) && id ? id : DEFAULT_PLACE_ID;
  }
}
