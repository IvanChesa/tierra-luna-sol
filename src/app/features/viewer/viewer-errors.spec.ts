import { viewerErrorKind, viewerErrorText } from './viewer-errors';

describe('viewer-errors: mensajes para las personas, no para los programadores', () => {
  it('distingue la falta de WebGL, la red y el resto (con los mensajes reales de la revisión)', () => {
    expect(viewerErrorKind('THREE.WebGLRenderer: Error creating WebGL context.')).toBe('webgl');
    expect(
      viewerErrorKind('Failed to fetch dynamically imported module: http://x/chunk-ogoJfe2i.js'),
    ).toBe('network');
    expect(viewerErrorKind('No se ha podido cargar el catálogo de estrellas (503).')).toBe(
      'network',
    );
    expect(viewerErrorKind("Cannot read properties of null (reading 'precision')")).toBe('other');
  });

  it('los textos están en español y sin detalles técnicos', () => {
    for (const message of ['WebGL', 'Failed to fetch', 'TypeError: x is undefined']) {
      const text = viewerErrorText(message);
      expect(text).not.toMatch(/http|chunk|THREE|TypeError|null/);
      expect(text.endsWith('.')).toBe(true);
    }
  });
});
