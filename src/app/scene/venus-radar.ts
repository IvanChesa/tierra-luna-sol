/**
 * Venus «Bajo las nubes» (fase 9b, D44): la capa del radar de Magellan, que sustituye a las nubes en
 * el material de Venus (`TLS_RADAR`, `body-material.ts`).
 *
 * - La textura (`venus-radar`) se pide solo al encenderla (el botón de la ficha de Venus enfocada) y
 *   se suelta al apagarla (al acabar el fundido), al dejar de enfocar Venus y al destruir el motor:
 *   si no se ve, no ocupa memoria de vídeo.
 * - Un fundido entre las nubes y el radar (`VISUAL_CONFIG.venus.radar.fadeMs`); con movimiento
 *   reducido o en las capturas, un corte. Mientras llega la textura, siguen las nubes; si no llega
 *   (red, 404), vuelven las nubes y el estado lo dice (`error`).
 * - Al cambiar de calidad, con el radar encendido, se pide al nivel nuevo y se suelta el anterior.
 *
 * Sin Angular ni renderer: el motor le da el cargador de texturas y lo que pone la textura en el
 * material (`apply`), y le pide el fundido en cada frame (`step`). Lo prueba `venus-radar.spec.ts`.
 */
import type { Texture } from 'three';
import type { TextureLevel } from './quality';
import type { LoadedTexture, TextureSource } from './textures';

/** `off`: las nubes. `loading`: pedido, aún con las nubes. `on`: el radar. `error`: no ha llegado. */
export type VenusRadarState = 'off' | 'loading' | 'on' | 'error';

export interface VenusRadarOptions {
  readonly textures: TextureSource | null;
  /** Pone la textura del radar y el fundido en el material de Venus (0: las nubes; 1: el radar). */
  readonly apply: (texture: Texture | null, mix: number) => void;
  /** Libera una textura que ya no se usa (`releaseTexture`). */
  readonly release: (texture: Texture) => void;
  /** Cada cambio de estado (el motor lo emite a la interfaz). */
  readonly onState: (state: VenusRadarState) => void;
  /** Pide un frame (render bajo demanda). */
  readonly invalidate: () => void;
  /** Duración del fundido, en ms. */
  readonly fadeMs: number;
}

export class VenusRadarLayer {
  private wanted = false;
  /** El nivel pedido (el del primer plano), o `null` si no hay nada pedido. */
  private level: TextureLevel | null = null;
  private loaded: LoadedTexture | null = null;
  private mix = 0;
  private current: VenusRadarState = 'off';
  /** Cada petición nueva (o el apagado) deja sin efecto las anteriores que aún no han llegado. */
  private generation = 0;

  constructor(private readonly options: VenusRadarOptions) {}

  get state(): VenusRadarState {
    return this.current;
  }

  /** El fundido de ahora: 0, las nubes; 1, el radar. */
  get fade(): number {
    return this.mix;
  }

  /** La memoria de vídeo de la textura cargada (0 si no hay ninguna). */
  get vramBytes(): number {
    return this.loaded?.vramBytes ?? 0;
  }

  /**
   * Enciende o apaga el radar. Al encenderlo, pide la textura al nivel `level` (el del primer plano);
   * al apagarlo, el fundido vuelve a las nubes y, al acabar, la suelta (con `instant`, ya).
   */
  set(on: boolean, level: TextureLevel, instant: boolean): void {
    if (!on) {
      if (!this.wanted && this.current !== 'error') return;
      this.wanted = false;
      this.generation++;
      if (instant || this.mix === 0) this.drop();
      this.setState('off');
      this.options.invalidate();
      return;
    }
    this.wanted = true;
    if (this.loaded && this.level === level) {
      // Ya estaba (apagándose, por ejemplo): vuelve sin pedir nada.
      this.setState('on');
      this.options.invalidate();
      return;
    }
    if (this.level === level && this.current === 'loading') return;
    this.request(level);
  }

  /** La calidad cambia: con el radar encendido, se pide al nivel nuevo (el anterior, hasta que llegue). */
  setLevel(level: TextureLevel): void {
    if (this.wanted && this.level !== level) this.request(level);
  }

  /** Lo suelta ya, sin fundido: al dejar de enfocar Venus o al destruir el motor. */
  release(): void {
    this.wanted = false;
    this.generation++;
    this.drop();
    this.setState('off');
  }

  /**
   * Avanza el fundido `dtMs` (un corte con `instant`) y lo pone en el material. Devuelve si sigue en
   * marcha (el motor pide otro frame). Al acabar de apagarse, suelta la textura.
   */
  step(dtMs: number, instant: boolean): boolean {
    const target = this.wanted && this.loaded ? 1 : 0;
    if (this.mix !== target) {
      const delta = instant || this.options.fadeMs <= 0 ? 1 : dtMs / this.options.fadeMs;
      this.mix =
        target > this.mix ? Math.min(target, this.mix + delta) : Math.max(target, this.mix - delta);
      this.options.apply(this.loaded?.texture ?? null, this.mix);
    }
    if (this.mix === 0 && !this.wanted && this.loaded) this.drop();
    return this.mix !== target;
  }

  private request(level: TextureLevel): void {
    this.level = level;
    const generation = ++this.generation;
    const source = this.options.textures;
    if (!source) {
      this.fail();
      return;
    }
    // Con el radar ya a la vista (un cambio de calidad), sigue el que hay hasta que llegue el nuevo.
    this.setState(this.loaded ? 'on' : 'loading');
    source.load('venus-radar', level).then(
      (loaded) => this.assign(generation, loaded),
      (error: unknown) => {
        if (generation !== this.generation) return;
        console.warn('[radar de Venus] No se ha podido cargar:', error);
        this.fail();
      },
    );
  }

  private assign(generation: number, loaded: LoadedTexture | null): void {
    if (generation !== this.generation || !this.wanted) {
      if (loaded) this.options.release(loaded.texture);
      return;
    }
    if (!loaded) {
      this.fail();
      return;
    }
    const previous = this.loaded;
    this.loaded = loaded;
    this.options.apply(loaded.texture, this.mix);
    if (previous && previous.texture !== loaded.texture) this.options.release(previous.texture);
    this.setState('on');
    this.options.invalidate();
  }

  /** No ha llegado: vuelven las nubes (sin fundido: no se llegó a ver) y se dice. */
  private fail(): void {
    this.wanted = false;
    this.drop();
    this.setState('error');
    this.options.invalidate();
  }

  /** Quita la textura del material y la libera; el fundido, a las nubes. */
  private drop(): void {
    this.level = null;
    this.mix = 0;
    const loaded = this.loaded;
    if (!loaded) return;
    this.loaded = null;
    this.options.apply(null, 0);
    this.options.release(loaded.texture);
  }

  private setState(state: VenusRadarState): void {
    if (state === this.current) return;
    this.current = state;
    this.options.onState(state);
  }
}
