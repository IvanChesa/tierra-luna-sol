import { Component, input } from '@angular/core';

export type IconName =
  | 'play'
  | 'pause'
  | 'reverse'
  | 'plus'
  | 'minus'
  | 'overview'
  | 'clean'
  | 'restore'
  | 'close'
  | 'chevron'
  | 'help'
  | 'skip'
  | 'menu'
  | 'list'
  | 'calendar'
  | 'sliders'
  | 'alert';

/**
 * Iconos propios (ESTILO §6; `craft-floor`: un solo trazo, nada de emojis ni glifos). SVG de 24×24
 * con `currentColor`, trazo de 1,75 y extremos redondeados. Son decorativos: el nombre accesible lo
 * lleva siempre el botón que los contiene.
 */
@Component({
  selector: 'tls-icon',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
      @switch (name()) {
        @case ('play') {
          <path
            class="fill"
            d="M8 5.75v12.5a.75.75 0 0 0 1.14.64l10-6.25a.75.75 0 0 0 0-1.28l-10-6.25A.75.75 0 0 0 8 5.75Z"
          />
        }
        @case ('pause') {
          <rect class="fill" x="6.5" y="5" width="4" height="14" rx="1" />
          <rect class="fill" x="13.5" y="5" width="4" height="14" rx="1" />
        }
        @case ('reverse') {
          <path d="M11.5 6.5 5 12l6.5 5.5M19 6.5 12.5 12l6.5 5.5" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('minus') {
          <path d="M5 12h14" />
        }
        @case ('overview') {
          <!-- El sistema entero: el Sol, dos órbitas y un planeta. -->
          <circle class="fill" cx="12" cy="12" r="2" />
          <circle cx="12" cy="12" r="5.5" />
          <circle cx="12" cy="12" r="9.25" />
          <circle class="fill" cx="18.55" cy="5.45" r="1.9" />
        }
        @case ('clean') {
          <!-- Ocultar la interfaz: el ojo tachado. -->
          <path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6Z" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="m4.5 4.5 15 15" />
        }
        @case ('restore') {
          <!-- Mostrar la interfaz: el ojo. -->
          <path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        }
        @case ('close') {
          <path d="m6.5 6.5 11 11m0-11-11 11" />
        }
        @case ('chevron') {
          <path d="m9 6 6 6-6 6" />
        }
        @case ('help') {
          <circle cx="12" cy="12" r="9" />
          <path d="M9.75 9.5a2.25 2.25 0 1 1 3.2 2.04c-.58.27-.95.84-.95 1.48v.48" />
          <circle class="fill" cx="12" cy="16.75" r="1" />
        }
        @case ('skip') {
          <path d="m6 6.5 7 5.5-7 5.5zM17 6v12" />
        }
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('list') {
          <!-- El índice: una lista con sus viñetas. -->
          <path d="M9.5 7h10.5M9.5 12h10.5M9.5 17h10.5" />
          <circle class="fill" cx="5" cy="7" r="1.25" />
          <circle class="fill" cx="5" cy="12" r="1.25" />
          <circle class="fill" cx="5" cy="17" r="1.25" />
        }
        @case ('calendar') {
          <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
          <path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
        }
        @case ('sliders') {
          <!-- Ajustes: tres reguladores. -->
          <path d="M4 6.5h7.5M16.5 6.5H20M4 12h2.5M11.5 12H20M4 17.5h10.5M19.5 17.5h.5" />
          <circle cx="14" cy="6.5" r="2.25" />
          <circle cx="9" cy="12" r="2.25" />
          <circle cx="17" cy="17.5" r="2.25" />
        }
        @case ('alert') {
          <path
            d="M10.3 4.9 3 17.5a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.9a2 2 0 0 0-3.4 0Z"
          />
          <path d="M12 10v4" />
          <circle class="fill" cx="12" cy="17" r="1" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .fill {
      fill: currentColor;
      stroke: none;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}
