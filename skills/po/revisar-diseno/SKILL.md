---
name: revisar-diseno
owner: "@n-mangini"
role: po
created: 2026-08-18
description: Cruza una user story de SplitIt contra su diseño de Figma, reporta las discrepancias y las anota en la issue. Usar cuando llega o cambia el diseño de una pantalla, antes de que la historia entre a un ciclo, o cuando el usuario pide revisar/contrastar una historia contra el Figma.
---

# Revisar diseño contra historia

Las historias de SplitIt se escriben antes que el diseño. Cuando el Figma llega después,
aparecen desajustes que **no se ven mirando una sola fuente**: la historia está bien, el
diseño está bien, y el problema recién aparece al cruzarlos.

Esta skill hace ese cruce.

## Invocación

```
/revisar-diseno 1              una historia
/revisar-diseno 1 2 18         varias
/revisar-diseno 1 --dry-run    solo reporta, no toca la issue
/revisar-diseno                todas las que tengan sección "## Diseño"
```

Por defecto anota las discrepancias en la issue. `--dry-run` reporta y no escribe nada.

## Repositorio

Las issues viven en `SplitItLab/dirproy`. Pasar siempre `--repo SplitItLab/dirproy` a `gh`.
Si el usuario indica otro repo, usar ese.

## Procedimiento

### 1. Leer la historia

```bash
gh issue view <n> --repo SplitItLab/dirproy --json title,body -q '.title + "\n" + .body'
```

Sin argumentos, listar primero las candidatas y quedarse con las que tengan `## Diseño`:

```bash
gh issue list --repo SplitItLab/dirproy --limit 100 --json number,title,body \
  -q '.[] | select(.body | contains("## Diseño")) | "\(.number) \(.title)"'
```

Si la issue no tiene sección `## Diseño`, decirlo y no inventar links.

### 2. Leer el diseño

De la sección `## Diseño` salen las URLs de Figma. De cada una se extrae `fileKey` y
`node-id` (`?node-id=45-37` → nodeId `45:37`).

Para cada nodo:

- `mcp__claude_ai_Figma__get_screenshot` — y **mirar la imagen**: bajarla con `curl` al
  scratchpad y leerla con Read. El cruce es visual; la metadata sola no alcanza.
- `mcp__claude_ai_Figma__get_metadata` — para nombres de capas, campos y textos exactos.

No usar `get_design_context`: acá no se genera código, y trae mucho más de lo necesario.

### 3. Cruzar

Recorrer los criterios de aceptación uno por uno contra lo que se ve, y buscar estas seis
categorías:

| Categoría | Qué buscar |
|---|---|
| **Falta en el diseño** | Algo que un criterio exige y la pantalla no tiene |
| **Falta en la historia** | Algo diseñado que ningún criterio cubre |
| **Camino sin salida** | Una pantalla sin forma de llegar a la siguiente, o sin vuelta |
| **Estado no diseñado** | Error, vacío o carga que los criterios piden y no están dibujados |
| **Desktop vs mobile** | Diferencias entre las dos versiones que la historia no declara |
| **Copy** | Typos, tildes faltantes, términos inconsistentes entre pantallas |

Ejemplos reales de la primera pasada, para calibrar:

- SPLT-001 exige nombre, email y contraseña; la pantalla solo tiene email y contraseña.
- SPLT-002: el registro enlaza al login, pero el login no ofrece volver al registro.
- SPLT-018: el menú hamburguesa está diseñado y ningún criterio dice qué hace.
- El eyebrow de la landing dice "APLICACION" sin tilde; el subtítulo alterna "mail" y "Email".

### 4. Reportar

Agrupar por categoría, con la referencia concreta: qué criterio, qué elemento del diseño.
Distinguir lo que bloquea el desarrollo de lo que es cosmético — un campo faltante frena
al dev, una tilde no.

Cerrar diciendo **de quién es cada decisión**: si falta algo en el diseño, es del PO
decidir si se agrega al Figma o se saca de la historia. No resolverlo unilateralmente.

Si no hay discrepancias, decirlo en una línea y no inflar el informe.

### 5. Anotar

Salvo que se haya pasado `--dry-run`, insertar en la issue, al final de `## Diseño`, una
cita con lo que bloquea:

```markdown
> **Pendiente de diseño:** <qué falta y por qué importa>
```

Anotar solo lo que bloquea o cambia el trabajo. Lo cosmético va en el reporte, no en la issue.

Editar preservando el resto del cuerpo: bajarlo con `gh issue view --json body -q .body`,
modificarlo, y subirlo con `gh issue edit --body-file`. Nunca reescribir el cuerpo de memoria.

Si la issue ya tiene una nota de "Pendiente de diseño", actualizarla en lugar de agregar otra.
Si lo que decía ya está resuelto en el diseño nuevo, borrarla.

## Formato de las issues

Las historias siguen este orden. Si una no lo respeta, mencionarlo al pasar:

```
## Historia de usuario
## Criterios de aceptación
## Fuera de alcance
## Diseño
## Dependencias
```
