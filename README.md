# Tierra Luna Sol

Explorador 3D interactivo del Sol, los planetas, la Tierra y la Luna, en español, con posiciones reales calculadas en el navegador.

Proyecto en desarrollo. El plan está en [`docs/PLAN.md`](docs/PLAN.md).

## Comandos

- `npm start`: servidor de desarrollo
- `npm test`: tests unitarios (Vitest)
- `npm run lint`: ESLint y Prettier
- `npm run build`: build con prerenderizado
- `npm run check`: lint + test (con cobertura) + build + comprobación de que el JS inicial no lleva librerías pesadas

## Licencia

El código propio tiene licencia [MIT](LICENSE) (© 2026 Iván Chesa Lapena).

Las texturas, los datos y los catálogos de terceros **conservan sus propias licencias**, que se detallan archivo a archivo en [`docs/FUENTES.md`](docs/FUENTES.md) y en la página `/creditos`. En particular, el catálogo de estrellas (`public/data/stars.bin`, derivado de la HYG Database v4.1) tiene licencia CC BY-SA 4.0, y las texturas de Solar System Scope, CC BY 4.0.
