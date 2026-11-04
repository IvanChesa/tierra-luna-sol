import { Component } from '@angular/core';
import { SITE_CONFIG } from '../../core/site.config';

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
  templateUrl: './credits-page.html',
  styleUrl: './credits-page.css',
})
export class CreditsPage {
  protected readonly site = SITE_CONFIG;
  protected readonly licenses = LICENSES;
  protected readonly sources = `${SITE_CONFIG.repository}/blob/main/docs/FUENTES.md`;
}
