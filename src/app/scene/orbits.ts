/**
 * Órbitas (PLAN, fase 2, 2.c.14): `LineSegments2` de `three/addons`, con grosor en píxeles y nítidas
 * en pantallas de alta densidad (B8). Las 29 órbitas van en un solo objeto (una llamada de dibujo).
 *
 * Cada órbita empieza EXACTAMENTE en el cuerpo y se desvanece hacia atrás a lo largo de una vuelta.
 * Los puntos salen de la caché de órbitas muestreadas (las mismas funciones de posición que los
 * cuerpos) y pasan por la misma transformación de marco que ellos (`FrameController`), en float64 y
 * relativos al foco; solo al final se escriben en float32.
 *
 * Sobre ella, la estela del cuerpo (D34, fase 4b): un arco de su color, detrás de él, que cubre una
 * fracción de la vuelta (`VISUAL_CONFIG.trails`) y se desvanece hasta fundirse con la órbita. Se ve
 * también en pausa (dice hacia dónde se mueve cada cuerpo) y sigue el sentido de la reproducción:
 * hacia atrás en el tiempo, la estela y el desvanecimiento de la órbita van delante. Va en los mismos
 * segmentos, con color y grosor por vértice (un atributo más, que el `onBeforeCompile` lleva al
 * shader) y mezcla aditiva: ninguna llamada de dibujo más. Un cuerpo que se mueve demasiado deprisa
 * para seguirlo (§4.5) no se dibuja y su órbita se resalta entera, sin estela.
 *
 * Sobre los discos (fase 3b, tarea 8): la prueba de profundidad oculta lo que queda detrás de un
 * cuerpo, pero una órbita que pasa POR DELANTE (la del propio planeta enfocado, que lo atraviesa, o
 * las de sus lunas) cruzaría su disco. El material recibe los discos en pantalla de los cuerpos más
 * grandes y desvanece las líneas sobre ellos y un poco más allá (`onBeforeCompile` del
 * `LineMaterial`, que ya lleva los chunks de profundidad de three).
 */
import {
  AdditiveBlending,
  Color,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Uniform,
  Vector4,
} from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { OrbitCache } from '../ephemeris/orbits';
import { Vec3, vec3 } from '../ephemeris/vec3';
import type { FrameController } from './frames';
import { VISUAL_CONFIG } from './visual-config';

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
  /** Color del cuerpo (`body-colors.ts`), el de su estela. */
  readonly color: string;
}

/** Sentido de las estelas: 1, detrás del cuerpo; −1, delante (el tiempo va hacia atrás). */
export type TrailDirection = 1 | -1;

/** Opacidad de la órbita en su extremo (justo delante del cuerpo). */
const TAIL_ALPHA = 0.1;
const TRAILS = VISUAL_CONFIG.trails;
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
  /** Grosor de cada extremo de segmento, en múltiplos de `ORBIT_WIDTH_PX` (la estela engorda). */
  private widths: Float32Array;
  private capacity: number;
  /** Color de la estela de cada fuente, en el orden de `sources`. */
  private trailColors: Color[];
  private readonly discs = new Uniform(
    Array.from({ length: ORBIT_FADE_DISCS }, () => new Vector4()),
  );
  private readonly discCount = new Uniform(0);
  private readonly gain = new Uniform(1);

  constructor(private sources: readonly OrbitSource[]) {
    this.trailColors = sources.map((source) => trailColor(source.color));
    this.capacity = this.segmentCount();
    this.positions = new Float32Array(this.capacity * 6);
    this.colors = new Float32Array(this.capacity * 6);
    this.widths = new Float32Array(this.capacity * 2);
    this.geometry.setPositions(this.positions);
    this.geometry.setColors(this.colors);
    this.setWidths(this.widths);
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
      shader.vertexShader = shader.vertexShader
        .replace(
          'attribute vec3 instanceColorEnd;',
          `attribute vec3 instanceColorEnd;
attribute float instanceWidthStart;
attribute float instanceWidthEnd;`,
        )
        .replace(
          'offset *= linewidth;',
          'offset *= linewidth * ( ( position.y < 0.5 ) ? instanceWidthStart : instanceWidthEnd );',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'uniform float linewidth;',
          `uniform float linewidth;
${DISC_FADE_PARS}`,
        )
        .replace(
          'gl_FragColor = vec4( diffuseColor.rgb, alpha );',
          'gl_FragColor = vec4( diffuseColor.rgb * uTlsGain, alpha ) * tlsDiscFade();',
        )
        // Sin remates redondos: con la mezcla aditiva, el de cada segmento y el del siguiente se
        // sumarían en cada unión (una cuenta brillante cada grado). Con ~1° entre segmentos, la
        // junta a tope no deja hueco visible.
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
if ( abs( vUv.y ) > 1.0 ) discard;`,
        );
    };
    this.material.customProgramCacheKey = () => 'tls-orbits-discs-trails';
    this.object = new LineSegments2(this.geometry, this.material);
    this.object.name = 'orbits';
    // Los vértices se reescriben en cada frame: la esfera envolvente se quedaría vieja.
    this.object.frustumCulled = false;
    this.object.renderOrder = 1;
  }

  /** Cambia la resolución de las órbitas (calidad). */
  setSources(sources: readonly OrbitSource[]): void {
    this.sources = sources;
    this.trailColors = sources.map((source) => trailColor(source.color));
    const needed = this.segmentCount();
    if (needed > this.capacity) {
      this.capacity = needed;
      this.positions = new Float32Array(needed * 6);
      this.colors = new Float32Array(needed * 6);
      this.widths = new Float32Array(needed * 2);
      this.geometry.setPositions(this.positions);
      this.geometry.setColors(this.colors);
      this.setWidths(this.widths);
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
   * @param direction sentido de las estelas (el de la reproducción, también en pausa).
   * @param aliased 1 en los cuerpos sustituidos por su órbita (velocidades altas).
   */
  update(
    frames: FrameController,
    timeMs: number,
    opacity: readonly number[],
    highlighted: number,
    speedDaysPerSecond: number,
    direction: TrailDirection = 1,
    aliased: Uint8Array | null = null,
  ): void {
    const date = new Date(timeMs);
    const out = frames.output.position;
    const c = this.colors;
    const widths = this.widths;
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
      const base = isHighlighted ? HIGHLIGHT_COLOR : BASE_COLOR;
      const strength = isHighlighted ? Math.min(1, alpha * 1.4) : alpha;
      const replaced = aliased?.[source.bodyIndex] === 1;
      const trail = source.parentIndex < 0 ? TRAILS.planet : TRAILS.moon;
      const tint = this.trailColors[k] as Color;
      const tintStrength = alpha * trail.intensity;
      const widen = trail.widthPx / ORBIT_WIDTH_PX - 1;
      // Color y grosor de un extremo (`end`, 0 o 1) de un segmento a `u` de vuelta detrás del cuerpo
      // (0 en el cuerpo; 1, de vuelta a él por delante): la órbita, que se funde con la estela junto
      // al cuerpo.
      const shade = (seg: number, end: 0 | 1, u: number): void => {
        const o = 6 * seg + 3 * end;
        if (replaced) {
          const a = Math.max(strength, ALIASED_ALPHA);
          c[o] = base.r * a;
          c[o + 1] = base.g * a;
          c[o + 2] = base.b * a;
          widths[2 * seg + end] = 1;
          return;
        }
        const along = direction < 0 ? 1 - u : u;
        const w = trailWeight(along, trail.fraction, TRAILS.falloff);
        const a = strength * fade(along) * (1 - w);
        const t = tintStrength * w;
        c[o] = base.r * a + tint.r * t;
        c[o + 1] = base.g * a + tint.g * t;
        c[o + 2] = base.b * a + tint.b * t;
        widths[2 * seg + end] = 1 + widen * w;
      };
      // El primer punto es el propio cuerpo; después, las n muestras hacia atrás, y un último tramo
      // de vuelta al cuerpo (la parte de la órbita que tiene justo delante, la más tenue).
      const b = 3 * source.bodyIndex;
      const head = vec3(out[b] as number, out[b + 1] as number, out[b + 2] as number);
      let previous = head;
      for (let step = 0; step < n; step++) {
        const index = (((behind - step) % n) + n) % n;
        const current = this.place(frames, source, sampled.points, index);
        this.write(segment, previous, current);
        shade(segment, 0, step / (n + 1));
        shade(segment, 1, (step + 1) / (n + 1));
        segment++;
        previous = current;
      }
      this.write(segment, previous, head);
      shade(segment, 0, n / (n + 1));
      shade(segment, 1, 1);
      segment++;
    });
    this.geometry.instanceCount = segment;
    for (const name of ['instanceStart', 'instanceColorStart', 'instanceWidthStart']) {
      const attribute = this.geometry.attributes[name];
      if (attribute && 'data' in attribute) attribute.data.needsUpdate = true;
    }
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

  /** Grosores por extremo de segmento: un búfer intercalado como el de los colores de three. */
  private setWidths(widths: Float32Array): void {
    const buffer = new InstancedInterleavedBuffer(widths, 2, 1);
    this.geometry.setAttribute('instanceWidthStart', new InterleavedBufferAttribute(buffer, 1, 0));
    this.geometry.setAttribute('instanceWidthEnd', new InterleavedBufferAttribute(buffer, 1, 1));
  }

  /** Escribe las posiciones de un segmento en ejes de Three: ECL (x, y, z) → (x, z, −y). */
  private write(segment: number, a: Vec3, b: Vec3): void {
    const o = 6 * segment;
    const p = this.positions;
    p[o] = a.x;
    p[o + 1] = a.z;
    p[o + 2] = -a.y;
    p[o + 3] = b.x;
    p[o + 4] = b.z;
    p[o + 5] = -b.y;
  }

  private segmentCount(): number {
    return this.sources.reduce((sum, source) => sum + source.segments + 1, 0);
  }
}

/** Desvanecimiento a lo largo de la órbita: 1 en el cuerpo y `TAIL_ALPHA` al final. */
const fade = (u: number): number => TAIL_ALPHA + (1 - TAIL_ALPHA) * (1 - u) ** 1.6;

/**
 * Peso de la estela (D34) a `along` de vuelta del cuerpo, contada en el sentido de la estela: 1 en el
 * cuerpo, que baja como (1 − s)^falloff hasta 0 al cubrir `fraction` de la vuelta (s = along/fraction).
 */
export function trailWeight(along: number, fraction: number, falloff: number): number {
  if (!(fraction > 0) || along >= fraction) return 0;
  return (1 - Math.max(along, 0) / fraction) ** falloff;
}

/**
 * Color de una estela: el del cuerpo con su canal mayor a 1 (en el espacio lineal), el tono más vivo
 * que admite la mezcla aditiva. Los colores esquemáticos son apagados (Neptuno, azul oscuro, quedaría
 * por debajo de la órbita); así, todas las estelas destacan sobre ella con su tono.
 */
export function trailColor(hex: string): Color {
  const color = new Color(hex);
  const max = Math.max(color.r, color.g, color.b);
  return max > 0 ? color.multiplyScalar(1 / max) : color.setScalar(1);
}
