# Skills

Herramientas de trabajo de los roles de gestión, una carpeta por rol.

Son markdown plano: las ejecuta Claude Code o Codex, no esta app. La app las lee de acá
y las muestra; ellas no dependen de la app.

## Estructura

```
skills/<rol>/<nombre-en-kebab-case>/SKILL.md
```

Roles: `po`, `qa`, `tl`. Las del PM viven en `agents/`.

## Instalar

Para que estén disponibles desde cualquier carpeta, enlazarlas a las skills del usuario:

```bash
./skills/install.sh
```

Crea un symlink por skill en `~/.claude/skills`. Se corre una vez por máquina, y de nuevo
cuando se agrega una skill nueva. Al ser symlinks, editar el archivo del repo alcanza:
no hay copias que se desincronicen.

## Escribir una skill

Cada `SKILL.md` lleva frontmatter con `name` y `description`, y el cuerpo dice qué rol la
usa, sobre qué datos opera y cuándo se corre.

Una skill nace de una fricción real que ya pasó, no de completar una cuota. Si nadie la
corre, conviene borrarla.

## Índice

| Rol | Skill | Qué hace |
|---|---|---|
| PO | [revisar-diseno](po/revisar-diseno/SKILL.md) | Cruza una user story contra su diseño de Figma y anota las discrepancias en la issue |
