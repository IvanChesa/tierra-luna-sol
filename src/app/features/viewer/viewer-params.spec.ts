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
      viewFrom: null,
      toneMapping: null,
      isolate: false,
      place: null,
      skyView: null,
      shadow: false,
      warnings: [],
    });
    expect(CAPTURE_DATE.toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });

  it('lee la geometría de las fotos de referencia y el tone mapping solo en captura', () => {
    expect(parseViewerParams('?captura=1&cuerpo=marte&desde=tierra').viewFrom).toEqual({
      kind: 'earth',
    });
    expect(parseViewerParams('?captura=1&fase=160&latitud=-17').viewFrom).toEqual({
      kind: 'phase',
      phaseDeg: 160,
      latitudeDeg: -17,
    });
    expect(parseViewerParams('?captura=1&fase=30').viewFrom).toEqual({
      kind: 'phase',
      phaseDeg: 30,
    });
    expect(parseViewerParams('?captura=1&fase=200').viewFrom).toBeNull();
    // La latitud sobre la eclíptica (las miniaturas de las lunas, fase 7).
    expect(parseViewerParams('?captura=1&fase=30&latitud=15&sobre=ecliptica').viewFrom).toEqual({
      kind: 'phase',
      phaseDeg: 30,
      latitudeDeg: 15,
      reference: 'ecliptic',
    });
    expect(parseViewerParams('?captura=1&tonemapping=agx').toneMapping).toBe('agx');
    expect(parseViewerParams('?captura=1&tonemapping=filmico').toneMapping).toBeNull();
    expect(parseViewerParams('?captura=1&cuerpo=jupiter&aislado=1').isolate).toBe(true);
    expect(parseViewerParams('?captura=1&cuerpo=jupiter&aislado=si').isolate).toBe(false);
    // Fuera del modo de captura no existen.
    const normal = parseViewerParams('?desde=tierra&tonemapping=aces&aislado=1');
    expect(normal.viewFrom).toBeNull();
    expect(normal.toneMapping).toBeNull();
    expect(normal.isolate).toBe(false);
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
      viewFrom: null,
      toneMapping: null,
      isolate: false,
      place: null,
      skyView: null,
      shadow: false,
      warnings: [],
    });
    expect(params.warnings).toEqual([
      'La fecha «ayer» no vale y se muestra el momento actual. Tiene que existir, ir en UTC (como 2030‑01‑01T00:00Z) y estar entre 1900 y 2100.',
      'El cuerpo «pluton» no está en el explorador y se ha ignorado.',
      'La escala «gigante» no existe y se usa la ilustrativa. Puede ser «real» o «ilustrativa».',
      'La calidad «ultra» no existe y se ha ignorado. Puede ser «alta», «media», «baja» o «auto».',
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
    ).toEqual({
      fecha: '2030-01-01T00:00Z',
      cuerpo: 'titan',
      escala: 'real',
      lugar: null,
      sombra: null,
      calidad: null,
    });
    expect(viewerQueryParams({ time: null, body: null, scale: 'illustrative' })).toEqual({
      fecha: null,
      cuerpo: null,
      escala: null,
      lugar: null,
      sombra: null,
      calidad: null,
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

  it('el lugar del cielo (fase 8): los del selector; el Montsec, por defecto, no se escribe', () => {
    expect(parseViewerParams('?lugar=teide').place).toBe('teide');
    expect(parseViewerParams('?lugar=roque-de-los-muchachos').place).toBe('roque-de-los-muchachos');
    // Lleida está en los datos, pero no en el selector; un lugar que no existe, tampoco.
    const lleida = parseViewerParams('?lugar=lleida');
    expect(lleida.place).toBeNull();
    expect(lleida.warnings).toEqual([
      'El lugar «lleida» no está en el selector del cielo y se muestra el del Montsec.',
    ]);
    expect(parseViewerParams('?lugar=marte').place).toBeNull();
    const base = { time: null, body: null, scale: 'illustrative' as const };
    expect(viewerQueryParams({ ...base, place: 'teide' })['lugar']).toBe('teide');
    expect(viewerQueryParams({ ...base, place: 'montsec' })['lugar']).toBeNull();
    expect(viewerQueryParams({ ...base, place: null })['lugar']).toBeNull();
  });

  it('«Ver en 3D» de un eclipse de Sol: la sombra, solo con fecha; y no se vuelve a escribir', () => {
    expect(parseViewerParams('?fecha=2026-08-12T18:29:29Z&sombra=1').shadow).toBe(true);
    expect(parseViewerParams('?sombra=1').shadow).toBe(false);
    expect(parseViewerParams('?fecha=2026-08-12T18:29:29Z&sombra=si').shadow).toBe(false);
    expect(
      viewerQueryParams({ time: null, body: null, scale: 'illustrative' })['sombra'],
    ).toBeNull();
  });

  it('la cámara del cielo, solo en captura (rumbo, altura y campo)', () => {
    expect(parseViewerParams('?captura=1&rumbo=119&altura=51.4&campo=2').skyView).toEqual({
      azimuthDeg: 119,
      altitudeDeg: 51.4,
      fovDeg: 2,
    });
    expect(parseViewerParams('?captura=1&rumbo=90').skyView).toEqual({ azimuthDeg: 90 });
    expect(parseViewerParams('?captura=1&altura=95').skyView).toBeNull();
    expect(parseViewerParams('?rumbo=90&altura=20').skyView).toBeNull();
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
