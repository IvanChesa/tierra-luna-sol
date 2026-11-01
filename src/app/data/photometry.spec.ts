import {
  PHASE_LAWS,
  PhaseLaw,
  Photometry,
  bandChromaticity,
  discBrightness,
  hazeGlow,
  lawPhaseMagnitude,
} from '../ephemeris/photometry';
import { BODY_DATA } from './body-data';
import { BODY_INDEX } from './body-index';
import { BODY_PHOTOMETRY, RING_SPECTRA } from './photometry';

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

  it('Saturno a contraluz (R2): el limbo brilla con la fase de PIA17172 y casi nada en las fases de siempre', () => {
    const haze = BODY_PHOTOMETRY.saturno.haze;
    if (!haze) throw new Error('Saturno sin atmósfera');
    // Lo que brilla el limbo (μ₀ = 1, μ = 0) a cada fase, respecto a casi de frente.
    const limb = (alphaDeg: number) =>
      hazeGlow(1, 0, alphaDeg * DEG, haze) / hazeGlow(1, 0, 0, haze);
    // A contraluz, con la fase de la foto de Cassini (≈ 176°), unas 35 veces más.
    expect(limb(176)).toBeGreaterThan(30);
    // A 60° de fase (las vistas de Cassini desde latitudes altas), menos de un 5 % más; en la del
    // Hubble (6°), nada.
    expect(limb(60)).toBeLessThan(1.05);
    expect(limb(6)).toBeLessThan(1.001);
  });

  it('el color medido de cada cuerpo es una cromaticidad (luminancia 1), con fuente', () => {
    const luminance = ([r, g, b]: readonly [number, number, number]) =>
      0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (const [id, entry] of Object.entries(BODY_PHOTOMETRY)) {
      if (!entry.chromaticity) continue;
      expect(luminance(entry.chromaticity.rgb), id).toBeCloseTo(1, 2);
      expect(entry.chromaticity.source, id).toMatch(/https:\/\//);
    }
  });

  it('el color de los anillos sale de su reflectividad por bandas medida por el Hubble: el B, tostado, no azulado (fase 7, D36)', () => {
    const color = (name: keyof typeof RING_SPECTRA.colorFrom) =>
      bandChromaticity(
        RING_SPECTRA[RING_SPECTRA.colorFrom[name]].map((value, i) => ({
          nm: RING_SPECTRA.wavelengthsNm[i] ?? 0,
          value,
        })),
      );
    expect(RING_SPECTRA.source).toMatch(/https:\/\/arxiv\.org\/abs\/1007\.0349/);
    expect(RING_SPECTRA.source).toMatch(/https:\/\/doi\.org\/10\.1006\/icar\.2002\.6851/);
    // Los cinco filtros de la tabla 5, y el V (549 nm) es el de la calibración del brillo (fase 3b).
    expect(RING_SPECTRA.wavelengthsNm).toEqual([338, 434, 549, 672, 798]);
    expect(RING_SPECTRA.B[2]).toBe(0.465);
    expect(RING_SPECTRA.A[2]).toBe(0.297);
    // El B, rojizo (más rojo que verde y más verde que azul) y no azulado; el C, el más gris.
    const [r, g, b] = color('B');
    expect(r).toBeCloseTo(1.073, 3);
    expect(g).toBeCloseTo(0.997, 3);
    expect(b).toBeCloseTo(0.82, 3);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(color('A')[2]).toBeGreaterThan(b);
    expect(color('C')[2]).toBeGreaterThan(color('A')[2]);
    // La división de Cassini, sin valores publicados, con el color del C.
    expect(color('Cassini')).toEqual(color('C'));
    for (const name of ['C', 'B', 'Cassini', 'A'] as const) {
      const [cr, cg, cb] = color(name);
      expect(0.2126 * cr + 0.7152 * cg + 0.0722 * cb, name).toBeCloseTo(1, 12);
      // Sin tono lavanda: ni el azul ni el rojo por encima del verde a la vez.
      expect(cr > cg && cb > cg, name).toBe(false);
    }
  });
});
