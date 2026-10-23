# Prompts para Claude Code (terminal)

Abre la terminal en la carpeta del proyecto y lanza **`claude`**, sin nada detrás: lo que escribas detrás se envía como primer mensaje. Pon el esfuerzo de la tabla y comprueba que pone «auto mode on». **El ciclo completo del modo autónomo está en `CLAUDE.md`**: el prompt solo dice qué bloque toca.

## Bloques

| Bloque | Fases | Ramas | Esfuerzo | Antes de empezar (Iván) |
|---|---|---|---|---|
| A ✅ | 1 | `fase-1-efemerides` | `max` | — |
| B | 2–3 | `fase-2-motor`, `fase-3-interfaz` | `max` | — |
| C | 4–5 | `fase-4-staging`, `fase-5-tierra` | `max` | Repo en GitHub + staging en cPanel + secrets (si no, la fase 4 se aplaza) |
| D | 6–7 | `fase-6-luna`, `fase-7-lunas-escala-real` | `max` | — |
| E | 8–9 | `fase-8-cielo-eclipses`, `fase-9-contenido` | `high` | — |
| F | 10 | `fase-10-pulido` | `max` | Un iPhone para probar; decisión sobre `@lhci/cli` |
| — | 11 | `fase-11-lanzamiento` | `high` | Subdominio de producción, FTP, secrets y licencia |

## Prompts

**Lanzar un bloque** (sesión nueva):
```
Bloque B.
```

**Lanzar un bloque con decisiones nuevas tuyas:**
```
Bloque C. Decisiones: <lo que hayas decidido>.
```

**Retomar un bloque a medias** (sesión nueva, por ejemplo si se acabó el contexto o el uso):
```
Retoma el bloque B donde se quedó (mira DIARIO.md, el informe en curso y git log).
```

**Aplicar una revisión de bloque:**
```
Aplica docs/revisiones/bloque-B.md. Decisiones: <las tuyas, si hay>.
```

**Si algo se tuerce:**
```
Para y explícame qué ha fallado y qué opciones ves. No borres ni reviertas nada.
```

**Adoptar el plan v2** (una sola vez, antes del bloque B):
```
Adopta el plan v2 siguiendo ../_plan-v2-tierra-luna-sol/ADOPTAR.md.
```
