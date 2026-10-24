import { readQualityPreference, writeQualityPreference } from './quality-preference';
import { CAPTURE_DATE, parseUtcDate, parseViewerParams } from './viewer-params';

describe('parámetros del explorador', () => {
  it('lee el modo de captura y sus parámetros de prueba', () => {
    const params = parseViewerParams(
      '?captura=1&fecha=2030-01-01T00:00Z&cuerpo=titan&escala=real&calidad=media&profundidad=invertida&detras=neptuno',
    );
    expect(params).toEqual({
      capture: true,
      time: new Date('2030-01-01T00:00:00Z'),
      body: 'titan',
      scale: 'real',
      quality: 'medium',
      depth: 'reversed',
      background: 'neptuno',
    });
    expect(CAPTURE_DATE.toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });

  it('ignora lo que no es válido sin romper nada', () => {
    const params = parseViewerParams(
      '?captura=si&fecha=ayer&cuerpo=pluton&escala=gigante&calidad=ultra&profundidad=estandar',
    );
    expect(params).toEqual({
      capture: false,
      time: null,
      body: null,
      scale: null,
      quality: null,
      depth: null, // solo en el modo de captura
      background: null,
    });
  });

  it('solo admite fechas UTC de 1900 a 2100', () => {
    expect(parseUtcDate('2026-10-24')).toEqual(new Date('2026-10-24T00:00:00Z'));
    expect(parseUtcDate('2026-10-24T12:30:15Z')).toEqual(new Date('2026-10-24T12:30:15Z'));
    expect(parseUtcDate('2026-10-24T12:30')).toBeNull(); // sin zona: ambiguo
    expect(parseUtcDate('1899-12-31')).toBeNull();
    expect(parseUtcDate('2101-01-01')).toBeNull();
    expect(parseUtcDate('2026-02-31')).toBeNull();
    expect(parseUtcDate(null)).toBeNull();
  });
});

describe('preferencia de calidad', () => {
  const storage = (): Storage => {
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: (key) => data.get(key) ?? null,
      key: () => null,
      removeItem: (key) => void data.delete(key),
      setItem: (key, value) => void data.set(key, value),
    };
  };

  it('se recuerda y «automática» no guarda nada', () => {
    const s = storage();
    expect(readQualityPreference(s)).toBe('auto');
    writeQualityPreference(s, 'low');
    expect(readQualityPreference(s)).toBe('low');
    writeQualityPreference(s, 'auto');
    expect(s.length).toBe(0);
  });

  it('sin almacenamiento o con valores raros, vuelve a «automática»', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    } as unknown as Storage;
    expect(readQualityPreference(broken)).toBe('auto');
    expect(() => writeQualityPreference(broken, 'high')).not.toThrow();
    expect(readQualityPreference(undefined)).toBe('auto');
    const s = storage();
    s.setItem('tls.calidad', 'ultra');
    expect(readQualityPreference(s)).toBe('auto');
  });
});
