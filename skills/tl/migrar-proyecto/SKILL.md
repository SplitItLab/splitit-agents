---
name: migrar-proyecto
owner: "@lucasmonteverdi1"
role: tl
description: Migra el esqueleto técnico de un monorepo A (Spring Boot + Next.js) a un proyecto B — layout, manifiestos, lockfiles, Docker y andamiaje JWT — sin copiar ejercicios, datos ni secretos, y cierra con un informe de la migración. Usar al arrancar un repo nuevo que reutiliza el stack de la capacitación (Sistema de Biblioteca), o cuando pidan migrar/copiar la config de un proyecto A a un B.
---

# Migrar proyecto A → proyecto B

Trasladar el **esqueleto técnico** de un monorepo de capacitación (Next.js App
Router + Spring Boot/JPA + Spring Security/JWT + Postgres vía docker-compose)
al proyecto real. No migra features ni dominio: migra cableado (versiones,
carpetas, scripts, config) para que B arranque sin reconstruir eso a mano.

## Cuándo no usarla

Si B ya tiene backend/frontend andando con un stack definido, no aplica —
forzar la migración pisaría decisiones ya tomadas. Confirmar con el TL.

## Invocación

```
/migrar-proyecto <path-a-proyecto-A> <path-a-proyecto-B>
/migrar-proyecto <path-a-proyecto-A> <path-a-proyecto-B> --dry-run
```

Ambos paths son locales. Si falta alguno, preguntar — no asumir el
directorio actual. `--dry-run` muestra el plan (paso 3) y termina: no
copia, no verifica, no emite el informe del paso 8.

## Procedimiento

### 1. Detectar el layout del monorepo en A

Buscar en A (raíz y un nivel de profundidad) `build.gradle`/`build.gradle.kts`,
`package.json` y `docker-compose.yml`/`docker-compose.yaml`. Clasificar cada
carpeta:

| Rol | Señal |
|---|---|
| **backend** | `build.gradle*` + `src/main/java` o `src/main/kotlin` |
| **frontend** | `package.json` con dependencia `next` |
| **root** | lo que no es backend ni frontend: compose, `.gitignore`, README, `settings.gradle*` |

Fijar un **mapa A→B** (ej. `A/backend` → `B/backend`, `A/frontend` → `B/frontend`,
`A/docker-compose.yml` → `B/docker-compose.yml`). Si B ya tiene carpetas con
otros nombres, mapear a esas, no inventar un tercer layout. Si el layout de A
no es 1 backend + 1 frontend, mostrar lo encontrado y preguntar.

Leer versiones **de A**, no las de la capacitación:

- `build.gradle*`: Spring Boot, JVM (`sourceCompatibility` o toolchain), DSL
  Groovy vs Kotlin (independiente del lenguaje de la app).
- Lenguaje de la app: árbol `src/main/java/` vs `src/main/kotlin/`, plugin
  `org.jetbrains.kotlin.jvm`. Migrar tal cual; no traducir Java↔Kotlin.
- `gradle/wrapper/gradle-wrapper.properties`: Gradle.
- `package.json` del frontend: Next.js, React, TypeScript, Tailwind/shadcn.
- Lockfile del frontend: el que exista; no mezclar gestores.
- `docker-compose.yml`: imagen de Postgres.

### 2. Revisar qué existe en B

Listar B. Si hay README, AGENTS.md/CLAUDE.md, `.gitignore`, o el mismo path
que algo a migrar:

- README/AGENTS.md/CLAUDE.md: fusionar, preservar lo de B.
- `.gitignore`: unir entradas, sin duplicar.
- Cualquier otro conflicto de nombre: mostrarlo y preguntar.

Anotar el **nombre de paquete/módulo y de la DB** que debe usar B. No dejar
`com.biblioteca` ni el database `biblioteca` (ni nombres de contenedor/volumen
del ejercicio) salvo que B lo pida explícito.

### 3. Armar el plan y mostrarlo

Dos columnas, un path por fila. Completo cuando cada path de A que el agente
consideró aparece en una columna con motivo en la de descarte:

```
Copiar                          Descartar
A/<be>/build.gradle → B/...     A/<be>/src/.../Book.java — código del ejercicio
```

Motivos de descarte: `cache`, `secretos`, `código del ejercicio`, `fuera de
esqueleto`. `--dry-run` termina acá. Sin aprobación del plan, no escribir.

### 4. Copiar según el plan

Solo paths de la columna Copiar. Preservar ejecución de `gradlew`. No copiar
`.git` de A. No inicializar git en B si ya está inicializado.

**Root:** `docker-compose.yml`, `.dockerignore`, `.gitignore` (unir),
`.env.example` (nunca `.env` real), README (fusionar). `settings.gradle*` y
`gradle.properties` si viven en raíz. Scripts de arranque del root si no
mencionan features del ejercicio.

**Backend (carpeta mapeada):** `build.gradle*` / `settings.gradle*`, wrapper
(`gradlew*`, `gradle/wrapper/`), `Dockerfile`, `.gitignore`. Fuente: solo
`Application.java`/`Application.kt` y el andamiaje JWT (abajo). Config:
`application.properties`/`application.yml` **sin credenciales reales**;
`jwt.expiration` tal cual; `jwt.secret=${JWT_SECRET}`; datasource/DB con el
nombre de B, no el de A.

**Frontend (carpeta mapeada):** `package.json`, lockfile de A, `next.config.*`,
`tsconfig.json`, `tailwind.config.*`, `postcss.config.*`, `components.json`
(shadcn), `.eslintrc*` / `eslint.config.*`, `.gitignore`. Shell Next (abajo).

**Config de ejemplo:** `.env.example` / `.env.local.example`. Si A tenía
`jwt.secret` hardcodeado, en B va `JWT_SECRET=` vacío o `changeme`.

### 5. Cerrar JWT y el shell para que compile

**JWT (infra, no negocio).** Copiar en el lenguaje de A, sin traducir:
`SecurityConfig`/`SecurityFilterChain`, filtro de token (`JwtAuthFilter` o
eq.), `JwtService`, dependencia JWT en `build.gradle*`. No copiar
login/registro ni validaciones de User/Book/Loan.

Cierre de compilación: listar los tipos que esos archivos **importan**. Si el
import es dominio del ejercicio (`Book`, `Loan`, `User` de biblioteca, etc.),
no copiarlo — introducir un stub mínimo (`AuthUser` o eq. con lo que
`UserDetails` necesita: id, username, password, roles) y un
`UserDetailsService`/`PasswordEncoder` de andamiaje. Si no está claro qué
stub basta, preguntar. CORS u otro `@Configuration` solo si Security o el
frontend JWT lo necesitan y no referencia dominio.

**Shell Next.** Debe existir un App Router que buildea: `app/layout.tsx`
mínimo, `app/page.tsx` placeholder, `globals.css` si Tailwind lo requiere.
Cliente HTTP/JWT (`lib/` o eq. que ponga `Authorization` / lea el token de
env) si en A es genérico y no importa páginas del ejercicio. No copiar
páginas, componentes ni tests de catálogo/préstamos/login de capacitación.

Renombrar paquetes/módulos Gradle y nombres de DB/compose al de B (paso 2).

### 6. Verificar (un solo done)

En B, sobre el mapa del paso 1:

1. Backend: `./gradlew build -x test` (wrapper de la carpeta backend).
2. Frontend: instalar con el gestor del lockfile (`npm ci` si hay
   `package-lock.json`). Si `npm ci` falla, reportar — no `npm install`.
   Confirmar que el lockfile no se reescribió. Luego `npm run build`.
3. `docker compose up -d` en el compose migrado: Postgres up; el datasource
   de B apunta a esa base.

Criterio de aceptación: el circuito (backend + base + frontend) **arranca y
compila**. Nada de tests de dominio.

Mostrar `git status`/`git diff` de B y confirmar con el dev (nada de
`node_modules`, `.env`, ejercicios).

### 7. Registrar dudas

Decisiones que pidieron pregunta (layout raro, conflictos de nombre, stubs
JWT, archivos fuera de las listas) van al ticket de Linear, no en silencio.
El informe del paso 8 **apunta** a esos ítems; no reemplaza este registro.

### 8. Informe final

Último paso de una corrida que **escribió** en B (no dry-run). En el chat,
no un archivo nuevo en B salvo que el dev lo pida. Completo cuando las
cuatro secciones existen con el contenido de abajo — no es opcional ni un
resumen libre.

Pegar esta plantilla y llenarla. Si un build falló, **Resultado** es lo
primero que se lee; no reordenar secciones.

```
## Informe de migración A → B

**Resultado**
- backend `./gradlew build -x test`: ok | FAIL — <una línea>
- frontend `npm ci` + `npm run build`: ok | FAIL — <una línea>
- `docker compose up -d`: ok | FAIL — <una línea>

**Qué se migró**
- root: …
- backend (`A/…` → `B/…`): …
- frontend (`A/…` → `B/…`): …
- JWT: …

**Decisiones (regla de la skill, no juicio)**
- …

**A vigilar**
- … | nada que vigilar
```

**Resultado.** Los tres comandos del paso 6, cada uno `ok` o `FAIL` con
el síntoma. No un veredicto en prosa ("quedó bien"). Si alguno falló,
decirlo acá; no enterrarlo en las secciones siguientes.

**Qué se migró.** Una línea por área + el mapa del paso 1. No reimprimir
el plan archivo por archivo del paso 3.

**Decisiones.** Un bullet por cosa que la skill resolvió con regla fija:
paquete/DB renombrados (paso 2), `jwt.secret` → placeholder, exclusiones
(`Book.java` — código del ejercicio), *el hecho* de introducir stub JWT.
Sin narrativa. Tantas líneas como decisiones; no rellenar.

**A vigilar.** Juicio del agente, no regla: forma del stub
(`AuthUser`/`UserDetailsService` — campos, qué le falta vs el `User` de
dominio, reemplazarlo no extenderlo). Dudas del paso 7 que sigan abiertas
(con link/id del ticket si existe). Si no hay nada: una línea `nada que
vigilar`. No inventar riesgos.

## Qué nunca se copia

- `node_modules/`, `.next/`, `build/`, `target/`, `dist/`, `.gradle/`.
- `.env`, `.env.local`, secretos/tokens/credenciales reales, aunque el
  nombre parezca de ejemplo.
- Entidades, controllers, services, páginas y tests del ejercicio
  (User/Book/Loan, login de capacitación, catálogo, préstamos), salvo el
  andamiaje JWT + stubs del paso 5.
- Datos de prueba, fixtures, seeds, volúmenes de Postgres.
- `.git` de A.

Si algo no calza en esqueleto ni en ejercicio, no copiarlo y preguntar.

## Fuera de alcance

Registro, login de producto, lógica de negocio, despliegue (Vercel u otro) y
cambios de arquitectura. Si el dev lo pide durante la migración, derivar al
ticket de la feature.
