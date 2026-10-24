import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ExplorerStore } from '../../state/explorer.store';
import { Icon } from '../viewer/icon';
import { SHORTCUT_HELP } from './shortcuts';

/**
 * Diálogo de atajos de teclado (PLAN 3.d.10), con `?`. Un `<dialog>` nativo y modal: el navegador
 * lleva el foco dentro, lo cierra con `Esc` y lo devuelve al cerrar. Lo que muestra sale de la misma
 * tabla que usan los manejadores de teclado (`shortcuts.ts`).
 */
@Component({
  selector: 'tls-shortcuts-dialog',
  imports: [Icon],
  template: `
    <dialog #dialog class="dialog" aria-labelledby="shortcuts-title" (close)="closed()">
      <header class="dialog__head">
        <h2 id="shortcuts-title">Atajos de teclado</h2>
        <button type="button" class="dialog__close" title="Cerrar (Esc)" (click)="dialog.close()">
          <tls-icon name="close" />
          <span class="visually-hidden">Cerrar</span>
        </button>
      </header>
      <p class="dialog__intro">
        Funcionan en todo el explorador, salvo mientras escribes en un campo.
      </p>
      @for (group of groups; track group.title) {
        <h3>{{ group.title }}</h3>
        <dl>
          @for (item of group.items; track item.action) {
            <div class="dialog__row">
              <dt>
                @for (key of item.keys; track key) {
                  <kbd>{{ key }}</kbd>
                }
              </dt>
              <dd>{{ item.action }}</dd>
            </div>
          }
        </dl>
      }
    </dialog>
  `,
  styles: `
    .dialog {
      width: min(34rem, calc(100vw - 2 * var(--space-4)));
      max-height: calc(100svh - 2 * var(--space-6));
      padding: 0 var(--space-6) var(--space-6);
      background: var(--color-surface);
      color: var(--color-text);
      border: var(--border-width) solid var(--color-control);
      border-radius: var(--radius-md);
      box-shadow: 0 16px 48px rgb(0 0 0 / 0.5);
    }

    .dialog::backdrop {
      background: rgb(6 9 16 / 0.7);
    }

    .dialog__head {
      position: sticky;
      top: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) 0 var(--space-2);
      background: var(--color-surface);
    }

    h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    h3 {
      margin: var(--space-6) 0 var(--space-2);
      color: var(--color-text-muted);
      font-family: var(--font-body);
      font-size: 0.75rem;
      font-weight: var(--font-weight-strong);
    }

    .dialog__intro {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    dl {
      margin: 0;
    }

    .dialog__row {
      display: grid;
      grid-template-columns: 8.5rem 1fr;
      gap: var(--space-4);
      padding: var(--space-2) 0;
      border-top: var(--border-width) solid var(--color-line);
      font-size: var(--text-sm);
    }

    dt {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    dd {
      margin: 0;
    }

    kbd {
      min-width: 1.75rem;
      padding: 0 var(--space-2);
      border: var(--border-width) solid var(--color-control);
      border-bottom-width: 2px;
      border-radius: var(--radius-md);
      font-family: var(--font-body);
      font-size: 0.8125rem;
      text-align: center;
    }

    .dialog__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--tap-target);
      height: var(--tap-target);
      padding: 0;
      background: transparent;
      color: var(--color-text-muted);
      border: 0;
      cursor: pointer;
    }

    .dialog__close:hover {
      color: var(--color-text);
    }
  `,
})
export class ShortcutsDialog {
  private readonly explorer = inject(ExplorerStore);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly groups = SHORTCUT_HELP;

  constructor() {
    // Sincroniza el estado con el diálogo nativo (DOM: sistema externo).
    effect(() => {
      const dialog = this.dialog().nativeElement;
      const open = this.explorer.helpOpen();
      if (open && !dialog.open) dialog.showModal();
      else if (!open && dialog.open) dialog.close();
    });
  }

  protected closed(): void {
    this.explorer.helpOpen.set(false);
  }
}
