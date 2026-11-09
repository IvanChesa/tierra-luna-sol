import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatNumber } from '../../core/format';
import { SITE_CONFIG } from '../../core/site.config';
import { BODY_INDEX } from '../../data/body-index';
import { MOON_RECREATION } from '../../data/moon-recreation';

/** Una fracción como porcentaje con un decimal («30,6 %»). */
const percent = (x: number): string => `${formatNumber(100 * x, 1, true)}\u00a0%`;

/**
 * Lo recreado de cada luna con mapa (fase 9b, D45; entrega 10.a, D48), en el orden del catálogo: lo real
 * con detalle, lo real con luz rasante (corregida), lo que solo se fotografió de lejos y lo que no se vio,
 * medidos en su mapa (data/moon-recreation.ts).
 */
const RECREATION_ROWS = BODY_INDEX.flatMap((entry) => {
  const row = MOON_RECREATION.find((r) => r.body === entry.id);
  return row
    ? [
        {
          id: row.body,
          name: entry.name,
          real: percent(row.real),
          grazing: percent(row.grazing),
          far: percent(row.far),
          none: percent(row.none),
        },
      ]
    : [];
});

/** El texto de cada licencia (en español, donde lo hay). */
const LICENSES = {
  ccBy: 'https://creativecommons.org/licenses/by/4.0/deed.es',
  ccBySa: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
  mit: 'https://opensource.org/license/mit',
  ofl: 'https://openfontlicense.org/',
} as const;

/**
 * Créditos (fase 9, tarea 3; regla permanente: toda imagen o dato de terceros, en docs/FUENTES.md y
 * aquí): cada recurso publicado, con su autor, su licencia y sus cambios; las licencias, una por una;
 * y el aviso de que la NASA no respalda el proyecto.
 */
@Component({
  selector: 'tls-credits-page',
  host: { class: 'page' },
  imports: [RouterLink],
  templateUrl: './credits-page.html',
  styleUrl: './credits-page.css',
})
export class CreditsPage {
  protected readonly site = SITE_CONFIG;
  protected readonly licenses = LICENSES;
  protected readonly sources = `${SITE_CONFIG.repository}/blob/main/docs/FUENTES.md`;
  protected readonly recreation = RECREATION_ROWS;
  protected readonly recreationDoc = `${SITE_CONFIG.repository}/blob/main/docs/datos/recreacion-lunas.md`;
}
