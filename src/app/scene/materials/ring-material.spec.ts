import { RING_PHOTOMETRY } from '../../data/photometry';
import { VISUAL_CONFIG } from '../visual-config';
import { createRingMaterial } from './ring-material';

describe('material de los anillos de Saturno', () => {
  it('el realce ilustrativo de su brillo (D36), solo en la cara iluminada (revisión del bloque D, D4)', () => {
    const { material, uniforms } = createRingMaterial({
      polarScale: 0.9,
      brightness: VISUAL_CONFIG.rings.brightness,
      photometry: RING_PHOTOMETRY.photometry,
    });
    expect(uniforms.uBrightness.value).toBe(VISUAL_CONFIG.rings.brightness);
    // La luz que atraviesa los anillos (la cara oscura, a contraluz) va sin realce: con él, el anillo
    // A salía casi blanco y la división de Cassini, quemada, frente a PIA17172.
    expect(material.fragmentShader).toContain(
      'tlsRingReflectance(mu0, mu, tau, litSide) * phase * (litSide ? uBrightness : 1.0)',
    );
    material.dispose();
  });
});
