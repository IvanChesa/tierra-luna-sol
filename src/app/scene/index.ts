/**
 * API pública del motor 3D (PLAN, fase 2, 2.a.4). Es lo ÚNICO de `scene/` que pueden importar los
 * componentes (lo vigila el lint).
 *
 * - Los TIPOS se pueden importar con `import type` desde cualquier sitio: no generan código.
 * - El MOTOR se carga siempre con `import()` dinámico (`import('../scene').then(m => …)`) y dentro
 *   de `afterNextRender` o de un bloque `@defer`, para que three y astronomy-engine no entren en el
 *   bundle inicial ni se ejecuten en el prerenderizado (PLAN §4.6).
 *
 * El motor es una clase TS sin Angular (D6). La lógica (tiempo, marcos, cámara, selección, calidad)
 * está separada del renderer WebGL, que se inyecta con una fábrica: así se prueba sin WebGL.
 */
import { SceneEngine as SceneEngineImpl } from './engine';
import { browserEngineDeps } from './browser-deps';
import type { SceneEngineApi, SceneEngineOptions } from './types';

export type { BodyId } from '../data/body.model';
export type {
  DepthMode,
  ExplorerView,
  FrameStats,
  QualityLevel,
  QualitySetting,
  ScaleMode,
  SceneEngineApi,
  ToneMappingMode,
  ViewFrom,
  SceneEngineEventName,
  SceneEngineEvents,
  SceneEngineOptions,
  ViewInsets,
} from './types';

/** Crea el motor con el renderer WebGL del navegador. Arranca en segundo plano (eventos). */
export function createSceneEngine(options: SceneEngineOptions): SceneEngineApi {
  return new SceneEngineImpl(options, browserEngineDeps(options));
}
