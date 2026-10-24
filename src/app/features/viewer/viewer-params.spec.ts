import { readQualityPreference, writeQualityPreference } from './quality-preference';
import {
  CAPTURE_DATE,
  formatUtcParam,
  parseUtcDate,
  parseViewerParams,
  viewerQueryParams,
} from './viewer-params';

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
      warnings: [],
    });
    expect(CAPTURE_DATE.toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });

  it('ignora lo que no es válido sin romper nada y explica cada parámetro ignorado', () => {
    const params = parseViewerParams(
      '?captura=si&fecha=ayer&cuerpo=pluton&escala=gigante&calidad=ultra&profundidad=estandar',
    );
    expect({ ...params, warnings: [] }).toEqual({
      capture: false,
      time: null,
      body: null,
      scale: null,
      quality: null,
      depth: null, // solo en el modo de captura
      background: null,
      warnings: [],
    });
    expect(params.warnings).toEqual([
      'La fecha «ayer» no vale: tiene que existir, ir en UTC (como 2030‑01‑01T00:00Z) y estar entre 1900 y 2100.',
      'El cuerpo «pluton» no está en el explorador.',
      'La escala «gigante» no existe: puede ser «real» o «ilustrativa».',
      'La calidad «ultra» no existe: puede ser «alta», «media», «baja» o «auto».',
    ]);
    // Un valor larguísimo se recorta en el aviso.
    const long = parseViewerParams(`?cuerpo=${'x'.repeat(200)}`);
    expect(long.warnings[0]?.length).toBeLessThan(120);
  });

  it('escribe la URL del estado: fecha solo en pausa, cuerpo y escala si no son los de partida', () => {
    expect(formatUtcParam(new Date('2030-01-01T00:00:00.400Z'))).toBe('2030-01-01T00:00Z');
    expect(formatUtcParam(new Date('2030-01-01T10:20:30Z'))).toBe('2030-01-01T10:20:30Z');
    expect(
      viewerQueryParams({ time: new Date('2030-01-01T00:00:00Z'), body: 'titan', scale: 'real' }),
    ).toEqual({ fecha: '2030-01-01T00:00Z', cuerpo: 'titan', escala: 'real' });
    expect(viewerQueryParams({ time: null, body: null, scale: 'illustrative' })).toEqual({
      fecha: null,
      cuerpo: null,
      escala: null,
    });
    // Ida y vuelta: lo que se escribe se vuelve a leer igual.
    const written = viewerQueryParams({
      time: new Date('1969-07-20T20:17:40Z'),
      body: 'luna',
      scale: 'real',
    });
    const read = parseViewerParams(
      `?fecha=${written['fecha']}&cuerpo=${written['cuerpo']}&escala=${written['escala']}`,
    );
    expect(read.time).toEqual(new Date('1969-07-20T20:17:40Z'));
    expect(read.body).toBe('luna');
    expect(read.scale).toBe('real');
    expect(read.warnings).toEqual([]);
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
