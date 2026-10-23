// GENERADO por scripts/fit-moon-elements.mjs el 2026-10-23. No se edita a mano.
// Elementos medios ajustados por mínimos cuadrados a las efemérides del JPL (Horizons), época
// J2000 TT, en el plano de referencia de cada luna. Método, consultas y residuos:
// docs/datos/elementos-lunas.md.
import type { PlanetId } from '../ephemeris/ids';
import type { MeanElements } from '../ephemeris/moons';

export interface MoonElementsEntry {
  readonly parent: PlanetId;
  /** Consulta de Horizons de la ventana larga del ajuste (1900–2100). */
  readonly source: string;
  /** Efeméride del JPL de la que salen los datos. */
  readonly ephemeris: string;
  /** Plano de referencia: Laplace (polo de la tabla del JPL) o ecuador del planeta (polo IAU). */
  readonly referencePlane: { readonly kind: 'laplace' | 'ecuador'; readonly source: string };
  /** Calidad del ajuste frente a Horizons en 1900–2100 (error angular visto desde el planeta). */
  readonly fit: {
    readonly span: string;
    readonly samples: number;
    readonly rmsDeg: number;
    readonly maxDeg: number;
  };
  readonly elements: MeanElements;
}

export const MOON_ELEMENTS = {
  fobos: {
    parent: 'marte',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='401'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40499'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'mar099',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 3140,
      rmsDeg: 0.0314,
      maxDeg: 0.117,
    },
    elements: {
      referencePole: {
        raDeg: 317.7,
        decDeg: 52.9,
      },
      semiMajorAxisKm: 9374.921439,
      eccentricity: 0.015127814,
      inclinationDeg: 1.084444207,
      nodeDeg: 168.809857207,
      nodeRateDegPerDay: -0.4357969444,
      argPeriapsisDeg: 216.926540163,
      argPeriapsisRateDegPerDay: 0.8709829796,
      meanAnomalyDeg: 189.433284732,
      meanMotionDegPerDay: 1128.40957017678,
      meanMotionRateDegPerDay2: 1.887664993e-8,
    },
  },
  deimos: {
    parent: 'marte',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='402'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40499'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'mar099',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2288,
      rmsDeg: 0.0404,
      maxDeg: 0.162,
    },
    elements: {
      referencePole: {
        raDeg: 316.6,
        decDeg: 53.5,
      },
      semiMajorAxisKm: 23457.53973,
      eccentricity: 0.00027072582,
      inclinationDeg: 1.78690417,
      nodeDeg: 54.0603750178,
      nodeRateDegPerDay: -0.01807250691,
      argPeriapsisDeg: 200.464801854,
      argPeriapsisRateDegPerDay: 0.03607601285,
      meanAnomalyDeg: 4.92577486578,
      meanMotionDegPerDay: 285.143883639132,
      longitudeTerms: [
        {
          amplitudeDeg: 0.2722368,
          periodDays: 19905.3098,
          phaseDeg: 349.1515442,
        },
      ],
    },
  },
  mimas: {
    parent: 'saturno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='601'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40699'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'sat441l',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2386,
      rmsDeg: 0.124,
      maxDeg: 0.362,
    },
    elements: {
      referencePole: {
        raDeg: 40.6,
        decDeg: 83.5,
      },
      semiMajorAxisKm: 185534.9462,
      eccentricity: 0.019681753,
      inclinationDeg: 1.568489548,
      nodeDeg: 173.203685221,
      nodeRateDegPerDay: -0.9994930498,
      argPeriapsisDeg: 332.389368096,
      argPeriapsisRateDegPerDay: 2.000408796,
      meanAnomalyDeg: 14.7242197497,
      meanMotionDegPerDay: 380.993579531549,
      longitudeTerms: [
        {
          amplitudeDeg: 43.440967,
          periodDays: 25814.20064,
          phaseDeg: 140.755064,
        },
        {
          amplitudeDeg: 0.67607956,
          periodDays: 8590.333066,
          phaseDeg: 64.53207698,
        },
      ],
    },
  },
  encelado: {
    parent: 'saturno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='602'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40699'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'sat441l',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2267,
      rmsDeg: 0.0121,
      maxDeg: 0.0351,
    },
    elements: {
      referencePole: {
        raDeg: 40.6,
        decDeg: 83.5,
      },
      semiMajorAxisKm: 238035.9322,
      eccentricity: 0.0047321883,
      inclinationDeg: 0.0365674682,
      nodeDeg: 184.123472408,
      nodeRateDegPerDay: 0.0001816292651,
      argPeriapsisDeg: 347.417219694,
      argPeriapsisRateDegPerDay: 0.3377830531,
      meanAnomalyDeg: 10.7126659849,
      meanMotionDegPerDay: 262.393933090058,
      longitudeTerms: [
        {
          amplitudeDeg: 0.26167803,
          periodDays: 4035.181038,
          phaseDeg: 73.99564732,
        },
        {
          amplitudeDeg: 0.18832629,
          periodDays: 1418.902686,
          phaseDeg: 317.0096456,
        },
      ],
    },
  },
  tetis: {
    parent: 'saturno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='603'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40699'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'sat441l',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2194,
      rmsDeg: 0.0379,
      maxDeg: 0.0904,
    },
    elements: {
      referencePole: {
        raDeg: 40.6,
        decDeg: 83.5,
      },
      semiMajorAxisKm: 294673.2163,
      eccentricity: 0.000012062085,
      inclinationDeg: 1.094648764,
      nodeDeg: 259.841324988,
      nodeRateDegPerDay: -0.1978496092,
      argPeriapsisDeg: 353.039379156,
      argPeriapsisRateDegPerDay: -0.01668255018,
      meanAnomalyDeg: 295.498390319,
      meanMotionDegPerDay: 190.91244335311,
      longitudeTerms: [
        {
          amplitudeDeg: 2.0875089,
          periodDays: 25839.34717,
          phaseDeg: 320.7352217,
        },
      ],
    },
  },
  dione: {
    parent: 'saturno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='604'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40699'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'sat441l',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2135,
      rmsDeg: 0.029,
      maxDeg: 0.0658,
    },
    elements: {
      referencePole: {
        raDeg: 40.6,
        decDeg: 83.5,
      },
      semiMajorAxisKm: 377415.3003,
      eccentricity: 0.0021940616,
      inclinationDeg: 0.0397471694,
      nodeDeg: 187.788024648,
      nodeRateDegPerDay: 0.0002560144114,
      argPeriapsisDeg: 26.9384869875,
      argPeriapsisRateDegPerDay: 0.08399084977,
      meanAnomalyDeg: 322.176480017,
      meanMotionDegPerDay: 131.450683744617,
    },
  },
  rea: {
    parent: 'saturno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='605'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40699'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'sat441l',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2083,
      rmsDeg: 0.0439,
      maxDeg: 0.0933,
    },
    elements: {
      referencePole: {
        raDeg: 40.6,
        decDeg: 83.5,
      },
      semiMajorAxisKm: 527067.4611,
      eccentricity: 0.00097427416,
      inclinationDeg: 0.3246462432,
      nodeDeg: 353.210800021,
      nodeRateDegPerDay: -0.02745638637,
      argPeriapsisDeg: 208.265896313,
      argPeriapsisRateDegPerDay: 0.02883248023,
      meanAnomalyDeg: 210.685757471,
      meanMotionDegPerDay: 79.688669945749,
    },
  },
  titan: {
    parent: 'saturno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='606'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40699'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'sat441l',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2051,
      rmsDeg: 0.0195,
      maxDeg: 0.0567,
    },
    elements: {
      referencePole: {
        raDeg: 36.4,
        decDeg: 84,
      },
      semiMajorAxisKm: 1221864.893,
      eccentricity: 0.028734279,
      inclinationDeg: 0.3432140291,
      nodeDeg: 23.6010876709,
      nodeRateDegPerDay: -0.001314167849,
      argPeriapsisDeg: 184.653677368,
      argPeriapsisRateDegPerDay: 0.002722758946,
      meanAnomalyDeg: 163.472350936,
      meanMotionDegPerDay: 22.5755676509366,
    },
  },
  japeto: {
    parent: 'saturno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='608'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40699'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'sat441l',
    referencePlane: {
      kind: 'laplace',
      source: 'https://ssd.jpl.nasa.gov/sats/elem/',
    },
    fit: {
      span: '1900–2100',
      samples: 2051,
      rmsDeg: 0.0615,
      maxDeg: 0.165,
    },
    elements: {
      referencePole: {
        raDeg: 288.7,
        decDeg: 78.9,
      },
      semiMajorAxisKm: 3560839.624,
      eccentricity: 0.028401582,
      inclinationDeg: 7.578231858,
      nodeDeg: 74.8028614827,
      nodeRateDegPerDay: -0.0003149218251,
      argPeriapsisDeg: 276.448546009,
      argPeriapsisRateDegPerDay: 0.0005947500052,
      meanAnomalyDeg: 209.017460446,
      meanMotionDegPerDay: 4.53766886824987,
      meanMotionRateDegPerDay2: -3.022257261e-10,
    },
  },
  miranda: {
    parent: 'urano',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='705'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40799'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'ura184_merged',
    referencePlane: {
      kind: 'ecuador',
      source: 'https://doi.org/10.1007/s10569-017-9805-5',
    },
    fit: {
      span: '1900–2100',
      samples: 2258,
      rmsDeg: 0.0626,
      maxDeg: 0.285,
    },
    elements: {
      referencePole: {
        raDeg: 77.311,
        decDeg: 15.175,
      },
      semiMajorAxisKm: 129847.9786,
      eccentricity: 0.0013493569,
      inclinationDeg: 4.426886759,
      nodeDeg: 100.860026338,
      nodeRateDegPerDay: -0.05541319379,
      argPeriapsisDeg: 154.637759345,
      argPeriapsisRateDegPerDay: 0.1102691516,
      meanAnomalyDeg: 73.1458063233,
      meanMotionDegPerDay: 254.635806707562,
      longitudeTerms: [
        {
          amplitudeDeg: 1.4373732,
          periodDays: 4582.275074,
          phaseDeg: 318.1001887,
        },
        {
          amplitudeDeg: 0.17483298,
          periodDays: 2289.643814,
          phaseDeg: 277.0113371,
        },
      ],
    },
  },
  ariel: {
    parent: 'urano',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='701'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40799'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'ura184_merged',
    referencePlane: {
      kind: 'ecuador',
      source: 'https://doi.org/10.1007/s10569-017-9805-5',
    },
    fit: {
      span: '1900–2100',
      samples: 2147,
      rmsDeg: 0.113,
      maxDeg: 0.302,
    },
    elements: {
      referencePole: {
        raDeg: 77.311,
        decDeg: 15.175,
      },
      semiMajorAxisKm: 190929.302,
      eccentricity: 0.00030286502,
      inclinationDeg: 0.006514670791,
      nodeDeg: 208.363105934,
      nodeRateDegPerDay: -0.04582997767,
      argPeriapsisDeg: 140.973165211,
      argPeriapsisRateDegPerDay: 0.07448448182,
      meanAnomalyDeg: 213.775877119,
      meanMotionDegPerDay: 142.806998256601,
      meanMotionRateDegPerDay2: -4.270426591e-10,
    },
  },
  umbriel: {
    parent: 'urano',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='702'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40799'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'ura184_merged',
    referencePlane: {
      kind: 'ecuador',
      source: 'https://doi.org/10.1007/s10569-017-9805-5',
    },
    fit: {
      span: '1900–2100',
      samples: 2090,
      rmsDeg: 0.0586,
      maxDeg: 0.186,
    },
    elements: {
      referencePole: {
        raDeg: 77.311,
        decDeg: 15.175,
      },
      semiMajorAxisKm: 265981.4358,
      eccentricity: 0.0038852163,
      inclinationDeg: 0.08250718278,
      nodeDeg: 182.516272194,
      nodeRateDegPerDay: -0.007479940196,
      argPeriapsisDeg: 170.067329354,
      argPeriapsisRateDegPerDay: 0.01524082616,
      meanAnomalyDeg: 258.661633792,
      meanMotionDegPerDay: 86.8611131115509,
    },
  },
  titania: {
    parent: 'urano',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='703'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40799'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'ura184_merged',
    referencePlane: {
      kind: 'ecuador',
      source: 'https://doi.org/10.1007/s10569-017-9805-5',
    },
    fit: {
      span: '1900–2100',
      samples: 2052,
      rmsDeg: 0.111,
      maxDeg: 0.38,
    },
    elements: {
      referencePole: {
        raDeg: 77.311,
        decDeg: 15.175,
      },
      semiMajorAxisKm: 436280.5488,
      eccentricity: 0.0013958275,
      inclinationDeg: 0.02981752843,
      nodeDeg: 266.847419169,
      nodeRateDegPerDay: 0.007094539208,
      argPeriapsisDeg: 324.972112285,
      argPeriapsisRateDegPerDay: -0.004050178435,
      meanAnomalyDeg: 49.7422550722,
      meanMotionDegPerDay: 41.3483705318733,
    },
  },
  oberon: {
    parent: 'urano',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='704'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40799'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'ura184_merged',
    referencePlane: {
      kind: 'ecuador',
      source: 'https://doi.org/10.1007/s10569-017-9805-5',
    },
    fit: {
      span: '1900–2100',
      samples: 2051,
      rmsDeg: 0.0914,
      maxDeg: 0.281,
    },
    elements: {
      referencePole: {
        raDeg: 77.311,
        decDeg: 15.175,
      },
      semiMajorAxisKm: 583447.5285,
      eccentricity: 0.0014211212,
      inclinationDeg: 0.1717108355,
      nodeDeg: 32.4214637131,
      nodeRateDegPerDay: -0.001083922064,
      argPeriapsisDeg: 165.277850035,
      argPeriapsisRateDegPerDay: 0.001738247825,
      meanAnomalyDeg: 154.857840482,
      meanMotionDegPerDay: 26.7388278788794,
    },
  },
  triton: {
    parent: 'neptuno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='801'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40899'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'nep098_merged',
    referencePlane: {
      kind: 'ecuador',
      source: 'https://doi.org/10.1007/s10569-017-9805-5',
    },
    fit: {
      span: '1900–2100',
      samples: 2065,
      rmsDeg: 0.0307,
      maxDeg: 0.162,
    },
    elements: {
      referencePole: {
        raDeg: 299.3337,
        decDeg: 42.9504,
      },
      semiMajorAxisKm: 354759.0216,
      eccentricity: 0.00012661115,
      inclinationDeg: 157.3009797,
      nodeDeg: 177.885928267,
      nodeRateDegPerDay: 0.001462901174,
      argPeriapsisDeg: 77.1340291016,
      argPeriapsisRateDegPerDay: 0.002584735216,
      meanAnomalyDeg: 341.464447802,
      meanMotionDegPerDay: 61.2561409806943,
    },
  },
  proteo: {
    parent: 'neptuno',
    source:
      "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='808'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500%40899'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'&OUT_UNITS='KM-S'&CSV_FORMAT='YES'&START_TIME='1900-01-01'&STOP_TIME='2100-12-31'&STEP_SIZE='105307%20m'",
    ephemeris: 'nep098_merged',
    referencePlane: {
      kind: 'ecuador',
      source: 'https://doi.org/10.1007/s10569-017-9805-5',
    },
    fit: {
      span: '1900–2100',
      samples: 2324,
      rmsDeg: 0.0641,
      maxDeg: 0.272,
    },
    elements: {
      referencePole: {
        raDeg: 299.3337,
        decDeg: 42.9504,
      },
      semiMajorAxisKm: 117646.9165,
      eccentricity: 0.00003651532,
      inclinationDeg: 0.591858982,
      nodeDeg: 2.00735287891,
      nodeRateDegPerDay: 0.002280400209,
      argPeriapsisDeg: 106.316570601,
      argPeriapsisRateDegPerDay: -0.01001914982,
      meanAnomalyDeg: 165.807122013,
      meanMotionDegPerDay: 320.773373227379,
    },
  },
} as const satisfies Record<string, MoonElementsEntry>;

export type MeanElementsMoonId = keyof typeof MOON_ELEMENTS;
