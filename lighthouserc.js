// Lighthouse en el CI (fase 10, tarea 7): `@lhci/cli`, aprobado en la revisión del bloque S (decisión 5,
// delegada por Iván), con sus tres condiciones:
// - los informes, solo en el disco (`target: 'filesystem'`; nunca `temporary-public-storage`, que los
//   sube a un tercero);
// - contra el build local, servido como en Cloudflare Pages (`scripts/serve-dist.mjs`, con `_headers`);
// - con el Chromium de Playwright (el mismo de los e2e), no con otro navegador descargado.
//
// Los presupuestos de §5 del plan, en el móvil de Lighthouse (su emulación y su estrangulamiento
// simulado, los de serie): las fichas y las demás páginas de contenido, ≥ 95 en rendimiento,
// accesibilidad y buenas prácticas; el explorador, rendimiento ≥ 90 y lo demás ≥ 95. El SEO no es
// criterio. La muestra, la de `scripts/measure-pages.mjs` (fase 9) más la portada del explorador; la
// mediana de 3 cargas por página.
//
// El rendimiento del explorador va como aviso, no como error (fase 10, §10 del informe y PENDIENTES):
// con su arranque ya troceado, crear el contexto WebGL es una sola tarea que no se puede partir, y en
// el Chrome recién abierto de cada carga de Lighthouse tarda unos 200 ms (unos 850 ms de bloqueo con la
// CPU a ×4 de la simulación). Su accesibilidad y sus buenas prácticas, como error.
//
// Uso: npm run build && npm run lighthouse
const { chromium } = require('playwright-core');

const PORT = 4398;
const BASE = `http://127.0.0.1:${PORT}`;
const PAGES = [
  '/planetas/marte',
  '/planetas/saturno',
  '/lunas/titan',
  '/sol',
  '/luna',
  '/planetas',
  '/lunas',
  '/sobre-el-proyecto',
  '/creditos',
];

/** Las notas mínimas (0–1) de cada categoría; la de rendimiento, como error o como aviso. */
const scores = (performance, level = 'error') => ({
  'categories:performance': [level, { minScore: performance, aggregationMethod: 'median-run' }],
  'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
  'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
});

module.exports = {
  ci: {
    collect: {
      startServerCommand: `node scripts/serve-dist.mjs ${PORT}`,
      startServerReadyPattern: 'Sirviendo dist',
      url: ['/', ...PAGES].map((path) => BASE + path),
      numberOfRuns: 3,
      chromePath: chromium.executablePath(),
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        // En los ejecutores de Ubuntu del CI, sin el sandbox de Chrome (como Playwright) y, sin GPU,
        // con WebGL por software (SwiftShader, como los e2e): si no, el explorador no tendría 3D.
        chromeFlags: [
          '--headless=new',
          '--no-sandbox',
          ...(process.env.CI ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
        ].join(' '),
      },
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: `^${BASE}/$`, assertions: scores(0.9, 'warn') },
        { matchingUrlPattern: `^${BASE}/.+`, assertions: scores(0.95) },
      ],
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci/informes',
    },
  },
};
