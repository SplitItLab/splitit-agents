---
name: generar-tests-e2e
owner: "@lucasmonteverdi1"
role: tl
description: Genera tests E2E para una feature de una PR abierta en un repo de aplicación, los pushea, y si fallan por un bug (no por el armado del test) pushea el fix en un commit aparte. Usar al comentar /e2e en una PR lista para review, o al pedir "generame los E2E de esta PR".
---

# Generar tests E2E de una PR

Esta skill corre **en el repo de aplicación**, no en `splitit-agents`. Este
repo es el catálogo: acá vive la instrucción, pero el checkout, el framework
E2E y la PR real están en el otro repo. No asumir contexto de `splitit-agents`
(next.config, agents/, etc.) salvo que la PR en cuestión sea de este mismo
repo.

Se invoca de dos formas: manual (parado en el repo de app, con el dev
pidiéndolo) o automática (ver `workflow-plantilla.md` en esta carpeta: un
comentario `/e2e` en la PR dispara el job; el CLI del agente lo elige cada
repo). La instrucción es markdown: no asume Claude Code ni `.claude/skills`.

## Cuándo no usarla

Si la PR todavía tiene comentarios de review sin resolver, o el autor la
marcó como draft/WIP, no generar tests todavía — preguntar. Tampoco aplica si
la feature no tiene una superficie de usuario navegable (una migración de
datos, un cambio de config): ahí un E2E no aporta, decirlo y no forzarlo.

## Invocación

```
/generar-tests-e2e <owner/repo>#<PR>
/generar-tests-e2e <owner/repo>#<PR> --dry-run
```

Si falta el número de PR, preguntar — no asumir "la última abierta".
`--dry-run` hace los pasos 1-3 (entender la feature, plan de qué testear) y
termina: no escribe, no corre nada, no pushea.

## Procedimiento

### 1. Entender la feature de la PR

`gh pr view <PR> --json title,body,baseRefName,headRefName,files` y
`gh pr diff <PR>`. Leer el diff completo, no solo los nombres de archivo: de
ahí sale qué flujo de usuario cambió (una pantalla nueva, un botón, un
endpoint que ahora alimenta una vista). Si el diff es puro refactor/backend
sin superficie visible, aplica "Cuándo no usarla".

`gh pr checkout <PR>` para pararse en la rama real.

### 2. Detectar el framework E2E del repo

Buscar `playwright.config.*`, `cypress.config.*`, o carpeta `e2e/`/`tests/e2e/`.

- Si existe, usarlo tal cual (mismo estilo de selectors, fixtures, helpers de
  auth que ya haya).
- Si no existe ninguno, instalar Playwright (`npm init playwright@latest` o
  equivalente al gestor del repo) con la config mínima que corra contra el
  entorno de dev local del repo (`npm run dev` o el script que exista).
  Preguntar antes si el repo no tiene forma obvia de levantar un entorno
  local (sin `dev`/`start` script ni docker-compose).

### 3. Plan de qué testear

Listar los flujos de usuario que el diff introduce o modifica, en una línea
por flujo (ej. "crear ticket desde el form nuevo", "el badge de estado
cambia a 'en review' al asignar"). `--dry-run` termina acá, mostrando esta
lista.

### 4. Escribir los tests y pushearlos

Un archivo de test por feature (no por PR), nombrado por el flujo. Cubrir el
camino feliz siempre; camino de error solo si el diff introduce validación o
manejo de error explícito — no inventar edge cases que la PR no toca.

Levantar el entorno local del repo, correr los tests una vez para
confirmar que al menos ejecutan (no que pasen todavía).

Commit **solo con los tests**, nada de código de app:

```
git add <archivos de test>
git commit -m "test(e2e): <flujo> para PR #<N>"
git push
```

Si a esta altura los tests pasan, terminar acá — no hay bug que arreglar,
no hay segundo commit.

### 5. Si fallan: diagnosticar antes de tocar código

Para cada test que falla, decidir con evidencia (no adivinar) si la causa es:

- **El test está mal armado** (selector que no matchea, timing, dato de
  fixture inválido, asunción incorrecta sobre el flujo): corregir el test,
  no el código de la app. Sigue siendo parte del commit de tests del paso 4
  — si ya se pusheó, un commit adicional de "test(e2e): fix selector" está
  bien, pero es un commit de test, no de fix de producto.
- **La app tiene un bug real** (la UI no hace lo que la PR dice que hace, un
  endpoint devuelve mal, una validación falta): recién acá se toca código de
  producto.

Evidencia mínima antes de decidir bug real: reproducir manualmente el paso
que falla (via el mismo comando que levanta el entorno del paso 2) y
confirmar que el comportamiento no matchea la intención de la PR (título,
body, diff) — no solo que el test no pasa.

Si tras un intento de diagnóstico razonable no se puede distinguir con
confianza entre "test mal armado" y "bug real", no adivinar: dejar el test
fallando, pushear igual (para que quede visible en CI) y comentar en la PR
la ambigüedad con el nombre del test y el output del fallo.

### 6. Fix del bug, en commit aparte

Solo el código mínimo para que el flujo descrito en la PR funcione. No
refactors, no limpieza al pasar, no tocar código fuera del alcance del bug.
Correr los tests E2E de nuevo tras el fix; si siguen fallando, repetir el
diagnóstico del paso 5 en vez de insistir con el mismo fix.

```
git add <archivos de código, no de test>
git commit -m "fix: <bug> (detectado por E2E de PR #<N>)"
git push
```

Máximo dos intentos de fix por test. Si al segundo intento sigue fallando,
parar, dejar el estado tal cual (tests pusheados, fix parcial si lo hay) y
comentar en la PR qué se probó y por qué no se resolvió — no seguir
iterando a ciegas.

### 7. Comentario final en la PR

`gh pr comment <PR> --body "..."` con: qué tests se agregaron (lista corta),
si hubo fix y de qué, y si algo quedó pendiente (ambigüedad del paso 5 o
límite de intentos del paso 6). Un comentario, no uno por commit.

## Fuera de alcance

Tests unitarios o de integración (esta skill es específicamente E2E).
Cambios de arquitectura del framework de testing existente. Levantar
infraestructura de CI nueva más allá de lo que `workflow-plantilla.md`
documenta. Si el fix del paso 6 requeriría una decisión de diseño (no un bug
puntual), parar y preguntar en vez de decidir por el dev.
