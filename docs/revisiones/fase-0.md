# Revisión: Fase 0 (Cimientos)

- **Fecha:** 2026-10-23
- **Revisado:** `main...fase-0-cimientos` (13 commits) + `docs/informes/fase-0.md`
- **Veredicto: APROBADA CON CAMBIOS MENORES**

## Verificación independiente
No me he fiado solo del informe; lo he comprobado yo:
- `npm run check` en la rama → código 0: lint y Prettier limpios, 18/18 tests y build con 272,45 kB iniciales, sin avisos.
- `dist/tierra-luna-sol/browser/`: las 8 rutas + `index.csr.html`, cada una con su `<title>` correcto en el HTML estático.
- Los ficheros están en UTF-8 y los textos con tildes son correctos.
- Las capturas de escritorio y móvil son coherentes con la propuesta A y no hay desbordamiento horizontal.

Todos los criterios de aceptación se cumplen y están demostrados. Destaco:
- la demostración del lint por capas, incluidos los casos que **no** deben fallar;
- las acciones fijadas por SHA con `persist-credentials: false`;
- `noUncheckedIndexedAccess`;
- el `canMatch` contra el catálogo;
- el armazón accesible (enlace para saltar al contenido, `aria-current` y foco en `main`).

## Hallazgos

| # | Severidad | Archivo | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | **Importante** | `.mcp.json` | `npx -y @angular/cli mcp` sin versión: cada arranque descarga la **última** CLI publicada, sea la 22, la 23 o lo que haya. Es un riesgo de cadena de suministro y puede desalinearse con el proyecto. | Usar la CLI local: `"command": "npx", "args": ["ng", "mcp"]`, o fijar `@angular/cli@22.2.4`. |
| 2 | **Importante** (estrategia) | `docs/PLAN.md` §5 | La base de Angular (router, hidratación y repetición de eventos) ya ocupa 272 kB de los 300 kB del aviso. El presupuesto sigue teniendo sentido, pero solo si **todo lo nuevo** va diferido. | Mantener 300/400 kB y añadir a §5 y a `CLAUDE.md` que `astronomy-engine`, el store del simulador y los controles del visor nunca van en el bundle inicial: viven dentro del `@defer` del visor. En las fichas (fase 5), la «posición actual» se calcula con un `import()` dinámico en `afterNextRender`. |
| 3 | Menor | `.github/workflows/ci.yml` | `on: push` (todas las ramas) + `pull_request` ejecuta el CI dos veces en cada PR. | `push: { branches: [main] }` + `pull_request`. |
| 4 | Menor | `package.json` | `@types/node` en `^22.12.0`, pero el proyecto y el CI usan Node 24 (`.nvmrc`). | Alinear con `^24`. Afecta poco, porque `tsconfig.app.json` no carga los tipos de Node. |
| 5 | Menor (para más adelante) | `app.routes.ts` | `/404` es una URL prerenderizada que Apache servirá con un 200 si alguien entra directamente. | Nada en esta fase. En la fase 5 debe llevar siempre `noindex` (aunque `indexable` sea `true`) y quedar fuera del sitemap. Déjalo como `TODO` en el código. |
| 6 | Sugerencia | `site.config.ts` / `src/index.html` | `lang: 'es'` aparece en dos sitios. | Un test que compruebe que `index.html` lleva `lang="<SITE_CONFIG.lang>"`, o quitar `lang` de la configuración. |
| 7 | Sugerencia | `app.css` | En escritorio, la cabecera arranca a 16 px del borde y el contenido a ~80 px: los márgenes laterales no están alineados. | Un único token de margen lateral (`--gutter`) para la cabecera, `main` y el pie. Puede esperar a la fase 6. |

## Propuestas de cambio al plan (§10 del informe)
Recomiendo **aprobar las tres**:
1. ✅ Comando de `ng new` con `--directory=tls-scaffold` desde la carpeta padre. Es un error del plan, bien detectado.
2. ✅ `OnPush` no se declara: es el valor por defecto en Angular 22 (lo confirma `docs/angular-buenas-practicas.md`).
3. ✅ Añadir `@eslint/js` y `typescript-eslint` a la lista permitida. Son parte de `angular-eslint`, no dependencias nuevas de verdad.

## Otras notas
- **`npm audit`:** de acuerdo en no forzar la bajada de versión. Volver a comprobarlo en cada actualización de `@angular/build`.
- **Scripts de instalación sin aprobar** (esbuild y compañía): de acuerdo, mientras build y tests funcionen.
- **Dirección visual:** mi recomendación coincide, la **A («Carta celeste»)**. Es distintiva sin ser recargada, y los contrastes están calculados. La decisión es de Iván.

## Para cerrar la fase
1. Iván decide: dirección visual (A/B), las 3 propuestas del §10 y el hallazgo 2 (cambio de estrategia).
2. Claude Code aplica los hallazgos 1–4 (y el 6 si quiere), actualiza `PLAN.md`/`CLAUDE.md` con lo aprobado, pasa `npm run check` y completa «Respuesta a la revisión».
3. Fusión a `main` con `--no-ff`.
