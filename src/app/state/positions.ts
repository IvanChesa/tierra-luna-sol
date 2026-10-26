import { Service, computed, inject } from '@angular/core';
import type { BodyId } from '../data/body.model';
import { BodyDistances, bodyDistances, createSolarSystemModel } from '../data/solar-system';
import { SimulationStore } from './simulation.store';

/**
 * Posiciones de los 30 cuerpos en el instante de la simulación, para la interfaz (las distancias del
 * índice y de la ficha). Se calculan aquí, sin el motor: funcionan aunque no haya WebGL. Cambian como
 * mucho 5 veces por segundo, al ritmo del tiempo del store; cada cálculo cuesta ~0,2 ms.
 */
@Service({ autoProvided: false })
export class SystemPositions {
  private readonly sim = inject(SimulationStore);
  private readonly model = createSolarSystemModel(4);
  readonly state = computed(() => this.model.at(this.sim.time()));

  distances(id: BodyId): BodyDistances {
    return bodyDistances(this.state(), id);
  }
}
