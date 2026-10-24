import { Component, computed, input } from '@angular/core';
import type { ExplorerView } from '../../scene';

/**
 * Póster del explorador: lo que se ve antes de que llegue el 3D (y si no llega). Es una captura del
 * propio motor en modo de captura (`scripts/build-poster.mjs`); la fase 9 lo sustituye por el
 * definitivo. Con anchura y altura fijadas: no mueve nada al cargar (CLS).
 */
@Component({
  selector: 'tls-viewer-poster',
  template: `
    <picture>
      <source media="(max-width: 640px)" [srcset]="mobile()" width="720" height="1280" />
      <img
        class="poster"
        [src]="desktop()"
        width="1600"
        height="900"
        alt=""
        fetchpriority="high"
        decoding="async"
      />
    </picture>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      overflow: hidden;
    }

    .poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class ViewerPoster {
  readonly view = input.required<ExplorerView>();
  protected readonly desktop = computed(() => `img/poster-${this.view()}-escritorio.webp`);
  protected readonly mobile = computed(() => `img/poster-${this.view()}-movil.webp`);
}
