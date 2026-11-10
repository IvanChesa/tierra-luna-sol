# Cambios

Los cambios de cada versión publicada en [tierra-luna-sol.ivanchesa.com](https://tierra-luna-sol.ivanchesa.com). El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones, [SemVer](https://semver.org/lang/es/). El detalle de cada fase está en su informe (`docs/informes/fase-N.md`) y su revisión (`docs/revisiones/fase-N.md`).

## [1.0.0] - 2026-11-10

La primera versión pública, con todas las funcionalidades del plan (`docs/PLAN.md`), construida por fases entre el 23 de octubre y el 10 de noviembre de 2026.

### El explorador
- El Sol, los ocho planetas y veintiuna lunas en 3D, con sus posiciones y orientaciones reales para cualquier fecha entre 1900 y 2100, calculadas en el navegador (fases 1 y 2).
- La vista general del sistema solar, con la velocidad según el contexto (3 días/s en la vista general y 1 h/s con un cuerpo enfocado), estelas, rótulos y viajes de cámara continuos (fases 3, 3c y 4b).
- La interfaz del explorador: línea de tiempo, índice de cuerpos, fichas, controles con el teclado y la URL compartible (`?fecha=`, `?cuerpo=`, `?escala=`) (fases 3, 3c y 9c).
- Los planetas con su realismo: atmósferas, anillos de Saturno con la opacidad de Cassini, Venus bajo las nubes con el radar de Magellan (fases 3b, 9b y 10).
- La Tierra: relieve, nubes, luces nocturnas, el reflejo del Sol en el agua y cinco vistas guiadas (fase 5).
- La Luna: el relieve del altímetro LOLA, los polos, la libración, sus vistas y un recorrido (fase 6).
- Las lunas con sus mosaicos del USGS, las formas reales de Fobos y Deimos, las sombras de las lunas sobre sus planetas y la escala real (fases 7, 9b y 10.a).
- El cielo desde España (el Montsec por defecto, seis lugares más o tu ubicación) y los próximos eclipses visibles desde España, con «Ver en 3D» (fase 8).
- El Sol en color realzado, con su granulación, sus manchas y sus protuberancias (fase 9b).

### Las páginas
- Las fichas de los 30 cuerpos, los índices de planetas y lunas, los eclipses, los créditos y «Sobre el proyecto», prerenderizadas, con cada dato enlazado a su fuente (fases 1 y 9).
- Una imagen para compartir, títulos y descripciones por página, `robots.txt`, `sitemap.xml` y canónicos en el dominio definitivo (fases 9 y 11).

### Calidad
- Accesibilidad WCAG 2.1 AA: todo con teclado y con su equivalente sin 3D, axe sin violaciones graves ni críticas en las 40 rutas, movimiento reducido en todas las animaciones y un modo sin WebGL (fases 3 y 10).
- Rendimiento: pintado bajo demanda y al ritmo del movimiento, texturas por niveles de calidad, nada pesado en el JS inicial y presupuestos medidos de FPS, VRAM y arranque (fases 2 a 10).
- Privacidad: sin cookies, sin analítica y sin peticiones a terceros; Network Error Logging desactivado en el dominio propio (fases 4, 9 y 11).
- 835 tests unitarios, 153 e2e con la regresión visual y Lighthouse en el CI (fases 10 y 11).

### Despliegue
- Cloudflare Pages desde GitHub Actions: vista previa por rama y producción por etiqueta `v*`, con el build verificado por el CI y comprobado tras publicar (fases 4 y 11).

[1.0.0]: https://github.com/IvanChesa/tierra-luna-sol/releases/tag/v1.0.0
