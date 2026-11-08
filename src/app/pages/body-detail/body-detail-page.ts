import { IMAGE_LOADER, NgOptimizedImage } from '@angular/common';
import { Component, afterNextRender, computed, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CAPTURE_DATE, isCaptureQuery } from '../../core/capture';
import { getBody } from '../../data/bodies';
import { findBody } from '../../data/body-index';
import { bodyPagePath, explorerLinkOf } from '../../data/body-links';
import type { BodyId } from '../../data/body.model';
import { bodyImageLoader } from '../shared/body-images';
import { Breadcrumbs, Crumb } from '../shared/breadcrumbs';
import { moonsByDistance } from '../shared/moons';
import { bodyFacts, citations } from './body-facts';
import { accessedText, imageAltOf, kindLineOf, textSourceName, urlText } from './body-labels';
import { PENDING_NOTE, pendingRows, positionNote } from './today-text';

/**
 * Ficha completa de un cuerpo (fase 9, tarea 2): la usan /sol, /luna, /planetas/:id y /lunas/:id. Sin
 * three ni astronomy-engine en su JS inicial: los datos y los textos son del catálogo, y los «de hoy»
 * se calculan en el navegador con un `import()` dinámico después de pintar (`afterNextRender`); en el
 * HTML prerenderizado, las mismas filas con «—» y una nota, para que nada se mueva al llegar (CLS). Su
 * description la pone el resolver de la ruta (`data/body-description.ts`).
 */
@Component({
  selector: 'tls-body-detail-page',
  host: { class: 'page body-page' },
  imports: [RouterLink, NgOptimizedImage, Breadcrumbs],
  providers: [{ provide: IMAGE_LOADER, useValue: bodyImageLoader }],
  templateUrl: './body-detail-page.html',
  styleUrl: './body-detail-page.css',
})
export class BodyDetailPage {
  /** El cuerpo: el parámetro de /planetas/:id y /lunas/:id, o `data.id` en /sol y /luna. */
  readonly id = input.required<string>();
  /** `?captura=1`: los datos «de hoy», en la fecha fija de las capturas. */
  readonly captura = input<string>();

  protected readonly bodyId = computed(() => this.id() as BodyId);
  protected readonly body = computed(() => getBody(this.bodyId()));
  /** «Planeta», «Luna de Saturno» o «Satélite de la Tierra», con el enlace al planeta. */
  protected readonly kind = computed(() => kindLineOf(this.body()));
  protected readonly groups = computed(() => bodyFacts(this.body()));
  protected readonly citations = computed(() => citations(this.groups()));
  protected readonly refs = computed(
    () => new Map(this.citations().map((citation) => [citation.id, citation.number])),
  );
  /** Las fuentes de los textos (el resumen y las curiosidades), sin repetir. */
  protected readonly textSources = computed(() => {
    const body = this.body();
    const map = body.mapNote?.source;
    return [
      ...new Set([
        body.summary.source,
        ...body.facts.map((fact) => fact.source),
        ...(map ? [map] : []),
      ]),
    ];
  });
  protected readonly explorer = computed(() => explorerLinkOf(this.bodyId()));
  /** «Inicio › Planetas › Marte», «Inicio › Lunas › Titán»; la Luna, también en Lunas (decisión de Iván del 04-11). */
  protected readonly crumbs = computed<Crumb[]>(() => {
    const body = this.body();
    const section =
      body.kind === 'planet'
        ? [{ label: 'Planetas', link: '/planetas' }]
        : body.kind === 'moon'
          ? [{ label: 'Lunas', link: '/lunas' }]
          : [];
    return [{ label: 'Inicio', link: '/' }, ...section, { label: body.name }];
  });
  /** En un planeta, sus lunas; en una luna, las de su planeta (ella, marcada); por su distancia. */
  protected readonly family = computed(() => {
    const body = this.body();
    if (body.kind === 'planet') {
      const moons = moonsByDistance(body.id);
      if (!moons.length) return null;
      return {
        title: body.id === 'tierra' ? 'Su satélite' : `Las lunas ${ofName(body.id)}`,
        moons,
      };
    }
    if (body.kind === 'moon' && body.parent && body.id !== 'luna') {
      return { title: `Las lunas ${ofName(body.parent)}`, moons: moonsByDistance(body.parent) };
    }
    return null;
  });
  protected readonly imageAlt = computed(() => imageAltOf(this.body()));
  protected readonly pagePath = bodyPagePath;
  protected readonly textSourceName = textSourceName;
  protected readonly urlText = urlText;
  protected readonly accessedText = accessedText;

  /** Los datos «de hoy»: solo en el navegador y después de pintar (PLAN §4.6). */
  private readonly browser = signal(false);
  protected readonly today = resource({
    params: () => (this.browser() ? { id: this.bodyId(), capture: this.captura() } : undefined),
    loader: async ({ params }) => {
      const { todayOf } = await import('./today');
      return todayOf(params.id, isCaptureQuery(params.capture) ? CAPTURE_DATE : new Date());
    },
  });
  protected readonly todayRows = computed(
    () => this.today.value()?.rows ?? pendingRows(this.bodyId()),
  );
  protected readonly positionNote = computed(() => positionNote(this.bodyId()));
  protected readonly todayNote = computed(() =>
    this.today.error()
      ? 'No se han podido calcular las distancias de hoy.'
      : (this.today.value()?.note ?? PENDING_NOTE),
  );

  constructor() {
    afterNextRender(() => this.browser.set(true));
  }
}

/** «de Saturno», «de la Tierra». */
function ofName(id: BodyId): string {
  if (id === 'tierra') return 'de la Tierra';
  return `de ${findBody(id)?.name ?? id}`;
}
