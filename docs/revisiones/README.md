# Revisiones

La sesión de revisión escribe aquí `fase-N.md` al terminar cada fase. Esta lista sirve para que Claude Code sepa de antemano qué se va a mirar.

## Qué se revisa en cada fase
1. **Criterios de aceptación**: ¿se cumplen y están demostrados en el informe, no solo afirmados?
2. **Corrección**: lógica, casos límite (fechas extremas, zona horaria UTC frente a local, `NaN`, listas vacías) y sistemas de coordenadas.
3. **Arquitectura**: capas de §4.2, imports prohibidos, API de `SceneEngine` estrecha y estable.
4. **Angular**: signals bien usados (sin `effect()` para derivar estado), `OnPush`, zoneless, seguridad en el prerenderizado (`@defer`, `afterNextRender`) y limpieza con `DestroyRef`.
5. **Three.js**: `dispose()` completo, espacio de color, DPR limitado, tamaño de texturas, draw calls y render bajo demanda.
6. **Rendimiento**: presupuestos de §5, bundle inicial sin `three` y peso de red.
7. **Accesibilidad**: teclado, foco, etiquetas, `aria-live` sin ruido, contraste y `prefers-reduced-motion`.
8. **SEO** (desde la fase 8): metadatos en el HTML estático, canonical, JSON-LD y sitemap.
9. **Datos y licencias**: fuentes reales y comprobables, nada inventado, `FUENTES.md` y `/creditos` al día.
10. **Tests**: que prueben comportamiento real (no tests triviales) y fixtures con su origen.
11. **Higiene**: commits pequeños, sin secrets, sin dependencias fuera de la lista, sin código muerto ni `console.log` olvidados.

## Formato de cada revisión
```
# Revisión: Fase N
Veredicto: APROBADA / APROBADA CON CAMBIOS MENORES / CAMBIOS NECESARIOS

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
```
Severidades:
- **Bloqueante**: impide fusionar.
- **Importante**: se corrige en esta fase.
- **Menor**: se puede corregir ahora o anotarlo.
- **Sugerencia**: opcional.
