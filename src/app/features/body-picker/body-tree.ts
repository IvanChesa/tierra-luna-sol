/**
 * Árbol de cuerpos del índice (patrón «Tree View» de WAI-ARIA): el Sol y los planetas en el primer
 * nivel y las lunas dentro de su planeta. Lógica pura de navegación con el teclado, sin Angular:
 * qué fila es la siguiente, la anterior, la madre o la primera hija.
 *
 * Sin búsqueda por la primera letra (recomendada, no obligatoria, en la guía de WAI-ARIA): las letras
 * son atajos globales del explorador (K, R, N, G, V) y se pisarían con «Neptuno», «Rea»…
 */
import { BODY_INDEX } from '../../data/body-index';
import type { BodyId } from '../../data/body.model';

export interface TreeNode {
  readonly id: BodyId;
  readonly name: string;
  readonly kind: 'star' | 'planet' | 'moon';
  readonly parent: BodyId | null;
  readonly children: readonly BodyId[];
}

export const BODY_TREE: readonly TreeNode[] = BODY_INDEX.map((entry) => ({
  id: entry.id,
  name: entry.name,
  kind: entry.kind,
  parent: entry.kind === 'moon' ? entry.parent : null,
  children: BODY_INDEX.filter((child) => child.kind === 'moon' && child.parent === entry.id).map(
    (child) => child.id,
  ),
}));

const BY_ID = new Map<BodyId, TreeNode>(BODY_TREE.map((node) => [node.id, node]));

export function treeNode(id: BodyId): TreeNode {
  const node = BY_ID.get(id);
  if (!node) throw new Error(`No hay ningún cuerpo «${id}» en el índice.`);
  return node;
}

/** Filas visibles en orden: el primer nivel y las lunas de los planetas abiertos. */
export function visibleRows(expanded: ReadonlySet<BodyId>): BodyId[] {
  const rows: BodyId[] = [];
  for (const node of BODY_TREE) {
    if (node.parent !== null) continue;
    rows.push(node.id);
    if (expanded.has(node.id)) rows.push(...node.children);
  }
  return rows;
}

export type TreeKey = 'ArrowDown' | 'ArrowUp' | 'ArrowRight' | 'ArrowLeft' | 'Home' | 'End';

export interface TreeMove {
  /** Fila que recibe el foco. */
  readonly focus: BodyId;
  /** Planeta que se abre o se cierra con esta tecla, si alguno. */
  readonly expand?: BodyId;
  readonly collapse?: BodyId;
}

/** Qué hace una tecla de navegación desde `current` (APG, «Tree View», interacción de teclado). */
export function treeKey(key: TreeKey, current: BodyId, expanded: ReadonlySet<BodyId>): TreeMove {
  const rows = visibleRows(expanded);
  const index = Math.max(rows.indexOf(current), 0);
  const node = treeNode(current);
  switch (key) {
    case 'ArrowDown':
      return { focus: rows[Math.min(index + 1, rows.length - 1)] as BodyId };
    case 'ArrowUp':
      return { focus: rows[Math.max(index - 1, 0)] as BodyId };
    case 'Home':
      return { focus: rows[0] as BodyId };
    case 'End':
      return { focus: rows[rows.length - 1] as BodyId };
    case 'ArrowRight':
      if (node.children.length === 0) return { focus: current };
      if (!expanded.has(current)) return { focus: current, expand: current };
      return { focus: node.children[0] as BodyId };
    case 'ArrowLeft':
      if (node.children.length > 0 && expanded.has(current))
        return { focus: current, collapse: current };
      return { focus: node.parent ?? current };
  }
}

/** Planeta cuyas lunas se abren al elegir un cuerpo: el suyo (si es una luna) o él mismo. */
export function systemOf(id: BodyId | null): BodyId | null {
  if (id === null) return null;
  const node = treeNode(id);
  if (node.parent !== null) return node.parent;
  return node.children.length > 0 ? node.id : null;
}

/** Los nodos del primer nivel (el Sol y los planetas). */
export const ROOT_NODES: readonly TreeNode[] = BODY_TREE.filter((node) => node.parent === null);
