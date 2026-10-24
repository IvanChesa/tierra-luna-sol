import {
  Mat3,
  columnOf,
  cross,
  fromColumns,
  length,
  mulMat3Vec,
  normalize,
  rotationZ,
  vec3,
} from './vec3';

describe('vec3: utilidades de vectores y matrices', () => {
  it('normaliza vectores y deja el vector nulo como está', () => {
    expect(length(normalize(vec3(3, 4, 12)))).toBeCloseTo(1, 15);
    expect(normalize(vec3(0, 0, 0))).toEqual(vec3(0, 0, 0));
  });

  it('el producto vectorial sigue la regla de la mano derecha', () => {
    expect(cross(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual(vec3(0, 0, 1));
    expect(cross(vec3(0, 1, 0), vec3(1, 0, 0))).toEqual(vec3(0, 0, -1));
  });

  it('columnOf y fromColumns son inversas y las columnas son las imágenes de los ejes', () => {
    const m: Mat3 = rotationZ(30);
    const rebuilt = fromColumns(columnOf(m, 0), columnOf(m, 1), columnOf(m, 2));
    expect(rebuilt).toEqual(m);
    expect(columnOf(m, 0)).toEqual(mulMat3Vec(m, vec3(1, 0, 0)));
    expect(columnOf(m, 1)).toEqual(mulMat3Vec(m, vec3(0, 1, 0)));
    expect(columnOf(m, 2)).toEqual(mulMat3Vec(m, vec3(0, 0, 1)));
  });
});
