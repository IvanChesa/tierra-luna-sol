import {
  VISUAL_CONFIG,
  closeUpAmount,
  cloudOpacity,
  exposureFor,
  fillLight,
  moonPresence,
} from './visual-config';

describe('configuración visual', () => {
  it('las nubes de la Tierra, enteras con el disco a la vista y atenuadas de cerca, sin saltos (C1)', () => {
    const { from, to, min } = VISUAL_CONFIG.earth.cloudFade;
    // El disco entero a la vista (las comparativas con EPIC, la vista Tierra y «La Tierra completa»).
    expect(cloudOpacity(0, 300)).toBe(1);
    expect(cloudOpacity(0.82 * 300, 300)).toBe(1);
    expect(cloudOpacity(from * 300, 300)).toBe(1);
    // Los primeros planos (el Himalaya, a 1,9 radios, desborda unas dos veces la parte visible).
    expect(cloudOpacity(to * 300, 300)).toBeCloseTo(min, 12);
    expect(cloudOpacity(5 * 300, 300)).toBeCloseTo(min, 12);
    expect(cloudOpacity(Infinity, 300)).toBeCloseTo(min, 12);
    expect(min).toBeGreaterThan(0);
    // Baja de forma monótona y suave al acercarse.
    let previous = 1;
    for (let ratio = from; ratio <= to + 0.5; ratio += 0.02) {
      const opacity = cloudOpacity(ratio * 300, 300);
      expect(opacity).toBeLessThanOrEqual(previous);
      expect(previous - opacity).toBeLessThan(0.05);
      previous = opacity;
    }
    // Sin datos de pantalla, las nubes enteras.
    expect(cloudOpacity(Number.NaN, 300)).toBe(1);
    expect(cloudOpacity(100, 0)).toBe(1);
  });

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

describe('presencia de las lunas (fase 4b)', () => {
  const { from, to } = VISUAL_CONFIG.moonResolutionPx;
  // Un planeta de radio 2 (unidades) que mide 10 px en pantalla: cada unidad, 5 px.
  const at = (separationPx: number) => moonPresence(2 * (1 + separationPx / 10), 2, 10);

  it('0 mientras la luna no se separa del borde de su planeta; 1 cuando el sistema se distingue', () => {
    expect(at(0)).toBe(0);
    expect(at(from)).toBe(0);
    expect(at(to)).toBe(1);
    expect(at(10 * to)).toBe(1);
    let previous = 0;
    for (let px = from; px <= to; px += 0.5) {
      const presence = at(px);
      expect(presence).toBeGreaterThanOrEqual(previous);
      expect(presence - previous).toBeLessThan(0.05);
      previous = presence;
    }
  });

  it('la separación es la distancia en el espacio a la escala del disco: crece al acercarse', () => {
    // La misma luna, a 1,5 radios del centro: con el planeta de 10 px no se ve; con 100 px, sí.
    expect(moonPresence(3, 2, 10)).toBe(0);
    expect(moonPresence(3, 2, 100)).toBe(1);
  });

  it('sin radio o con la cámara dentro del planeta, no se dibuja', () => {
    expect(moonPresence(3, 0, 10)).toBe(0);
    expect(moonPresence(3, 2, Infinity)).toBe(0);
  });
});
