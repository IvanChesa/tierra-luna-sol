import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatAu, formatDistanceKm, formatPeriodHours } from '../../core/format';
import { getBody } from '../../data/bodies';
import type { BodyId } from '../../data/body.model';
import { isMeanElementsMoon } from '../../data/solar-system';
import { SOURCES } from '../../data/sources';
import { SystemPositions } from '../../state/positions';
import { bodyKindLabel, bodyPagePath, toBodyLabel } from '../explorer-ui/describe';
import { Icon } from '../viewer/icon';

interface Row {
  readonly label: string;
  /** La cifra y su unidad, por separado: la unidad va en el color secundario (DISENO.md). */
  readonly value: { readonly number: string; readonly unit: string };
  /** La misma cifra en otra unidad (los km junto a las UA). */
  readonly detail?: string;
}

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
})
export class BodyPanel {
  readonly bodyId = input.required<BodyId>();
  readonly closed = output<void>();

  private readonly positions = inject(SystemPositions);
  protected readonly body = computed(() => getBody(this.bodyId()));
  protected readonly kind = computed(() => bodyKindLabel(this.bodyId()));
  protected readonly link = computed(() => bodyPagePath(this.bodyId()));
  protected readonly source = computed(() => SOURCES[this.body().physical.radiusKm.source]);
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
      },
    ];
    if (physical.synchronousRotation?.value) {
      rows.push({ label: 'Rotación', value: splitUnit('Síncrona') });
    } else if (physical.rotationPeriodH) {
      const hours = physical.rotationPeriodH.value;
      rows.push({
        label: 'Rotación',
        value: splitUnit(formatPeriodHours(hours)),
        detail: hours < 0 ? 'retrógrada' : undefined,
      });
    }
    if (body.orbit) {
      rows.push({
        label: body.kind === 'planet' ? 'Año' : 'Órbita',
        value: splitUnit(formatPeriodHours(body.orbit.periodDays.value * 24)),
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
