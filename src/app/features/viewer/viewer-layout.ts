import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExplorerViewState } from '../../state/explorer-view';
import { ViewerCanvas } from './viewer-canvas';
import { ViewerPoster } from './viewer-poster';

/**
 * Layout del explorador (D10): ruta padre de `/`, `/explorar/tierra` y `/explorar/luna`. Conserva el
 * lienzo y el motor mientras se cambia de vista; las páginas hijas solo ponen su texto y su vista.
 *
 * Primero se pintan el texto (prerenderizado) y el póster; el 3D llega con `@defer` cuando el
 * navegador está libre y se crea en `afterNextRender` (PLAN §4.6 y §4.7).
 */
@Component({
  selector: 'tls-viewer-layout',
  imports: [RouterOutlet, ViewerCanvas, ViewerPoster],
  template: `
    <section class="viewer" aria-label="Explorador">
      <div class="viewer__stage">
        @defer (on idle) {
          <tls-viewer-canvas [view]="state.view()" />
        } @placeholder {
          <tls-viewer-poster [view]="state.view()" />
        }
      </div>
      <div class="viewer__text">
        <router-outlet />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .viewer {
      position: relative;
      flex: 1;
      min-height: 26rem;
      background: var(--color-bg);
    }

    .viewer__stage {
      position: absolute;
      inset: 0;
    }

    .viewer__text {
      position: absolute;
      top: var(--space-4);
      left: var(--space-4);
      max-width: min(30rem, calc(100% - 2 * var(--space-4)));
      padding: var(--space-4);
      background: color-mix(in srgb, var(--color-bg) 82%, transparent);
      border: var(--border-width) solid var(--color-line);
      border-radius: var(--radius-md);
      pointer-events: auto;
    }
  `,
})
export class ViewerLayout {
  protected readonly state = inject(ExplorerViewState);
}
