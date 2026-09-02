# Skills

Herramientas de trabajo de los roles de gestión, una carpeta por rol.

Son markdown plano: las ejecuta el agente que tenga el equipo (Claude Code,
Codex, Cursor, etc.), no esta app. La app las lee de acá y las muestra; ellas
no dependen de la app.

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

Cada `SKILL.md` arranca con este frontmatter:

```yaml
---
name: nombre-en-kebab-case
owner: "@handle-de-github"
role: po | qa | tl
description: Qué hace y cuándo conviene usarla. Es lo que decide si se invoca.
---
```

`owner` es quien la escribió, igual que en el decision log: si algo no se entiende o hay
que cambiarla, se sabe con quién hablar. Como los roles rotan, el autor no cambia aunque
cambie el rol.

El cuerpo dice sobre qué datos opera, cuándo se corre y qué devuelve.

Una skill nace de una fricción real que ya pasó, no de completar una cuota. Si nadie la
corre, conviene borrarla.

## Índice

| Rol | Skill | Autor | Qué hace |
|---|---|---|---|
| PO | [revisar-diseno](po/revisar-diseno/SKILL.md) | @n-mangini | Cruza una user story contra su diseño de Figma y anota las discrepancias en la issue |
| TL | [migrar-proyecto](tl/migrar-proyecto/SKILL.md) | @lucasmonteverdi1 | Migra el esqueleto de un monorepo A (Spring Boot + Next.js + JWT) a B, sin copiar ejercicios ni secretos, y cierra con informe |
| TL | [generar-tests-e2e](tl/generar-tests-e2e/SKILL.md) | @lucasmonteverdi1 | Genera tests E2E para una PR de un repo de aplicación, los pushea, y si fallan por un bug real pushea el fix en un commit aparte |
| PO | [to-canvas](po/to-canvas/SKILL.md) | @n-mangini | Convierte un prototipo navegable en un canvas de pantallas, con una dirección estable por historia |
| PO | [iterar-canvas](po/iterar-canvas/SKILL.md) | @n-mangini | Trabaja una historia sobre el canvas ya construido: cruza sus criterios contra la pantalla, cierra los huecos con el PO, y deja la issue y el deploy al día |
