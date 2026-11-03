/**
 * La escena del cielo desde un lugar (fase 8): la cúpula vista desde el suelo, con su propia cámara y
 * el mismo renderer que el espacio (D10: un solo lienzo; el motor elige qué escena pinta). Todo está
 * en el infinito, centrado en la cámara, en los ejes del cielo en Three (X al este, Y al cénit, Z al
 * sur): la Vía Láctea, las estrellas HYG y las constelaciones giran con la rotación ECL → horizonte del
 * lugar (`eclThreeToSkyThree`); el Sol, la Luna y los planetas van donde los pone `ephemeris/sky.ts`
 * (topocéntricos, aparentes y con la refracción).
 *
 * El orden de pintado, en `sky-materials.ts`: lo de fuera de la atmósfera, la luz del cielo sumada y
 * el suelo. Lo que crea se libera en `dispose()`; las texturas (la Vía Láctea y la Luna) son las del
 * espacio, compartidas: no añaden memoria de vídeo.
 */
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  SphereGeometry,
  Texture,
  Vector3,
} from 'three';
import {
  ECL_TO_THREE,
  eqjToEcl,
  equatorialToVector,
  horizontalToSkyThree,
} from '../../ephemeris/coordinates';
import type { SkyBody, SkyBodyId } from '../../ephemeris/sky';
import { StarCatalog, starDirectionsEcl } from '../../ephemeris/stars';
import { Mat3, Vec3, mulMat3Vec } from '../../ephemeris/vec3';
import { SCHEMATIC_COLORS } from '../body-colors';
import { createMilkyWayMaterial } from '../materials/milky-way-material';
import { bvToTemperature, temperatureToSrgb } from '../stars';
import type { ViewInsets, ViewProjection } from '../view-insets';
import { VISUAL_CONFIG } from '../visual-config';
import {
  constellationOpacityAt,
  daylightAt,
  eclipseSkyAltitude,
  milkyWayGainAt,
  skyColorsAt,
  srgbHexToLinear,
  starLimitAt,
} from './sky-colors';
import { SkyLabelPlacement, SkyLabelSpec, SkyLabels } from './sky-labels';
import {
  createConstellationMaterial,
  createCoronaMaterial,
  createGroundMaterial,
  createPlanetMaterial,
  createSkyDomeMaterial,
  createSkyMoonMaterial,
  createSkyStarMaterial,
  createSunDiscMaterial,
} from './sky-materials';
import type { SkyPose } from './sky-rig';

/** Distancia a la que se dibuja todo (entre los planos cercano y lejano de la cámara). */
const SKY_DISTANCE = 50;
const DEG = Math.PI / 180;

/** Las líneas de las constelaciones (`public/data/constellations.json`, fase 8). */
export interface ConstellationData {
  readonly constellations: readonly {
    readonly id: string;
    /** El nombre oficial de la IAU, en latín: el secundario de la etiqueta (D38). */
    readonly name: string;
    /** El nombre en español (D38): el de la etiqueta. */
    readonly es: string;
    /** Ascensión recta y declinación J2000 (grados) donde va su nombre. */
    readonly label: readonly number[];
    /** Polilíneas: [α₁, δ₁, α₂, δ₂, …] en grados J2000. */
    readonly lines: readonly (readonly number[])[];
  }[];
}

/** La sombra de la Tierra en la Luna, vista desde el centro de la Tierra (ejes del cielo). */
export interface SkyMoonShadow {
  readonly moonGeocentric: Vec3;
  readonly antisolar: Vec3;
  readonly moonRadiusRad: number;
  readonly umbraRad: number;
  readonly penumbraRad: number;
}

export interface SkyFrame {
  readonly bodies: readonly SkyBody[];
  /** ECL en ejes de Three → el cielo del lugar (por filas). */
  readonly eclThreeToSky: Mat3;
  /** Altura geométrica del Sol (grados): la de la luz del cielo. */
  readonly sunAltitudeDeg: number;
  /** Parte del disco del Sol tapada por la Luna, vista desde el lugar (0–1). */
  readonly obscuration: number;
  /** La orientación de la Luna: sus ejes de malla (Y, el polo) → el cielo, o `null`. */
  readonly moonOrientation: Mat3 | null;
  readonly moonShadow: SkyMoonShadow;
  readonly pose: SkyPose;
  readonly projection: ViewProjection;
  /** Lo que tapa la interfaz (px CSS): las etiquetas solo van en la parte visible. */
  readonly insets: ViewInsets;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly pixelRatio: number;
  /** El límite de magnitud de la calidad (el catálogo entero en la alta). */
  readonly qualityMagnitudeLimit: number;
}

/** Los puntos cardinales: los cuatro principales y los intermedios, en el horizonte. */
const CARDINALS: readonly (readonly [string, number, boolean])[] = [
  ['N', 0, true],
  ['NE', 45, false],
  ['E', 90, true],
  ['SE', 135, false],
  ['S', 180, true],
  ['SO', 225, false],
  ['O', 270, true],
  ['NO', 315, false],
];

const BODY_NAMES: Readonly<Record<SkyBodyId, string>> = {
  sol: 'Sol',
  luna: 'Luna',
  mercurio: 'Mercurio',
  venus: 'Venus',
  marte: 'Marte',
  jupiter: 'Júpiter',
  saturno: 'Saturno',
  urano: 'Urano',
  neptuno: 'Neptuno',
};

const PLANET_IDS = [
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
] as const;

/**
 * Cuánto se dibuja un planeta (0–1) con la luz del cielo: los que llegan al límite de magnitud, del
 * todo (con un paso suave); de noche cerrada (límite ≥ 6), también los que no se ven a simple vista
 * (Neptuno, magnitud 7,8), tenues y con su nombre: la tabla del cielo los lista, y la vista enseña lo
 * mismo que la tabla (con prismáticos o telescopio, lo dice su texto).
 */
export function planetPresence(magnitude: number, limit: number): number {
  const fade = Math.min(Math.max(limit + 0.5 - magnitude, 0), 1);
  return limit >= 6 ? Math.max(fade, 0.6) : fade;
}

/** El orden de las etiquetas de los cuerpos: el Sol, la Luna y los planetas (por brillo después). */
const labelRank = (body: SkyBody): number => (body.id === 'sol' ? 0 : body.id === 'luna' ? 1 : 2);

/** RA/Dec J2000 (grados) → dirección ECL en los ejes de Three. */
function equatorialToEclThree(raDeg: number, decDeg: number): Vec3 {
  return mulMat3Vec(ECL_TO_THREE, eqjToEcl(equatorialToVector(raDeg, decDeg)));
}

const toMatrix4 = (m: Mat3, target: Matrix4): Matrix4 =>
  target.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);

const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

export interface SkySceneOptions {
  readonly labelLayer: HTMLElement;
  readonly onPick: (id: SkyBodyId) => void;
}

export class SkyScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 1, 0.1, 100);
  private readonly dome = createSkyDomeMaterial();
  private readonly ground = createGroundMaterial();
  private readonly starMaterial = createSkyStarMaterial();
  private readonly milkyWayMaterial = createMilkyWayMaterial();
  private readonly constellationMaterial = createConstellationMaterial();
  private readonly sunMaterial = createSunDiscMaterial();
  private readonly coronaMaterial = createCoronaMaterial();
  private readonly corona: Mesh;
  private readonly moonMaterial = createSkyMoonMaterial();
  private readonly planetMaterial = createPlanetMaterial();
  private readonly domeMesh: Mesh;
  private readonly groundMesh: Mesh;
  private readonly milkyWay: Mesh;
  private readonly sun: Mesh;
  private readonly moon: Mesh;
  private readonly planets: Points;
  private readonly planetGeometry = new BufferGeometry();
  private stars: Points | null = null;
  private constellations: LineSegments | null = null;
  private constellationLabels: { key: string; text: string; direction: Vec3 }[] = [];
  private constellationsVisible = true;
  /** Las líneas se ven con esta luz (de día no): sus nombres, igual. */
  private constellationLinesVisible = true;
  private readonly labels: SkyLabels;
  private labelsVisible = true;
  private readonly geometries: BufferGeometry[] = [];
  private readonly placements = new Map<string, SkyLabelPlacement>();
  /** Posiciones en pantalla (px CSS) y radio de cada cuerpo, del último frame (para el puntero). */
  private screenBodies: { id: SkyBodyId; x: number; y: number; radiusPx: number }[] = [];
  private readonly tmpMatrix = new Matrix4();
  private readonly tmpVector = new Vector3();
  private disposed = false;

  constructor(options: SkySceneOptions) {
    this.scene.name = 'tls-sky';
    // Fondo negro: la luz del cielo se suma después (no el azul del fondo del espacio).
    this.scene.background = new Color(0x000000);
    const dome = new SphereGeometry(1, 64, 32);
    const ground = new SphereGeometry(1, 64, 16, 0, 2 * Math.PI, Math.PI / 2, Math.PI / 2);
    const milkyWay = new SphereGeometry(1, 64, 32);
    const disc = new PlaneGeometry(2, 2);
    const sphere = new SphereGeometry(1, 48, 24);
    this.geometries.push(dome, ground, milkyWay, disc, sphere, this.planetGeometry);

    this.milkyWay = new Mesh(milkyWay, this.milkyWayMaterial.material);
    this.milkyWay.name = 'sky-milky-way';
    this.milkyWay.renderOrder = -30;
    this.milkyWay.frustumCulled = false;
    this.milkyWay.visible = false;
    this.milkyWayMaterial.uniforms.uSkyDistance.value = SKY_DISTANCE * 0.98;
    this.milkyWayMaterial.uniforms.uIntensity.value = VISUAL_CONFIG.sky.milkyWayIntensity;
    this.milkyWayMaterial.uniforms.uKnee.value = VISUAL_CONFIG.sky.milkyWayKnee;

    this.sun = new Mesh(disc, this.sunMaterial.material);
    this.sun.name = 'sky-sun';
    this.sun.renderOrder = -10;
    this.sun.frustumCulled = false;

    this.corona = new Mesh(disc, this.coronaMaterial.material);
    this.corona.name = 'sky-corona';
    this.corona.renderOrder = -9.5;
    this.corona.frustumCulled = false;
    this.corona.visible = false;

    this.moon = new Mesh(sphere, this.moonMaterial.material);
    this.moon.name = 'sky-moon';
    this.moon.renderOrder = -9;
    this.moon.frustumCulled = false;
    this.moonMaterial.uniforms.uUmbraColor.value.set(VISUAL_CONFIG.moon.umbraLight.color);
    this.moonMaterial.uniforms.uUmbraLight.value = VISUAL_CONFIG.moon.umbraLight.intensity;

    const planetCount = PLANET_IDS.length;
    this.planetGeometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(3 * planetCount), 3),
    );
    this.planetGeometry.setAttribute(
      'aMagnitude',
      new BufferAttribute(new Float32Array(planetCount), 1),
    );
    this.planetGeometry.setAttribute(
      'aVisible',
      new BufferAttribute(new Float32Array(planetCount), 1),
    );
    const colors = new Float32Array(3 * planetCount);
    PLANET_IDS.forEach((id, k) => {
      // El color esquemático de cada planeta, aclarado: a simple vista son puntos casi blancos.
      const color = new Color(SCHEMATIC_COLORS[id]).lerp(new Color('#ffffff'), 0.55);
      colors[3 * k] = color.r;
      colors[3 * k + 1] = color.g;
      colors[3 * k + 2] = color.b;
    });
    this.planetGeometry.setAttribute('aColor', new BufferAttribute(colors, 3));
    this.planets = new Points(this.planetGeometry, this.planetMaterial.material);
    this.planets.name = 'sky-planets';
    this.planets.renderOrder = -8;
    this.planets.frustumCulled = false;

    this.domeMesh = new Mesh(dome, this.dome.material);
    this.domeMesh.name = 'sky-dome';
    this.domeMesh.renderOrder = 10;
    this.domeMesh.frustumCulled = false;
    this.dome.material.side = BackSide;
    this.dome.uniforms.uSkyDistance.value = SKY_DISTANCE * 0.99;
    this.dome.uniforms.uGlowPower.value = VISUAL_CONFIG.sky.glow.power;
    this.dome.uniforms.uGlowRise.value = VISUAL_CONFIG.sky.glow.rise;

    this.groundMesh = new Mesh(ground, this.ground.material);
    this.groundMesh.name = 'sky-ground';
    this.groundMesh.renderOrder = 20;
    this.groundMesh.frustumCulled = false;
    this.ground.material.side = BackSide;
    this.ground.uniforms.uSkyDistance.value = SKY_DISTANCE * 0.97;

    this.scene.add(
      this.milkyWay,
      this.sun,
      this.corona,
      this.moon,
      this.planets,
      this.domeMesh,
      this.groundMesh,
    );
    this.camera.position.set(0, 0, 0);

    this.labels = new SkyLabels(options.labelLayer, options.onPick);
    const specs: SkyLabelSpec[] = CARDINALS.map(([text, , main]) => ({
      key: `cardinal-${text}`,
      text,
      kind: main ? 'cardinal' : 'cardinal-minor',
    }));
    for (const id of Object.keys(BODY_NAMES) as SkyBodyId[]) {
      specs.push({ key: `body-${id}`, text: BODY_NAMES[id], kind: 'body', body: id });
    }
    this.labels.define(specs);
  }

  /** Las estrellas del catálogo HYG (las mismas que el espacio), giradas al horizonte del lugar. */
  setStars(catalog: StarCatalog): void {
    if (this.stars) return;
    const directions = starDirectionsEcl(catalog);
    const n = catalog.count;
    const position = new Float32Array(3 * n);
    const color = new Float32Array(3 * n);
    for (let k = 0; k < n; k++) {
      // ECL (x, y, z) → Three (x, z, −y).
      position[3 * k] = directions[3 * k] as number;
      position[3 * k + 1] = directions[3 * k + 2] as number;
      position[3 * k + 2] = -(directions[3 * k + 1] as number);
      const bv = catalog.colorIndex[k] as number;
      const rgb = Number.isNaN(bv) ? ([1, 1, 1] as const) : temperatureToSrgb(bvToTemperature(bv));
      color[3 * k] = srgbToLinear(rgb[0]);
      color[3 * k + 1] = srgbToLinear(rgb[1]);
      color[3 * k + 2] = srgbToLinear(rgb[2]);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(position, 3));
    geometry.setAttribute('aColor', new BufferAttribute(color, 3));
    geometry.setAttribute(
      'aMagnitude',
      new BufferAttribute(Float32Array.from(catalog.magnitude), 1),
    );
    this.geometries.push(geometry);
    this.stars = new Points(geometry, this.starMaterial.material);
    this.stars.name = 'sky-stars';
    this.stars.renderOrder = -20;
    this.stars.frustumCulled = false;
    this.starMaterial.uniforms.uSkyDistance.value = SKY_DISTANCE * 0.96;
    this.starMaterial.uniforms.uExtinction.value = VISUAL_CONFIG.sky.extinction;
    this.scene.add(this.stars);
  }

  /** Las líneas de las constelaciones y la posición de sus nombres (llegan al abrir la vista). */
  setConstellations(data: ConstellationData): void {
    if (this.constellations || this.disposed) return;
    const vertices: number[] = [];
    const specs: SkyLabelSpec[] = [];
    this.constellationLabels = [];
    data.constellations.forEach((constellation, k) => {
      for (const polyline of constellation.lines) {
        for (let i = 0; i + 3 < polyline.length; i += 2) {
          const a = equatorialToEclThree(polyline[i] as number, polyline[i + 1] as number);
          const b = equatorialToEclThree(polyline[i + 2] as number, polyline[i + 3] as number);
          vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
      const [ra = 0, dec = 0] = constellation.label;
      const key = `constellation-${constellation.id}-${k}`;
      // El nombre en español y, debajo y más pequeño, el oficial de la IAU en latín (D38).
      specs.push({
        key,
        text: constellation.es,
        secondary: constellation.name,
        kind: 'constellation',
      });
      this.constellationLabels.push({
        key,
        text: constellation.es,
        direction: equatorialToEclThree(ra, dec),
      });
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    this.geometries.push(geometry);
    this.constellations = new LineSegments(geometry, this.constellationMaterial.material);
    this.constellations.name = 'sky-constellations';
    this.constellations.renderOrder = -15;
    this.constellations.frustumCulled = false;
    this.constellations.visible = this.constellationsVisible;
    this.constellationMaterial.uniforms.uSkyDistance.value = SKY_DISTANCE * 0.95;
    this.scene.add(this.constellations);
    this.labels.define(specs);
  }

  setConstellationsVisible(visible: boolean): void {
    this.constellationsVisible = visible;
    if (this.constellations) this.constellations.visible = visible;
  }

  /** La textura de la Vía Láctea del espacio (la misma), o `null` mientras no ha llegado. */
  setMilkyWayTexture(texture: Texture | null): void {
    const uniforms = this.milkyWayMaterial.uniforms;
    if (uniforms.uMap.value === texture) return;
    uniforms.uMap.value = texture;
    uniforms.uHasMap.value = texture ? 1 : 0;
  }

  /** La textura de color de la Luna del espacio (la misma) y su meridiano 0, o `null`. */
  setMoonTexture(map: { texture: Texture; meridianOffset: number } | null): void {
    const uniforms = this.moonMaterial.uniforms;
    if (uniforms.uMap.value === (map?.texture ?? null)) return;
    uniforms.uMap.value = map?.texture ?? null;
    uniforms.uHasMap.value = map ? 1 : 0;
    uniforms.uMeridianOffset.value = map?.meridianOffset ?? 0;
  }

  setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
  }

  /** Muestra u oculta la escena (sus etiquetas): el motor la activa en la vista del cielo. */
  setActive(active: boolean): void {
    this.labels.setVisible(active && this.labelsVisible);
  }

  update(frame: SkyFrame): void {
    this.applyCamera(frame);
    const effective = eclipseSkyAltitude(frame.sunAltitudeDeg, frame.obscuration);
    const sun = frame.bodies.find((b) => b.id === 'sol');
    const moon = frame.bodies.find((b) => b.id === 'luna');

    // La luz del cielo y el suelo.
    const colors = skyColorsAt(effective);
    this.dome.uniforms.uZenith.value.setRGB(...colors.zenith);
    this.dome.uniforms.uHorizon.value.setRGB(...colors.horizon);
    this.dome.uniforms.uGlow.value.setRGB(...colors.glow);
    if (sun)
      this.dome.uniforms.uSunDirection.value.set(sun.direction.x, sun.direction.y, sun.direction.z);
    const daylight = daylightAt(effective);
    const night = srgbHexToLinear(VISUAL_CONFIG.sky.ground.night);
    const day = srgbHexToLinear(VISUAL_CONFIG.sky.ground.day);
    this.ground.uniforms.uColor.value.setRGB(
      night[0] + (day[0] - night[0]) * daylight,
      night[1] + (day[1] - night[1]) * daylight,
      night[2] + (day[2] - night[2]) * daylight,
    );
    this.ground.uniforms.uRim.value.setRGB(...colors.horizon).multiplyScalar(0.55);

    // La rotación de lo que está fuera del sistema solar.
    const rotation = frame.eclThreeToSky;
    this.starMaterial.uniforms.uSkyRotation.value.set(...rotation);
    this.constellationMaterial.uniforms.uSkyRotation.value.set(...rotation);
    this.milkyWayMaterial.uniforms.uSkyRotation.value.set(...rotation);
    const limit = Math.min(starLimitAt(effective), frame.qualityMagnitudeLimit);
    // Al estrechar el campo, los puntos crecen algo (como al mirar con prismáticos), con tope.
    const zoom = Math.min(Math.max(Math.sqrt(70 / frame.pose.fovDeg), 1), 2);
    this.starMaterial.uniforms.uMagnitudeLimit.value = limit;
    this.starMaterial.uniforms.uPixelRatio.value = frame.pixelRatio;
    this.starMaterial.uniforms.uZoom.value = zoom;
    this.planetMaterial.uniforms.uPixelRatio.value = frame.pixelRatio;
    this.planetMaterial.uniforms.uZoom.value = zoom;
    const milkyWayGain = milkyWayGainAt(effective);
    this.milkyWayMaterial.uniforms.uGain.value = milkyWayGain;
    this.milkyWay.visible = milkyWayGain > 0 && this.milkyWayMaterial.uniforms.uHasMap.value > 0;
    const lines = constellationOpacityAt(effective);
    this.constellationMaterial.uniforms.uOpacity.value = lines;
    if (this.constellations) this.constellations.visible = this.constellationsVisible && lines > 0;
    this.constellationLinesVisible = lines > 0.02;

    // El tamaño mínimo de los discos del Sol y de la Luna en pantalla.
    const focalPx = frame.viewport.height / (2 * Math.tan((frame.projection.fovDeg * DEG) / 2));
    const minRadius = VISUAL_CONFIG.sky.minDiscPx / Math.max(focalPx, 1);
    if (sun) {
      const radius = Math.max(sun.angularRadiusDeg * DEG, minRadius);
      this.sun.position
        .set(sun.direction.x, sun.direction.y, sun.direction.z)
        .multiplyScalar(SKY_DISTANCE);
      this.sun.quaternion.copy(this.camera.quaternion);
      this.sun.scale.setScalar(SKY_DISTANCE * Math.tan(radius));
      this.sun.visible = sun.altitudeDeg > -2;
      // La corona, solo en la totalidad (con el Sol tapado del todo).
      const totality = Math.min(Math.max((frame.obscuration - 0.999) / 0.001, 0), 1);
      this.corona.visible = this.sun.visible && totality > 0;
      this.corona.position.copy(this.sun.position);
      this.corona.quaternion.copy(this.camera.quaternion);
      this.corona.scale.setScalar(SKY_DISTANCE * Math.tan(radius) * 4);
      this.coronaMaterial.uniforms.uStrength.value = 0.9 * totality;
    }
    if (moon) {
      const distance = SKY_DISTANCE * 0.9;
      const radius = Math.max(moon.angularRadiusDeg * DEG, minRadius);
      this.moon.position
        .set(moon.direction.x, moon.direction.y, moon.direction.z)
        .multiplyScalar(distance);
      this.moon.scale.setScalar(distance * Math.sin(radius));
      if (frame.moonOrientation) {
        this.moon.quaternion.setFromRotationMatrix(
          toMatrix4(frame.moonOrientation, this.tmpMatrix),
        );
      }
      this.moon.visible = moon.altitudeDeg > -2;
      const u = this.moonMaterial.uniforms;
      if (sun) {
        // Hacia el Sol desde la Luna: casi el del observador (la Luna está a 0,0026 UA).
        u.uSunDirection.value.set(sun.direction.x, sun.direction.y, sun.direction.z);
      }
      const shadow = frame.moonShadow;
      u.uMoonGeocentric.value.set(
        shadow.moonGeocentric.x,
        shadow.moonGeocentric.y,
        shadow.moonGeocentric.z,
      );
      u.uAntisolar.value.set(shadow.antisolar.x, shadow.antisolar.y, shadow.antisolar.z);
      u.uMoonRadius.value = shadow.moonRadiusRad;
      u.uUmbra.value = shadow.umbraRad;
      u.uPenumbra.value = shadow.penumbraRad;
    }

    // Los planetas: un punto donde se ven, si su brillo llega al límite de esta luz.
    const position = this.planetGeometry.getAttribute('position') as BufferAttribute;
    const magnitude = this.planetGeometry.getAttribute('aMagnitude') as BufferAttribute;
    const visible = this.planetGeometry.getAttribute('aVisible') as BufferAttribute;
    PLANET_IDS.forEach((id, k) => {
      const body = frame.bodies.find((b) => b.id === id);
      if (!body) return;
      position.setXYZ(
        k,
        body.direction.x * SKY_DISTANCE,
        body.direction.y * SKY_DISTANCE,
        body.direction.z * SKY_DISTANCE,
      );
      magnitude.setX(k, body.magnitude);
      visible.setX(k, body.altitudeDeg > -0.5 ? planetPresence(body.magnitude, limit) : 0);
    });
    position.needsUpdate = true;
    magnitude.needsUpdate = true;
    visible.needsUpdate = true;

    this.updateLabels(frame, limit, minRadius, focalPx);
  }

  /** El cuerpo bajo el puntero (px CSS), o `null`. */
  pick(x: number, y: number): SkyBodyId | null {
    let best: SkyBodyId | null = null;
    let bestDistance = Infinity;
    for (const body of this.screenBodies) {
      const distance = Math.hypot(body.x - x, body.y - y);
      if (distance <= Math.max(14, body.radiusPx + 8) && distance < bestDistance) {
        best = body.id;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Memoria de vídeo propia (geometría): las texturas son las del espacio. */
  vramBytes(): number {
    let bytes = 0;
    for (const geometry of this.geometries) {
      for (const attribute of Object.values(geometry.attributes)) {
        bytes += (attribute.array as ArrayLike<number> & { byteLength: number }).byteLength;
      }
      bytes += geometry.index ? (geometry.index.array as Uint16Array).byteLength : 0;
    }
    return bytes;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of [
      this.dome,
      this.ground,
      this.starMaterial,
      this.milkyWayMaterial,
      this.constellationMaterial,
      this.sunMaterial,
      this.coronaMaterial,
      this.moonMaterial,
      this.planetMaterial,
    ]) {
      material.material.dispose();
    }
    this.labels.dispose();
    this.scene.clear();
  }

  // --- Cámara y etiquetas --------------------------------------------------------------------------

  private applyCamera(frame: SkyFrame): void {
    const { projection, pose } = frame;
    const camera = this.camera;
    camera.fov = projection.fovDeg;
    camera.aspect = projection.aspect;
    if (projection.offset) {
      const o = projection.offset;
      camera.setViewOffset(o.fullWidth, o.fullHeight, o.x, o.y, o.width, o.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    const look = horizontalToSkyThree(pose.azimuthDeg, pose.altitudeDeg);
    this.tmpVector.set(look.x, look.y, look.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.tmpVector);
    camera.updateMatrixWorld();
  }

  /** Proyecta una dirección del cielo a la pantalla (px CSS), o `null` si queda detrás o fuera. */
  private project(
    direction: Vec3,
    viewport: { width: number; height: number },
  ): { x: number; y: number } | null {
    const v = this.tmpVector.set(direction.x, direction.y, direction.z);
    v.applyMatrix4(this.camera.matrixWorldInverse);
    if (v.z >= -1e-6) return null;
    v.applyMatrix4(this.camera.projectionMatrix);
    const x = ((v.x + 1) / 2) * viewport.width;
    const y = ((1 - v.y) / 2) * viewport.height;
    const margin = 40;
    if (x < -margin || y < -margin || x > viewport.width + margin || y > viewport.height + margin) {
      return null;
    }
    return { x, y };
  }

  private updateLabels(frame: SkyFrame, limit: number, minRadius: number, focalPx: number): void {
    const placements = this.placements;
    placements.clear();
    const viewport = frame.viewport;
    // Solo en la parte visible: no encima de los paneles ni del texto de arriba (revisión de la fase 8,
    // hallazgo 6: en el móvil, los nombres de las constelaciones pisaban la entradilla).
    const { top, right, bottom, left } = frame.insets;
    const visible = (at: { x: number; y: number }): boolean =>
      at.x >= left &&
      at.x <= viewport.width - right &&
      at.y >= top &&
      at.y <= viewport.height - bottom;
    for (const [text, azimuth] of CARDINALS) {
      // Un poco por encima del horizonte (1,6°), para que la letra no pise la línea del suelo.
      const at = this.project(horizontalToSkyThree(azimuth, 1.6), viewport);
      if (at && visible(at)) placements.set(`cardinal-${text}`, at);
    }
    // Las etiquetas no se pisan: se colocan por orden (el Sol, la Luna, los planetas del más brillante
    // al más débil y las constelaciones) y se salta la que caería encima de otra ya puesta. Las cajas,
    // estimadas por el número de letras (unos 7 px por letra y 16 px de alto por línea; las de las
    // constelaciones, de dos líneas: el nombre español y, debajo, el latino, D38).
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const free = (x: number, y: number, text: string, lines = 1): boolean => {
      const w = 7 * text.length + 8;
      const h = 16 * lines;
      if (boxes.some((b) => Math.abs(b.x - x) < (b.w + w) / 2 && Math.abs(b.y - y) < (b.h + h) / 2))
        return false;
      boxes.push({ x, y, w, h });
      return true;
    };
    this.screenBodies = [];
    const ordered = [...frame.bodies].sort(
      (a, b) => labelRank(a) - labelRank(b) || a.magnitude - b.magnitude,
    );
    for (const body of ordered) {
      if (body.altitudeDeg < -0.5) continue;
      const isDisc = body.id === 'sol' || body.id === 'luna';
      if (!isDisc && planetPresence(body.magnitude, limit) <= 0) continue;
      const at = this.project(body.direction, viewport);
      if (!at) continue;
      const radiusPx = isDisc ? Math.max(body.angularRadiusDeg * DEG, minRadius) * focalPx : 4;
      this.screenBodies.push({ id: body.id, x: at.x, y: at.y, radiusPx });
      // El nombre, debajo del cuerpo.
      const y = at.y + radiusPx * 1.15 + 14;
      const label = { x: at.x, y };
      if (visible(label) && free(at.x, y, BODY_NAMES[body.id]))
        placements.set(`body-${body.id}`, label);
    }
    if (this.constellations && this.constellationsVisible && this.constellationLinesVisible) {
      const rotation = frame.eclThreeToSky;
      for (const label of this.constellationLabels) {
        const direction = mulMat3Vec(rotation, label.direction);
        if (direction.y < 0.03) continue;
        const at = this.project(direction, viewport);
        if (at && visible(at) && free(at.x, at.y, label.text, 2)) placements.set(label.key, at);
      }
    }
    this.labels.update(placements);
  }
}
