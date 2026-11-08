/**
 * El bloom del Sol (fase 9b, D41; en la fase 3b quedó como opcional): un resplandor que solo sale del
 * Sol, con el `UnrealBloomPass` de `three/addons` y sin dependencias nuevas.
 *
 * La escena se sigue pintando como siempre, directa al lienzo y con su tone mapping (nada de lo medido
 * cambia: la Tierra frente a EPIC, los anillos, el fondo). Después:
 * 1. a media resolución (en px CSS: el resplandor mide lo mismo con cualquier densidad de píxeles), los
 *    cuerpos que tapan el Sol en este frame (`OCCLUDER_LAYER`), en negro, solo para la profundidad;
 * 2. el Sol (`SUN_LAYER`) con su material, detrás de ellos: solo lo que se ve de él;
 * 3. el bloom de esa imagen (sin umbral: todo es Sol), con la forma de `factors`: cuánto pesa cada
 *    una de sus cinco capas, de la más estrecha a la más ancha (un núcleo fuerte y unas alas débiles);
 * 4. el lienzo, copiado a una textura, y el resplandor sumado en luz lineal: 1 − (1 − base)·e^(−bloom),
 *    que no pasa de 1. Sumarlo en sRGB, sin leer el lienzo, lo exageraba: un resplandor lineal pequeño
 *    sube mucho al codificarse, velaba el fondo y borraba el limbo del disco.
 * Así el fondo no pasa por un render target ni por el `OutputPass`, que lo aclaraban (informe de la
 * fase 3b, §4.1), y los planetas cercanos no se queman: no entran en el bloom, solo lo tapan.
 *
 * Los materiales del pase (desenfoques y mezcla) son cuadrados a pantalla completa sin prueba de
 * profundidad: no llevan los chunks de D13, que son los de la profundidad de la escena. Los nuestros sí.
 */
import {
  Camera,
  Color,
  FramebufferTexture,
  HalfFloatType,
  Mesh,
  NoBlending,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Uniform,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OCCLUDER_LAYER, SUN_LAYER } from './layers';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  sceneShaderMaterial,
} from './materials/depth';

export interface SunBloomOptions {
  /** Fuerza del resplandor (la de `UnrealBloomPass`). */
  readonly strength: number;
  /**
   * El peso de cada una de las cinco capas del desenfoque, de la más estrecha a la más ancha (con el
   * lienzo de 1600 × 900, sus sigmas son de unos 8, 28, 80, 210 y 515 px CSS).
   */
  readonly factors: readonly [number, number, number, number, number];
}

/** Bytes por píxel: RGBA de medio flotante, su profundidad y el RGBA de 8 bits de la copia del lienzo. */
const HALF_FLOAT_RGBA_BYTES = 8;
const DEPTH_BYTES = 4;
const RGBA8_BYTES = 4;

export class SunBloom {
  private readonly target: WebGLRenderTarget;
  private readonly pass: UnrealBloomPass;
  private readonly quad: FullScreenQuad;
  private readonly occluder: ShaderMaterial;
  private readonly composite: ShaderMaterial;
  private canvasTexture: FramebufferTexture;
  private readonly clear = new Color();
  private width = 1;
  private height = 1;
  /** ¿Tienen memoria de vídeo sus render targets? (se reserva al pintar y se suelta con `releaseBuffers`). */
  private allocated = false;

  constructor() {
    this.target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: true });
    this.target.texture.name = 'tls-sun-bloom';
    this.canvasTexture = new FramebufferTexture(1, 1);
    this.pass = new UnrealBloomPass(new Vector2(1, 1), 1, 0, 0);
    // Los cuerpos que tapan el Sol: negros, con la profundidad logarítmica de la escena (D13).
    this.occluder = sceneShaderMaterial({
      name: 'tls-sun-occluder',
      vertexShader: /* glsl */ `
        ${DEPTH_VERTEX_PARS}
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          ${DEPTH_VERTEX}
        }
      `,
      fragmentShader: /* glsl */ `
        ${DEPTH_FRAGMENT_PARS}
        void main() {
          ${DEPTH_FRAGMENT}
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
      `,
      blending: NoBlending,
    });
    // El lienzo con el resplandor sumado en luz lineal (el lienzo guarda sRGB: se decodifica y se
    // vuelve a codificar).
    this.composite = sceneShaderMaterial({
      name: 'tls-sun-bloom-composite',
      uniforms: {
        tBloom: new Uniform(this.target.texture),
        tCanvas: new Uniform(this.canvasTexture),
      },
      vertexShader: /* glsl */ `
        ${DEPTH_VERTEX_PARS}
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
          ${DEPTH_VERTEX}
        }
      `,
      fragmentShader: /* glsl */ `
        ${DEPTH_FRAGMENT_PARS}
        uniform sampler2D tBloom;
        uniform sampler2D tCanvas;
        varying vec2 vUv;
        vec3 tlsToLinear(vec3 c) {
          return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
        }
        vec3 tlsToSrgb(vec3 c) {
          return mix(
            c * 12.92,
            1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
            step(vec3(0.0031308), c)
          );
        }
        void main() {
          ${DEPTH_FRAGMENT}
          vec3 base = tlsToLinear(texture2D(tCanvas, vUv).rgb);
          vec3 glow = max(texture2D(tBloom, vUv).rgb, vec3(0.0));
          gl_FragColor = vec4(tlsToSrgb(1.0 - (1.0 - base) * exp(-glow)), 1.0);
        }
      `,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new FullScreenQuad(this.composite);
  }

  /**
   * Tamaño del lienzo: en píxeles reales (la copia del lienzo) y en px CSS (el bloom trabaja a la
   * mitad de estos: su desenfoque mide lo mismo en pantalla con cualquier densidad de píxeles).
   */
  setSize(drawingWidth: number, drawingHeight: number, cssWidth: number, cssHeight: number): void {
    const image = this.canvasTexture.image as { width: number; height: number };
    const dw = Math.max(1, Math.round(drawingWidth));
    const dh = Math.max(1, Math.round(drawingHeight));
    if (image.width !== dw || image.height !== dh) {
      this.canvasTexture.dispose();
      this.canvasTexture = new FramebufferTexture(dw, dh);
      this.composite.uniforms['tCanvas']!.value = this.canvasTexture;
    }
    const w = Math.max(1, Math.round(cssWidth / 2));
    const h = Math.max(1, Math.round(cssHeight / 2));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.target.setSize(w, h);
    this.pass.setSize(w, h);
  }

  /**
   * Compila sus sombreados sin bloquear el hilo principal (`compileAsync`, PLAN §4.7), cada uno en la
   * variante con la que se usa: el Sol y los que lo tapan, en su render target (sin tone mapping y en
   * lineal); el pase, en sus render targets; y la mezcla, en el lienzo. Sin esto, el primer frame con
   * el Sol (el primero del explorador) compilaría una decena de programas de golpe.
   */
  async compile(renderer: WebGLRenderer, scene: Scene, camera: Camera): Promise<void> {
    const quad = new PlaneGeometry(2, 2);
    const screen = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const offscreen = new Scene();
    for (const material of [
      this.occluder,
      this.pass.materialHighPassFilter,
      ...this.pass.separableBlurMaterials,
      this.pass.compositeMaterial,
      this.pass.blendMaterial,
    ]) {
      offscreen.add(new Mesh(quad, material));
    }
    const suns: Object3D[] = [];
    scene.traverse((object) => {
      if (object.layers.isEnabled(SUN_LAYER)) suns.push(object);
    });
    const previous = renderer.getRenderTarget();
    const pending: Promise<unknown>[] = [];
    // Al ponerlo como destino, three reserva su render target: cuenta (y se puede soltar).
    this.allocated = true;
    try {
      renderer.setRenderTarget(this.target);
      pending.push(renderer.compileAsync(offscreen, screen));
      for (const sun of suns) pending.push(renderer.compileAsync(sun, camera, scene));
      renderer.setRenderTarget(null);
      pending.push(renderer.compileAsync(new Mesh(quad, this.composite), screen));
    } finally {
      renderer.setRenderTarget(previous);
    }
    try {
      await Promise.all(pending);
    } finally {
      quad.dispose();
    }
  }

  /** Pinta el bloom del Sol sobre lo que ya hay en el lienzo (después de `renderer.render`). */
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, options: SunBloomOptions): void {
    this.allocated = true;
    const autoClear = renderer.autoClear;
    const layers = camera.layers.mask;
    const override = scene.overrideMaterial;
    const background = scene.background;
    renderer.getClearColor(this.clear);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    scene.background = null;
    try {
      // 1 y 2: los que tapan, en negro, y el Sol detrás de ellos.
      renderer.setRenderTarget(this.target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      scene.overrideMaterial = this.occluder;
      camera.layers.set(OCCLUDER_LAYER);
      renderer.render(scene, camera);
      scene.overrideMaterial = override;
      camera.layers.set(SUN_LAYER);
      renderer.render(scene, camera);
      camera.layers.mask = layers;
      // 3: el bloom (sin umbral), con su forma. El pase deja su resultado en su primer render target
      // horizontal (y lo suma a su entrada, que ya no se usa).
      this.pass.strength = options.strength;
      this.pass.radius = 0;
      this.pass.compositeMaterial.uniforms['bloomFactors']!.value = options.factors;
      this.pass.render(renderer, this.target, this.target, 0, false);
      // 4: el lienzo con el resplandor sumado en lineal.
      renderer.setRenderTarget(null);
      renderer.copyFramebufferToTexture(this.canvasTexture);
      this.composite.uniforms['tBloom']!.value =
        this.pass.renderTargetsHorizontal[0]?.texture ?? null;
      this.quad.render(renderer);
    } finally {
      camera.layers.mask = layers;
      scene.overrideMaterial = override;
      scene.background = background;
      renderer.setRenderTarget(null);
      renderer.setClearColor(this.clear, clearAlpha);
      renderer.autoClear = autoClear;
    }
  }

  /**
   * Suelta la memoria de vídeo de sus render targets y de la copia del lienzo, y conserva sus
   * materiales (sus programas siguen compilados): si vuelve a hacer falta, three los reserva otra vez
   * al pintar, sin el tirón de compilarlos.
   */
  releaseBuffers(): void {
    if (!this.allocated) return;
    this.allocated = false;
    this.target.dispose();
    this.canvasTexture.dispose();
    for (const target of [
      this.pass.renderTargetBright,
      ...this.pass.renderTargetsHorizontal,
      ...this.pass.renderTargetsVertical,
    ]) {
      target.dispose();
    }
  }

  /** Memoria de vídeo: su render target con profundidad, los del pase y la copia del lienzo. */
  vramBytes(): number {
    if (!this.allocated) return 0;
    const own = this.width * this.height * (HALF_FLOAT_RGBA_BYTES + DEPTH_BYTES);
    let pass = this.pass.renderTargetBright.width * this.pass.renderTargetBright.height;
    for (const target of [
      ...this.pass.renderTargetsHorizontal,
      ...this.pass.renderTargetsVertical,
    ]) {
      pass += target.width * target.height;
    }
    const image = this.canvasTexture.image as { width: number; height: number };
    return own + pass * HALF_FLOAT_RGBA_BYTES + image.width * image.height * RGBA8_BYTES;
  }

  dispose(): void {
    this.target.dispose();
    this.canvasTexture.dispose();
    this.pass.dispose();
    this.quad.dispose();
    this.occluder.dispose();
    this.composite.dispose();
  }
}
