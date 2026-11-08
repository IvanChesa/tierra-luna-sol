import { Texture } from 'three';
import type { TextureLevel } from './quality';
import type { LoadedTexture, TextureId, TextureSource } from './textures';
import { VenusRadarLayer, type VenusRadarState } from './venus-radar';

/** Un cargador falso: cada petición queda pendiente hasta que el test la resuelve o la rechaza. */
class FakeSource implements TextureSource {
  readonly requests: {
    id: TextureId;
    level: TextureLevel;
    resolve: (loaded: LoadedTexture | null) => void;
    reject: (error: unknown) => void;
  }[] = [];

  load(id: TextureId, level: TextureLevel): Promise<LoadedTexture | null> {
    return new Promise((resolve, reject) => this.requests.push({ id, level, resolve, reject }));
  }
}

const loadedTexture = (level: TextureLevel): LoadedTexture => {
  const width = { '1k': 1024, '2k': 2048, '4k': 4096, '8k': 8192 }[level];
  return {
    texture: new Texture(),
    file: {
      level,
      path: `textures/${level}/venus-radar.0123456789.webp`,
      width,
      height: width / 2,
      bytes: 1,
    },
    vramBytes: width * (width / 2) * 4 * (4 / 3),
  };
};

/** Lo que va pasando: lo que se pone en el material, lo que se libera y los estados. */
function setup(fadeMs = 800) {
  const source = new FakeSource();
  const applied: { texture: Texture | null; mix: number }[] = [];
  const released: Texture[] = [];
  const states: VenusRadarState[] = [];
  let frames = 0;
  const layer = new VenusRadarLayer({
    textures: source,
    apply: (texture, mix) => applied.push({ texture, mix }),
    release: (texture) => released.push(texture),
    onState: (state) => states.push(state),
    invalidate: () => frames++,
    fadeMs,
  });
  return { layer, source, applied, released, states, frames: () => frames };
}

/** Deja que se cumplan las promesas pendientes. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('Venus «Bajo las nubes»: la capa del radar (fase 9b, D44)', () => {
  it('apagado no pide nada; al encenderlo pide «venus-radar» al nivel del primer plano y, mientras llega, siguen las nubes', () => {
    const { layer, source, applied, states } = setup();
    expect(layer.state).toBe('off');
    expect(layer.step(16, false)).toBe(false);
    expect(source.requests).toHaveLength(0);
    layer.set(true, '4k', false);
    expect(source.requests.map((r) => [r.id, r.level])).toEqual([['venus-radar', '4k']]);
    expect(states).toEqual(['loading']);
    // Sin textura, el fundido no empieza.
    expect(layer.step(400, false)).toBe(false);
    expect(layer.fade).toBe(0);
    expect(applied).toHaveLength(0);
    // Pulsarlo otra vez mientras llega no pide otra.
    layer.set(true, '4k', false);
    expect(source.requests).toHaveLength(1);
  });

  it('al llegar la textura, el fundido va de las nubes al radar en `fadeMs` y pide frames mientras dura', async () => {
    const { layer, source, applied, states, frames } = setup(800);
    layer.set(true, '2k', false);
    const loaded = loadedTexture('2k');
    source.requests[0]?.resolve(loaded);
    await flush();
    expect(states).toEqual(['loading', 'on']);
    expect(frames()).toBeGreaterThan(0);
    expect(applied.at(-1)).toEqual({ texture: loaded.texture, mix: 0 });
    expect(layer.vramBytes).toBe(loaded.vramBytes);
    expect(layer.step(400, false)).toBe(true);
    expect(layer.fade).toBeCloseTo(0.5, 9);
    expect(layer.step(400, false)).toBe(false);
    expect(layer.fade).toBe(1);
    expect(applied.at(-1)).toEqual({ texture: loaded.texture, mix: 1 });
    // Ya en el radar: nada más que pintar.
    const count = applied.length;
    expect(layer.step(16, false)).toBe(false);
    expect(applied).toHaveLength(count);
  });

  it('con movimiento reducido (o en las capturas), un corte: el radar entero en el primer frame', async () => {
    const { layer, source } = setup(800);
    layer.set(true, '1k', true);
    source.requests[0]?.resolve(loadedTexture('1k'));
    await flush();
    expect(layer.step(16, true)).toBe(false);
    expect(layer.fade).toBe(1);
  });

  it('al apagarlo, vuelven las nubes con el fundido y, al acabar, la textura se libera (§5: no ocupa memoria si no se ve)', async () => {
    const { layer, source, applied, released, states } = setup(800);
    layer.set(true, '4k', false);
    const loaded = loadedTexture('4k');
    source.requests[0]?.resolve(loaded);
    await flush();
    layer.step(800, false);
    layer.set(false, '4k', false);
    expect(states.at(-1)).toBe('off');
    expect(released).toHaveLength(0);
    expect(layer.step(400, false)).toBe(true);
    expect(layer.fade).toBeCloseTo(0.5, 9);
    expect(layer.step(400, false)).toBe(false);
    expect(released).toEqual([loaded.texture]);
    expect(applied.at(-1)).toEqual({ texture: null, mix: 0 });
    expect(layer.vramBytes).toBe(0);
  });

  it('apagado con movimiento reducido, se suelta ya; y encendido otra vez durante el fundido, vuelve sin pedirla de nuevo', async () => {
    const { layer, source, released } = setup(800);
    layer.set(true, '2k', false);
    const loaded = loadedTexture('2k');
    source.requests[0]?.resolve(loaded);
    await flush();
    layer.step(800, false);
    layer.set(false, '2k', false);
    layer.step(200, false);
    layer.set(true, '2k', false);
    expect(source.requests).toHaveLength(1);
    expect(layer.state).toBe('on');
    layer.step(800, false);
    expect(layer.fade).toBe(1);
    layer.set(false, '2k', true);
    expect(released).toEqual([loaded.texture]);
    expect(layer.fade).toBe(0);
  });

  it('si se suelta (Venus deja de estar enfocada) antes de que llegue, la textura que llega se libera sin ponerse', async () => {
    const { layer, source, applied, released, states } = setup();
    layer.set(true, '4k', false);
    layer.release();
    expect(states).toEqual(['loading', 'off']);
    const loaded = loadedTexture('4k');
    source.requests[0]?.resolve(loaded);
    await flush();
    expect(applied).toHaveLength(0);
    expect(released).toEqual([loaded.texture]);
    expect(layer.state).toBe('off');
  });

  it('si no llega (red, 404 o sin fichero), vuelven las nubes y el estado lo dice; se puede volver a pedir', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { layer, source, applied, states } = setup();
    layer.set(true, '4k', false);
    source.requests[0]?.reject(new Error('404'));
    await flush();
    expect(states).toEqual(['loading', 'error']);
    expect(applied).toHaveLength(0);
    layer.set(true, '4k', false);
    expect(source.requests).toHaveLength(2);
    source.requests[1]?.resolve(null);
    await flush();
    expect(layer.state).toBe('error');
    // Apagarlo deja el estado en «off».
    layer.set(false, '4k', false);
    expect(layer.state).toBe('off');
    warn.mockRestore();
  });

  it('al cambiar de calidad, con el radar encendido, se pide al nivel nuevo y el anterior se suelta cuando llega', async () => {
    const { layer, source, applied, released } = setup();
    layer.set(true, '4k', true);
    const high = loadedTexture('4k');
    source.requests[0]?.resolve(high);
    await flush();
    layer.step(16, true);
    layer.setLevel('1k');
    expect(source.requests.map((r) => r.level)).toEqual(['4k', '1k']);
    // Mientras llega, sigue el de 4k.
    expect(layer.state).toBe('on');
    expect(released).toHaveLength(0);
    const low = loadedTexture('1k');
    source.requests[1]?.resolve(low);
    await flush();
    expect(applied.at(-1)).toEqual({ texture: low.texture, mix: 1 });
    expect(released).toEqual([high.texture]);
    // Apagado, no pide nada al cambiar de calidad.
    layer.release();
    layer.setLevel('2k');
    expect(source.requests).toHaveLength(2);
    expect(released).toEqual([high.texture, low.texture]);
  });

  it('sin cargador de texturas (sin WebGL), el radar no se puede encender', () => {
    const states: VenusRadarState[] = [];
    const layer = new VenusRadarLayer({
      textures: null,
      apply: () => undefined,
      release: () => undefined,
      onState: (state) => states.push(state),
      invalidate: () => undefined,
      fadeMs: 800,
    });
    layer.set(true, '4k', false);
    expect(states).toEqual(['error']);
  });
});
