# PM Tools · SplitIt

Aplicación Next.js + Eve con tres agentes independientes:

- `control-tower`: estado, hitos, atrasos, bloqueos, riesgos y decisiones.
- `backlog-refiner`: requerimientos → user stories; crear en Linear requiere aprobación.
- `meeting-steering`: agendas, informes para Steering y próximos pasos.

Cada agente tiene prompt, sesión y superficie de herramientas propios. `withEve()` los publica juntos en un solo proyecto de Vercel.

## Qué necesitás

- Node.js 24 o superior.
- Una cuenta/equipo de Vercel con Vercel Connect habilitado.
- Créditos de OpenAI API y una `OPENAI_API_KEY` de `platform.openai.com`.
- Permiso para instalar la conexión en el workspace de Linear de SplitIt.
- Los integrantes que usarán la app agregados al equipo/proyecto de Vercel.

## Correr local

```bash
npm install
vercel login
vercel link
vercel env add OPENAI_API_KEY development
vercel env pull .env.local
npm run dev
```

Abrí `http://localhost:3000`.

El dashboard muestra el estado de Linear y GitHub. Linear se verifica server-side mediante Vercel Connect; la UI nunca recibe el token. GitHub figura como no configurado hasta que exista un repositorio real.

Las fechas de Steering, parciales y finales se guardan en `localStorage`: quedan en ese navegador y dispositivo. No se sincronizan entre integrantes porque esta versión no usa base de datos.

Los tres agentes usan OpenAI directamente mediante `@ai-sdk/openai`. El modelo está fijado en código como `gpt-5.4-mini`. El consumo se descuenta de la cuenta asociada a `OPENAI_API_KEY`.

Para producción y previews:

```bash
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
```

No expongas `OPENAI_API_KEY` en variables `NEXT_PUBLIC_*` ni en el repositorio.

## Conectar Linear

Desde la raíz del proyecto:

```bash
vercel connect create linear
vercel connect attach linear --yes
```

Autorizá el workspace de SplitIt cuando Vercel lo solicite. Los tres agentes usan el conector `linear` con `principalType: "app"`: una instalación compartida para todo el grupo.

Usá el UID completo que devuelve el CLI (por ejemplo, `linear/splitit-c0e8`) en el health check y en las tres conexiones:

- `app/api/connections/route.ts`
- `agents/control-tower/agent/connections/linear.ts`
- `agents/backlog-refiner/agent/connections/linear.ts`
- `agents/meeting-steering/agent/connections/linear.ts`

Después de crear/adjuntar Linear:

```bash
vercel env pull .env.local
```

## Verificar

```bash
npm run typecheck
npm test
npm run build
```

Con `npm run dev`, los health checks son:

```text
/eve/agents/control-tower/eve/v1/health
/eve/agents/backlog-refiner/eve/v1/health
/eve/agents/meeting-steering/eve/v1/health
```

## Deploy a producción

```bash
vercel deploy --prod
```

El comando devuelve la URL de producción. No hace falta un repositorio GitHub para desplegar con Vercel CLI.

## Dar acceso al grupo

La versión actual no tiene usuarios ni roles propios. Para compartirla de forma segura:

1. Invitá a los integrantes al equipo/proyecto de Vercel.
2. En Vercel: **Project → Settings → Deployment Protection**.
3. Activá **Vercel Authentication** para Production.
4. Compartí la URL de producción; cada integrante entra con su cuenta de Vercel.

Linear es una conexión compartida a nivel aplicación. Todos consultan el mismo proyecto y toda escritura sigue mostrando una aprobación humana antes de ejecutarse.

Si cada integrante debe usar su propia cuenta de Linear en lugar de una instalación compartida, hay que agregar Auth.js y cambiar el conector a `principalType: "user"`.

## GitHub (pendiente)

No hay integración GitHub activa porque SplitIt todavía no tiene repositorio. Cuando exista, se agrega el conector usando la URL real; hasta entonces los agentes informan "GitHub no configurado" y no inventan PRs o actividad.

## Seguridad actual

- Tokens y credenciales quedan en Vercel Connect, nunca en frontend.
- Las tools de escritura de Linear requieren aprobación humana.
- El canal interno es monogrupo; la barrera de acceso es Vercel Deployment Protection.
- No compartir la URL sin activar Deployment Protection.
