/**
 * Rasgos de los anillos de Saturno con sus radios publicados (km), de la tabla «Vital Statistics for
 * Saturn's Rings and Inner Satellites» del PDS Ring-Moon Systems Node, que cita para cada uno su
 * medida de Cassini: Nicholson et al. (2014, I y II) en el anillo C y el borde del B; French et al.
 * (2016) en la división de Cassini; Colwell et al. (2009) en el anillo A y sus divisiones; El Moutamid
 * et al. (2016) en el borde del A y Cooper et al. (2013) en el anillo F. Con ellos se comprueba la tira
 * de los anillos que sale de una ocultación (fase 7, D36) y se reparten su color y su albedo.
 */
export const SATURN_RINGS_SOURCE = 'https://pds-rings.seti.org/saturn/saturn_tables.html';

/** Una división: un hueco casi vacío (τ ~ 0) entre dos radios. */
export interface RingGap {
  readonly name: string;
  readonly fromKm: number;
  readonly toKm: number;
}

export interface SaturnRingFeatures {
  /** Bordes de los anillos C, B y A (la tabla da el del B como no circular y el del A, con 7 lóbulos). */
  readonly cInnerKm: number;
  readonly bInnerKm: number;
  readonly bOuterKm: number;
  readonly aInnerKm: number;
  readonly aOuterKm: number;
  /** El anillo F: su núcleo y su extensión. */
  readonly fCoreKm: number;
  readonly fFromKm: number;
  readonly fToKm: number;
  readonly gaps: Readonly<Record<'colombo' | 'maxwell' | 'huygens' | 'encke' | 'keeler', RingGap>>;
  readonly source: string;
}

export const SATURN_RING_FEATURES: SaturnRingFeatures = {
  cInnerKm: 74_491,
  bInnerKm: 91_975,
  bOuterKm: 117_570,
  aInnerKm: 122_050,
  aOuterKm: 136_770,
  fCoreKm: 140_224,
  fFromKm: 139_826,
  fToKm: 140_612,
  gaps: {
    colombo: { name: 'Colombo', fromKm: 77_748, toKm: 77_926 },
    maxwell: { name: 'Maxwell', fromKm: 87_343, toKm: 87_610 },
    huygens: { name: 'Huygens', fromKm: 117_500, toKm: 117_930 },
    encke: { name: 'Encke', fromKm: 133_423, toKm: 133_745 },
    keeler: { name: 'Keeler', fromKm: 136_487, toKm: 136_522 },
  },
  source: SATURN_RINGS_SOURCE,
};
