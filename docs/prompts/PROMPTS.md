# Prompts para Claude Code (terminal)

Abre la terminal **en la carpeta `tierra-luna-sol`** y lanza `claude`. Copia el prompt que toque.

---

## Arranque: Fase 0

```
Lee CLAUDE.md y docs/PLAN.md enteros. Vamos a ejecutar la FASE 0 (Cimientos).

1. Antes de tocar nada, comprueba los requisitos de la tarea 0.1 (versión de Node y que esta carpeta
   no está dentro de otro repo git). Si algo falla, para y dime qué hay que hacer.
2. Preséntame tu plan para la fase 0: pasos, comandos exactos, archivos que vas a crear o mover
   y dudas. Espera mi OK.
3. Con mi OK, ejecútala en la rama fase-0-cimientos con commits pequeños.
4. Al terminar: npm run check, informe en docs/informes/fase-0.md con la plantilla, commit y PARA.
```

---

## Siguientes fases (cambia N y el nombre)

```
Lee CLAUDE.md, docs/PLAN.md y el informe y la revisión de la fase anterior
(docs/informes/fase-<N-1>.md y docs/revisiones/fase-<N-1>.md).
Vamos a ejecutar la FASE N (<nombre>) desde main actualizado.

1. Preséntame tu plan para la fase: pasos, archivos, dependencias que vas a instalar
   (solo de la lista permitida), riesgos y dudas. Espera mi OK.
2. Con mi OK, ejecútala en la rama fase-N-<nombre> con commits pequeños.
3. Al terminar: npm run check, informe en docs/informes/fase-N.md, commit y PARA.
```

---

## Aplicar una revisión

```
Lee docs/revisiones/fase-N.md. Corrige en la rama fase-N-<nombre> todos los hallazgos
Bloqueantes e Importantes, y los Menores que sean rápidos. Si no estás de acuerdo con
alguno, explica por qué en vez de aplicarlo. Después: npm run check, añade la sección
"Respuesta a la revisión" al informe de la fase, commit y PARA.
```

---

## Fusionar una fase aprobada

```
La fase N está aprobada. Fusiona fase-N-<nombre> en main con --no-ff,
comprueba que npm run check pasa en main y, si hay remoto, haz push de main.
```
