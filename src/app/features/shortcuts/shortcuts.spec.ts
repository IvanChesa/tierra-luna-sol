import { SHORTCUT_HELP, canvasCommand, globalCommand, isTextField } from './shortcuts';

const key = (
  k: string,
  mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {},
) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});

describe('shortcuts: atajos de teclado', () => {
  it('las letras valen en mayúscula y minúscula; los símbolos tal cual', () => {
    expect(globalCommand(key('k'))).toBe('toggle-play');
    expect(globalCommand(key('K'))).toBe('toggle-play');
    expect(globalCommand(key('?'))).toBe('help');
    expect(globalCommand(key('+'))).toBe('zoom-in');
    expect(globalCommand(key('-'))).toBe('zoom-out');
    expect(globalCommand(key('2'))).toBe('view-earth');
    expect(globalCommand(key('Escape'))).toBe('escape');
    expect(globalCommand(key('x'))).toBeNull();
  });

  it('con Ctrl, Cmd o Alt no hacen nada (son del navegador)', () => {
    expect(globalCommand(key('k', { ctrlKey: true }))).toBeNull();
    expect(globalCommand(key('+', { metaKey: true }))).toBeNull();
    expect(canvasCommand(key('ArrowLeft', { altKey: true }))).toBeNull();
  });

  it('las flechas, Inicio y el espacio solo son del lienzo', () => {
    expect(globalCommand(key('ArrowLeft'))).toBeNull();
    expect(canvasCommand(key('ArrowLeft'))).toBe('orbit-left');
    expect(canvasCommand(key('Home'))).toBe('overview');
    expect(canvasCommand(key(' '))).toBe('toggle-play');
  });

  it('no actúan con el foco en un campo de texto, de fecha, de hora o en un desplegable', () => {
    const make = (html: string) => {
      const host = document.createElement('div');
      host.innerHTML = html;
      return host.firstElementChild;
    };
    expect(isTextField(make('<input type="date">'))).toBe(true);
    expect(isTextField(make('<input type="time">'))).toBe(true);
    expect(isTextField(make('<input>'))).toBe(true);
    expect(isTextField(make('<select></select>'))).toBe(true);
    expect(isTextField(make('<textarea></textarea>'))).toBe(true);
    expect(isTextField(make('<input type="checkbox">'))).toBe(false);
    expect(isTextField(make('<button>Ir</button>'))).toBe(false);
    expect(isTextField(null)).toBe(false);
  });

  it('la ayuda documenta todas las órdenes globales', () => {
    const documented = SHORTCUT_HELP.flatMap((group) => group.items.flatMap((item) => item.keys));
    for (const k of ['K', ',', '.', 'R', 'N', 'G', '+', '−', '1', '2', '3', 'V', 'Esc', '?']) {
      expect(documented).toContain(k);
    }
  });
});
