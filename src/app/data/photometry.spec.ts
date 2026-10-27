import {
  PHASE_LAWS,
  PhaseLaw,
  Photometry,
  discBrightness,
  lawPhaseMagnitude,
} from '../ephemeris/photometry';
import { BODY_DATA } from './body-data';
import { BODY_INDEX } from './body-index';
import { BODY_PHOTOMETRY, RING_PHOTOMETRY } from './photometry';

const DEG = Math.PI / 180;

/** Error RMS (magnitudes) de la curva de fase del modelo frente a una ley, cada 5°. */
function rms(law: PhaseLaw, p: Photometry): number {
  const full = discBrightness(0, p, 64, 128);
  let sum = 0;
  let n = 0;
  for (let alpha = Math.max(law.validDeg[0], 2.5); alpha <= law.validDeg[1]; alpha += 5) {
    const model = -2.5 * Math.log10(discBrightness(alpha * DEG, p, 64, 128) / full);
    sum += (model - lawPhaseMagnitude(law, alpha)) ** 2;
    n++;
  }
  return Math.sqrt(sum / n);
}

describe('fotometría de los cuerpos', () => {
  it('cubre todos los cuerpos menos el Sol, cada uno con el origen de sus parámetros', () => {
    const ids = BODY_INDEX.filter((body) => body.kind !== 'star').map((body) => body.id);
    expect(Object.keys(BODY_PHOTOMETRY).sort()).toEqual([...ids].sort());
    for (const entry of Object.values(BODY_PHOTOMETRY))
      expect(entry.note.length).toBeGreaterThan(20);
  });

  it('los que se calibran con el albedo lo tienen en el catálogo', () => {
    for (const [id, entry] of Object.entries(BODY_PHOTOMETRY)) {
      if (!entry.calibrateAlbedo) continue;
      const albedo = BODY_DATA[id as keyof typeof BODY_PHOTOMETRY].physical.geometricAlbedo;
      expect(albedo?.value, id).toBeGreaterThan(0);
    }
  });

  it('los rocosos tienen el disco plano en fase llena y los gigantes, limbo de Minnaert', () => {
    for (const entry of Object.values(BODY_PHOTOMETRY)) {
      if (entry.kind === 'rocky') expect(entry.photometry.lommel).toBe(1);
      if (entry.kind === 'giant') expect(entry.photometry.lommel).toBe(0);
    }
  });

  it.each([
    ['luna', 0.02],
    ['mercurio', 0.13],
    ['venus', 0.11],
    ['marte', 0.03],
  ] as const)('la curva de fase de %s sigue su ley publicada (RMS ≤ %s mag)', (id, tolerance) => {
    expect(rms(PHASE_LAWS[id], BODY_PHOTOMETRY[id].photometry)).toBeLessThan(tolerance);
  });

  it('el color medido de cada cuerpo y de cada anillo es una cromaticidad (luminancia 1), con fuente', () => {
    const luminance = ([r, g, b]: readonly [number, number, number]) =>
      0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (const [id, entry] of Object.entries(BODY_PHOTOMETRY)) {
      if (!entry.chromaticity) continue;
      expect(luminance(entry.chromaticity.rgb), id).toBeCloseTo(1, 2);
      expect(entry.chromaticity.source, id).toMatch(/https:\/\//);
    }
    const { source, ...rings } = RING_PHOTOMETRY.chromaticity;
    expect(Object.keys(rings)).toEqual(['C', 'B', 'Cassini', 'A']);
    for (const [name, rgb] of Object.entries(rings)) {
      expect(luminance(rgb), name).toBeCloseTo(1, 2);
    }
    expect(source).toMatch(/https:\/\/esahubble\.org\/images\/heic1917a/);
  });
});
