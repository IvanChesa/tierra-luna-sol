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
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
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
import { Mat3 } from '../ephemeris/vec3';
import { SCHEMATIC_COLORS } from './body-colors';
import type { FrameController } from './frames';
import {
  ATMOSPHERE_SHELL_HEIGHTS,
  AtmosphereUniforms,
  createAtmosphereMaterial,
} from './materials/atmosphere-material';
import { BodyMaterialUniforms, createBodyMaterial } from './materials/body-material';
import { createMilkyWayMaterial } from './materials/milky-way-material';
import { createRingMaterial } from './materials/ring-material';
import { createHaloMaterial, createSunMaterial } from './materials/sun-material';
import { OrbitLines, OrbitSource } from './orbits';
import type { ScreenBody } from './picking';
import type { QualityProfile, TextureLevel } from './quality';
import { StarField } from './stars';
import type { SceneBody } from './system';
import { TEXTURE_MEAN_LUMINANCE } from './texture-files';
import {
  LoadedTexture,
  TextureId,
  TextureMeta,
  TextureSource,
  meridianOffset,
  releaseTexture,
} from './textures';
import type { ViewProjection } from './view-insets';

/** Textura de color de cada cuerpo que la tiene (las demás lunas, en la fase 7). */
export const BODY_TEXTURES: Readonly<Partial<Record<BodyId, TextureId>>> = {
  sol: 'sun',
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
  marte: 'mars-normal',
};

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
  /** Días simulados que cubre la estela de movimiento (0 en pausa; negativo hacia atrás). */
  readonly trailDays: number;
  /** Velocidades altas (§4.5): cuerpos que no se dibujan (su órbita los sustituye)… */
  readonly aliasedOrbit: Uint8Array | null;
  /** …y cuerpos cuya rotación propia se congela. */
  readonly frozenSpin: Uint8Array | null;
}

interface BodyVisual {
  readonly body: SceneBody;
  readonly mesh: Mesh;
  readonly uniforms: BodyMaterialUniforms | null;
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
/** Tamaño del halo del Sol, en radios solares. */
const HALO_RADII = 3.2;
/** Segmentos de la esfera ligera de las lunas pequeñas (a lo ancho). */
const COARSE_SEGMENTS = 32;
/** Por debajo de este radio en pantalla (px CSS), el halo de la atmósfera no se dibuja: no se vería. */
const ATMOSPHERE_MIN_RADIUS_PX = 2;

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
  private readonly milkyWay: Mesh;
  private readonly milkyWayMaterial = createMilkyWayMaterial();
  private milkyWayTexture: LoadedTexture | null = null;
  private milkyWayRequested: TextureLevel | null = null;
  private orbitSources: readonly OrbitSource[];
  private disposed = false;

  constructor(private readonly options: WorldOptions) {
    this.profile = options.profile;
    this.scene.name = 'tierra-luna-sol';
    this.sphere = this.createSphere(options.profile.sphereSegments);
    this.coarseSphere = this.createSphere(COARSE_SEGMENTS);
    this.sun = createSunMaterial();
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
          })
        : null;
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
    this.scene.add(stars.object);
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
      const r = radii[k] as number;
      mesh.scale.set(r, r * (1 - visual.body.flattening), r);
      mesh.visible = frame.aliasedOrbit?.[k] !== 1;
      // Con la rotación congelada se conserva la última orientación pintada (§4.5).
      const frozen = frame.frozenSpin?.[k] === 1;
      if (!frozen || !visual.frozen) {
        const m = eclRotationToThree(orientations[k] as Mat3);
        tmpMatrix.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
        mesh.quaternion.setFromRotationMatrix(tmpMatrix);
      }
      visual.frozen = frozen;
      const distance = tmpVector.copy(mesh.position).sub(camera.position).length();
      nearest = Math.min(nearest, distance - r * 1.02);
      farthest = Math.max(farthest, distance + r);
      if (visual.uniforms) {
        // Dirección REAL hacia el Sol: −(posición heliocéntrica verdadera), en ejes de Three.
        setFromEcl(visual.uniforms.uSunDirection.value, helio, k).negate().normalize();
      }
      if (visual.atmosphere) {
        const onScreen = frame.screen[k];
        visual.atmosphere.uniforms.uRadius.value = r;
        visual.atmosphere.mesh.visible =
          mesh.visible && (!onScreen || onScreen.radiusPx >= ATMOSPHERE_MIN_RADIUS_PX);
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
      frame.trailDays,
      frame.aliasedOrbit,
    );
    return { near, far };
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

  /** Factor de albedo de un cuerpo (para las pruebas y el informe). */
  albedoScaleOf(id: BodyId): number | null {
    return this.visuals.find((v) => v.body.id === id)?.uniforms?.uAlbedoScale.value ?? null;
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
      if (visual.photometry && luminance !== undefined) {
        visual.uniforms.uAlbedoScale.value = bodyAlbedoScale(
          visual.body.id,
          visual.photometry,
          luminance,
        );
      }
    } else {
      this.sun.uniforms.uMap.value = loaded.texture;
      this.sun.uniforms.uHasMap.value = 1;
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
    this.milkyWay.visible = true;
    if (previous) releaseTexture(previous.texture);
    this.options.invalidate();
  }

  private updateSunAndRings(frame: WorldFrame): void {
    const sunVisual = this.visuals.find((v) => v.body.kind === 'star');
    if (sunVisual) {
      this.halo.position.copy(sunVisual.mesh.position);
      this.haloMaterial.uniforms.uRadius.value = sunVisual.mesh.scale.x * HALO_RADII;
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
   * general); las de las lunas aparecen cuando su sistema se resuelve en pantalla (de 8 a 30 px).
   */
  private orbitOpacity(frame: WorldFrame): number[] {
    const physical = frame.frames.targetSpec.kind === 'physical';
    return this.orbitSources.map((source) => {
      // En un marco físico, la órbita del propio planeta enfocado es casi una recta que lo
      // atraviesa: se deja tenue (indica hacia dónde se mueve).
      if (source.parentIndex < 0) {
        if (!physical) return 0.85;
        if (frame.detail) return 0.12;
        return source.bodyIndex === frame.focusIndex ? 0.3 : 0.5;
      }
      const moon = frame.screen[source.bodyIndex];
      const parent = frame.screen[source.parentIndex];
      if (!moon || !parent || !parent.onScreen) return 0;
      const separation = Math.hypot(moon.x - parent.x, moon.y - parent.y);
      const t = Math.min(Math.max((separation - 8) / 22, 0), 1);
      return t * t * (3 - 2 * t) * 0.7;
    });
  }
}

/** Una textura no ha llegado: no es un error fatal (queda el color esquemático), pero se anota. */
function textureFailed(id: TextureId, error: unknown): void {
  console.warn(`[texturas] No se ha podido cargar «${id}»:`, error);
}
