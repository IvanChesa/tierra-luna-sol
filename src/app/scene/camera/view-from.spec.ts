import { dot, length, normalize, vec3 } from '../../ephemeris/vec3';
import { anglesFromEcl, phaseViewDirection } from './view-from';

const DEG = Math.PI / 180;
const angle = (a: ReturnType<typeof vec3>, b: ReturnType<typeof vec3>) =>
  Math.acos(Math.min(Math.max(dot(a, b), -1), 1)) / DEG;

describe('cámara de las capturas comparables', () => {
  const pole = vec3(0, 0, 1);

  it('con fase 0 mira desde el Sol', () => {
    const toSun = normalize(vec3(1, 0.3, 0.2));
    const direction = phaseViewDirection(toSun, pole, 0);
    expect(angle(direction, toSun)).toBeCloseTo(0, 6);
  });

  it('da el ángulo de fase y la latitud pedidos', () => {
    const toSun = normalize(vec3(0.9, 0.2, Math.sin(10 * DEG)));
    for (const [phase, latitude] of [
      [60, 20],
      [120, -17],
      [30, 0],
    ] as const) {
      const direction = phaseViewDirection(toSun, pole, phase, latitude);
      expect(length(direction)).toBeCloseTo(1, 12);
      expect(angle(direction, toSun)).toBeCloseTo(phase, 6);
      expect(Math.asin(dot(direction, pole)) / DEG).toBeCloseTo(latitude, 6);
    }
  });

  it('sin latitud, usa la del Sol', () => {
    const toSun = normalize(vec3(0.5, 0.5, 0.3));
    const direction = phaseViewDirection(toSun, pole, 45);
    expect(dot(direction, pole)).toBeCloseTo(dot(toSun, pole), 12);
    expect(angle(direction, toSun)).toBeCloseTo(45, 6);
  });

  it('si la combinación es imposible, se acerca lo más posible sin romperse', () => {
    const toSun = normalize(vec3(0.1, 0, 1)); // el Sol casi sobre el polo
    const direction = phaseViewDirection(toSun, pole, 5, -80);
    expect(length(direction)).toBeCloseTo(1, 12);
    expect(Math.asin(dot(direction, pole)) / DEG).toBeCloseTo(-80, 6);
    const overPole = phaseViewDirection(pole, pole, 90, 0);
    expect(dot(overPole, pole)).toBeCloseTo(0, 12);
  });

  it('convierte una dirección ECL en el acimut y la elevación del rig (ejes de Three)', () => {
    expect(anglesFromEcl(vec3(1, 0, 0))).toEqual({ azimuth: Math.PI / 2, elevation: 0 });
    expect(anglesFromEcl(vec3(0, 0, 2)).elevation).toBeCloseTo(Math.PI / 2, 12);
    // ECL −y → Three +z: acimut 0.
    expect(anglesFromEcl(vec3(0, -1, 0)).azimuth).toBeCloseTo(0, 12);
  });
});
