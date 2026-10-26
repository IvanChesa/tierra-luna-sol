/**
 * Órbitas (PLAN, fase 2, 2.c.14): `LineSegments2` de `three/addons`, con grosor en píxeles y nítidas
 * en pantallas de alta densidad (B8). Las 29 órbitas van en un solo objeto (una llamada de dibujo).
 *
 * Cada órbita es una estela: empieza EXACTAMENTE en el cuerpo y se desvanece hacia atrás a lo largo
 * de una vuelta. Los puntos salen de la caché de órbitas muestreadas (las mismas funciones de
 * posición que los cuerpos) y pasan por la misma transformación de marco que ellos (`FrameController`),
 * en float64 y relativos al foco; solo al final se escriben en float32.
 *
 * Al reproducir (PLAN 3.c.7), el camino recorrido en el último segundo real brilla más: la estela de
 * movimiento, detrás del cuerpo (o delante, hacia atrás en el tiempo). Un cuerpo que se mueve
 * demasiado deprisa para seguirlo (§4.5) no se dibuja y su órbita se resalta entera.
 *
 * Sobre los discos (fase 3b, tarea 8): la prueba de profundidad oculta lo que queda detrás de un
 * cuerpo, pero una órbita que pasa POR DELANTE (la del propio planeta enfocado, que lo atraviesa, o
 * las de sus lunas) cruzaría su disco. El material recibe los discos en pantalla de los cuerpos más
 * grandes y desvanece las líneas sobre ellos y un poco más allá (`onBeforeCompile` del
 * `LineMaterial`, que ya lleva los chunks de profundidad de three).
 */
import { AdditiveBlending, Color, Uniform, Vector4 } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { OrbitCache } from '../ephemeris/orbits';
import { Vec3, vec3 } from '../ephemeris/vec3';
import type { FrameController } from './frames';

export interface OrbitSource {
  readonly bodyIndex: number;
  /** Índice del planeta en las órbitas de lunas; −1 en las heliocéntricas. */
  readonly parentIndex: number;
  readonly periodDays: number;
  /** Validez mínima de una vuelta muestreada (días), según lo rápido que cambie su forma. */
  readonly validityDays: number;
  readonly segments: number;
  /** Posición heliocéntrica (planetas) o respecto al planeta (lunas), en UA y ECL. */
  readonly position: (date: Date) => Vec3;
}

/** Opacidad de la estela en su extremo (justo delante del cuerpo). */
const TAIL_ALPHA = 0.1;
/** Brillo extra de la estela de movimiento (el camino del último segundo real) junto al cuerpo. */
const MOTION_TRAIL_BOOST = 0.9;
/** Opacidad uniforme de una órbita que sustituye a su cuerpo (velocidades altas, §4.5). */
const ALIASED_ALPHA = 0.6;
const BASE_COLOR = new Color('#7d8aa6');
const HIGHLIGHT_COLOR = new Color('#d9b76e');

/** Grosor de las órbitas en píxeles CSS. */
export const ORBIT_WIDTH_PX = 1.25;

/** Discos que desvanecen las órbitas (los de los cuerpos más grandes en pantalla). */
export const ORBIT_FADE_DISCS = 8;

/** Un disco en pantalla, en píxeles CSS desde la esquina superior izquierda. */
export interface ScreenDisc {
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
}

const DISC_FADE_PARS = /* glsl */ `
uniform vec4 uTlsDiscs[${ORBIT_FADE_DISCS}];
uniform int uTlsDiscCount;
uniform float uTlsGain;

// 0 sobre el disco de un cuerpo, 1 a partir de un margen alrededor (px del lienzo, origen abajo).
float tlsDiscFade() {
  float fade = 1.0;
  for (int i = 0; i < ${ORBIT_FADE_DISCS}; i++) {
    if (i >= uTlsDiscCount) break;
    vec4 disc = uTlsDiscs[i];
    fade *= smoothstep(disc.z, disc.z + disc.w, distance(gl_FragCoord.xy, disc.xy));
  }
  return fade;
}
`;

export class OrbitLines {
  readonly object: LineSegments2;
  private readonly geometry = new LineSegmentsGeometry();
  private readonly material: LineMaterial;
  private readonly cache = new OrbitCache(256);
  private positions: Float32Array;
  private colors: Float32Array;
  private capacity: number;
  private readonly discs = new Uniform(
    Array.from({ length: ORBIT_FADE_DISCS }, () => new Vector4()),
  );
  private readonly discCount = new Uniform(0);
  private readonly gain = new Uniform(1);

  constructor(private sources: readonly OrbitSource[]) {
    this.capacity = this.segmentCount();
    this.positions = new Float32Array(this.capacity * 6);
    this.colors = new Float32Array(this.capacity * 6);
    this.geometry.setPositions(this.positions);
    this.geometry.setColors(this.colors);
    this.material = new LineMaterial({
      linewidth: ORBIT_WIDTH_PX,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      worldUnits: false,
    });
    this.material.name = 'tls-orbits';
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms['uTlsDiscs'] = this.discs;
      shader.uniforms['uTlsDiscCount'] = this.discCount;
      shader.uniforms['uTlsGain'] = this.gain;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'uniform float linewidth;',
          `uniform float linewidth;
${DISC_FADE_PARS}`,
        )
        .replace(
          'gl_FragColor = vec4( diffuseColor.rgb, alpha );',
          'gl_FragColor = vec4( diffuseColor.rgb * uTlsGain, alpha ) * tlsDiscFade();',
        );
    };
    this.material.customProgramCacheKey = () => 'tls-orbits-discs';
    this.object = new LineSegments2(this.geometry, this.material);
    this.object.name = 'orbits';
    // Los vértices se reescriben en cada frame: la esfera envolvente se quedaría vieja.
    this.object.frustumCulled = false;
    this.object.renderOrder = 1;
  }

  /** Cambia la resolución de las órbitas (calidad). */
  setSources(sources: readonly OrbitSource[]): void {
    this.sources = sources;
    const needed = this.segmentCount();
    if (needed > this.capacity) {
      this.capacity = needed;
      this.positions = new Float32Array(needed * 6);
      this.colors = new Float32Array(needed * 6);
      this.geometry.setPositions(this.positions);
      this.geometry.setColors(this.colors);
    }
  }

  /**
   * Discos sobre los que se desvanecen las órbitas: los más grandes primero (como mucho
   * `ORBIT_FADE_DISCS`). Se pasan a píxeles del lienzo con su densidad y con el origen abajo.
   * El margen alrededor de cada disco crece con él (un cuarto del radio, de 2 a 10 px CSS).
   */
  setDiscs(discs: readonly ScreenDisc[], heightPx: number, pixelRatio: number): void {
    const list = this.discs.value;
    const count = Math.min(discs.length, ORBIT_FADE_DISCS);
    for (let k = 0; k < count; k++) {
      const disc = discs[k] as ScreenDisc;
      const margin = Math.min(Math.max(disc.radiusPx * 0.25, 2), 10);
      list[k]?.set(
        disc.x * pixelRatio,
        (heightPx - disc.y) * pixelRatio,
        disc.radiusPx * pixelRatio,
        margin * pixelRatio,
      );
    }
    this.discCount.value = count;
  }

  /** Ganancia del fondo (configuración visual): compensa la exposición del primer plano. */
  setGain(gain: number): void {
    this.gain.value = gain;
  }

  /** Tamaño del lienzo en píxeles CSS (el grosor de la línea depende de él). */
  setResolution(width: number, height: number): void {
    this.material.resolution.set(width, height);
  }

  /**
   * Rehace todas las estelas para el instante `timeMs`.
   * @param bodyPositions posiciones de los cuerpos relativas al foco (ECL), de `FrameController`.
   * @param opacity opacidad de cada órbita (0 = oculta), en el orden de `sources`.
   * @param highlighted índice de cuerpo cuya órbita va resaltada, o −1.
   * @param speedDaysPerSecond velocidad de la reproducción: con velocidades altas, cada vuelta
   *        muestreada se reutiliza más tiempo para no recalcular órbitas en cada frame.
   * @param trailDays días simulados que cubre la estela de movimiento (0 en pausa; negativo hacia
   *        atrás en el tiempo).
   * @param aliased 1 en los cuerpos sustituidos por su órbita (velocidades altas).
   */
  update(
    frames: FrameController,
    timeMs: number,
    opacity: readonly number[],
    highlighted: number,
    speedDaysPerSecond: number,
    trailDays = 0,
    aliased: Uint8Array | null = null,
  ): void {
    const date = new Date(timeMs);
    const out = frames.output.position;
    let segment = 0;
    this.sources.forEach((source, k) => {
      const alpha = opacity[k] ?? 0;
      if (alpha <= 0.002) return;
      const sampled = this.cache.sample({
        id: String(source.bodyIndex),
        date,
        periodDays: source.periodDays,
        segments: source.segments,
        validityDays: Math.max(source.validityDays, Math.abs(speedDaysPerSecond) / 4),
        position: source.position,
      });
      const n = source.segments;
      const periodMs = source.periodDays * 86_400_000;
      const phase = ((((timeMs - sampled.startMs) / periodMs) % 1) + 1) % 1;
      const behind = Math.floor(phase * n) % n;
      const isHighlighted = source.bodyIndex === highlighted;
      const color = isHighlighted ? HIGHLIGHT_COLOR : BASE_COLOR;
      const strength = isHighlighted ? Math.min(1, alpha * 1.4) : alpha;
      const replaced = aliased?.[source.bodyIndex] === 1;
      // Fracción de la vuelta que cubre la estela de movimiento y hacia qué lado.
      const trail = replaced ? 0 : Math.min(1, Math.abs(trailDays) / source.periodDays);
      const ahead = trailDays < 0;
      const shade = (u: number): number => {
        if (replaced) return Math.max(strength, ALIASED_ALPHA);
        const along = ahead ? 1 - u : u;
        const boost = trail > 0 && along < trail ? MOTION_TRAIL_BOOST * (1 - along / trail) : 0;
        return Math.min(1, strength * fade(u) + boost * Math.max(strength, 0.4));
      };
      // El primer punto es el propio cuerpo; después, las n muestras hacia atrás, y un último tramo
      // de vuelta al cuerpo (la parte de la órbita que tiene justo delante, la más tenue).
      const b = 3 * source.bodyIndex;
      const head = vec3(out[b] as number, out[b + 1] as number, out[b + 2] as number);
      let previous = head;
      for (let step = 0; step < n; step++) {
        const index = (((behind - step) % n) + n) % n;
        const current = this.place(frames, source, sampled.points, index);
        const u0 = step / (n + 1);
        const u1 = (step + 1) / (n + 1);
        this.write(segment++, previous, current, color, shade(u0), shade(u1));
        previous = current;
      }
      this.write(segment++, previous, head, color, shade(n / (n + 1)), shade(1));
    });
    this.geometry.instanceCount = segment;
    const start = this.geometry.attributes['instanceStart'];
    const colorStart = this.geometry.attributes['instanceColorStart'];
    if (start && 'data' in start) start.data.needsUpdate = true;
    if (colorStart && 'data' in colorStart) colorStart.data.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.cache.clear();
  }

  private place(
    frames: FrameController,
    source: OrbitSource,
    points: Float64Array,
    index: number,
  ): Vec3 {
    const p = vec3(
      points[3 * index] as number,
      points[3 * index + 1] as number,
      points[3 * index + 2] as number,
    );
    return source.parentIndex < 0 ? frames.helioPoint(p) : frames.moonPoint(source.parentIndex, p);
  }

  /** Escribe un segmento en ejes de Three: ECL (x, y, z) → (x, z, −y). */
  private write(
    segment: number,
    a: Vec3,
    b: Vec3,
    color: Color,
    alphaA: number,
    alphaB: number,
  ): void {
    const o = 6 * segment;
    const p = this.positions;
    p[o] = a.x;
    p[o + 1] = a.z;
    p[o + 2] = -a.y;
    p[o + 3] = b.x;
    p[o + 4] = b.z;
    p[o + 5] = -b.y;
    const c = this.colors;
    c[o] = color.r * alphaA;
    c[o + 1] = color.g * alphaA;
    c[o + 2] = color.b * alphaA;
    c[o + 3] = color.r * alphaB;
    c[o + 4] = color.g * alphaB;
    c[o + 5] = color.b * alphaB;
  }

  private segmentCount(): number {
    return this.sources.reduce((sum, source) => sum + source.segments + 1, 0);
  }
}

/** Desvanecimiento a lo largo de la estela: 1 en el cuerpo y `TAIL_ALPHA` al final. */
const fade = (u: number): number => TAIL_ALPHA + (1 - TAIL_ALPHA) * (1 - u) ** 1.6;
