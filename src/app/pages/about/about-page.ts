import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_CONFIG } from '../../core/site.config';

/** Un informe de fase en el repositorio (donde se midió cada cifra de esta página). */
const report = (phase: string): string =>
  `${SITE_CONFIG.repository}/blob/main/docs/informes/fase-${phase}.md`;
/** La revisión de una fase, cuando la cifra la midió el revisor (la libración, en la fase 2). */
const review = (phase: string): string =>
  `${SITE_CONFIG.repository}/blob/main/docs/revisiones/fase-${phase}.md`;

/**
 * «Sobre el proyecto» (fase 9, tarea 4): el caso de estudio del portfolio. Qué es, cómo está hecho, la
 * arquitectura, los marcos de escala, la precisión y el rendimiento medidos (cada cifra, con el
 * informe donde se midió), las decisiones, lo que es ilustrativo (D21), la privacidad (D24, con el NEL
 * de Cloudflare, C8) y el autor (D37). Texto estático, prerenderizado.
 */
@Component({
  selector: 'tls-about-page',
  host: { class: 'page' },
  imports: [RouterLink],
  templateUrl: './about-page.html',
  styleUrl: './about-page.css',
})
export class AboutPage {
  protected readonly site = SITE_CONFIG;
  protected readonly report = report;
  protected readonly review = review;
  protected readonly plan = `${SITE_CONFIG.repository}/blob/main/docs/PLAN.md`;
}
