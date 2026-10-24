import type { BodyId } from '../../data/body.model';
import { BODY_TREE, systemOf, treeKey, treeNode, visibleRows } from './body-tree';

const none = new Set<BodyId>();

describe('body-tree: índice de cuerpos como árbol (WAI-ARIA Tree View)', () => {
  it('el Sol y los ocho planetas en el primer nivel; las lunas dentro de su planeta', () => {
    expect(visibleRows(none)).toEqual([
      'sol',
      'mercurio',
      'venus',
      'tierra',
      'marte',
      'jupiter',
      'saturno',
      'urano',
      'neptuno',
    ]);
    expect(treeNode('saturno').children).toHaveLength(7);
    expect(treeNode('tierra').children).toEqual(['luna']);
    expect(BODY_TREE).toHaveLength(30);
  });

  it('abajo y arriba recorren las filas visibles, con las lunas de los planetas abiertos', () => {
    const open = new Set<BodyId>(['marte']);
    expect(treeKey('ArrowDown', 'marte', open).focus).toBe('fobos');
    expect(treeKey('ArrowDown', 'deimos', open).focus).toBe('jupiter');
    expect(treeKey('ArrowUp', 'jupiter', open).focus).toBe('deimos');
    expect(treeKey('ArrowUp', 'sol', open).focus).toBe('sol');
    expect(treeKey('End', 'sol', open).focus).toBe('neptuno');
    expect(treeKey('Home', 'neptuno', open).focus).toBe('sol');
  });

  it('derecha abre un planeta y luego entra en su primera luna; izquierda cierra o sube', () => {
    expect(treeKey('ArrowRight', 'jupiter', none)).toEqual({ focus: 'jupiter', expand: 'jupiter' });
    const open = new Set<BodyId>(['jupiter']);
    expect(treeKey('ArrowRight', 'jupiter', open)).toEqual({ focus: 'io' });
    expect(treeKey('ArrowLeft', 'europa', open)).toEqual({ focus: 'jupiter' });
    expect(treeKey('ArrowLeft', 'jupiter', open)).toEqual({
      focus: 'jupiter',
      collapse: 'jupiter',
    });
    // Sin lunas, derecha no hace nada.
    expect(treeKey('ArrowRight', 'venus', none)).toEqual({ focus: 'venus' });
  });

  it('el sistema de un cuerpo: el planeta de una luna, el planeta con lunas, o ninguno', () => {
    expect(systemOf('titan')).toBe('saturno');
    expect(systemOf('saturno')).toBe('saturno');
    expect(systemOf('luna')).toBe('tierra');
    expect(systemOf('venus')).toBeNull();
    expect(systemOf('sol')).toBeNull();
    expect(systemOf(null)).toBeNull();
  });
});
