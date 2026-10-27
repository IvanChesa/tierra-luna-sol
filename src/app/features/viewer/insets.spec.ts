import { insetsFromRects, parseChromeEdge } from './insets';

const stage = { left: 0, top: 56, right: 1600, bottom: 900 };
const rect = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
});

describe('insets: márgenes que tapa la interfaz', () => {
  it('escritorio: columna izquierda, ficha a la derecha y barra de tiempo abajo', () => {
    const insets = insetsFromRects(stage, [
      rect(0, 56, 296, 832), // columna del índice
      rect(1264, 56, 1600, 832), // ficha resumida
      rect(0, 832, 1600, 900), // barra de tiempo
      rect(1200, 700, 1248, 820), // botones de cámara: pequeños, no cuentan
    ]);
    expect(insets).toEqual({ top: 0, right: 336, bottom: 68, left: 296 });
  });

  it('móvil: franja superior y hoja inferior', () => {
    const phone = { left: 0, top: 52, right: 390, bottom: 844 };
    const insets = insetsFromRects(phone, [rect(0, 52, 390, 190), rect(0, 660, 390, 844)]);
    expect(insets).toEqual({ top: 138, right: 0, bottom: 184, left: 0 });
  });

  it('con un borde declarado (--chrome-edge), el panel cuenta por él aunque sea bajo o flote', () => {
    const insets = insetsFromRects(stage, [
      { ...rect(1248, 72, 1584, 400), edge: 'right' }, // tarjeta flotante, baja y separada del borde
      { ...rect(0, 700, 1600, 900), edge: 'bottom' }, // franja de abajo
      { ...rect(400, 640, 1200, 696), edge: 'bottom' }, // fila de lunas, flotando sobre la franja
      { ...rect(16, 72, 336, 680), edge: 'left' }, // índice abierto
      { ...rect(0, 56, 1600, 300), edge: 'none' }, // el texto de presentación en escritorio
    ]);
    expect(insets).toEqual({ top: 0, right: 352, bottom: 260, left: 336 });
  });

  it('el borde declarado solo vale si es uno de los cuatro (o «none»)', () => {
    expect(parseChromeEdge(' left ')).toBe('left');
    expect(parseChromeEdge('none')).toBe('none');
    expect(parseChromeEdge('')).toBeNull();
    expect(parseChromeEdge('izquierda')).toBeNull();
    expect(parseChromeEdge(undefined)).toBeNull();
    // Sin borde válido, se clasifica por la geometría (aquí, una franja de abajo).
    const insets = insetsFromRects(stage, [
      { ...rect(0, 832, 1600, 900), edge: parseChromeEdge('raro') },
    ]);
    expect(insets).toEqual({ top: 0, right: 0, bottom: 68, left: 0 });
  });

  it('lo que no toca un borde o queda fuera del lienzo no tapa nada', () => {
    expect(insetsFromRects(stage, [rect(400, 300, 1200, 700), rect(-500, 0, -10, 900)])).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(insetsFromRects({ left: 0, top: 0, right: 0, bottom: 0 }, [rect(0, 0, 10, 10)])).toEqual(
      { top: 0, right: 0, bottom: 0, left: 0 },
    );
  });
});
