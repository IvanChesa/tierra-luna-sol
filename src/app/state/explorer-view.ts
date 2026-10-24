import { Service, signal } from '@angular/core';
import type { ExplorerView } from '../scene';

/**
 * Vista activa del explorador (sistema solar, Tierra o Luna). La fija cada página hija del layout
 * del visor y el lienzo la pasa al motor. La fase 3 la integra en el `ExplorerStore`.
 */
@Service()
export class ExplorerViewState {
  readonly view = signal<ExplorerView>('system');
}
