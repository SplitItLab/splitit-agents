# CI/CD desde un repositorio privado de GitHub Organization hacia Vercel Hobby

Guía paso a paso para pasarle a un agente de código. Verificada el 14 de agosto de 2026.

## Objetivo

Configurar este flujo sin conectar el repositorio privado de la organización a la integración Git de Vercel:

1. Cada pull request ejecuta instalación, typecheck y tests en GitHub Actions.
2. Cada push a `main` repite esas validaciones.
3. Si pasan, GitHub Actions construye la aplicación con Vercel CLI.
4. GitHub Actions sube `.vercel/output` a producción con `vercel deploy --prebuilt --prod`.

Vercel no permite conectar un proyecto Hobby con un repositorio privado perteneciente a una organización. El flujo evita esa integración: GitHub Actions lee el repositorio y Vercel CLI recibe solamente el resultado del build. Vercel documenta por separado tanto la [restricción de repositorios privados de organizaciones](https://vercel.com/docs/git) como el [deploy mediante GitHub Actions y `--prebuilt`](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel).

> [!IMPORTANT]
> Vercel Hobby está limitado a uso personal y no comercial. Si el proyecto es comercial, pertenece a un negocio o lo desarrolla personal remunerado, no usar este procedimiento para evitar Pro. Consultar el [plan Hobby](https://vercel.com/docs/plans/hobby) y las [reglas de uso justo](https://vercel.com/docs/limits/fair-use-guidelines).

## Instrucciones para el agente

Antes de modificar archivos:

1. Confirmar que el repositorio es privado y que su owner de GitHub es una organización.
2. Confirmar que el uso cumple las condiciones de Vercel Hobby.
3. Leer las instrucciones locales del repositorio (`AGENTS.md`, `CONTRIBUTING.md` o equivalentes).
4. Detectar el package manager por su lockfile.
5. Leer `package.json` para obtener la versión de Node y los scripts reales.
6. Revisar si ya existe `.github/workflows/` para no duplicar CI/CD.
7. Revisar si existe `.vercel/project.json`. Nunca mostrar ni commitear credenciales.
8. Preservar cambios locales ajenos a esta tarea.

Usar el workflow de esta guía como base, pero adaptar Node, instalación, typecheck y tests al repositorio real. No agregar dependencias ni abstracciones para esta tarea.

## Requisitos

- Acceso de administración al repositorio de GitHub o permiso para administrar Actions secrets.
- Una cuenta personal de Vercel en plan Hobby.
- Un proyecto de Vercel creado dentro de esa cuenta.
- GitHub Actions habilitado.
- Vercel CLI y GitHub CLI, o acceso a sus interfaces web.
- Rama de producción conocida; esta guía usa `main`.

## Paso 1: comprobar el repositorio

Desde la raíz local:

```bash
git remote -v
git branch --show-current
```

Si GitHub CLI está autenticado:

```bash
gh api repos/OWNER/REPO --jq '{owner: .owner.type, private: .private, default_branch: .default_branch, permissions: .permissions}'
```

Reemplazar `OWNER/REPO`. El resultado esperado es:

- `owner: Organization`
- `private: true`
- Permiso `admin` o capacidad equivalente para configurar secrets.

Si `origin` apunta a una URL anterior después de una transferencia del repositorio, confirmar primero que ambos remotos llegan al mismo commit y luego corregirlo:

```bash
git remote set-url origin https://github.com/OWNER/REPO.git
```

## Paso 2: crear o enlazar el proyecto de Vercel

No importar el repositorio desde **Vercel → Add New Project**. Eso intenta usar la integración Git bloqueada para Hobby.

Desde la raíz local:

```bash
npm install --global vercel@latest
vercel login
vercel link
```

Durante `vercel link`:

1. Elegir el scope personal Hobby que será dueño del deploy.
2. Enlazar un proyecto existente o crear uno nuevo.
3. No conectar la integración Git del repositorio privado de la organización.

El comando crea `.vercel/project.json`:

```json
{
  "projectId": "prj_...",
  "orgId": "team_...",
  "projectName": "..."
}
```

Comprobar que `.vercel` esté ignorado:

```bash
git check-ignore .vercel/project.json
```

Si no está ignorado, agregar esta línea a `.gitignore`:

```gitignore
.vercel
```

No commitear `.vercel/project.json`. Aunque los IDs no autentican por sí solos, son configuración específica de la cuenta.

Si el proyecto conserva una conexión Git anterior, desconectarla desde **Vercel → Project → Settings → Git** para evitar intentos de deploy duplicados o bloqueados.

## Paso 3: crear el token de Vercel

Esta parte requiere intervención humana. El agente no debe copiar ni reutilizar silenciosamente la sesión local de Vercel.

1. Abrir [Vercel Account Settings → Tokens](https://vercel.com/account/settings/tokens).
2. Crear un token dedicado para GitHub Actions.
3. Asignarlo al scope Hobby que contiene el proyecto.
4. Usar una fecha de expiración y rotarlo según la política del equipo.
5. Copiarlo una sola vez y guardarlo directamente como GitHub secret.

No guardar el token en `.env`, `.vercel/project.json`, el workflow, un issue, un chat ni el historial del shell.

## Paso 4: crear los tres GitHub Actions secrets

En GitHub: **Repository → Settings → Secrets and variables → Actions → New repository secret**.

Crear exactamente:

| Secret | Valor |
| --- | --- |
| `VERCEL_TOKEN` | Token dedicado creado en el paso anterior |
| `VERCEL_ORG_ID` | `orgId` de `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` de `.vercel/project.json` |

Alternativa con GitHub CLI:

```bash
gh secret set VERCEL_TOKEN --repo OWNER/REPO
gh secret set VERCEL_ORG_ID --repo OWNER/REPO --body "team_..."
gh secret set VERCEL_PROJECT_ID --repo OWNER/REPO --body "prj_..."
```

El primer comando solicita el token sin escribirlo dentro del comando. Reemplazar los dos IDs por los valores reales; nunca pegar el token en `--body` porque puede quedar en el historial del shell.

Verificar solamente los nombres y fechas, no los valores:

```bash
gh secret list --repo OWNER/REPO
```

## Paso 5: crear el workflow

Crear `.github/workflows/ci.yml`.

Este ejemplo corresponde a npm, Node 24 y un proyecto con scripts `typecheck` y `test`. El agente debe adaptar esas cuatro decisiones a `package.json` y al lockfile real. Si un script no existe, no inventarlo: omitir esa línea o usar el comando de validación ya presente en el repositorio.

```yaml
name: CI/CD

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test

      - if: github.event_name == 'push'
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm install --global vercel@latest
          vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
          vercel build --prod --token="$VERCEL_TOKEN"
          vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
```

### Por qué está armado así

- `pull_request` ejecuta CI, pero no recibe ni usa credenciales de Vercel.
- `push.branches: [main]` limita producción a la rama principal.
- `if: github.event_name == 'push'` omite completamente el paso con secrets durante una PR.
- `permissions: contents: read` aplica el permiso mínimo requerido al `GITHUB_TOKEN`.
- `vercel pull` descarga la configuración y variables de producción del proyecto.
- `vercel build --prod` genera `.vercel/output` dentro del runner de GitHub.
- `vercel deploy --prebuilt --prod` sube ese resultado sin pedirle a Vercel que lea el repositorio privado.

No agregar previews de PR por defecto. Requerirían entregar credenciales de deploy a un flujo disparado por cambios todavía no integrados. Agregarlas sólo si existe una necesidad concreta y una política clara para contribuciones externas.

## Paso 6: verificar antes de subir

Ejecutar las mismas validaciones que usará CI:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Adaptar los comandos al proyecto. Además:

```bash
git diff --check
git status --short
```

Revisar que:

- Sólo estén modificados el workflow y cualquier `.gitignore` estrictamente necesario.
- No aparezcan `.vercel/`, tokens ni archivos `.env` en el diff.
- El YAML sea válido.
- El build local finalice correctamente.

## Paso 7: probar CI y producción

1. Crear una rama de trabajo.
2. Commitear el workflow.
3. Abrir una pull request.
4. Confirmar que GitHub Actions ejecuta instalación, typecheck y tests.
5. Confirmar que la PR no ejecuta comandos de Vercel.
6. Mergear a `main` cuando CI pase.
7. Abrir **GitHub → Actions → CI/CD**.
8. Confirmar que `vercel pull`, `vercel build --prod` y `vercel deploy --prebuilt --prod` terminan correctamente.
9. Abrir **Vercel → Project → Deployments** y confirmar un nuevo deployment `Production`.
10. Abrir el dominio de producción y realizar una verificación funcional mínima.

Si el repositorio usa protección de rama, marcar el job `ci` como status check requerido antes del merge.

## Problemas frecuentes

### `No existing credentials found` o `Invalid token`

`VERCEL_TOKEN` falta, expiró o pertenece a otro scope. Crear o rotar el token y actualizar únicamente el GitHub secret.

### `Project not found`

`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` y `VERCEL_TOKEN` no pertenecen al mismo scope/proyecto. Volver a ejecutar `vercel link` con la cuenta correcta y actualizar los IDs.

### El build no encuentra variables de entorno

Agregar las variables en **Vercel → Project → Settings → Environment Variables** para `Production`. `vercel pull --environment=production` las descargará en el runner. No copiarlas al workflow.

### Vercel sigue mostrando errores sobre el autor del commit o el repositorio de la organización

El proyecto todavía está intentando usar la integración Git. Desconectar el repositorio desde **Project → Settings → Git**. El deployment correcto debe originarse en Vercel CLI ejecutado por GitHub Actions.

### El deploy no corre en una pull request

Es el comportamiento esperado. Las PR sólo ejecutan CI; producción se despliega después del push o merge a `main`.

### GitHub Actions no puede leer los secrets

Confirmar que son **Repository secrets** del repositorio correcto y que los nombres coinciden exactamente. GitHub no entrega secrets a workflows ejecutados desde forks; este flujo no los necesita durante PRs.

### El dominio no apunta al deployment nuevo

Confirmar que el dominio está asignado al environment `Production` del mismo `VERCEL_PROJECT_ID`.

## Checklist final para el agente

- [ ] Confirmé owner, visibilidad y rama principal del repositorio.
- [ ] Confirmé que el uso es personal/no comercial.
- [ ] Leí las instrucciones y scripts reales del proyecto.
- [ ] Enlacé el proyecto Hobby mediante Vercel CLI, sin integración Git.
- [ ] Confirmé que `.vercel` está ignorado.
- [ ] Pedí a una persona crear el token dedicado; no reutilicé credenciales locales.
- [ ] Verifiqué los tres GitHub secrets por nombre.
- [ ] Creé un solo workflow y adapté Node/package manager/scripts.
- [ ] Evité exponer secrets durante PRs.
- [ ] Ejecuté las validaciones locales.
- [ ] Verifiqué CI en una PR y CD después del merge a `main`.
- [ ] Informé qué archivos cambiaron y cualquier paso manual pendiente.
