/**
 * Gestos del puntero sobre el lienzo: arrastrar para girar (con inercia), rueda o pellizco para el
 * zoom y clic (o toque) para elegir un cuerpo. El teclado y los botones llegan en la fase 3.
 * El lienzo necesita `touch-action: none` para recibir los gestos táctiles.
 */
export interface PointerTarget {
  rotate(deltaAzimuth: number, deltaElevation: number): void;
  fling(azimuthSpeed: number, elevationSpeed: number): void;
  zoom(factor: number): void;
  /** Clic sin arrastre en (x, y), en píxeles CSS desde la esquina del lienzo. */
  pick(x: number, y: number): void;
}

/** Movimiento máximo (px) para que un toque cuente como clic y no como arrastre. */
const CLICK_SLOP_PX = 5;
/** Sensibilidad de la rueda: factor de zoom por píxel de desplazamiento. */
const WHEEL_ZOOM_PER_PX = 0.0015;

interface Tracked {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  lastTime: number;
  vx: number;
  vy: number;
}

/** Engancha los gestos. Devuelve la función que los desengancha. */
export function attachPointerControls(
  canvas: HTMLCanvasElement,
  target: PointerTarget,
): () => void {
  const pointers = new Map<number, Tracked>();
  let pinchDistance = 0;
  // Un arrastre de toda la altura del lienzo gira 180°.
  const radiansPerPixel = () => Math.PI / Math.max(1, canvas.clientHeight || canvas.height);

  const local = (event: PointerEvent | WheelEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const twoFingerDistance = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const { x, y } = local(event);
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, {
      x,
      y,
      startX: x,
      startY: y,
      startTime: event.timeStamp,
      lastTime: event.timeStamp,
      vx: 0,
      vy: 0,
    });
    if (pointers.size === 2) pinchDistance = twoFingerDistance();
  };

  const onMove = (event: PointerEvent) => {
    const tracked = pointers.get(event.pointerId);
    if (!tracked) return;
    const { x, y } = local(event);
    const dx = x - tracked.x;
    const dy = y - tracked.y;
    const dt = Math.max(1, event.timeStamp - tracked.lastTime);
    tracked.x = x;
    tracked.y = y;
    tracked.lastTime = event.timeStamp;
    if (pointers.size === 1) {
      const k = radiansPerPixel();
      target.rotate(-dx * k, dy * k);
      // Velocidad (rad/s) con un suavizado para la inercia al soltar.
      tracked.vx = 0.8 * tracked.vx + 0.2 * ((-dx * k) / dt) * 1000;
      tracked.vy = 0.8 * tracked.vy + 0.2 * ((dy * k) / dt) * 1000;
    } else if (pointers.size === 2) {
      const distance = twoFingerDistance();
      if (pinchDistance > 0 && distance > 0) target.zoom(pinchDistance / distance);
      pinchDistance = distance;
    }
  };

  const onUp = (event: PointerEvent) => {
    const tracked = pointers.get(event.pointerId);
    if (!tracked) return;
    pointers.delete(event.pointerId);
    canvas.releasePointerCapture?.(event.pointerId);
    if (pointers.size > 0) return;
    const moved = Math.hypot(tracked.x - tracked.startX, tracked.y - tracked.startY);
    if (moved <= CLICK_SLOP_PX && event.timeStamp - tracked.startTime < 600) {
      target.pick(tracked.x, tracked.y);
    } else if (event.timeStamp - tracked.lastTime < 80) {
      target.fling(tracked.vx, tracked.vy);
    }
  };

  const onCancel = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    target.zoom(Math.exp(pixels * WHEEL_ZOOM_PER_PX));
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    canvas.removeEventListener('wheel', onWheel);
  };
}
