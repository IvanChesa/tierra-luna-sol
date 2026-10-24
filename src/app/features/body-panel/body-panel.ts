import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatAu, formatDistanceKm, formatPeriodHours } from '../../core/format';
import { getBody } from '../../data/bodies';
import type { BodyId } from '../../data/body.model';
import { SOURCES } from '../../data/sources';
import { SystemPositions } from '../../state/positions';
import { bodyKindLabel, bodyPagePath, toBodyLabel } from '../explorer-ui/describe';
import { Icon } from '../viewer/icon';

interface Row {
  readonly label: string;
  readonly value: string;
  /** La misma cifra en otra unidad (los km junto a las UA). */
  readonly detail?: string;
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
        value: formatDistanceKm(physical.radiusKm.value),
      },
    ];
    if (physical.synchronousRotation?.value) {
      rows.push({ label: 'Rotación', value: 'Síncrona' });
    } else if (physical.rotationPeriodH) {
      const hours = physical.rotationPeriodH.value;
      rows.push({
        label: 'Rotación',
        value: formatPeriodHours(hours),
        detail: hours < 0 ? 'retrógrada' : undefined,
      });
    }
    if (body.orbit) {
      rows.push({
        label: body.kind === 'planet' ? 'Año' : 'Órbita',
        value: formatPeriodHours(body.orbit.periodDays.value * 24),
      });
    }
    return rows;
  });

  private far(label: string, km: number): Row {
    return km < NEAR_KM
      ? { label, value: formatDistanceKm(km) }
      : { label, value: formatAu(km), detail: formatDistanceKm(km) };
  }
}
