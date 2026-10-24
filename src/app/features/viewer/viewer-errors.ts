/**
 * Mensajes de error del visor para las personas (ESTILO §2: qué ha pasado y qué puedes hacer, sin
 * tecnicismos). El detalle técnico va a la consola, no a la interfaz.
 */
export type ViewerErrorKind = 'webgl' | 'network' | 'other';

export function viewerErrorKind(message: string): ViewerErrorKind {
  if (/webgl|context/i.test(message)) return 'webgl';
  if (/fetch|import|network|load|cargar|\b(4|5)\d\d\b/i.test(message)) return 'network';
  return 'other';
}

const MESSAGES: Readonly<Record<ViewerErrorKind, string>> = {
  webgl: 'Tu navegador o tu dispositivo no puede mostrar gráficos 3D (WebGL).',
  network: 'No se han podido descargar los datos de la escena. Comprueba la conexión.',
  other: 'Ha fallado algo al preparar la escena 3D.',
};

export const viewerErrorText = (message: string): string => MESSAGES[viewerErrorKind(message)];
