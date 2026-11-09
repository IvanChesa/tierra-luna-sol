import { AdaptiveQuality, QUALITY_PROFILES, detectQuality, lowerLevel } from './quality';
import type { QualityLevel } from './types';

/** Simula `seconds` segundos de animación a `fps` con un reloj falso; devuelve los cambios. */
function run(
  quality: AdaptiveQuality,
  level: { current: QualityLevel },
  fps: number,
  seconds: number,
  startMs = 0,
  animating = true,
): { changes: QualityLevel[]; endMs: number } {
  const changes: QualityLevel[] = [];
  const step = 1000 / fps;
  let now = startMs;
  for (; now < startMs + seconds * 1000; now += step) {
    const next = quality.sample(now, animating, level.current);
    if (next) {
      changes.push(next);
      level.current = next;
    }
  }
  return { changes, endMs: now };
}

describe('quality: niveles y detección', () => {
  it('cada nivel baja la resolución, las estrellas y el presupuesto de VRAM de §5', () => {
    expect(QUALITY_PROFILES.high.vramBudgetMB).toBe(300);
    expect(QUALITY_PROFILES.low.vramBudgetMB).toBe(120);
    expect(QUALITY_PROFILES.high.starMagnitudeLimit).toBe(6.5);
    expect(QUALITY_PROFILES.low.maxPixelRatio).toBeLessThan(QUALITY_PROFILES.high.maxPixelRatio);
    expect(lowerLevel('high')).toBe('medium');
    expect(lowerLevel('medium')).toBe('low');
    expect(lowerLevel('low')).toBeNull();
  });

  it('elige alto en escritorio, medio en táctil y bajo en dispositivos justos', () => {
    const desktop = { maxTextureSize: 16_384, coarsePointer: false, screenPixels: 2560 * 1440 };
    expect(detectQuality({ ...desktop, deviceMemoryGB: 8, hardwareConcurrency: 16 })).toBe('high');
    expect(detectQuality(desktop)).toBe('high'); // sin datos de memoria ni núcleos
    expect(detectQuality({ ...desktop, coarsePointer: true })).toBe('medium');
    expect(detectQuality({ ...desktop, deviceMemoryGB: 4 })).toBe('medium');
    expect(detectQuality({ ...desktop, deviceMemoryGB: 2 })).toBe('low');
    expect(detectQuality({ ...desktop, hardwareConcurrency: 2 })).toBe('low');
    expect(detectQuality({ ...desktop, maxTextureSize: 2048 })).toBe('low');
  });
});

describe('quality: bajada automática con histéresis (reloj falso)', () => {
  it('con FPS bajos durante la animación baja UNA vez y no oscila', () => {
    const quality = new AdaptiveQuality({ windowMs: 5000, cooldownMs: 8000 });
    const level = { current: 'high' as QualityLevel };
    // 40 FPS: por debajo del umbral de alto (50) y por encima del de medio (30).
    const first = run(quality, level, 40, 60);
    expect(first.changes).toEqual(['medium']);
    // Aunque luego vaya a 60 FPS, nunca vuelve a subir sola.
    const second = run(quality, level, 60, 60, first.endMs);
    expect(second.changes).toEqual([]);
    expect(level.current).toBe('medium');
  });

  it('no baja por picos cortos ni sin animación (render bajo demanda)', () => {
    const quality = new AdaptiveQuality({ windowMs: 5000, cooldownMs: 8000 });
    const level = { current: 'high' as QualityLevel };
    // 1 s a 20 FPS en medio de 60 FPS: la media de la ventana (5 s) sigue por encima de 50.
    let t = run(quality, level, 60, 2).endMs;
    t = run(quality, level, 20, 1, t).endMs;
    const steady = run(quality, level, 60, 20, t);
    expect(steady.changes).toEqual([]);
    // Sin animación no se mide nada, aunque los frames lleguen muy espaciados.
    expect(run(quality, level, 5, 60, steady.endMs, false).changes).toEqual([]);
    expect(level.current).toBe('high');
  });

  it('un hueco largo entre frames (pestaña oculta) corta la ventana', () => {
    const quality = new AdaptiveQuality({ windowMs: 5000, cooldownMs: 0 });
    const level = { current: 'high' as QualityLevel };
    expect(run(quality, level, 60, 3).changes).toEqual([]);
    // 30 s sin frames y luego 3 s más: sin el corte saldrían 6 frames en 33 s (0,2 FPS).
    expect(run(quality, level, 60, 3, 33_000).changes).toEqual([]);
  });

  it('con FPS muy bajos puede bajar dos niveles, pero respetando la espera entre bajadas', () => {
    const quality = new AdaptiveQuality({ windowMs: 5000, cooldownMs: 8000 });
    const level = { current: 'high' as QualityLevel };
    const result = run(quality, level, 15, 12);
    expect(result.changes).toEqual(['medium']); // a los 5 s; la segunda espera la pausa de 8 s
    const later = run(quality, level, 15, 30, result.endMs);
    expect(later.changes).toEqual(['low']);
    expect(run(quality, level, 5, 30, later.endMs).changes).toEqual([]); // ya no hay más abajo
  });
});
