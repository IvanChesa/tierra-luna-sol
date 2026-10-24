import { LabelInfo, LabelLayer, MOON_MIN_SEPARATION_PX, layoutLabels } from './labels';
import type { ScreenBody } from './picking';

const infos: LabelInfo[] = [
  { id: 'sol', name: 'Sol', kind: 'star', parentIndex: -1 },
  { id: 'tierra', name: 'Tierra', kind: 'planet', parentIndex: 0 },
  { id: 'luna', name: 'Luna', kind: 'moon', parentIndex: 1 },
  { id: 'marte', name: 'Marte', kind: 'planet', parentIndex: 0 },
];
const sizes = infos.map(() => ({ width: 60, height: 16 }));
const viewport = { width: 800, height: 600 };

const screen = (
  index: number,
  x: number,
  y: number,
  radiusPx = 4,
  extra: Partial<ScreenBody> = {},
): ScreenBody => ({
  index,
  x,
  y,
  radiusPx,
  depth: 100 + index,
  onScreen: true,
  occluded: false,
  ...extra,
});

describe('labels: colocación sin solapes', () => {
  it('pone el nombre a la derecha del disco del cuerpo', () => {
    const [box] = layoutLabels([screen(1, 100, 200, 10)], infos, sizes, viewport, -1, -1);
    expect(box?.x).toBe(100 + 10 + 6);
    expect(box?.y).toBe(200 - 8);
    expect(box?.marker).toBe(false);
  });

  it('si dos etiquetas chocan, gana la de más prioridad (el Sol y los planetas antes que las lunas)', () => {
    const bodies = [
      screen(0, 100, 100),
      screen(1, 300, 300),
      screen(2, 300 + MOON_MIN_SEPARATION_PX + 1, 302),
      screen(3, 105, 104),
    ];
    const shown = layoutLabels(bodies, infos, sizes, viewport, -1, -1).map((b) => b.index);
    expect(shown).toContain(0); // el Sol gana a Marte, que está encima
    expect(shown).not.toContain(3);
    expect(shown).toContain(1); // la Tierra gana a la Luna
    expect(shown).not.toContain(2);
  });

  it('la seleccionada va siempre primero', () => {
    const bodies = [screen(0, 100, 100), screen(3, 105, 104)];
    const shown = layoutLabels(bodies, infos, sizes, viewport, 3, -1).map((b) => b.index);
    expect(shown).toEqual([3]);
  });

  it('oculta las lunas pegadas a su planeta, las tapadas y las de fuera de la pantalla', () => {
    const bodies = [
      screen(1, 300, 300),
      screen(2, 305, 300),
      screen(3, 500, 500, 4, { occluded: true }),
      screen(0, 900, 100),
    ];
    const shown = layoutLabels(bodies, infos, sizes, viewport, -1, -1).map((b) => b.index);
    expect(shown).toEqual([1]);
    // Una luna seleccionada se muestra aunque esté pegada a su planeta.
    expect(layoutLabels(bodies, infos, sizes, viewport, 2, -1).map((b) => b.index)).toContain(2);
  });

  it('marca con un punto los cuerpos de menos de 3 px', () => {
    const [box] = layoutLabels([screen(3, 400, 300, 0.4)], infos, sizes, viewport, -1, -1);
    expect(box?.marker).toBe(true);
  });
});

describe('labels: capa DOM', () => {
  it('crea una etiqueta oculta a los lectores de pantalla por cuerpo y avisa del clic', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const picked: string[] = [];
    const layer = new LabelLayer(host, infos, (id) => picked.push(id));
    const root = host.querySelector('.scene-labels');
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelectorAll('.scene-label')).toHaveLength(4);
    const sizesMeasured = layer.measure();
    expect(sizesMeasured[1]?.width).toBeGreaterThan(0);
    const [box] = layoutLabels([screen(1, 100, 200, 10)], infos, sizesMeasured, viewport, 1, -1);
    layer.update(box ? [box] : [], 1);
    const earth = host.querySelector<HTMLElement>('[data-body="tierra"]');
    expect(earth?.hidden).toBe(false);
    expect(earth?.style.transform).toBe('translate3d(100.0px, 200.0px, 0)');
    expect(earth?.classList.contains('scene-label--selected')).toBe(true);
    expect(host.querySelector<HTMLElement>('[data-body="luna"]')?.hidden).toBe(true);
    earth?.querySelector('span')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual(['tierra']);
    layer.update([], -1);
    expect(earth?.hidden).toBe(true);
    layer.dispose();
    expect(host.querySelector('.scene-labels')).toBeNull();
    host.remove();
  });
});
