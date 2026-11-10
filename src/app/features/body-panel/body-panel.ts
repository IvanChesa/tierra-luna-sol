import {
  Component,
  type ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatAu, formatDistanceKm, formatPeriodHours } from '../../core/format';
import { getBody } from '../../data/bodies';
import type { BodyId } from '../../data/body.model';
import type { VenusRadarState } from '../../scene';
import { isMeanElementsMoon } from '../../data/solar-system';
import { SOURCES, Source, SourceId } from '../../data/sources';
import { SystemPositions } from '../../state/positions';
import { bodyKindLabel, bodyPagePath, toBodyLabel } from '../explorer-ui/describe';
import { Icon } from '../viewer/icon';

interface Row {
  readonly label: string;
  /** La cifra y su unidad, por separado: la unidad va en el color secundario (DISENO.md). */
  readonly value: { readonly number: string; readonly unit: string };
  /** La misma cifra en otra unidad (los km junto a las UA). */
  readonly detail?: string;
  /** De dónde sale el dato (las distancias son un cálculo propio: no llevan). */
  readonly source?: SourceId;
}

/** Una fuente de la ficha y los datos que respalda («Rotación y órbita»). */
interface Citation {
  readonly source: Source;
  readonly what: string;
}

const LIST = new Intl.ListFormat('es-ES', { type: 'conjunction' });

/** Separa la cifra de su unidad, que `core/format.ts` une con un espacio duro (ESTILO §3). */
function splitUnit(text: string): Row['value'] {
  const at = text.indexOf('\u00a0');
  return at < 0
    ? { number: text, unit: '' }
    : { number: text.slice(0, at), unit: text.slice(at + 1) };
}

/** Más cerca que esto, las distancias se dan en km; más lejos, en UA con los km al lado. */
const NEAR_KM = 5e6;

/**
 * Ficha resumida del cuerpo elegido (PLAN 3.b.5): nombre, tipo, resumen, las distancias en el
 * instante de la simulación (al Sol y a la Tierra; a su planeta, las lunas), los datos clave con su
 * fuente y el enlace a la ficha completa. Las distancias salen del modelo de efemérides, no del
 * motor: funciona sin WebGL.
 */
@Component({
  selector: 'tls-body-panel',
  imports: [RouterLink, Icon],
  templateUrl: './body-panel.html',
  styleUrl: './body-panel.css',
  // En reposo (la hoja del móvil y de la tableta sin subir), para su CSS: una clase en el propio
  // elemento, más corta que preguntar por el panel con `:host-context`.
  host: { '[class.is-resting]': '!expanded()' },
})
export class BodyPanel {
  readonly bodyId = input.required<BodyId>();
  readonly closed = output<void>();
  /**
   * En el móvil, la hoja subida a su altura completa (fase 9c, 9c.2): en reposo, el nombre, el resumen
   * y «Ficha completa»; subida, también las distancias, los datos y sus fuentes. En escritorio, todo.
   */
  readonly expanded = model(false);
  /**
   * Venus «Bajo las nubes» (fase 9b, D44): el estado del radar de Magellan, o `null` si no se ofrece
   * (otro cuerpo, otra vista o sin 3D). Pulsar el botón pide encenderlo o apagarlo (`radarChange`).
   */
  readonly radar = input<VenusRadarState | null>(null);
  readonly radarChange = output<boolean>();

  private readonly positions = inject(SystemPositions);
  private readonly radarNote = viewChild<ElementRef<HTMLElement>>('radarNote');

  constructor() {
    // Con el radar puesto, su aviso («no es lo que verían tus ojos», D44 y D49), entero a la vista: en
    // la hoja del móvil en reposo, con tres líneas, la última quedaba bajo el borde o bajo la sombra de
    // «hay más» (revisión de la fase 10, hallazgo 2). Si algo queda tapado, el cuerpo de la ficha baja
    // lo justo, sin animación. En escritorio, la tarjeta lo enseña todo y no se mueve.
    afterRenderEffect({
      earlyRead: () => {
        const note = this.radar() === 'on' ? this.radarNote()?.nativeElement : undefined;
        const body = note?.closest<HTMLElement>('.card__body');
        if (!note || !body) return 0;
        const shadowPx = 24; // la sombra de «hay más», 1.5rem (body-panel.css)
        const visibleBottom = body.getBoundingClientRect().bottom - shadowPx;
        return Math.max(0, note.getBoundingClientRect().bottom - visibleBottom);
      },
      write: (hidden) => {
        if (hidden() <= 0) return;
        this.radarNote()?.nativeElement.closest('.card__body')?.scrollBy({ top: hidden() });
      },
    });
  }
  protected readonly body = computed(() => getBody(this.bodyId()));
  protected readonly kind = computed(() => bodyKindLabel(this.bodyId()));
  protected readonly link = computed(() => bodyPagePath(this.bodyId()));
  /** El botón del radar, pulsado: encendido o cargándose (lo que ha pedido quien lo pulsó). */
  protected readonly radarPressed = computed(() => {
    const state = this.radar();
    return state === 'on' || state === 'loading';
  });
  /** La línea del Sol en color realzado (fase 9b, D46), con su fuente: solo en el Sol. */
  protected readonly sunNote = computed(() => {
    const body = this.body();
    return body.kind === 'star' ? (body.mapNote ?? null) : null;
  });
  /** «NASA» por la página de su fuente (las de los textos son de la NASA). */
  protected sourceName(url: string): string {
    const host = new URL(url).hostname.replace(/^www./, '');
    return host.endsWith('nasa.gov') ? 'NASA' : host;
  }
  /**
   * Las fuentes de los datos de la ficha (ESTILO §5). Si son varias (en las lunas, el radio sale
   * del JPL y la rotación y la órbita de la NSSDCA), cada una dice qué respalda.
   */
  protected readonly citations = computed<Citation[]>(() => {
    const groups = new Map<SourceId, string[]>();
    for (const row of this.facts()) {
      if (!row.source) continue;
      const names = groups.get(row.source) ?? [];
      names.push((row.label.split(' ')[0] ?? row.label).toLowerCase());
      groups.set(row.source, names);
    }
    return [...groups].map(([id, names]) => {
      const what = LIST.format(names);
      return { source: SOURCES[id], what: what.charAt(0).toUpperCase() + what.slice(1) };
    });
  });
  /** Con qué se calculan las distancias (ESTILO §5). */
  protected readonly calculation = computed(() => {
    const body = this.body();
    const base = 'Las distancias se calculan en tu navegador con astronomy-engine';
    if (!body.parent || !isMeanElementsMoon(body.id)) return `${base}.`;
    return `${base}; la posición de ${body.name} respecto a ${getBody(body.parent).name}, con elementos orbitales ajustados a las efemérides del JPL.`;
  });

  protected readonly distances = computed<Row[]>(() => {
    const body = this.body();
    const d = this.positions.distances(body.id);
    const rows: Row[] = [];
    if (body.kind === 'moon' && body.parent && d.toParentKm !== null) {
      rows.push(this.far(toBodyLabel(body.parent), d.toParentKm));
    }
    // La Luna: su distancia al Sol y a la Tierra ya la dicen la de la Tierra y la de arriba.
    if (body.parent === 'tierra') return rows;
    if (d.toSunKm !== null) rows.push(this.far(toBodyLabel('sol'), d.toSunKm));
    if (d.toEarthKm !== null) rows.push(this.far(toBodyLabel('tierra'), d.toEarthKm));
    return rows;
  });

  protected readonly facts = computed<Row[]>(() => {
    const body = this.body();
    const physical = body.physical;
    const rows: Row[] = [
      {
        label: body.kind === 'planet' ? 'Radio ecuatorial' : 'Radio medio',
        value: splitUnit(formatDistanceKm(physical.radiusKm.value)),
        source: physical.radiusKm.source,
      },
    ];
    if (physical.synchronousRotation?.value) {
      rows.push({
        label: 'Rotación',
        value: splitUnit('Síncrona'),
        source: physical.synchronousRotation.source,
      });
    } else if (physical.rotationPeriodH) {
      const hours = physical.rotationPeriodH.value;
      rows.push({
        label: 'Rotación',
        value: splitUnit(formatPeriodHours(hours)),
        detail: hours < 0 ? 'retrógrada' : undefined,
        source: physical.rotationPeriodH.source,
      });
    }
    if (body.orbit) {
      rows.push({
        label: body.kind === 'planet' ? 'Año' : 'Órbita',
        value: splitUnit(formatPeriodHours(body.orbit.periodDays.value * 24)),
        source: body.orbit.periodDays.source,
      });
    }
    return rows;
  });

  private far(label: string, km: number): Row {
    return km < NEAR_KM
      ? { label, value: splitUnit(formatDistanceKm(km)) }
      : { label, value: splitUnit(formatAu(km)), detail: formatDistanceKm(km) };
  }
}
