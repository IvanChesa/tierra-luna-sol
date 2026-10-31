import {
  ClampToEdgeWrapping,
  ImageBitmapLoader,
  RepeatWrapping,
  SphereGeometry,
  Vector3,
} from 'three';
import {
  eclRotationToThree,
  eclToThree,
  earthFixedToEcl,
  geographicToEarthFixed,
} from '../ephemeris/coordinates';
import type { BodyId } from '../data/body.model';
import { Mat3, mulMat3Vec, vec3 } from '../ephemeris/vec3';
import { OrientationModel } from './orientations';
import { SCENE_BODIES, createSolarSystemModel, sceneBody } from './system';
import { SATURN_RING_FEATURES } from '../data/saturn-rings';
import {
  TEXTURE_FILES,
  SATURN_RING_FEATURES_MEASURED,
  SATURN_RING_STRIP_KM,
} from './texture-files';
import { TEXTURE_META } from './texture-meta';
import {
  ManifestTextureSource,
  TextureFile,
  TextureId,
  chooseTextureFile,
  meridianOffset,
  textureVramBytes,
} from './textures';
import { QUALITY_PROFILES, TextureLevel } from './quality';
import { BODY_RELIEF_TEXTURES, BODY_TEXTURES } from './world';

const ids = Object.keys(TEXTURE_META) as TextureId[];

/** Vértice de la esfera de three con ese uv (en el ecuador). */
function vertexAt(u: number): Vector3 {
  const sphere = new SphereGeometry(1, 64, 32);
  const position = sphere.getAttribute('position');
  const uv = sphere.getAttribute('uv');
  for (let k = 0; k < uv.count; k++) {
    if (Math.abs(uv.getX(k) - u) < 1e-9 && Math.abs(uv.getY(k) - 0.5) < 1e-9) {
      return new Vector3().fromBufferAttribute(position, k);
    }
  }
  throw new Error(`No hay vértice con u = ${u}`);
}

/** Aplica una rotación por filas a un vector de three. */
const rotate = (m: Mat3, v: Vector3) => {
  const r = mulMat3Vec(m, vec3(v.x, v.y, v.z));
  return new Vector3(r.x, r.y, r.z);
};

describe('texturas: manifiesto y alineación del meridiano 0', () => {
  it('cada textura del manifiesto tiene ficheros, y cada cuerpo con textura la tiene en el manifiesto', () => {
    for (const id of ids) expect(TEXTURE_FILES[id]?.length).toBeGreaterThan(0);
    // La Vía Láctea (el panorama de ESO, fase 3b): en todos los niveles, dentro de §5 (≤ 1,5 MB en
    // alta y ≤ 400 kB en baja).
    const sky = (level: string | null) =>
      TEXTURE_FILES['milky-way']?.find((file) => file.level === level)?.bytes ?? Infinity;
    expect(sky(QUALITY_PROFILES.high.milkyWayTexture)).toBeLessThanOrEqual(1_500_000);
    expect(sky(QUALITY_PROFILES.low.milkyWayTexture)).toBeLessThanOrEqual(400_000);
    for (const id of Object.values(BODY_TEXTURES)) expect(ids).toContain(id);
    for (const id of Object.values(BODY_RELIEF_TEXTURES)) expect(ids).toContain(id);
  });

  it('los niveles son 1k/2k/4k (y 8k), en proporción 2:1 los mapas y con hash en el nombre', () => {
    const widths: Record<string, number> = { '1k': 1024, '2k': 2048, '4k': 4096, '8k': 8192 };
    for (const id of ids) {
      for (const file of TEXTURE_FILES[id] ?? []) {
        expect(file.width).toBe(widths[file.level]);
        if (TEXTURE_META[id].projection !== 'ring-strip') expect(file.height).toBe(file.width / 2);
        expect(file.path).toMatch(
          new RegExp(`^textures/${file.level}/${id}\\.[0-9a-f]{10}\\.webp$`),
        );
        expect(file.bytes).toBeGreaterThan(0);
      }
    }
  });

  it('los mapas de datos no llevan espacio de color y solo los anillos llevan alfa', () => {
    expect(TEXTURE_META['earth-normal'].colorSpace).toBe('data');
    expect(TEXTURE_META['earth-specular'].colorSpace).toBe('data');
    expect(TEXTURE_META['earth-clouds'].colorSpace).toBe('data');
    expect(TEXTURE_META['earth-day'].colorSpace).toBe('srgb');
    expect(ids.filter((id) => TEXTURE_META[id].alpha)).toEqual(['saturn-rings']);
  });

  it('en la esfera de three, u = 0,5 es el meridiano 0 (+X) y u = 0,75 los 90° E', () => {
    expect(vertexAt(0.5).distanceTo(new Vector3(1, 0, 0))).toBeLessThan(1e-9);
    // 90° E en el sistema propio (Y) es −Z en los ejes de three (x, z, −y).
    expect(vertexAt(0.75).distanceTo(new Vector3(0, 0, -1))).toBeLessThan(1e-9);
    for (const id of ids) {
      const meta = TEXTURE_META[id];
      if (meta.primeMeridianU !== null) expect(meridianOffset(meta)).toBe(0);
    }
  });

  it('con la orientación de la escena, el vértice u = 0,5 cae en (0°, 0°) de la Tierra', () => {
    const date = new Date('2026-06-21T12:00:00Z');
    const bodyToEcl = earthFixedToEcl(date);
    // La escena gira la malla con eclRotationToThree; el texel del meridiano 0 está en u = 0,5.
    const onSphere = rotate(eclRotationToThree(bodyToEcl), vertexAt(0.5));
    const expected = eclToThree(mulMat3Vec(bodyToEcl, geographicToEarthFixed(0, 0)));
    expect(onSphere.distanceTo(new Vector3(expected.x, expected.y, expected.z))).toBeLessThan(1e-9);
    const east = rotate(eclRotationToThree(bodyToEcl), vertexAt(0.75));
    const expectedEast = eclToThree(mulMat3Vec(bodyToEcl, geographicToEarthFixed(0, 90)));
    expect(
      east.distanceTo(new Vector3(expectedEast.x, expectedEast.y, expectedEast.z)),
    ).toBeLessThan(1e-9);
  });

  it('las lunas con mosaico (fase 7): la longitud 0 del mapa mira a su planeta y el hemisferio delantero, a 90° O (en Tritón, retrógrada, a 90° E)', () => {
    const model = createSolarSystemModel();
    const orientations = new OrientationModel(SCENE_BODIES);
    const moons = (Object.entries(BODY_TEXTURES) as [BodyId, TextureId][]).filter(
      ([id]) => sceneBody(id).kind === 'moon' && id !== 'luna',
    );
    expect(moons.map(([id]) => id)).toContain('triton');
    const angleDeg = (a: Vector3, b: Vector3) => (a.angleTo(b) * 180) / Math.PI;
    const toThree = (v: { x: number; y: number; z: number }) => {
      const t = eclToThree(v);
      return new Vector3(t.x, t.y, t.z).normalize();
    };
    for (const date of [new Date('2026-10-31T00:00:00Z'), new Date('2000-01-01T12:00:00Z')]) {
      const state = model.at(date);
      const later = model.at(date.getTime() + 60_000);
      const matrices = orientations.at(state);
      for (const [id, texture] of moons) {
        const body = sceneBody(id);
        // El mosaico está centrado en su longitud 0 (usgs-mosaic.mjs): sin desplazamiento.
        expect(meridianOffset(TEXTURE_META[texture]), id).toBe(0);
        const toWorld = eclRotationToThree(matrices[body.index] as Mat3);
        const offset = state.parentOffsetOf(id);
        const toPlanet = toThree({ x: -offset.x, y: -offset.y, z: -offset.z });
        expect(angleDeg(rotate(toWorld, vertexAt(0.5)), toPlanet), id).toBeLessThan(0.01);
        // Hacia donde avanza la luna respecto a su planeta (un minuto después); la excentricidad lo
        // separa unos grados de la perpendicular al radio.
        const next = later.parentOffsetOf(id);
        const ahead = toThree({ x: next.x - offset.x, y: next.y - offset.y, z: next.z - offset.z });
        const leading = id === 'triton' ? 0.75 : 0.25;
        expect(angleDeg(rotate(toWorld, vertexAt(leading)), ahead), id).toBeLessThan(3);
      }
    }
  });

  it('la tira de los anillos cubre del interior del anillo C al exterior del F', () => {
    const f = SATURN_RING_FEATURES;
    expect(SATURN_RING_STRIP_KM.inner).toBeLessThan(f.cInnerKm);
    expect(SATURN_RING_STRIP_KM.outer).toBeGreaterThan(f.fToKm);
    expect(TEXTURE_META['saturn-rings'].ringRadiiKm).toEqual(SATURN_RING_STRIP_KM);
  });

  it('en la tira de los anillos, las divisiones están vacías y los bordes, en sus radios publicados (fase 7, D36)', () => {
    const f = SATURN_RING_FEATURES;
    const measured = SATURN_RING_FEATURES_MEASURED;
    expect(f.source).toMatch(/https:\/\/pds-rings\.seti\.org\//);
    // Cassini, Encke y Keeler (y las de Colombo, Maxwell y Huygens): sin anillo dentro de su intervalo
    // publicado y con anillo a los lados (con la tira desplazada más que su anchura, fallaría).
    for (const id of ['colombo', 'maxwell', 'huygens', 'encke', 'keeler'] as const) {
      const gap = measured.gaps[id];
      expect(gap.minTau, id).toBeLessThan(0.05);
      expect(gap.minTau, id).toBeLessThan(0.25 * gap.sidesTau);
    }
    // El borde interior del C, a ±15 km; el exterior del A (7 lóbulos de 12,8 km), a ±20; el del B
    // (no circular), a ±100; y el núcleo del F, dentro de su extensión.
    expect(Math.abs(measured.cInnerKm - f.cInnerKm)).toBeLessThanOrEqual(15);
    expect(Math.abs(measured.aOuterKm - f.aOuterKm)).toBeLessThanOrEqual(20);
    expect(Math.abs(measured.bOuterKm - f.bOuterKm)).toBeLessThanOrEqual(100);
    expect(measured.fCoreKm).toBeGreaterThanOrEqual(f.fFromKm);
    expect(measured.fCoreKm).toBeLessThanOrEqual(f.fToKm);
    // La división de Cassini empieza donde acaba el B: su hueco de Huygens, junto a ese borde.
    expect(f.gaps.huygens.fromKm).toBeLessThanOrEqual(f.bOuterKm);
  });

  it('la tira de los anillos llega a unos 8 km por píxel en 8k (D36)', () => {
    const files = TEXTURE_FILES['saturn-rings'] ?? [];
    const finest = files.reduce((best, file) => (file.width > best.width ? file : best));
    const kmPerPx = (SATURN_RING_STRIP_KM.outer - SATURN_RING_STRIP_KM.inner) / finest.width;
    expect(finest.level).toBe('8k');
    expect(kmPerPx).toBeGreaterThan(7);
    expect(kmPerPx).toBeLessThan(10);
    // Lo que se pide con cada calidad (los dispositivos sin 8192 px se quedan con el mayor que quepa).
    expect(QUALITY_PROFILES.high.ringTexture).toBe('8k');
    expect(chooseTextureFile(files, QUALITY_PROFILES.high.ringTexture, 4096)?.level).toBe('4k');
  });
});

describe('texturas: nivel elegido y VRAM', () => {
  const files: TextureFile[] = [
    { level: '1k', path: 'a', width: 1024, height: 512, bytes: 1 },
    { level: '2k', path: 'b', width: 2048, height: 1024, bytes: 1 },
    { level: '4k', path: 'c', width: 4096, height: 2048, bytes: 1 },
  ];

  it('elige el nivel pedido, o el mayor que haya por debajo y quepa en maxTextureSize', () => {
    expect(chooseTextureFile(files, '2k', 16_384)?.level).toBe('2k');
    expect(chooseTextureFile(files, '4k', 2048)?.level).toBe('2k');
    expect(chooseTextureFile(files.slice(0, 2), '4k', 16_384)?.level).toBe('2k');
    expect(chooseTextureFile(files, '1k', 512)).toBeNull();
    expect(chooseTextureFile(undefined, '1k', 4096)).toBeNull();
  });

  it('la textura de día de la Tierra llega a 8k, que solo se elige si cabe en maxTextureSize (fase 5)', () => {
    const day = TEXTURE_FILES['earth-day'];
    expect(chooseTextureFile(day, '8k', 16_384)?.level).toBe('8k');
    expect(chooseTextureFile(day, '8k', 8192)?.level).toBe('8k');
    expect(chooseTextureFile(day, '8k', 4096)?.level).toBe('4k');
    // Las demás, como mucho 4k: pedir 8k da 4k.
    expect(chooseTextureFile(TEXTURE_FILES['earth-clouds'], '8k', 16_384)?.level).toBe('4k');
    expect(QUALITY_PROFILES.high.earthDayTexture).toBe('8k');
  });

  it('los mapas de superficie dan la vuelta en longitud; la tira de los anillos, no (fase 5)', async () => {
    // Sin ImageBitmap en jsdom: un bitmap falso. Con ClampToEdge (el de three), la deriva de las
    // nubes estiraba la última columna del mapa en una franja cada vez más ancha.
    const bitmap = { width: 4, height: 2, close: () => undefined } as unknown as ImageBitmap;
    const spy = vi.spyOn(ImageBitmapLoader.prototype, 'loadAsync').mockResolvedValue(bitmap);
    const source = new ManifestTextureSource({
      files: TEXTURE_FILES,
      meta: TEXTURE_META,
      baseUrl: 'http://localhost/',
      maxTextureSize: 16_384,
      anisotropy: () => 1,
      upload: () => Promise.resolve(),
    });
    for (const id of ['earth-day', 'earth-clouds', 'earth-night', 'mars'] as const) {
      expect((await source.load(id, '1k'))?.texture.wrapS, id).toBe(RepeatWrapping);
    }
    expect((await source.load('saturn-rings', '1k'))?.texture.wrapS).toBe(ClampToEdgeWrapping);
    spy.mockRestore();
  });

  it('estima la VRAM con mipmaps (4/3) y deja las vistas dentro del presupuesto de §5', () => {
    expect(textureVramBytes(1024, 512)).toBeCloseTo(1024 * 512 * 4 * (4 / 3), 6);
    expect(textureVramBytes(1024, 512, false)).toBe(1024 * 512 * 4);
    // Todos los cuerpos en su nivel general, la Vía Láctea en 2k y, como peor caso, la Tierra enfocada
    // (fase 5): su textura de día (8k en alto) y sus nubes, noche, normales y máscara del océano. Las
    // lunas con mosaico (fase 7) solo se cargan con su sistema enfocado: no con la Tierra.
    const level = (id: TextureId, wanted: TextureLevel) =>
      chooseTextureFile(TEXTURE_FILES[id], wanted, 16_384);
    const withoutSatellites = (Object.entries(BODY_TEXTURES) as [BodyId, TextureId][])
      .filter(([id]) => sceneBody(id).kind !== 'moon' || id === 'luna')
      .map(([, texture]) => texture);
    for (const quality of ['high', 'medium', 'low'] as const) {
      const profile = QUALITY_PROFILES[quality];
      const bodies = withoutSatellites.map((id) => level(id, profile.overviewTexture));
      const sky = profile.milkyWayTexture ? level('milky-way', profile.milkyWayTexture) : null;
      const earth = [
        level('earth-day', profile.earthDayTexture),
        level('earth-clouds', profile.focusTexture),
        ...(['earth-night', 'earth-normal', 'earth-specular'] as const).map((id) =>
          level(id, profile.earthMapsTexture),
        ),
      ];
      const bytes = [...bodies, sky, ...earth].reduce(
        (sum, file) => sum + (file ? textureVramBytes(file.width, file.height) : 0),
        0,
      );
      expect(bytes / 1_048_576).toBeLessThan(profile.vramBudgetMB);
    }
  });
});
