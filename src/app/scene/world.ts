/**
 * El mundo de la escena: el grafo de three con el Sol, los 29 cuerpos, los anillos de Saturno, las
 * órbitas y las estrellas. En cada frame lo actualiza el motor con:
 * - las posiciones y radios del marco (relativos al foco, float64) de `FrameController`;
 * - la orientación verdadera de cada cuerpo (D19) y la dirección real del Sol (D21);
 * - la cámara, para los planos de recorte y los uniformes que dependen de la vista.
 *
 * Cada cuerpo lleva el sombreado de su tipo (D29, `data/photometry.ts`) con el brillo calibrado con
 * su albedo geométrico, y los que tienen atmósfera, un halo por encima del limbo.
 *
 * Todo lo que crea lo libera en `dispose()`, también al cambiar de calidad (geometrías y texturas).
 */
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  FrontSide,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  SphereGeometry,
  Uniform,
  Vector3,
} from 'three';
import { BODY_DATA } from '../data/body-data';
import type { BodyId } from '../data/body.model';
import { BODY_PHOTOMETRY, BodyPhotometry, RING_PHOTOMETRY } from '../data/photometry';
import { eclRotationToThree } from '../ephemeris/coordinates';
import { albedoScale } from '../ephemeris/photometry';
import type { SystemState } from '../ephemeris/system-state';
import { KM_PER_AU } from '../ephemeris/constants';
import { Mat3, Vec3, mulMat3Vec, transposeMat3 } from '../ephemeris/vec3';
import { SCHEMATIC_COLORS } from './body-colors';
import type { FrameController } from './frames';
import {
  ATMOSPHERE_SHELL_HEIGHTS,
  AtmosphereUniforms,
  createAtmosphereMaterial,
} from './materials/atmosphere-material';
import { BodyMaterialUniforms, EarthUniforms, createBodyMaterial } from './materials/body-material';
import { createMilkyWayMaterial } from './materials/milky-way-material';
import { createRingMaterial } from './materials/ring-material';
import { createHaloMaterial, createSunMaterial } from './materials/sun-material';
import { OrbitLines, OrbitSource, TrailDirection } from './orbits';
import type { ScreenBody } from './picking';
import type { QualityProfile, TextureLevel } from './quality';
import { StarField, temperatureToSrgb } from './stars';
import { SceneBody, sceneBody } from './system';
import { TEXTURE_MEAN_LUMINANCE } from './texture-files';
import { VISUAL_CONFIG } from './visual-config';
import {
  LoadedTexture,
  TextureId,
  TextureMeta,
  TextureSource,
  meridianOffset,
  releaseTexture,
} from './textures';
import type { ViewProjection } from './view-insets';

/**
 * Textura de color de cada cuerpo que la tiene (las demás lunas, en la fase 7). El Sol no lleva:
 * su fotosfera es procedural (fase 3b).
 */
export const BODY_TEXTURES: Readonly<Partial<Record<BodyId, TextureId>>> = {
  mercurio: 'mercury',
  venus: 'venus',
  tierra: 'earth-day',
  marte: 'mars',
  jupiter: 'jupiter',
  saturno: 'saturn',
  urano: 'uranus',
  neptuno: 'neptune',
  luna: 'moon',
};

/**
 * Mapa de normales del relieve de cada cuerpo que lo tiene (fase 3b; la Luna, en la fase 6). Solo se
 * carga con el cuerpo en primer plano: en la vista general no se vería.
 */
export const BODY_RELIEF_TEXTURES: Readonly<Partial<Record<BodyId, TextureId>>> = {
  mercurio: 'mercury-normal',
  tierra: 'earth-normal',
  marte: 'mars-normal',
};

/**
 * Mapas de la Tierra además del de día (fase 5): las nubes, también en la vista general (son las que
 * le dan su brillo); las luces nocturnas y la máscara del océano, solo en primer plano.
 */
const EARTH_MAPS = [
  { id: 'earth-clouds', uniform: 'uCloudMap', flag: 'uHasClouds', nearOnly: false },
  { id: 'earth-night', uniform: 'uNightMap', flag: 'uHasNight', nearOnly: true },
  { id: 'earth-specular', uniform: 'uSpecularMap', flag: 'uHasSpecular', nearOnly: true },
] as const;

interface BodyMap {
  readonly id: TextureId;
  readonly uniform: (typeof EARTH_MAPS)[number]['uniform'];
  readonly flag: (typeof EARTH_MAPS)[number]['flag'];
  readonly nearOnly: boolean;
  loaded: LoadedTexture | null;
  requested: TextureLevel | null;
}

/** Radios de los anillos (km), del catálogo; los sustituye la tira calibrada si hay textura. */
export interface RingRadii {
  readonly innerKm: number;
  readonly outerKm: number;
}

export interface WorldOptions {
  readonly bodies: readonly SceneBody[];
  readonly profile: QualityProfile;
  readonly orbitSources: (profile: QualityProfile) => readonly OrbitSource[];
  readonly textures: TextureSource | null;
  readonly textureMeta: Readonly<Record<TextureId, TextureMeta>> | null;
  readonly rings: RingRadii;
  /** Algo ha cambiado fuera del bucle (por ejemplo, ha llegado una textura): hay que pintar. */
  readonly invalidate: () => void;
}

export interface WorldFrame {
  readonly frames: FrameController;
  readonly state: SystemState;
  readonly orientations: readonly Mat3[];
  readonly focusIndex: number;
  /** Cuerpo cuya órbita va resaltada (−1: ninguno). */
  readonly highlighted: number;
  readonly speedDaysPerSecond: number;
  readonly viewport: { readonly width: number; readonly height: number };
  /** Cuerpos proyectados en pantalla en el frame anterior (para decidir qué órbitas se ven). */
  readonly screen: readonly ScreenBody[];
  /** Vista de detalle (Tierra, Luna): las órbitas de los planetas pasan a un segundo plano. */
  readonly detail: boolean;
  /** Proyección de la cámara con los márgenes de la interfaz (`setViewOffset`, PLAN 3.c.6). */
  readonly projection: ViewProjection;
  /** Sentido de las estelas (D34): el de la reproducción, también en pausa. */
  readonly trailDirection: TrailDirection;
  /**
   * Presencia de cada cuerpo, de 0 a 1 (`moonPresence`): las lunas de un sistema que aún no se
   * distingue en pantalla, 0; lo demás, 1. Escala el disco y la órbita de cada luna.
   */
  readonly presence: Float64Array;
  /** Velocidades altas (§4.5): cuerpos que no se dibujan (su órbita los sustituye)… */
  readonly aliasedOrbit: Uint8Array | null;
  /** …y cuerpos cuya rotación propia se congela. */
  readonly frozenSpin: Uint8Array | null;
}

interface BodyVisual {
  readonly body: SceneBody;
  readonly mesh: Mesh;
  readonly uniforms: BodyMaterialUniforms | null;
  /** Uniformes propios de la Tierra (fase 5), con sus mapas; `null` en los demás cuerpos. */
  readonly earth: EarthUniforms | null;
  readonly maps: readonly BodyMap[];
  /** Fotometría del cuerpo (`null` en el Sol, que emite luz). */
  readonly photometry: BodyPhotometry | null;
  /** Halo de la atmósfera, si la tiene. */
  readonly atmosphere: { readonly mesh: Mesh; readonly uniforms: AtmosphereUniforms } | null;
  /** Mapa de normales del relieve (solo en primer plano), si lo tiene. */
  readonly relief: {
    readonly id: TextureId;
    loaded: LoadedTexture | null;
    requested: TextureLevel | null;
  } | null;
  readonly textureId: TextureId | null;
  loaded: LoadedTexture | null;
  requested: TextureLevel | null;
  /** La rotación está congelada (velocidades altas): se conserva la última orientación. */
  frozen: boolean;
}

const tmpMatrix = new Matrix4();
const tmpQuaternion = new Quaternion();
const tmpVector = new Vector3();
const { halo: HALO, granulation: GRANULATION, intensity: SUN_INTENSITY } = VISUAL_CONFIG.sun;
/** La Luna y los radios de la Luna y del Sol, para la sombra de los eclipses en la Tierra. */
const LUNA_INDEX = sceneBody('luna').index;
const MOON_RADIUS_KM = BODY_DATA.luna.physical.radiusKm.value;
const SUN_RADIUS_KM = BODY_DATA.sol.physical.radiusKm.value;
/** Opacidad de la órbita de una luna con su sistema resuelto en pantalla. */
const MOON_ORBIT_OPACITY = 0.7;
/** Presencia mínima con la que se dibuja una luna (más pequeña, no llegaría a un píxel). */
const MIN_PRESENCE = 0.05;
/** Segmentos de la esfera ligera de las lunas pequeñas (a lo ancho). */
const COARSE_SEGMENTS = 32;

/**
 * Factor de albedo de un cuerpo (D29): lleva su textura (o su color esquemático, mientras no llega)
 * a su albedo geométrico. 1 si el cuerpo no se calibra (la Tierra, hasta la fase 5).
 */
export function bodyAlbedoScale(
  id: BodyId,
  photometry: BodyPhotometry,
  meanLuminance: number,
): number {
  const albedo = BODY_DATA[id].physical.geometricAlbedo?.value;
  if (!photometry.calibrateAlbedo || albedo === undefined) return 1;
  return albedoScale(albedo, meanLuminance, photometry.photometry);
}

/** Luminancia lineal (Rec. 709) de un color de three (sus componentes ya son lineales). */
const colorLuminance = (color: Color): number =>
  0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;

/** Coloca un vector ECL (x, y, z) en ejes de Three (x, z, −y). */
function setFromEcl(target: Vector3, array: Float64Array, index: number): Vector3 {
  const k = 3 * index;
  return target.set(array[k] as number, array[k + 2] as number, -(array[k + 1] as number));
}

/** Anillo plano en XZ (el ecuador del planeta), con u = posición radial de 0 a 1. */
export function createRingGeometry(inner: number, outer: number, segments: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    positions.push(inner * c, 0, inner * s, outer * c, 0, outer * s);
    uvs.push(0, i / segments, 1, i / segments);
    normals.push(0, 1, 0, 0, 1, 0);
    if (i < segments) {
      const a = 2 * i;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
}

export class World {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(40, 1, 0.01, 1000);
  readonly orbits: OrbitLines;
  private profile: QualityProfile;
  /** Esfera detallada (Sol, planetas, la Luna y el cuerpo enfocado) y esfera ligera (las demás lunas). */
  private sphere: SphereGeometry;
  private coarseSphere: SphereGeometry;
  private focusIndex: number | null = null;
  private readonly visuals: BodyVisual[];
  private readonly sun: ReturnType<typeof createSunMaterial>;
  private readonly halo: Mesh;
  private readonly haloMaterial: ReturnType<typeof createHaloMaterial>;
  private readonly rings: Mesh | null = null;
  private readonly ringMaterial: ReturnType<typeof createRingMaterial> | null = null;
  private ringTexture: LoadedTexture | null = null;
  private ringRequested: TextureLevel | null = null;
  private stars: StarField | null = null;
  /** Ganancia del fondo vigente (las estrellas llegan después de crear el mundo). */
  private backgroundGain = 1;
  private readonly milkyWay: Mesh;
  private readonly milkyWayMaterial = createMilkyWayMaterial();
  private milkyWayTexture: LoadedTexture | null = null;
  private milkyWayRequested: TextureLevel | null = null;
  private orbitSources: readonly OrbitSource[];
  /** Solo en captura: el único cuerpo que se dibuja (las miniaturas de las fichas, fase 3c). */
  private isolated: number | null = null;
  private disposed = false;

  constructor(private readonly options: WorldOptions) {
    this.profile = options.profile;
    this.scene.name = 'tierra-luna-sol';
    this.sphere = this.createSphere(options.profile.sphereSegments);
    this.coarseSphere = this.createSphere(COARSE_SEGMENTS);
    // Color de la fotosfera: un cuerpo negro a la temperatura efectiva del catálogo.
    const temperature = BODY_DATA.sol.physical.effectiveTemperatureK?.value ?? 5772;
    const [r, g, b] = temperatureToSrgb(temperature);
    this.sun = createSunMaterial(new Color().setRGB(r, g, b, SRGBColorSpace));
    this.haloMaterial = createHaloMaterial();
    this.halo = new Mesh(new PlaneGeometry(2, 2), this.haloMaterial.material);
    this.halo.name = 'sun-halo';
    this.halo.frustumCulled = false;
    this.halo.renderOrder = 2;
    this.scene.add(this.halo);

    this.visuals = options.bodies.map((body) => {
      const photometry = body.id === 'sol' ? null : BODY_PHOTOMETRY[body.id];
      const color = new Color(SCHEMATIC_COLORS[body.id]);
      const bodyMaterial = photometry
        ? createBodyMaterial({
            color,
            polarScale: 1 - body.flattening,
            photometry: photometry.photometry,
            haze: photometry.haze,
            hazeColor: photometry.hazeColor,
            earth: body.id === 'tierra',
          })
        : null;
      if (bodyMaterial?.earth) configureEarth(bodyMaterial.earth);
      if (bodyMaterial && photometry?.chromaticity) {
        const [r, g, b] = photometry.chromaticity.rgb;
        bodyMaterial.uniforms.uChromaticity.value.set(r, g, b, photometry.chromaticity.mix);
      }
      if (bodyMaterial && photometry) {
        bodyMaterial.uniforms.uAlbedoScale.value = bodyAlbedoScale(
          body.id,
          photometry,
          colorLuminance(color),
        );
      }
      const mesh = new Mesh(
        this.detailed(body, null) ? this.sphere : this.coarseSphere,
        bodyMaterial ? bodyMaterial.material : this.sun.material,
      );
      mesh.name = body.id;
      mesh.matrixAutoUpdate = true;
      this.scene.add(mesh);
      return {
        body,
        mesh,
        uniforms: bodyMaterial?.uniforms ?? null,
        earth: bodyMaterial?.earth ?? null,
        maps: bodyMaterial?.earth
          ? EARTH_MAPS.map((map) => ({ ...map, loaded: null, requested: null }))
          : [],
        photometry,
        atmosphere:
          bodyMaterial && photometry
            ? this.createAtmosphere(mesh, photometry, bodyMaterial.uniforms)
            : null,
        textureId: BODY_TEXTURES[body.id] ?? null,
        relief: BODY_RELIEF_TEXTURES[body.id]
          ? { id: BODY_RELIEF_TEXTURES[body.id] as TextureId, loaded: null, requested: null }
          : null,
        loaded: null,
        requested: null,
        frozen: false,
      };
    });

    const saturn = this.visuals.find((v) => v.body.id === 'saturno');
    if (saturn) {
      const radiusKm = saturn.body.radiusKm;
      const ringRadii = this.ringRadiiKm();
      this.ringMaterial = createRingMaterial({
        polarScale: 1 - saturn.body.flattening,
        photometry: RING_PHOTOMETRY.photometry,
      });
      this.rings = new Mesh(
        createRingGeometry(ringRadii.innerKm / radiusKm, ringRadii.outerKm / radiusKm, 256),
        this.ringMaterial.material,
      );
      this.rings.name = 'saturn-rings';
      this.rings.renderOrder = 3;
      // Hijo del planeta: hereda su orientación y su escala (la Y no afecta: está en y = 0).
      saturn.mesh.add(this.rings);
      if (saturn.uniforms) {
        saturn.uniforms.uRingShadow.value = 1;
        saturn.uniforms.uRingShine.value = RING_PHOTOMETRY.ringShine;
        saturn.uniforms.uRingRadii.value.set(
          ringRadii.innerKm / radiusKm,
          ringRadii.outerKm / radiusKm,
        );
      }
    }

    this.orbitSources = options.orbitSources(options.profile);
    this.orbits = new OrbitLines(this.orbitSources);
    this.scene.add(this.orbits.object);

    // Vía Láctea: esfera interior centrada en la cámara (solo gira), pintada antes que todo.
    this.milkyWay = new Mesh(new SphereGeometry(1, 64, 32), this.milkyWayMaterial.material);
    this.milkyWay.name = 'milky-way';
    this.milkyWay.renderOrder = -20;
    this.milkyWay.frustumCulled = false;
    // Sin textura no se dibuja (sería una esfera a pantalla completa que lo descarta todo).
    this.milkyWay.visible = false;
    this.scene.add(this.milkyWay);
  }

  /** Añade el cielo de estrellas cuando llega el catálogo. */
  setStars(stars: StarField): void {
    this.stars?.dispose();
    if (this.stars) this.scene.remove(this.stars.object);
    this.stars = stars;
    stars.setMagnitudeLimit(this.profile.starMagnitudeLimit);
    stars.setBrightness(this.backgroundGain);
    stars.object.visible = this.isolated === null;
    this.scene.add(stars.object);
  }

  /**
   * Solo en captura: dibuja un único cuerpo, sin estrellas, Vía Láctea ni órbitas (las miniaturas
   * de las fichas de cuerpos, fase 3c). Los anillos de Saturno van con Saturno y el halo, con el Sol.
   */
  setIsolated(index: number | null): void {
    this.isolated = index;
    const all = index === null;
    if (this.stars) this.stars.object.visible = all;
    this.milkyWay.visible = all && this.milkyWayTexture !== null;
    this.orbits.object.visible = all;
    this.halo.visible = all || this.visuals[index]?.body.kind === 'star';
  }

  /** Cambia de calidad: esferas, estrellas, órbitas y texturas (las anteriores se liberan). */
  setQuality(profile: QualityProfile): void {
    if (profile === this.profile) return;
    this.profile = profile;
    const old = this.sphere;
    this.sphere = this.createSphere(profile.sphereSegments);
    old.dispose();
    this.stars?.setMagnitudeLimit(profile.starMagnitudeLimit);
    this.orbitSources = this.options.orbitSources(profile);
    this.orbits.setSources(this.orbitSources);
    this.setFocus(this.focusIndex);
  }

  /**
   * Cambia el cuerpo enfocado (`null`: vista general): su esfera pasa a ser la detallada y sus
   * texturas, las del nivel del foco.
   */
  setFocus(focusIndex: number | null): void {
    this.focusIndex = focusIndex;
    for (const visual of this.visuals) {
      visual.mesh.geometry = this.detailed(visual.body, focusIndex)
        ? this.sphere
        : this.coarseSphere;
    }
    this.requestTextures(focusIndex);
  }

  /**
   * Pide las texturas que tocan: el nivel de la vista general para todos y el del foco para el
   * cuerpo enfocado (y su planeta, si es una luna). Lo que se sustituye se libera.
   */
  private requestTextures(focusIndex: number | null): void {
    const source = this.options.textures;
    if (!source) return;
    const skyLevel = this.profile.milkyWayTexture;
    if (skyLevel && this.milkyWayRequested !== skyLevel) {
      this.milkyWayRequested = skyLevel;
      source
        .load('milky-way', skyLevel)
        .then((loaded) => this.assignMilkyWay(skyLevel, loaded))
        .catch((error: unknown) => {
          if (this.milkyWayRequested === skyLevel) this.milkyWayRequested = null;
          textureFailed('milky-way', error);
        });
    }
    const focusBody = focusIndex === null ? undefined : this.visuals[focusIndex]?.body;
    const focusPlanet = focusBody?.kind === 'moon' ? focusBody.parent : focusBody?.id;
    for (const visual of this.visuals) {
      if (!visual.textureId) continue;
      const near = visual.body.id === focusBody?.id || visual.body.id === focusPlanet;
      const level = near ? this.profile.focusTexture : this.profile.overviewTexture;
      if (visual.relief) this.requestRelief(visual, near ? this.profile.focusTexture : null);
      for (const map of visual.maps) {
        this.requestMap(visual, map, near ? level : map.nearOnly ? null : level);
      }
      if (visual.requested === level) continue;
      visual.requested = level;
      const id = visual.textureId;
      // Si falla (red, 404), el cuerpo se queda con su color esquemático y se vuelve a pedir en el
      // siguiente cambio de foco o de calidad.
      source
        .load(id, level)
        .then((loaded) => this.assignTexture(visual, level, loaded))
        .catch((error: unknown) => {
          if (visual.requested === level) visual.requested = null;
          textureFailed(id, error);
        });
      if (visual.body.id === 'saturno' && this.ringRequested !== level) {
        this.ringRequested = level;
        source
          .load('saturn-rings', level)
          .then((loaded) => this.assignRingTexture(level, loaded))
          .catch((error: unknown) => {
            if (this.ringRequested === level) this.ringRequested = null;
            textureFailed('saturn-rings', error);
          });
      }
    }
  }

  /**
   * Pide (o suelta, con `null`) el mapa de normales del relieve de un cuerpo, al nivel del primer
   * plano. Fuera del primer plano se libera: en la vista general no se vería y ocupa memoria.
   */
  private requestRelief(visual: BodyVisual, level: TextureLevel | null): void {
    const relief = visual.relief;
    const source = this.options.textures;
    if (!relief || !source || relief.requested === level) return;
    relief.requested = level;
    if (level === null) {
      this.releaseRelief(visual);
      return;
    }
    source
      .load(relief.id, level)
      .then((loaded) => this.assignRelief(visual, level, loaded))
      .catch((error: unknown) => {
        if (relief.requested === level) relief.requested = null;
        textureFailed(relief.id, error);
      });
  }

  private assignRelief(
    visual: BodyVisual,
    level: TextureLevel,
    loaded: LoadedTexture | null,
  ): void {
    const relief = visual.relief;
    if (!loaded || !relief) return;
    if (this.disposed || relief.requested !== level || !visual.uniforms) {
      releaseTexture(loaded.texture);
      return;
    }
    const previous = relief.loaded;
    relief.loaded = loaded;
    visual.uniforms.uNormalMap.value = loaded.texture;
    visual.uniforms.uNormalStrength.value = 1;
    if (previous && previous.texture !== loaded.texture) releaseTexture(previous.texture);
    this.options.invalidate();
  }

  private releaseRelief(visual: BodyVisual): void {
    const relief = visual.relief;
    if (!relief?.loaded) return;
    if (visual.uniforms) {
      visual.uniforms.uNormalMap.value = null;
      visual.uniforms.uNormalStrength.value = 0;
    }
    releaseTexture(relief.loaded.texture);
    relief.loaded = null;
    this.options.invalidate();
  }

  /** Pide un mapa de la Tierra a su nivel (o lo libera con `null`). */
  private requestMap(visual: BodyVisual, map: BodyMap, level: TextureLevel | null): void {
    const source = this.options.textures;
    if (!source || map.requested === level) return;
    map.requested = level;
    if (level === null) {
      this.releaseMap(visual, map);
      return;
    }
    source
      .load(map.id, level)
      .then((loaded) => this.assignMap(visual, map, level, loaded))
      .catch((error: unknown) => {
        if (map.requested === level) map.requested = null;
        textureFailed(map.id, error);
      });
  }

  private assignMap(
    visual: BodyVisual,
    map: BodyMap,
    level: TextureLevel,
    loaded: LoadedTexture | null,
  ): void {
    if (!loaded) return;
    if (this.disposed || map.requested !== level || !visual.earth) {
      releaseTexture(loaded.texture);
      return;
    }
    const previous = map.loaded;
    map.loaded = loaded;
    visual.earth[map.uniform].value = loaded.texture;
    visual.earth[map.flag].value = 1;
    if (previous && previous.texture !== loaded.texture) releaseTexture(previous.texture);
    this.options.invalidate();
  }

  private releaseMap(visual: BodyVisual, map: BodyMap): void {
    if (!map.loaded) return;
    if (visual.earth) {
      visual.earth[map.uniform].value = null;
      visual.earth[map.flag].value = 0;
    }
    releaseTexture(map.loaded.texture);
    map.loaded = null;
    this.options.invalidate();
  }

  /**
   * La Luna y el Sol en el sistema propio de la Tierra, para la sombra de los eclipses (fase 5, D20):
   * con la geometría real del estado (float64), no con la de la escena, y en los ejes de la malla
   * (sistema propio x, y, z → x, z, −y: Y, el polo; el meridiano 0 en +X).
   */
  private updateEclipse(visual: BodyVisual, frame: WorldFrame): void {
    const earth = visual.earth;
    const moon = LUNA_INDEX;
    if (!earth || moon < 0) return;
    const k = visual.body.index;
    const toBody = transposeMat3(frame.orientations[k] as Mat3);
    const toMesh = (v: Vec3): Vec3 => {
      const b = mulMat3Vec(toBody, v);
      return { x: b.x, y: b.z, z: -b.y };
    };
    const radiusAu = visual.body.radiusKm / KM_PER_AU;
    const offset = frame.state.parentOffset;
    const m = toMesh({
      x: (offset[3 * moon] as number) / radiusAu,
      y: (offset[3 * moon + 1] as number) / radiusAu,
      z: (offset[3 * moon + 2] as number) / radiusAu,
    });
    earth.uMoonLocal.value.set(m.x, m.y, m.z, MOON_RADIUS_KM / visual.body.radiusKm);
    const helio = frame.state.heliocentric;
    const toSun = {
      x: -(helio[3 * k] as number),
      y: -(helio[3 * k + 1] as number),
      z: -(helio[3 * k + 2] as number),
    };
    const s = toMesh(toSun);
    earth.uSunLocal.value.set(
      s.x / radiusAu,
      s.y / radiusAu,
      s.z / radiusAu,
      SUN_RADIUS_KM / visual.body.radiusKm,
    );
  }

  /** Deriva de las nubes de la Tierra (fracción de vuelta; 0 con movimiento reducido o en captura). */
  setCloudDrift(turns: number): void {
    for (const visual of this.visuals) {
      if (visual.earth) visual.earth.uCloudOffset.value = turns % 1;
    }
  }

  /** Actualiza el grafo para un frame. Devuelve los planos de recorte que ha puesto. */
  update(frame: WorldFrame): { near: number; far: number } {
    const { frames, state, orientations } = frame;
    const positions = frames.output.position;
    const radii = frames.output.radius;
    const camera = this.camera;
    let nearest = Infinity;
    let farthest = 0;
    const helio = state.heliocentric;
    for (const visual of this.visuals) {
      const k = visual.body.index;
      const mesh = visual.mesh;
      setFromEcl(mesh.position, positions, k);
      // Una luna de un sistema que no se distingue (presencia) crece con él; por debajo de
      // `MIN_PRESENCE` mediría una fracción de píxel y no se dibuja.
      const presence = frame.presence[k] ?? 1;
      const r = (radii[k] as number) * presence;
      mesh.scale.set(r, r * (1 - visual.body.flattening), r);
      mesh.visible =
        presence >= MIN_PRESENCE &&
        (this.isolated === null || this.isolated === k) &&
        frame.aliasedOrbit?.[k] !== 1;
      // Con la rotación congelada se conserva la última orientación pintada (§4.5).
      const frozen = frame.frozenSpin?.[k] === 1;
      if (!frozen || !visual.frozen) {
        const m = eclRotationToThree(orientations[k] as Mat3);
        tmpMatrix.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
        mesh.quaternion.setFromRotationMatrix(tmpMatrix);
      }
      visual.frozen = frozen;
      const distance = tmpVector.copy(mesh.position).sub(camera.position).length();
      // El plano cercano, por delante de la superficie o, con la cámara fuera de él, del halo de la
      // atmósfera (el de Titán mide 1,2 radios: si no, se recortaba su parte delantera).
      const shell = visual.atmosphere ? r * visual.atmosphere.mesh.scale.x : r;
      const front = distance > shell * 1.02 ? shell : r;
      nearest = Math.min(nearest, distance - front * 1.02);
      farthest = Math.max(farthest, distance + r);
      if (visual.uniforms) {
        // Dirección REAL hacia el Sol: −(posición heliocéntrica verdadera), en ejes de Three.
        setFromEcl(visual.uniforms.uSunDirection.value, helio, k).negate().normalize();
      }
      if (visual.earth) this.updateEclipse(visual, frame);
      if (visual.atmosphere) {
        const onScreen = frame.screen[k];
        visual.atmosphere.uniforms.uRadius.value = r;
        visual.atmosphere.mesh.visible =
          mesh.visible && (!onScreen || onScreen.radiusPx >= VISUAL_CONFIG.atmosphereMinRadiusPx);
        // Con la cámara dentro de la esfera del halo, se ven sus caras interiores.
        const side = distance < shell ? BackSide : FrontSide;
        const material = visual.atmosphere.mesh.material as ShaderMaterial;
        if (material.side !== side) {
          material.side = side;
          material.needsUpdate = true;
        }
      }
    }
    this.updateSunAndRings(frame);
    // Planos de recorte: el cercano, por delante de la superficie más próxima; el lejano, más allá
    // de todo (las órbitas se extienden hasta dos veces la distancia del cuerpo más lejano).
    const near = Math.max(nearest * 0.5, farthest * 1e-9, 1e-9);
    const far = Math.max(farthest * 4, near * 10);
    camera.near = near;
    camera.far = far;
    const projection = frame.projection;
    camera.fov = projection.fovDeg;
    camera.aspect = projection.aspect;
    const offset = projection.offset;
    if (offset) {
      camera.setViewOffset(
        offset.fullWidth,
        offset.fullHeight,
        offset.x,
        offset.y,
        offset.width,
        offset.height,
      );
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    const sky = Math.sqrt(near * far);
    this.stars?.setSkyDistance(sky);
    this.milkyWayMaterial.uniforms.uSkyDistance.value = sky;
    this.orbits.setResolution(frame.viewport.width, frame.viewport.height);
    this.orbits.update(
      frames,
      state.timeMs,
      this.orbitOpacity(frame),
      frame.highlighted,
      frame.speedDaysPerSecond,
      frame.trailDirection,
      frame.aliasedOrbit,
    );
    return { near, far };
  }

  /** Cuánto primer plano del Sol hay (0–1): recoge su halo y enciende la granulación. */
  private sunCloseUp = 0;

  /**
   * Aspecto del Sol según el encuadre (configuración visual) y el reloj de pared de la granulación
   * (0 con movimiento reducido o en captura: quieta).
   */
  setSunAppearance(closeUp: number, timeSeconds: number): void {
    this.sunCloseUp = closeUp;
    this.sun.uniforms.uGranulation.value = GRANULATION.amplitude * closeUp;
    this.sun.uniforms.uIntensity.value =
      SUN_INTENSITY.overview + (SUN_INTENSITY.closeUp - SUN_INTENSITY.overview) * closeUp;
    this.sun.uniforms.uTime.value = timeSeconds * GRANULATION.rate;
  }

  /**
   * Ganancia del fondo (configuración visual, `backgroundGain`): la Vía Láctea, las estrellas y las
   * órbitas no siguen la exposición del primer plano.
   */
  setBackgroundGain(gain: number): void {
    this.milkyWayMaterial.uniforms.uGain.value = gain;
    this.stars?.setBrightness(gain);
    this.backgroundGain = gain;
    this.orbits.setGain(gain);
  }

  /** Relleno ilustrativo de los cuerpos (configuración visual), en fracción de la luz del Sol. */
  setFill(fill: number): void {
    for (const visual of this.visuals) if (visual.uniforms) visual.uniforms.uFill.value = fill;
    if (this.ringMaterial) this.ringMaterial.uniforms.uFill.value = fill;
  }

  /**
   * Ángulo de fase (rad) con el que la cámara ve un cuerpo: entre la dirección real hacia el Sol y
   * la dirección hacia la cámara. 0 sin datos.
   */
  phaseAngleOf(index: number): number {
    const visual = this.visuals[index];
    if (!visual?.uniforms) return 0;
    tmpVector.copy(this.camera.position).sub(visual.mesh.position);
    const length = tmpVector.length();
    if (!(length > 0)) return 0;
    const cos = tmpVector.dot(visual.uniforms.uSunDirection.value) / length;
    return Math.acos(Math.min(Math.max(cos, -1), 1));
  }

  setPixelRatio(pixelRatio: number): void {
    this.stars?.setPixelRatio(pixelRatio);
  }

  /** Memoria de vídeo estimada (texturas + geometría), en bytes. */
  vramBytes(): number {
    const textures =
      this.visuals.reduce(
        (sum, v) => sum + (v.loaded?.vramBytes ?? 0) + (v.relief?.loaded?.vramBytes ?? 0),
        0,
      ) +
      (this.ringTexture?.vramBytes ?? 0) +
      (this.milkyWayTexture?.vramBytes ?? 0);
    const geometryBytes = (geometry: BufferGeometry) =>
      Object.values(geometry.attributes).reduce((sum, a) => sum + a.array.byteLength, 0) +
      (geometry.index?.array.byteLength ?? 0);
    return (
      textures + geometryBytes(this.sphere) + (this.rings ? geometryBytes(this.rings.geometry) : 0)
    );
  }

  /** Todos los materiales con shader propio (para comprobar los chunks de profundidad). */
  shaderMaterials(): ShaderMaterial[] {
    const found = new Set<ShaderMaterial>();
    this.scene.traverse((object) => {
      const material = (object as Mesh).material;
      for (const m of Array.isArray(material) ? material : material ? [material] : []) {
        if (m instanceof ShaderMaterial) found.add(m);
      }
    });
    return [...found];
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh && mesh.geometry !== this.sphere && mesh.geometry !== this.coarseSphere) {
        mesh.geometry.dispose();
      }
      const material = mesh.material;
      for (const m of Array.isArray(material) ? material : material ? [material] : []) m.dispose();
    });
    this.sphere.dispose();
    this.coarseSphere.dispose();
    for (const visual of this.visuals) {
      if (visual.loaded) releaseTexture(visual.loaded.texture);
      if (visual.relief?.loaded) releaseTexture(visual.relief.loaded.texture);
      for (const map of visual.maps) if (map.loaded) releaseTexture(map.loaded.texture);
    }
    if (this.ringTexture) releaseTexture(this.ringTexture.texture);
    if (this.milkyWayTexture) releaseTexture(this.milkyWayTexture.texture);
    this.orbits.dispose();
    this.stars?.dispose();
  }

  /** Halo de la atmósfera: hijo del cuerpo (hereda su orientación y su escala), algo mayor que él. */
  private createAtmosphere(
    mesh: Mesh,
    photometry: BodyPhotometry,
    body: BodyMaterialUniforms,
  ): BodyVisual['atmosphere'] {
    const scaleHeight = photometry.haloScaleHeight;
    if (!photometry.haze || !scaleHeight) return null;
    const { material, uniforms } = createAtmosphereMaterial({
      uRadius: new Uniform(1),
      uScaleHeight: new Uniform(scaleHeight),
      uHaze: body.uHaze,
      uHazeColor: body.uHazeColor,
      uSunDirection: body.uSunDirection,
    });
    const shell = new Mesh(this.coarseSphere, material);
    shell.name = `${mesh.name}-atmosphere`;
    shell.scale.setScalar(1 + ATMOSPHERE_SHELL_HEIGHTS * scaleHeight);
    shell.renderOrder = 2;
    mesh.add(shell);
    return { mesh: shell, uniforms };
  }

  private createSphere(segments: number): SphereGeometry {
    return new SphereGeometry(1, segments, Math.max(8, segments / 2));
  }

  /** ¿Lleva la esfera detallada? El Sol, los planetas, la Luna y el cuerpo enfocado. */
  private detailed(body: SceneBody, focusIndex: number | null): boolean {
    return body.kind !== 'moon' || body.id === 'luna' || body.index === focusIndex;
  }

  private ringRadiiKm(): RingRadii {
    const strip = this.options.textureMeta?.['saturn-rings'].ringRadiiKm;
    return strip ? { innerKm: strip.inner, outerKm: strip.outer } : this.options.rings;
  }

  private assignTexture(
    visual: BodyVisual,
    level: TextureLevel,
    loaded: LoadedTexture | null,
  ): void {
    if (!loaded) return;
    if (this.disposed || visual.requested !== level) {
      releaseTexture(loaded.texture);
      return;
    }
    const previous = visual.loaded;
    visual.loaded = loaded;
    const meta = visual.textureId ? this.options.textureMeta?.[visual.textureId] : undefined;
    if (visual.uniforms) {
      visual.uniforms.uMap.value = loaded.texture;
      visual.uniforms.uHasMap.value = 1;
      visual.uniforms.uMeridianOffset.value = meta ? meridianOffset(meta) : 0;
      const luminance = visual.textureId ? TEXTURE_MEAN_LUMINANCE[visual.textureId] : undefined;
      if (luminance !== undefined) visual.uniforms.uMeanLuminance.value = luminance;
      if (visual.photometry?.contrast)
        visual.uniforms.uContrast.value = visual.photometry.contrast.value;
      if (visual.photometry && luminance !== undefined) {
        visual.uniforms.uAlbedoScale.value = bodyAlbedoScale(
          visual.body.id,
          visual.photometry,
          luminance,
        );
      }
    }
    if (previous && previous.texture !== loaded.texture) releaseTexture(previous.texture);
    this.options.invalidate();
  }

  private assignRingTexture(level: TextureLevel, loaded: LoadedTexture | null): void {
    if (!loaded || !this.ringMaterial) return;
    if (this.disposed || this.ringRequested !== level) {
      releaseTexture(loaded.texture);
      return;
    }
    const previous = this.ringTexture;
    this.ringTexture = loaded;
    this.ringMaterial.uniforms.uRingMap.value = loaded.texture;
    this.ringMaterial.uniforms.uHasMap.value = 1;
    const saturn = this.visuals.find((v) => v.body.id === 'saturno');
    if (saturn?.uniforms) saturn.uniforms.uRingMap.value = loaded.texture;
    if (previous) releaseTexture(previous.texture);
    this.options.invalidate();
  }

  private assignMilkyWay(level: TextureLevel, loaded: LoadedTexture | null): void {
    if (!loaded) return;
    if (this.disposed || this.milkyWayRequested !== level) {
      releaseTexture(loaded.texture);
      return;
    }
    const previous = this.milkyWayTexture;
    this.milkyWayTexture = loaded;
    this.milkyWayMaterial.uniforms.uMap.value = loaded.texture;
    this.milkyWayMaterial.uniforms.uHasMap.value = 1;
    this.milkyWay.visible = this.isolated === null;
    if (previous) releaseTexture(previous.texture);
    this.options.invalidate();
  }

  private updateSunAndRings(frame: WorldFrame): void {
    const sunVisual = this.visuals.find((v) => v.body.kind === 'star');
    if (sunVisual) {
      this.halo.position.copy(sunVisual.mesh.position);
      const t = this.sunCloseUp;
      const radii = HALO.overview.radii + (HALO.closeUp.radii - HALO.overview.radii) * t;
      this.haloMaterial.uniforms.uRadius.value = sunVisual.mesh.scale.x * radii;
      this.haloMaterial.uniforms.uIntensity.value =
        HALO.overview.intensity + (HALO.closeUp.intensity - HALO.overview.intensity) * t;
      this.haloMaterial.uniforms.uViewportHeight.value = frame.viewport.height;
    }
    const saturn = this.visuals.find((v) => v.body.id === 'saturno');
    if (!saturn?.uniforms || !this.ringMaterial) return;
    // Del mundo al sistema propio de Saturno (rotación inversa) y en radios ecuatoriales.
    tmpQuaternion.copy(saturn.mesh.quaternion).invert();
    const sunLocal = tmpVector
      .copy(saturn.uniforms.uSunDirection.value)
      .applyQuaternion(tmpQuaternion);
    saturn.uniforms.uSunDirectionLocal.value.copy(sunLocal);
    this.ringMaterial.uniforms.uSunDirectionLocal.value.copy(sunLocal);
    const radius = saturn.mesh.scale.x;
    this.ringMaterial.uniforms.uCameraLocal.value
      .copy(this.camera.position)
      .sub(saturn.mesh.position)
      .applyQuaternion(tmpQuaternion)
      .divideScalar(radius);
  }

  /**
   * Opacidad de cada órbita. Las de los planetas se ven siempre (más tenues fuera de la vista
   * general); las de las lunas, con su luna: aparecen cuando su sistema se resuelve en pantalla
   * (`moonPresence`). La separación es la de su distancia real en el espacio a la escala del disco
   * en pantalla: no depende de por dónde pase la luna (delante del disco, la órbita no se apaga) y en
   * los sistemas compactos de la vista general (fase 4b) deja las órbitas ocultas hasta acercarse.
   */
  private orbitOpacity(frame: WorldFrame): number[] {
    const physical = frame.frames.targetSpec.kind === 'physical';
    return this.orbitSources.map((source) => {
      // En un marco físico, la órbita del propio planeta enfocado es casi una recta que lo
      // atraviesa: se deja tenue (indica hacia dónde se mueve).
      if (source.parentIndex < 0) {
        if (!physical) return VISUAL_CONFIG.overviewOrbitOpacity;
        if (frame.detail) return 0.12;
        return source.bodyIndex === frame.focusIndex ? 0.3 : 0.5;
      }
      const parent = frame.screen[source.parentIndex];
      if (!parent?.onScreen) return 0;
      return (frame.presence[source.bodyIndex] ?? 0) * MOON_ORBIT_OPACITY;
    });
  }
}

/** Los valores de presentación de la Tierra (`VISUAL_CONFIG.earth`) en sus uniformes. */
function configureEarth(earth: EarthUniforms): void {
  const config = VISUAL_CONFIG.earth;
  earth.uEarth.value.set(config.cloudAlbedo, config.nightLights, config.glint, config.cloudShadow);
  const scatter = new Color(config.scatter.color).multiplyScalar(config.scatter.intensity);
  earth.uScatter.value.set(scatter.r, scatter.g, scatter.b, config.scatter.limb);
  earth.uTwilightColor.value.set(config.twilight);
}

/** Una textura no ha llegado: no es un error fatal (queda el color esquemático), pero se anota. */
function textureFailed(id: TextureId, error: unknown): void {
  console.warn(`[texturas] No se ha podido cargar «${id}»:`, error);
}
