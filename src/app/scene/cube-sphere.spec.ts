import { createCubeSphere } from './cube-sphere';

describe('esfera cúbica (fase 6)', () => {
  const n = 16;
  const geometry = createCubeSphere(n);
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const vertex = (k: number) => [position.getX(k), position.getY(k), position.getZ(k)] as const;

  it('seis caras de n × n cuadrados, todos sus vértices en la esfera unidad', () => {
    expect(position.count).toBe(6 * (n + 1) ** 2);
    expect(index?.count).toBe(6 * n * n * 6);
    for (let k = 0; k < position.count; k++) {
      expect(Math.hypot(...vertex(k))).toBeCloseTo(1, 6);
    }
  });

  it('sin grietas: las aristas de caras vecinas comparten coordenadas exactas (6n² + 2 puntos distintos)', () => {
    const distinct = new Set<string>();
    for (let k = 0; k < position.count; k++) distinct.add(vertex(k).join(','));
    expect(distinct.size).toBe(6 * n * n + 2);
  });

  it('todos los triángulos miran hacia fuera, y el reparto es casi uniforme', () => {
    let shortest = Infinity;
    let longest = 0;
    for (let t = 0; t < (index?.count ?? 0); t += 3) {
      const [a, b, c] = [0, 1, 2].map((i) => vertex(index?.getX(t + i) ?? 0));
      if (!a || !b || !c) throw new Error('triángulo incompleto');
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const normal = [
        (ab[1] as number) * (ac[2] as number) - (ab[2] as number) * (ac[1] as number),
        (ab[2] as number) * (ac[0] as number) - (ab[0] as number) * (ac[2] as number),
        (ab[0] as number) * (ac[1] as number) - (ab[1] as number) * (ac[0] as number),
      ];
      const centroid = [0, 1, 2].map((i) => (a[i] as number) + (b[i] as number) + (c[i] as number));
      const outward = normal.reduce((sum, v, i) => sum + v * (centroid[i] as number), 0);
      expect(outward).toBeGreaterThan(0);
      const edge = Math.hypot(...(ab as [number, number, number]));
      shortest = Math.min(shortest, edge);
      longest = Math.max(longest, edge);
    }
    // Con el reparto equiangular, el lado más largo no llega a 1,5 veces el más corto (sin él, ~2,6).
    expect(longest / shortest).toBeLessThan(1.5);
  });

  it('los mismos ejes que SphereGeometry: el meridiano 0 en +X, el este hacia −Z y el norte en +Y', () => {
    const uv = geometry.getAttribute('uv');
    // Busca los vértices que están en +X, en −Z y en el polo norte.
    const find = (target: readonly [number, number, number]) => {
      for (let k = 0; k < position.count; k++) {
        const [x, y, z] = vertex(k);
        if (Math.hypot(x - target[0], y - target[1], z - target[2]) < 1e-6) return k;
      }
      throw new Error(`sin vértice en ${target.join(', ')}`);
    };
    const meridian = find([1, 0, 0]);
    expect(uv.getX(meridian)).toBeCloseTo(0.5, 6);
    expect(uv.getY(meridian)).toBeCloseTo(0.5, 6);
    // 90° E: u = 0,75.
    expect(uv.getX(find([0, 0, -1]))).toBeCloseTo(0.75, 6);
    expect(uv.getY(find([0, 1, 0]))).toBeCloseTo(1, 6);
  });
});
