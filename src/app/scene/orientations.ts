/**
 * Orientación de los 30 cuerpos en un instante (D19), a partir de `ephemeris/orientation.ts`:
 * el modelo IAU para el Sol, los planetas y la Luna, y la rotación síncrona para las demás lunas.
 * Con caché del último instante (varias partes del frame la piden).
 */
import { SystemState } from '../ephemeris/system-state';
import {
  bodyFixedToEcl,
  galileanOrbitNormals,
  meanElementsOrbitNormal,
  synchronousBodyFixedToEcl,
} from '../ephemeris/orientation';
import { Mat3 } from '../ephemeris/vec3';
import type { SceneBody } from './system';

export class OrientationModel {
  private lastTimeMs = Number.NaN;
  private lastResult: Mat3[] = [];

  constructor(private readonly bodies: readonly SceneBody[]) {}

  /** Matrices sistema propio → ECL, en el orden de los cuerpos. */
  at(state: SystemState): readonly Mat3[] {
    if (state.timeMs === this.lastTimeMs) return this.lastResult;
    const date = state.date;
    let galilean: ReturnType<typeof galileanOrbitNormals> | null = null;
    this.lastResult = this.bodies.map((body) => {
      const rotation = body.rotation;
      switch (rotation.kind) {
        case 'iau':
          return bodyFixedToEcl(rotation.body, date);
        case 'galilean':
          galilean ??= galileanOrbitNormals(date);
          return synchronousBodyFixedToEcl(state.parentOffsetOf(body.id), galilean[rotation.moon]);
        case 'mean-elements':
          return synchronousBodyFixedToEcl(
            state.parentOffsetOf(body.id),
            meanElementsOrbitNormal(rotation.elements, date),
          );
      }
    });
    this.lastTimeMs = state.timeMs;
    return this.lastResult;
  }
}
