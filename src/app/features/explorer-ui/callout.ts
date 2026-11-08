import { Component, input } from '@angular/core';

/**
 * Un aviso breve sobre el 3D, junto a la fila de fichas (crítica de la 9c): el rótulo de cada parada
 * del recorrido, con «Saltar el recorrido», y la primera vez, las pistas de uso («Ahora tú: elige un
 * cuerpo abajo…»). El texto solo se ve: lo que importa ya lo dice la región viva, y las pistas son de
 * gestos (para el teclado, la descripción del lienzo). No captura el puntero, salvo sus botones
 * (proyectados).
 */
@Component({
  selector: 'tls-callout',
  template: `
    @if (text(); as message) {
      <p class="callout__text" aria-hidden="true">{{ message }}</p>
    }
    <ng-content />
  `,
  styleUrl: './callout.css',
})
export class Callout {
  readonly text = input<string | null>(null);
}
