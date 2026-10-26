import { SphereGeometry, Vector3 } from 'three';
import {
  eclRotationToThree,
  eclToThree,
  earthFixedToEcl,
  geographicToEarthFixed,
} from '../ephemeris/coordinates';
import { Mat3, mulMat3Vec, vec3 } from '../ephemeris/vec3';
import { TEXTURE_FILES, SATURN_RING_STRIP_KM } from './texture-files';
import { TEXTURE_META } from './texture-meta';
import {
  TextureFile,
  TextureId,
  chooseTextureFile,
  meridianOffset,
  textureVramBytes,
} from './textures';
import { QUALITY_PROFILES } from './quality';
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

  it('los niveles son 1k/2k/4k, en proporción 2:1 los mapas y con hash en el nombre', () => {
    const widths: Record<string, number> = { '1k': 1024, '2k': 2048, '4k': 4096 };
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

  it('la tira de los anillos cubre del interior del anillo C al exterior del A', () => {
    // Bordes de la ficha de la NASA: anillo C desde 74 658 km; anillo A hasta 136 780 km.
    expect(SATURN_RING_STRIP_KM.inner).toBeLessThan(74_658);
    expect(SATURN_RING_STRIP_KM.outer).toBeGreaterThan(136_780);
    expect(TEXTURE_META['saturn-rings'].ringRadiiKm).toEqual(SATURN_RING_STRIP_KM);
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

  it('estima la VRAM con mipmaps (4/3) y deja las vistas dentro del presupuesto de §5', () => {
    expect(textureVramBytes(1024, 512)).toBeCloseTo(1024 * 512 * 4 * (4 / 3), 6);
    expect(textureVramBytes(1024, 512, false)).toBe(1024 * 512 * 4);
    // Vista general en alto: todos los cuerpos en su nivel general, la Vía Láctea en 4k y, como
    // peor caso, un cuerpo enfocado en 4k.
    const level = (id: TextureId, wanted: '1k' | '2k' | '4k') =>
      chooseTextureFile(TEXTURE_FILES[id], wanted, 16_384);
    for (const quality of ['high', 'medium', 'low'] as const) {
      const profile = QUALITY_PROFILES[quality];
      const bodies = Object.values(BODY_TEXTURES).map((id) => level(id, profile.overviewTexture));
      const sky = profile.milkyWayTexture ? level('milky-way', profile.milkyWayTexture) : null;
      const focus = level('earth-day', profile.focusTexture);
      const bytes = [...bodies, sky, focus].reduce(
        (sum, file) => sum + (file ? textureVramBytes(file.width, file.height) : 0),
        0,
      );
      expect(bytes / 1_048_576).toBeLessThan(profile.vramBudgetMB);
    }
  });
});
