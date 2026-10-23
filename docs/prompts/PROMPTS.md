# Prompts para Claude Code (terminal)

Abre la terminal en `tierra-luna-sol`, lanza `claude` y pon el esfuerzo que indica la tabla **antes** de pegar el prompt.
**Una sesión nueva por fase** (o por entrega). Para salir de una sesión: `/exit`.

| Fase | Nombre de la rama | Esfuerzo |
|---|---|---|
| 1 | `fase-1-efemerides` | `/effort max` |
| 2 | `fase-2-escena-base` | `/effort high` |
| 3 | `fase-3-interaccion` | `/effort high` |
| 4 | `fase-4-tierra` | `/effort max` |
| 5 | `fase-5-luna` | `/effort max` |
| 6 | `fase-6-lunas-escala-real` | `/effort max` |
| 7 | `fase-7-cielo-eclipses` | `/effort high` |
| 8 | `fase-8-contenido-seo` | `/effort high` |
| 9 | `fase-9-pulido` | `/effort high` |
| 10 | `fase-10-despliegue` | `/effort high` |

---

## Transición al plan v1 (una sola vez, cuando la fase 0 esté fusionada)

```
Iván ha ampliado el alcance: la versión 1 tendrá todas las funcionalidades del proyecto original
(earth-moon-solar) y mejoras propias. La estrategia nueva está en docs/v1/.

En main, sin rama de fase:
1. Sustituye docs/PLAN.md por docs/v1/PLAN.md, CLAUDE.md por docs/v1/CLAUDE.md,
   docs/prompts/PROMPTS.md por docs/v1/PROMPTS.md, docs/FUENTES.md por docs/v1/FUENTES.md
   y docs/PENDIENTES.md por docs/v1/PENDIENTES.md. Antes, comprueba que no se pierde nada que
   hubieras añadido en la fase 0 a los documentos antiguos; si encuentras algo, consérvalo e indícalo.
2. Borra docs/v1/.
3. La sesión de revisión ya ha añadido `.claude/skills/` a .gitignore y a .prettierignore (son skills
   de terceros copiadas en local; no van al repo público). Comprueba con git status que no se van a
   commitear e incluye esos dos cambios en el commit.
4. npm run check y commit: "docs: plan v1 con paridad completa y mejoras".
5. Resume en 10 líneas qué cambia respecto al plan anterior y PARA.
```

---

## Arrancar una fase (cambia N, el nombre y la rama según la tabla)

```
Lee CLAUDE.md, docs/PLAN.md (entero) y el informe y la revisión de la fase anterior
(docs/informes/fase-<N-1>.md y docs/revisiones/fase-<N-1>.md).
Vamos a ejecutar la FASE N (<nombre>) desde main actualizado, en la rama <rama>.

1. Preséntame tu plan para la fase:
   - pasos en orden y, si la fase es grande, en qué entregas (N.a, N.b…) la divides;
   - archivos que crearás o tocarás;
   - dependencias (solo de la lista permitida) y recursos que descargarás, con su licencia;
   - qué skills de .claude/skills vas a consultar;
   - riesgos y dudas.
   No modifiques nada hasta mi OK.
2. Con mi OK, ejecuta con commits pequeños. Al final de cada entrega o sesión, deja el informe
   actualizado y commiteado.
3. Al terminar la fase: npm run check, informe completo en docs/informes/fase-N.md con evidencias
   de cada criterio de aceptación, commit y PARA. No fusiones.
```

---

## Retomar una fase a medias (sesión nueva)

```
Lee CLAUDE.md, docs/PLAN.md y docs/informes/fase-N.md (está «en curso»). Comprueba con git log y
git status en la rama <rama> dónde se quedó el trabajo. Resúmeme en 5 líneas qué está hecho, qué falta
y cuál es la siguiente entrega, y espera mi OK para continuar.
```

---

## Aplicar una revisión

```
Lee docs/revisiones/fase-N.md. Decisiones de Iván: <pega aquí lo que hayas decidido, si hay algo>.
Corrige en la rama <rama> todos los hallazgos Bloqueantes e Importantes, y los Menores que sean rápidos.
Si no estás de acuerdo con alguno, explica por qué en vez de aplicarlo. Después: npm run check,
añade «Respuesta a la revisión» al informe, commit y PARA.
```

---

## Fusionar una fase aprobada

```
La fase N está aprobada. Fusiona <rama> en main con --no-ff, comprueba que npm run check pasa
en main y, si hay remoto, haz push de main. Después PARA.
```

---

## Si algo se tuerce

```
Para. Explícame en pocas líneas qué estabas intentando, qué ha fallado y qué opciones ves.
No borres ni reviertas nada hasta que yo decida.
```
