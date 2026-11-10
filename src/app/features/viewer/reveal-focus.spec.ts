import { revealInRow } from './reveal-focus';

/** Una fila de 273 px que se desplaza (361 de contenido), como la de las vistas de la Luna a 390. */
function row(scrollLeft = 0) {
  const scrolls: number[] = [];
  const element = {
    scrollWidth: 361,
    clientWidth: 273,
    clientLeft: 0,
    scrollLeft,
    getBoundingClientRect: () => ({ left: 16, right: 289 }),
    scrollBy: ({ left }: { left: number }) => scrolls.push(left),
  } as unknown as HTMLElement;
  return { element, scrolls };
}
const at = (left: number, right: number) =>
  ({ getBoundingClientRect: () => ({ left, right }) }) as unknown as HTMLElement;

describe('revealInRow: lo enfocado en una fila que se desplaza, entero y fuera del fundido (fase 10)', () => {
  it('«Luz rasante» asomando bajo el fundido: la fila se desplaza hasta dejarlo fuera de él', () => {
    // El botón va de x = 296 a 389; la fila acaba en 289 y su fundido empieza en 257.
    const { element, scrolls } = row();
    revealInRow(element, at(296, 389));
    expect(scrolls).toEqual([389 - (16 + 273 - 32)]);
  });

  it('lo que ya se ve, quieto; lo que queda a la izquierda, a su borde', () => {
    const still = row();
    revealInRow(still.element, at(30, 120));
    expect(still.scrolls).toEqual([]);
    const back = row(80);
    revealInRow(back.element, at(-10, 60));
    expect(back.scrolls).toEqual([-26]);
  });

  it('al final de la fila ya no hay fundido; y si la fila cabe entera, nada', () => {
    const end = row(361 - 273);
    revealInRow(end.element, at(200, 285));
    expect(end.scrolls).toEqual([]);
    const { element, scrolls } = row();
    Object.assign(element, { scrollWidth: 273 });
    revealInRow(element, at(296, 389));
    expect(scrolls).toEqual([]);
  });
});
