import { VISUAL_CONFIG, closeUpAmount, exposureFor, fillLight } from './visual-config';

describe('configuración visual', () => {
  it('la vista general no es primer plano y un cuerpo grande en pantalla sí', () => {
    expect(closeUpAmount(null)).toBe(0);
    expect(closeUpAmount(3)).toBe(0);
    expect(closeUpAmount(VISUAL_CONFIG.closeUpRadiusPx.from)).toBe(0);
    expect(closeUpAmount(VISUAL_CONFIG.closeUpRadiusPx.to)).toBe(1);
    expect(closeUpAmount(500)).toBe(1);
    expect(closeUpAmount(Infinity)).toBe(1);
  });

  it('la mezcla crece con el tamaño del cuerpo, sin saltos', () => {
    let previous = 0;
    for (let px = 8; px <= 90; px += 2) {
      const amount = closeUpAmount(px);
      expect(amount).toBeGreaterThanOrEqual(previous);
      expect(amount - previous).toBeLessThan(0.1);
      previous = amount;
    }
  });

  it('el relleno va del de la vista general al del primer plano', () => {
    expect(fillLight(0)).toBe(VISUAL_CONFIG.fill.overview);
    expect(fillLight(1)).toBeCloseTo(VISUAL_CONFIG.fill.closeUp, 12);
    expect(fillLight(0.5)).toBeLessThan(VISUAL_CONFIG.fill.overview);
  });

  it('en primer plano expone para el albedo del cuerpo, entre un mínimo y un máximo', () => {
    const { referenceAlbedo, strength, min, max } = VISUAL_CONFIG.closeUpExposure;
    expect(exposureFor(0, 0.12)).toBe(VISUAL_CONFIG.exposure);
    expect(exposureFor(1, 0.12)).toBeCloseTo(
      Math.min((referenceAlbedo / 0.12) ** strength, max),
      12,
    );
    expect(exposureFor(1, 0.01)).toBe(max);
    // Un cuerpo claro se expone menos (sin pasar del mínimo); sin albedo (el Sol), la base.
    expect(exposureFor(1, 0.689)).toBeLessThan(VISUAL_CONFIG.exposure);
    expect(exposureFor(1, 5)).toBe(min);
    expect(exposureFor(1, null)).toBe(VISUAL_CONFIG.exposure);
  });

  it('una fase creciente se expone más que una llena, sin pasar del máximo', () => {
    const { max } = VISUAL_CONFIG.closeUpExposure;
    expect(exposureFor(1, 0.5, 0.3)).toBeGreaterThan(exposureFor(1, 0.5, 1));
    expect(exposureFor(1, 0.142, 0.05)).toBe(max);
    // En la vista general no cambia nada.
    expect(exposureFor(0, 0.142, 0.05)).toBe(VISUAL_CONFIG.exposure);
  });
});
