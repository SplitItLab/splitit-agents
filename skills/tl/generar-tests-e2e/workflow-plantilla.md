# Plantilla: disparar `generar-tests-e2e` desde un comentario de PR

Este archivo no se ejecuta acá. Es la plantilla que se copia a
`.github/workflows/e2e-agent.yml` en cada **repo de aplicación** que quiera
el flujo automático: comentar `/e2e` en una PR y que un agente genere los
tests (y el fix, si aplica) solo.

El YAML de abajo es el contrato compartido (quién puede dispararlo, sobre
qué rama, dónde vive la skill). El CLI del agente es un solo step, para
que cada equipo enchufe Claude, Codex, Cursor u otro sin reescribir el resto.

## Requisitos en el repo de destino

- Secret del **proveedor del agente** que elijan (ver el step "Correr el
  agente"). No hace falta Anthropic si no usan Claude.
- Permiso de escritura del `GITHUB_TOKEN` por defecto alcanza para pushear a
  la rama de la PR y comentar; no hace falta un PAT salvo que la rama esté
  protegida contra pushes de Actions.
- Variable de repo `E2E_AGENT` (`claude` | `codex` | `cursor`) **o**
  reemplazar el `case` del último step por el comando de su runner.
- La skill `generar-tests-e2e` se trae en el job (clone del catálogo). En
  CI no hay symlink: se copia el contenido a `.agents/skills/` (path
  genérico, no `.claude/skills/`). Si `splitit-agents` es privado, crear el
  secret `CATALOG_TOKEN` (PAT de solo lectura, `contents: read` alcanza) en
  este repo — el step del clone ya lo usa si existe.

## Workflow

```yaml
name: E2E Agent

on:
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write

jobs:
  e2e-agent:
    if: >
      github.event.issue.pull_request &&
      (github.event.comment.body == '/e2e' || github.event.comment.body == '/e2e --dry-run') &&
      (github.event.comment.author_association == 'OWNER' ||
       github.event.comment.author_association == 'MEMBER' ||
       github.event.comment.author_association == 'COLLABORATOR')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Resolver head de la PR
        id: pr
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          number="${{ github.event.issue.number }}"
          sha="$(gh api "repos/${{ github.repository }}/pulls/${number}" --jq .head.sha)"
          echo "number=${number}" >> "$GITHUB_OUTPUT"
          echo "sha=${sha}" >> "$GITHUB_OUTPUT"

      - uses: actions/checkout@v4
        with:
          ref: ${{ steps.pr.outputs.sha }}

      - name: Traer la skill del catálogo
        env:
          # Si splitit-agents es privado, crear un PAT de solo lectura (repo:read
          # alcanza) y guardarlo en el secret CATALOG_TOKEN de este repo. Si es
          # público, GITHUB_TOKEN por defecto alcanza para el clone anónimo.
          CATALOG_TOKEN: ${{ secrets.CATALOG_TOKEN || secrets.GITHUB_TOKEN }}
        run: |
          git clone --depth 1 "https://x-access-token:${CATALOG_TOKEN}@github.com/<org>/splitit-agents" /tmp/splitit-agents
          mkdir -p .agents/skills
          cp -r /tmp/splitit-agents/skills/tl/generar-tests-e2e .agents/skills/

      - name: Armar el prompt
        run: |
          cat > /tmp/e2e-prompt.md <<EOF
          Seguí las instrucciones de .agents/skills/generar-tests-e2e/SKILL.md.
          Invocación: /generar-tests-e2e ${{ github.repository }}#${{ steps.pr.outputs.number }}
          Estás en la rama de esa PR. Commits y push van a esta rama, no a la default.
          EOF

      - name: Correr el agente
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
        run: |
          prompt="$(cat /tmp/e2e-prompt.md)"
          agent="${{ vars.E2E_AGENT }}"
          case "$agent" in
            claude)
              npm install -g @anthropic-ai/claude-code
              claude -p "$prompt" --allowedTools "Bash,Read,Write,Edit" --permission-mode acceptEdits
              ;;
            codex)
              npm install -g @openai/codex
              codex exec --full-auto "$prompt"
              ;;
            cursor)
              curl https://cursor.com/install -fsS | bash
              export PATH="$HOME/.cursor/bin:$PATH"
              agent -p --force "$prompt"
              ;;
            *)
              echo "Definí la variable de repo E2E_AGENT (claude | codex | cursor),"
              echo "o reemplazá este step por el CLI de tu agente."
              echo "Contrato: leer .agents/skills/generar-tests-e2e/SKILL.md y ejecutar"
              echo "la invocación del prompt, con permiso de editar / commit / push."
              exit 1
              ;;
          esac
```

## Notas de seguridad

- El `if:` filtra por `author_association` para que un comentario de
  cualquier cuenta externa no dispare un job con permisos de escritura y una
  API key. Ajustar la lista de asociaciones según quién debería poder
  invocarlo en ese repo.
- Match **exacto** del body (`== '/e2e'`), no `startsWith`: un comentario que
  solo *menciona* `/e2e` en una frase no dispara el job, y tampoco lo hace
  algo como `/e2e-agent` o `/e2elegante`. Si el comentario tiene espacios al
  final, no matchea — es intencional (evita falsos positivos silenciosos);
  si en la práctica molesta, cambiar a comparar contra
  `github.event.comment.body` recortado con `trim()` en un step previo.
- `timeout-minutes: 30` en el job: sin esto, un agente que no converge en el
  diagnóstico de bug-real-vs-test-mal-armado (paso 5/6 de la skill) corre
  hasta el default de 6h de Actions, consumiendo minutos de billing sin que
  nadie lo note. Ajustar el número si el entorno local del repo tarda mucho
  en levantar.
- El agente pushea directo a la rama de la PR (no a `main`), así que el
  blast radius de un fix erróneo queda contenido a esa PR — igual pasa por
  review normal antes de mergear.
- Si el repo tiene rama protegida que bloquea pushes de `github-actions[bot]`,
  hace falta un PAT de una cuenta de servicio en vez del `GITHUB_TOKEN` por
  defecto; evaluarlo caso a caso, no dejarlo como default.
- PRs desde forks: el `GITHUB_TOKEN` no va a poder pushear al fork. Este
  flujo asume PRs desde ramas del mismo repo.

## Qué ajustar por repo

- `E2E_AGENT` (o el `case` entero) según el CLI que usen.
- El comando de arranque del entorno: si no es obvio (`npm run dev` /
  `docker compose`), agregarlo al prompt del step "Armar el prompt".
- No hace falta `npm ci` acá: el paso 2 de la skill instala y detecta el
  framework E2E. Si el repo es monorepo, decir en el prompt en qué
  carpeta vive la app.
- Browsers de Playwright/Cypress en Actions: si el agente corre los tests
  en este job, instalar dependencias de OS / `npx playwright install --with-deps`
  (o el equivalente de Cypress) en un step previo, o documentar que el
  agente lo haga.
