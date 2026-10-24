// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

// Capas de la arquitectura (docs/PLAN.md §4.2).
// OJO: en la configuración plana, una regla repetida en un bloque posterior SUSTITUYE a la
// anterior en vez de sumarse. Por eso cada bloque de capa repite todas sus prohibiciones.
const NO_THREE = {
  regex: '^three(/|$)',
  message: '`three` solo se importa dentro de src/app/scene/ (PLAN §4.2).',
};
const NO_ANGULAR = {
  regex: '^@angular/',
  message: 'Esta capa no puede depender de Angular (PLAN §4.2).',
};
const NO_RXJS = {
  regex: '^rxjs(/|$)',
  message: 'Esta capa no puede depender de RxJS (PLAN §4.2).',
};
/**
 * Prohíbe importar (con ruta relativa) de otras carpetas de src/app/. Las rutas que pasan por
 * public/ (recursos estáticos, p. ej. public/data/stars.bin en un test) no son una capa.
 */
const noLayers = (layers, from) => ({
  regex: `^\\.{1,2}/(?!(\\.\\./)*public/)(.*/)?(${layers.join('|')})(/|$)`,
  message: `${from} no puede importar de: ${layers.join(', ')} (PLAN §4.2).`,
});
const ONLY_SCENE_PUBLIC_API = {
  regex: '^\\.{1,2}/(.*/)?scene/(?!index$).+',
  message: 'Usa solo la API pública de SceneEngine: importa desde `scene` (scene/index.ts).',
};

const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

module.exports = defineConfig([
  {
    ignores: ['dist/', '.angular/', 'coverage/', 'node_modules/'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'tls',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'tls',
          style: 'kebab-case',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },

  // --- Capas ---
  {
    files: ['src/**/*.ts'],
    ignores: ['src/app/scene/**'],
    rules: restrict(NO_THREE),
  },
  {
    files: ['src/app/ephemeris/**/*.ts'],
    rules: restrict(
      NO_THREE,
      NO_ANGULAR,
      NO_RXJS,
      noLayers(['core', 'data', 'scene', 'state', 'features', 'pages'], 'ephemeris/'),
    ),
  },
  {
    files: ['src/app/data/**/*.ts'],
    rules: restrict(
      NO_THREE,
      NO_ANGULAR,
      NO_RXJS,
      noLayers(['scene', 'state', 'features', 'pages'], 'data/'),
    ),
  },
  {
    files: ['src/app/scene/**/*.ts'],
    rules: restrict(NO_ANGULAR, NO_RXJS, noLayers(['state', 'features', 'pages'], 'scene/')),
  },
  {
    files: ['src/app/{state,features,pages,core}/**/*.ts', 'src/app/*.ts'],
    rules: restrict(NO_THREE, ONLY_SCENE_PUBLIC_API),
  },
]);
