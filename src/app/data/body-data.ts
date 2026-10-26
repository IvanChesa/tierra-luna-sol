// GENERADO por scripts/build-body-data.mjs el 2026-10-26. No se edita a mano.
// Datos físicos y orbitales copiados de las fichas de la NASA (NSSDCA) y del JPL; cada dato lleva
// el id de su fuente (data/sources.ts). Solo hay cambios de unidad exactos y, en los planetas,
// radio = diámetro / 2.
import type { BodyData, BodyId } from './body.model';

export const BODY_DATA: Record<BodyId, BodyData> = {
  sol: {
    physical: {
      radiusKm: {
        value: 695700,
        source: 'nssdc-sun',
        note: 'Radio medio volumétrico.',
      },
      massKg: {
        value: 1.9884e30,
        source: 'nssdc-sun',
      },
      densityKgM3: {
        value: 1408,
        source: 'nssdc-sun',
      },
      surfaceGravityMS2: {
        value: 274,
        source: 'nssdc-sun',
        note: 'En el ecuador.',
      },
      escapeVelocityKmS: {
        value: 617.6,
        source: 'nssdc-sun',
      },
      rotationPeriodH: {
        value: 609.12,
        source: 'nssdc-sun',
        note: 'A 16° de latitud: el Sol no gira como un sólido.',
      },
      axialTiltDeg: {
        value: 7.25,
        source: 'nssdc-sun',
        note: 'Respecto a la eclíptica.',
      },
      effectiveTemperatureK: {
        value: 5772,
        source: 'nssdc-sun',
      },
      luminosityW: {
        value: 3.828e26,
        source: 'nssdc-sun',
      },
      spectralType: {
        value: 'G2 V',
        source: 'nssdc-sun',
      },
    },
  },
  mercurio: {
    physical: {
      radiusKm: {
        value: 2439.5,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 3.3e23,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 5429,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 3.7,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 4.3,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: 1407.6,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 4222.6,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 0.034,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: 167,
        source: 'nssdc-planets',
      },
      surfacePressureBar: {
        value: 0,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: true,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: false,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0.0009,
        source: 'nssdc-mercury',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.142,
        source: 'nssdc-mercury',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 57900000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 46000000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 69800000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 88,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 47.4,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 7,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.206,
        source: 'nssdc-planets',
      },
    },
  },
  venus: {
    physical: {
      radiusKm: {
        value: 6052,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 4.87e24,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 5243,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 8.9,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 10.4,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: -5832.5,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 2802,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 177.4,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: 464,
        source: 'nssdc-planets',
      },
      surfacePressureBar: {
        value: 92,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: false,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: false,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0,
        source: 'nssdc-venus',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.689,
        source: 'nssdc-venus',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 108200000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 107500000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 108900000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 224.7,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 35,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 3.4,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.007,
        source: 'nssdc-planets',
      },
    },
  },
  tierra: {
    physical: {
      radiusKm: {
        value: 6378,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 5.97e24,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 5514,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 9.8,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 11.2,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: 23.9,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 24,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 23.4,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: 15,
        source: 'nssdc-planets',
      },
      surfacePressureBar: {
        value: 1,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: true,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: false,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0.003353,
        source: 'nssdc-earth',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.434,
        source: 'nssdc-earth',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 149600000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 147100000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 152100000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 365.2,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 29.8,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 0,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.017,
        source: 'nssdc-planets',
      },
    },
  },
  marte: {
    physical: {
      radiusKm: {
        value: 3396,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 6.42e23,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 3934,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 3.7,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 5,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: 24.6,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 24.7,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 25.2,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: -65,
        source: 'nssdc-planets',
      },
      surfacePressureBar: {
        value: 0.01,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: false,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: false,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0.00589,
        source: 'nssdc-mars',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.17,
        source: 'nssdc-mars',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 228000000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 206700000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 249300000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 687,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 24.1,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 1.8,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.094,
        source: 'nssdc-planets',
      },
    },
  },
  jupiter: {
    physical: {
      radiusKm: {
        value: 71492,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 1.898e27,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 1326,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 23.1,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 59.5,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: 9.9,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 9.9,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 3.1,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: -110,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: true,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: true,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0.06487,
        source: 'nssdc-jupiter',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.538,
        source: 'nssdc-jupiter',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 778500000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 740600000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 816400000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 4331,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 13.1,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 1.3,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.049,
        source: 'nssdc-planets',
      },
    },
  },
  saturno: {
    physical: {
      radiusKm: {
        value: 60268,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 5.68e26,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 687,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 9,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 35.5,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: 10.7,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 10.7,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 26.7,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: -140,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: true,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: true,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0.09796,
        source: 'nssdc-saturn',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.499,
        source: 'nssdc-saturn',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 1432000000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 1357600000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 1506500000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 10747,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 9.7,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 2.5,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.052,
        source: 'nssdc-planets',
      },
    },
    rings: {
      innerRadiusKm: {
        value: 74658,
        source: 'nssdc-saturn-rings',
        note: 'Borde interior del anillo C.',
      },
      cassiniInnerKm: {
        value: 117507,
        source: 'nssdc-saturn-rings',
        note: 'Borde exterior del anillo B (empieza la división de Cassini).',
      },
      cassiniOuterKm: {
        value: 122340,
        source: 'nssdc-saturn-rings',
        note: 'Borde interior del anillo A (acaba la división de Cassini).',
      },
      outerRadiusKm: {
        value: 136780,
        source: 'nssdc-saturn-rings',
        note: 'Borde exterior del anillo A.',
      },
    },
  },
  urano: {
    physical: {
      radiusKm: {
        value: 25559,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 8.68e25,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 1270,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 8.7,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 21.3,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: -17.2,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 17.2,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 97.8,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: -195,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: true,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: true,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0.02293,
        source: 'nssdc-uranus',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.488,
        source: 'nssdc-uranus',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 2867000000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 2732700000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 3001400000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 30589,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 6.8,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 0.8,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.047,
        source: 'nssdc-planets',
      },
    },
  },
  neptuno: {
    physical: {
      radiusKm: {
        value: 24764,
        source: 'nssdc-planets',
        note: 'Radio ecuatorial: la mitad del diámetro de la ficha.',
      },
      massKg: {
        value: 1.02e26,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 1638,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 11,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 23.5,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: 16.1,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 16.1,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 28.3,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: -200,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: true,
        source: 'nssdc-planets',
      },
      ringSystem: {
        value: true,
        source: 'nssdc-planets',
      },
      flatteningRatio: {
        value: 0.01708,
        source: 'nssdc-neptune',
        note: 'Achatamiento f = (a − c) / a (radios ecuatorial y polar).',
      },
      geometricAlbedo: {
        value: 0.442,
        source: 'nssdc-neptune',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 4515000000,
        source: 'nssdc-planets',
      },
      periapsisKm: {
        value: 4471100000,
        source: 'nssdc-planets',
      },
      apoapsisKm: {
        value: 4558900000,
        source: 'nssdc-planets',
      },
      periodDays: {
        value: 59800,
        source: 'nssdc-planets',
      },
      meanOrbitalVelocityKmS: {
        value: 5.4,
        source: 'nssdc-planets',
      },
      inclinationDeg: {
        value: 1.8,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.01,
        source: 'nssdc-planets',
      },
    },
  },
  luna: {
    physical: {
      massKg: {
        value: 7.3e22,
        source: 'nssdc-planets',
      },
      densityKgM3: {
        value: 3340,
        source: 'nssdc-planets',
      },
      surfaceGravityMS2: {
        value: 1.6,
        source: 'nssdc-planets',
      },
      escapeVelocityKmS: {
        value: 2.4,
        source: 'nssdc-planets',
      },
      rotationPeriodH: {
        value: 655.7,
        source: 'nssdc-planets',
      },
      lengthOfDayH: {
        value: 708.7,
        source: 'nssdc-planets',
      },
      axialTiltDeg: {
        value: 6.7,
        source: 'nssdc-planets',
      },
      meanTemperatureC: {
        value: -20,
        source: 'nssdc-planets',
      },
      surfacePressureBar: {
        value: 0,
        source: 'nssdc-planets',
      },
      globalMagneticField: {
        value: false,
        source: 'nssdc-planets',
      },
      radiusKm: {
        value: 1737.4,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      geometricAlbedo: {
        value: 0.12,
        source: 'nssdc-moon',
        note: 'Albedo geométrico (visual).',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 384000,
        source: 'nssdc-planets',
        note: 'Respecto a la Tierra (nota * de la ficha).',
      },
      periapsisKm: {
        value: 363000,
        source: 'nssdc-planets',
        note: 'Respecto a la Tierra (nota * de la ficha).',
      },
      apoapsisKm: {
        value: 406000,
        source: 'nssdc-planets',
        note: 'Respecto a la Tierra (nota * de la ficha).',
      },
      periodDays: {
        value: 27.3,
        source: 'nssdc-planets',
        note: 'Respecto a la Tierra (nota * de la ficha).',
      },
      meanOrbitalVelocityKmS: {
        value: 1,
        source: 'nssdc-planets',
        note: 'Respecto a la Tierra (nota * de la ficha).',
      },
      inclinationDeg: {
        value: 5.1,
        source: 'nssdc-planets',
        note: 'Respecto a la eclíptica.',
      },
      eccentricity: {
        value: 0.055,
        source: 'nssdc-planets',
      },
    },
  },
  fobos: {
    physical: {
      radiusKm: {
        value: 11.08,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1872,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 10600000000000000,
        source: 'nssdc-mars',
      },
      geometricAlbedo: {
        value: 0.07,
        source: 'nssdc-mars',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-mars',
        note: 'Periodo de rotación igual al orbital.',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 9378,
        source: 'nssdc-mars',
      },
      periodDays: {
        value: 0.31891,
        source: 'nssdc-mars',
      },
      inclinationDeg: {
        value: 1.08,
        source: 'nssdc-mars',
        note: 'Respecto al ecuador de Marte.',
      },
      eccentricity: {
        value: 0.0151,
        source: 'nssdc-mars',
      },
    },
  },
  deimos: {
    physical: {
      radiusKm: {
        value: 6.2,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1471,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 2400000000000000,
        source: 'nssdc-mars',
      },
      geometricAlbedo: {
        value: 0.08,
        source: 'nssdc-mars',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-mars',
        note: 'Periodo de rotación igual al orbital.',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 23459,
        source: 'nssdc-mars',
      },
      periodDays: {
        value: 1.26244,
        source: 'nssdc-mars',
      },
      inclinationDeg: {
        value: 1.79,
        source: 'nssdc-mars',
        note: 'Respecto al ecuador de Marte.',
      },
      eccentricity: {
        value: 0.0005,
        source: 'nssdc-mars',
      },
    },
  },
  io: {
    physical: {
      radiusKm: {
        value: 1821.49,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 3527.6,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 8.932e22,
        source: 'nssdc-jovian-satellites',
      },
      geometricAlbedo: {
        value: 0.62,
        source: 'nssdc-jovian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-jovian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 421800,
        source: 'nssdc-jovian-satellites',
      },
      periodDays: {
        value: 1.769138,
        source: 'nssdc-jovian-satellites',
      },
      inclinationDeg: {
        value: 0.04,
        source: 'nssdc-jovian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.004,
        source: 'nssdc-jovian-satellites',
      },
    },
  },
  europa: {
    physical: {
      radiusKm: {
        value: 1560.8,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 3013,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 4.8e22,
        source: 'nssdc-jovian-satellites',
      },
      geometricAlbedo: {
        value: 0.68,
        source: 'nssdc-jovian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-jovian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 671100,
        source: 'nssdc-jovian-satellites',
      },
      periodDays: {
        value: 3.551181,
        source: 'nssdc-jovian-satellites',
      },
      inclinationDeg: {
        value: 0.47,
        source: 'nssdc-jovian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.009,
        source: 'nssdc-jovian-satellites',
      },
    },
  },
  ganimedes: {
    physical: {
      radiusKm: {
        value: 2631.2,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1941.6,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 1.4819e23,
        source: 'nssdc-jovian-satellites',
      },
      geometricAlbedo: {
        value: 0.44,
        source: 'nssdc-jovian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-jovian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 1070400,
        source: 'nssdc-jovian-satellites',
      },
      periodDays: {
        value: 7.154553,
        source: 'nssdc-jovian-satellites',
      },
      inclinationDeg: {
        value: 0.18,
        source: 'nssdc-jovian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.001,
        source: 'nssdc-jovian-satellites',
      },
    },
  },
  calisto: {
    physical: {
      radiusKm: {
        value: 2410.3,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1834,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 1.0759e23,
        source: 'nssdc-jovian-satellites',
      },
      geometricAlbedo: {
        value: 0.19,
        source: 'nssdc-jovian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-jovian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 1882700,
        source: 'nssdc-jovian-satellites',
      },
      periodDays: {
        value: 16.689017,
        source: 'nssdc-jovian-satellites',
      },
      inclinationDeg: {
        value: 0.19,
        source: 'nssdc-jovian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.007,
        source: 'nssdc-jovian-satellites',
      },
    },
  },
  mimas: {
    physical: {
      radiusKm: {
        value: 198.2,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1150.1,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 37900000000000000000,
        source: 'nssdc-saturnian-satellites',
      },
      geometricAlbedo: {
        value: 0.6,
        source: 'nssdc-saturnian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-saturnian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 185520,
        source: 'nssdc-saturnian-satellites',
      },
      periodDays: {
        value: 0.9424218,
        source: 'nssdc-saturnian-satellites',
      },
      inclinationDeg: {
        value: 1.53,
        source: 'nssdc-saturnian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0202,
        source: 'nssdc-saturnian-satellites',
      },
    },
  },
  encelado: {
    physical: {
      radiusKm: {
        value: 252.1,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1609.7,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 108000000000000000000,
        source: 'nssdc-saturnian-satellites',
      },
      geometricAlbedo: {
        value: 1,
        source: 'nssdc-saturnian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-saturnian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 238020,
        source: 'nssdc-saturnian-satellites',
      },
      periodDays: {
        value: 1.370218,
        source: 'nssdc-saturnian-satellites',
      },
      inclinationDeg: {
        value: 0,
        source: 'nssdc-saturnian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0045,
        source: 'nssdc-saturnian-satellites',
      },
    },
  },
  tetis: {
    physical: {
      radiusKm: {
        value: 531.1,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 984,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 618000000000000000000,
        source: 'nssdc-saturnian-satellites',
      },
      geometricAlbedo: {
        value: 0.8,
        source: 'nssdc-saturnian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-saturnian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 294660,
        source: 'nssdc-saturnian-satellites',
      },
      periodDays: {
        value: 1.887802,
        source: 'nssdc-saturnian-satellites',
      },
      inclinationDeg: {
        value: 1.86,
        source: 'nssdc-saturnian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0,
        source: 'nssdc-saturnian-satellites',
      },
    },
  },
  dione: {
    physical: {
      radiusKm: {
        value: 561.4,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1478.1,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 1.1e21,
        source: 'nssdc-saturnian-satellites',
      },
      geometricAlbedo: {
        value: 0.7,
        source: 'nssdc-saturnian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-saturnian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 377400,
        source: 'nssdc-saturnian-satellites',
      },
      periodDays: {
        value: 2.736915,
        source: 'nssdc-saturnian-satellites',
      },
      inclinationDeg: {
        value: 0.02,
        source: 'nssdc-saturnian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0022,
        source: 'nssdc-saturnian-satellites',
      },
    },
  },
  rea: {
    physical: {
      radiusKm: {
        value: 763.5,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1237.2,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 2.31e21,
        source: 'nssdc-saturnian-satellites',
      },
      geometricAlbedo: {
        value: 0.7,
        source: 'nssdc-saturnian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-saturnian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 527040,
        source: 'nssdc-saturnian-satellites',
      },
      periodDays: {
        value: 4.5175,
        source: 'nssdc-saturnian-satellites',
      },
      inclinationDeg: {
        value: 0.35,
        source: 'nssdc-saturnian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.001,
        source: 'nssdc-saturnian-satellites',
      },
    },
  },
  titan: {
    physical: {
      radiusKm: {
        value: 2574.76,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1881.4,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 1.3455e23,
        source: 'nssdc-saturnian-satellites',
      },
      geometricAlbedo: {
        value: 0.22,
        source: 'nssdc-saturnian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-saturnian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 1221870,
        source: 'nssdc-saturnian-satellites',
      },
      periodDays: {
        value: 15.945421,
        source: 'nssdc-saturnian-satellites',
      },
      inclinationDeg: {
        value: 0.33,
        source: 'nssdc-saturnian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0292,
        source: 'nssdc-saturnian-satellites',
      },
    },
  },
  japeto: {
    physical: {
      radiusKm: {
        value: 734.3,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1088.7,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 1.81e21,
        source: 'nssdc-saturnian-satellites',
      },
      geometricAlbedo: {
        value: 0.05,
        source: 'nssdc-saturnian-satellites',
        note: 'Cara oscura; la clara llega a 0,5 (la ficha da «0.05 / 0.5»).',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-saturnian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 3560850,
        source: 'nssdc-saturnian-satellites',
      },
      periodDays: {
        value: 79.330183,
        source: 'nssdc-saturnian-satellites',
      },
      inclinationDeg: {
        value: 14.72,
        source: 'nssdc-saturnian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0283,
        source: 'nssdc-saturnian-satellites',
      },
    },
  },
  miranda: {
    physical: {
      radiusKm: {
        value: 235.8,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1178,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 66000000000000000000,
        source: 'nssdc-uranian-satellites',
      },
      geometricAlbedo: {
        value: 0.32,
        source: 'nssdc-uranian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-uranian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 129900,
        source: 'nssdc-uranian-satellites',
      },
      periodDays: {
        value: 1.413479,
        source: 'nssdc-uranian-satellites',
      },
      inclinationDeg: {
        value: 4.34,
        source: 'nssdc-uranian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0013,
        source: 'nssdc-uranian-satellites',
      },
    },
  },
  ariel: {
    physical: {
      radiusKm: {
        value: 578.9,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1539,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 1.29e21,
        source: 'nssdc-uranian-satellites',
      },
      geometricAlbedo: {
        value: 0.39,
        source: 'nssdc-uranian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-uranian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 190900,
        source: 'nssdc-uranian-satellites',
      },
      periodDays: {
        value: 2.520379,
        source: 'nssdc-uranian-satellites',
      },
      inclinationDeg: {
        value: 0.04,
        source: 'nssdc-uranian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0012,
        source: 'nssdc-uranian-satellites',
      },
    },
  },
  umbriel: {
    physical: {
      radiusKm: {
        value: 584.7,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1523,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 1.22e21,
        source: 'nssdc-uranian-satellites',
      },
      geometricAlbedo: {
        value: 0.21,
        source: 'nssdc-uranian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-uranian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 266000,
        source: 'nssdc-uranian-satellites',
      },
      periodDays: {
        value: 4.144176,
        source: 'nssdc-uranian-satellites',
      },
      inclinationDeg: {
        value: 0.13,
        source: 'nssdc-uranian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0039,
        source: 'nssdc-uranian-satellites',
      },
    },
  },
  titania: {
    physical: {
      radiusKm: {
        value: 788.9,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1653,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 3.42e21,
        source: 'nssdc-uranian-satellites',
      },
      geometricAlbedo: {
        value: 0.27,
        source: 'nssdc-uranian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-uranian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 436300,
        source: 'nssdc-uranian-satellites',
      },
      periodDays: {
        value: 8.705867,
        source: 'nssdc-uranian-satellites',
      },
      inclinationDeg: {
        value: 0.08,
        source: 'nssdc-uranian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0011,
        source: 'nssdc-uranian-satellites',
      },
    },
  },
  oberon: {
    physical: {
      radiusKm: {
        value: 761.4,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1664,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 2.88e21,
        source: 'nssdc-uranian-satellites',
      },
      geometricAlbedo: {
        value: 0.23,
        source: 'nssdc-uranian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-uranian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 583500,
        source: 'nssdc-uranian-satellites',
      },
      periodDays: {
        value: 13.463234,
        source: 'nssdc-uranian-satellites',
      },
      inclinationDeg: {
        value: 0.07,
        source: 'nssdc-uranian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0014,
        source: 'nssdc-uranian-satellites',
      },
    },
  },
  triton: {
    physical: {
      radiusKm: {
        value: 1352.6,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 2064.9,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 2.14e22,
        source: 'nssdc-neptunian-satellites',
      },
      geometricAlbedo: {
        value: 0.72,
        source: 'nssdc-neptunian-satellites',
      },
      synchronousRotation: {
        value: true,
        source: 'nssdc-neptunian-satellites',
        note: 'La ficha marca la rotación con «S».',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 354760,
        source: 'nssdc-neptunian-satellites',
      },
      periodDays: {
        value: 5.876854,
        source: 'nssdc-neptunian-satellites',
      },
      inclinationDeg: {
        value: 157.345,
        source: 'nssdc-neptunian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.000016,
        source: 'nssdc-neptunian-satellites',
      },
      retrograde: {
        value: true,
        source: 'nssdc-neptunian-satellites',
        note: 'La ficha marca el periodo con «R».',
      },
    },
  },
  proteo: {
    physical: {
      radiusKm: {
        value: 208,
        source: 'jpl-satellite-physical-parameters',
        note: 'Radio medio.',
      },
      densityKgM3: {
        value: 1026.9,
        source: 'jpl-satellite-physical-parameters',
      },
      massKg: {
        value: 50000000000000000000,
        source: 'nssdc-neptunian-satellites',
      },
      geometricAlbedo: {
        value: 0.1,
        source: 'nssdc-neptunian-satellites',
      },
    },
    orbit: {
      semiMajorAxisKm: {
        value: 117647,
        source: 'nssdc-neptunian-satellites',
      },
      periodDays: {
        value: 1.122315,
        source: 'nssdc-neptunian-satellites',
      },
      inclinationDeg: {
        value: 0.04,
        source: 'nssdc-neptunian-satellites',
        note: 'Respecto al ecuador del planeta.',
      },
      eccentricity: {
        value: 0.0004,
        source: 'nssdc-neptunian-satellites',
      },
    },
  },
};
