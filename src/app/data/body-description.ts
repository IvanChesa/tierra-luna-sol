/**
 * La description de la ficha de un cuerpo (fase 9, D25): la primera frase de su resumen, que lleva su
 * fuente. La calcula un resolver de la ruta con un `import()` (los textos no van en el bundle
 * inicial): así está al día también cuando la ficha se reutiliza, de /lunas/fobos a /lunas/deimos
 * (revisión de la fase 9, hallazgo 4).
 */
import { BODY_TEXTS } from './body-texts';
import type { BodyId } from './body.model';

/** La primera frase de un texto (hasta un punto seguido de espacio y mayúscula). */
export function firstSentence(text: string): string {
  const end = text.search(/\.\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u);
  return end < 0 ? text : text.slice(0, end + 1);
}

/** La description de la ficha de un cuerpo, o vacía si el id no es del catálogo. */
export function bodyDescription(id: string): string {
  const texts = (BODY_TEXTS as Partial<Record<string, (typeof BODY_TEXTS)[BodyId]>>)[id];
  return texts ? firstSentence(texts.summary.text) : '';
}
