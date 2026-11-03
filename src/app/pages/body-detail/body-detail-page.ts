import { IMAGE_LOADER, ImageLoaderConfig, NgOptimizedImage } from '@angular/common';
import { Component, afterNextRender, computed, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CAPTURE_DATE, isCaptureQuery } from '../../core/capture';
import { formatLongDate } from '../../core/format';
import { getBody } from '../../data/bodies';
import { findBody } from '../../data/body-index';
import { bodyPagePath, explorerLinkOf, moonsOf } from '../../data/body-links';
import type { BodyId } from '../../data/body.model';
import { Breadcrumbs, Crumb } from '../shared/breadcrumbs';
import { bodyFacts, citations } from './body-facts';
import { PENDING_NOTE, pendingRows, positionNote } from './today-text';

/** Las lunas sin mapa de su superficie: en la escena, con su color esquemático (fase 7). */
const SCHEMATIC = new Set<BodyId>([
  'deimos',
  'proteo',
  'miranda',
  'ariel',
  'umbriel',
  'titania',
  'oberon',
]);

/**
 * La imagen de la ficha, renderizada por el propio motor (`scripts/render-body-images.mjs`, fase 9) en
 * dos tamaños: `ngSrc` es el id del cuerpo y el ancho pedido elige el fichero.
 */
export const bodyImageLoader = ({ src, width }: ImageLoaderConfig): string =>
  `/img/fichas/${src}-${width !== undefined && width > 360 ? 720 : 360}.webp`;

/** «Ficha de NASA Science» por la URL de una página de la fuente de un texto. */
export function textSourceName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (host === 'science.nasa.gov') return 'NASA Science';
  if (host.endsWith('nasa.gov')) return 'NASA';
  return host;
}

/** «science.nasa.gov/mars/facts»: la dirección de una página, sin el protocolo ni la barra final. */
export function urlText(url: string): string {
  const { hostname, pathname } = new URL(url);
  return `${hostname.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}`;
}

/** «23 de octubre de 2026» de una fecha «2026-10-23» (ESTILO §4). */
export const accessedText = (iso: string): string =>
  formatLongDate(new Date(`${iso}T12:00:00Z`), 'utc');

/**
 * Ficha completa de un cuerpo (fase 9, tarea 2): la usan /sol, /luna, /planetas/:id y /lunas/:id. Sin
 * three ni astronomy-engine en su JS inicial: los datos y los textos son del catálogo, y los «de hoy»
 * se calculan en el navegador con un `import()` dinámico después de pintar (`afterNextRender`); en el
 * HTML prerenderizado, las mismas filas con «—» y una nota, para que nada se mueva al llegar (CLS).
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
  protected readonly parent = computed(() => {
    const parent = this.body().parent;
    return this.body().kind === 'moon' && parent ? findBody(parent) : undefined;
  });
  protected readonly kind = computed(() => {
    const body = this.body();
    if (body.kind === 'star') return 'Estrella';
    if (body.kind === 'planet') return 'Planeta';
    return body.id === 'luna' ? 'Satélite de la Tierra' : 'Luna de';
  });
  protected readonly groups = computed(() => bodyFacts(this.body()));
  protected readonly citations = computed(() => citations(this.groups()));
  protected readonly refs = computed(
    () => new Map(this.citations().map((citation) => [citation.id, citation.number])),
  );
  /** Las fuentes de los textos (el resumen y las curiosidades), sin repetir. */
  protected readonly textSources = computed(() => {
    const body = this.body();
    return [...new Set([body.summary.source, ...body.facts.map((fact) => fact.source)])];
  });
  protected readonly explorer = computed(() => explorerLinkOf(this.bodyId()));
  protected readonly crumbs = computed<Crumb[]>(() => {
    const body = this.body();
    const section =
      body.kind === 'planet'
        ? [{ label: 'Planetas', link: '/planetas' }]
        : body.kind === 'moon' && body.id !== 'luna'
          ? [{ label: 'Lunas', link: '/lunas' }]
          : [];
    return [{ label: 'Inicio', link: '/' }, ...section, { label: body.name }];
  });
  /** En un planeta, sus lunas; en una luna, las de su planeta (ella, marcada). */
  protected readonly family = computed(() => {
    const body = this.body();
    if (body.kind === 'planet') {
      const moons = moonsOf(body.id);
      if (!moons.length) return null;
      return {
        title: body.id === 'tierra' ? 'Su satélite' : `Las lunas ${ofName(body.id)}`,
        moons,
      };
    }
    if (body.kind === 'moon' && body.parent && body.id !== 'luna') {
      return { title: `Las lunas ${ofName(body.parent)}`, moons: moonsOf(body.parent) };
    }
    return null;
  });
  protected readonly imageAlt = computed(() => {
    const body = this.body();
    if (body.kind === 'star') return 'El Sol, con su halo: imagen del propio explorador.';
    const how = SCHEMATIC.has(body.id)
      ? 'con su color esquemático (no hay un mapa de su superficie)'
      : 'con su superficie real';
    return `${body.name}, iluminado de lado por el Sol y ${how}: imagen del propio explorador.`;
  });
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
