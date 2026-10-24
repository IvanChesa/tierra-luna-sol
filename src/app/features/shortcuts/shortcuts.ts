/**
 * Atajos de teclado del explorador (PLAN, fase 3, 3.d.10). Una tabla pura: la usan el manejador
 * global, el del lienzo y el diálogo de ayuda (`?`), así que lo que se documenta es lo que hay.
 */

export type ShortcutCommand =
  | 'help'
  | 'toggle-play'
  | 'slower'
  | 'faster'
  | 'reverse'
  | 'now'
  | 'overview'
  | 'zoom-in'
  | 'zoom-out'
  | 'view-system'
  | 'view-earth'
  | 'view-moon'
  | 'clean-view'
  | 'escape';

export type CanvasCommand =
  'orbit-left' | 'orbit-right' | 'orbit-up' | 'orbit-down' | 'overview' | 'toggle-play';

export interface ShortcutHelp {
  /** Teclas tal y como se muestran (cada una en su `<kbd>`). */
  readonly keys: readonly string[];
  readonly action: string;
}

/** Tecla (`KeyboardEvent.key`) → orden, en cualquier parte del explorador. */
const GLOBAL_KEYS: Readonly<Record<string, ShortcutCommand>> = {
  '?': 'help',
  k: 'toggle-play',
  ',': 'slower',
  '.': 'faster',
  r: 'reverse',
  n: 'now',
  g: 'overview',
  '+': 'zoom-in',
  '-': 'zoom-out',
  '1': 'view-system',
  '2': 'view-earth',
  '3': 'view-moon',
  v: 'clean-view',
  Escape: 'escape',
};

/** Tecla → orden, solo con el foco en el lienzo (las flechas y el espacio no se roban fuera). */
const CANVAS_KEYS: Readonly<Record<string, CanvasCommand>> = {
  ArrowLeft: 'orbit-left',
  ArrowRight: 'orbit-right',
  ArrowUp: 'orbit-up',
  ArrowDown: 'orbit-down',
  Home: 'overview',
  ' ': 'toggle-play',
};

/** Lo que muestra el diálogo de atajos, en el orden en que se lee. */
export const SHORTCUT_HELP: readonly {
  readonly title: string;
  readonly items: readonly ShortcutHelp[];
}[] = [
  {
    title: 'Tiempo',
    items: [
      { keys: ['K'], action: 'Reproducir o pausar (también Espacio con el visor enfocado)' },
      { keys: [',', '.'], action: 'Más lento o más rápido' },
      { keys: ['R'], action: 'Cambiar el sentido del tiempo' },
      { keys: ['N'], action: 'Volver a ahora, en tiempo real' },
    ],
  },
  {
    title: 'Cámara',
    items: [
      {
        keys: ['←', '→', '↑', '↓'],
        action: 'Girar alrededor del cuerpo (con el visor enfocado; con Mayús, más deprisa)',
      },
      { keys: ['+', '−'], action: 'Acercar o alejar' },
      { keys: ['G'], action: 'Vista general (también Inicio con el visor enfocado)' },
    ],
  },
  {
    title: 'Vistas e interfaz',
    items: [
      { keys: ['1', '2', '3'], action: 'Sistema solar, Tierra o Luna' },
      { keys: ['V'], action: 'Vista limpia: ocultar la interfaz' },
      { keys: ['Esc'], action: 'Saltar el viaje, salir de la vista limpia o cerrar la ficha' },
      { keys: ['?'], action: 'Mostrar estos atajos' },
    ],
  },
];

interface KeyLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

const normalize = (key: string): string => (key.length === 1 ? key.toLowerCase() : key);

/** Los atajos no se aplican con Ctrl, Cmd o Alt (son del navegador). Mayús sí vale (`?`, `+`). */
const hasModifier = (event: KeyLike): boolean => event.ctrlKey || event.metaKey || event.altKey;

export function globalCommand(event: KeyLike): ShortcutCommand | null {
  if (hasModifier(event)) return null;
  return GLOBAL_KEYS[normalize(event.key)] ?? null;
}

export function canvasCommand(event: KeyLike): CanvasCommand | null {
  if (hasModifier(event)) return null;
  return CANVAS_KEYS[event.key] ?? null;
}

/**
 * ¿Está el foco en un campo donde se escribe? Ahí no actúa ningún atajo (PLAN 3.d.10): ni en los
 * inputs de texto, fecha u hora, ni en los `select` (buscan opciones al teclear), ni en un área de
 * texto o un elemento editable.
 */
export function isTextField(element: Element | null): boolean {
  if (!element) return false;
  if ((element as HTMLElement).isContentEditable) return true;
  const tag = element.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (element as HTMLInputElement).type;
  return ![
    'button',
    'checkbox',
    'radio',
    'range',
    'reset',
    'submit',
    'image',
    'color',
    'file',
  ].includes(type);
}
