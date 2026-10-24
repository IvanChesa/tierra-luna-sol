import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { SITE_CONFIG } from '../../core/site.config';
import type { ExplorerView } from '../../scene';
import { ExplorerUi } from '../explorer-ui/explorer-ui';
import { ViewSwitcher } from '../view-switcher/view-switcher';
import { ViewerPoster } from './viewer-poster';

const VIEWS: readonly ExplorerView[] = ['system', 'earth', 'moon'];
/** El póster se quita cuando el lienzo ya se ve (su fundido dura `--duration-base`). */
const POSTER_FADE_MS = 400;

/**
 * Layout del explorador (D10): ruta padre de `/`, `/explorar/tierra` y `/explorar/luna`. Conserva el
 * lienzo, el motor y la interfaz mientras se cambia de vista; las páginas hijas solo ponen su texto y
 * su vista va en los datos de la ruta (`data.view`).
 *
 * Lo prerenderizado es el marco: el póster, el selector de vista, el texto de la vista y los fondos
 * de los paneles (así nada se mueve cuando llega el resto). El lienzo y toda la interfaz (stores,
 * controles, índice, ficha) llegan en un `@defer` cuando el navegador está libre: nada de eso va en
 * el bundle inicial (PLAN §4.6).
 */
@Component({
  selector: 'tls-viewer-layout',
  imports: [RouterOutlet, RouterLink, ViewSwitcher, ViewerPoster, ExplorerUi],
  templateUrl: './viewer-layout.html',
  styleUrl: './viewer-layout.css',
})
export class ViewerLayout {
  private readonly route = inject(ActivatedRoute);
  protected readonly site = SITE_CONFIG;
  protected readonly view = signal<ExplorerView>('system');
  /** El 3D ya está pintado: el póster puede irse. */
  protected readonly posterGone = signal(false);
  private posterTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.posterTimer !== null) clearTimeout(this.posterTimer);
    });
  }

  /** La ruta hija activa dice qué vista toca (también al prerenderizar). */
  protected onActivate(): void {
    const value: unknown = this.route.firstChild?.snapshot.data['view'];
    this.view.set(VIEWS.find((view) => view === value) ?? 'system');
  }

  protected onReady(): void {
    if (this.posterGone() || this.posterTimer !== null) return;
    this.posterTimer = setTimeout(() => {
      this.posterTimer = null;
      this.posterGone.set(true);
    }, POSTER_FADE_MS);
  }
}
