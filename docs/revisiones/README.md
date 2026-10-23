# Revisiones

- **Por fase** (`fase-N.md`): las escribe el subagente revisor en modo autónomo.
- **Por bloque** (`bloque-X.md`): las escribe la sesión de revisión al terminar cada bloque.

Esta lista sirve para que Claude Code sepa de antemano qué se va a mirar.

## Qué se revisa
1. **Criterios de aceptación**: ¿se cumplen y están demostrados en el informe (cifras, salidas, capturas), no solo afirmados?
2. **Corrección**: lógica, casos límite (fechas extremas, UTC frente a hora local, `NaN`, listas vacías), sistemas de referencia y orientación.
3. **Rigor científico**: fixtures con su origen, tests que comparan con fuentes independientes (no con los mismos datos usados para ajustar) y tolerancias de §5.
4. **Arquitectura**: capas de §4.2, imports prohibidos, API de `SceneEngine` estrecha y estable, marcos de escala y origen flotante, chunks de profundidad en los shaders.
5. **Angular**: signals bien usados (sin `effect()` para derivar estado), zoneless, seguridad en el prerenderizado (`@defer`, `afterNextRender`) y limpieza con `DestroyRef`.
6. **Three.js**: `dispose()` completo (también al cambiar de vista o de nivel), espacio de color, DPR, texturas por el manifiesto (`ImageBitmapLoader`, `maxTextureSize`), VRAM, draw calls y render bajo demanda.
7. **Rendimiento**: presupuestos de §5, bundle inicial sin `three` ni `astronomy-engine`, arranque sin tareas largas y peso de red por vista.
8. **Diseño visual**: capturas coherentes con `docs/DISENO.md`, jerarquía, legibilidad sobre el 3D, estados de carga y error, móvil.
9. **Accesibilidad**: teclado (también en el canvas), foco, etiquetas, `aria-live` sin ruido, contraste y `prefers-reduced-motion` en todo.
10. **Privacidad y compartir** (desde la fase 9): 0 cookies, 0 peticiones a terceros, title/description, Open Graph y `noindex` en `/404`.
11. **Datos, textos y licencias**: fuentes reales y comprobables, nada inventado, `docs/ESTILO.md`, `FUENTES.md` y `/creditos` al día.
12. **Tests**: que prueben comportamiento real, no tests triviales.
13. **Higiene**: commits pequeños, sin secrets, sin dependencias fuera de la lista, sin código muerto ni `console.log` olvidados.

## Formato
```
# Revisión: Fase N | Bloque X
Veredicto: APROBADA / APROBADA CON CAMBIOS MENORES / CAMBIOS NECESARIOS

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
```
Severidades:
- **Bloqueante**: impide fusionar o seguir.
- **Importante**: se corrige ya.
- **Menor**: se corrige ahora o se anota.
- **Sugerencia**: opcional.
