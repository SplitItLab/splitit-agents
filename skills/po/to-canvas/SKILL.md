---
name: to-canvas
owner: "@n-mangini"
role: po
created: 2026-08-27
description: Convierte una app mockeada (prototipo navegable generado con IA) en un canvas de pantallas legible como herramienta de diseño, con una dirección estable por historia. Usar cuando un PO tiene un prototipo funcionando y necesita que sirva de especificación visual del backlog, en lugar de un Figma.
---

# Mock → canvas

Toma un prototipo navegable y le agrega una capa de presentación que lo hace legible como
herramienta de diseño: una grilla de artboards y una dirección estable por historia.

Al terminar, la raíz del deploy (`/`) abre el canvas mediante una redirección a `/canvas`.
El login y las demás pantallas del mock siguen disponibles por sus rutas directas, pero ya
no son la puerta de entrada al artefacto.

**No modifica el diseño ni el comportamiento de las pantallas del prototipo.** Agrega las
rutas del canvas, cambia deliberadamente la entrada `/` para que abra `/canvas` y, si hace
falta, hace direccionables por URL estados que hoy son estado local.

Nació de un caso concreto: un backlog cuyas historias se escribieron antes que el diseño,
con el Figma cubriendo solo una fracción de las pantallas. Al cruzar historias contra sus
frames, lo que faltaba eran sobre todo estados que un diseño estático omite sin que se note
—datos cargados, validaciones, confirmaciones, estados vacíos, mobile— pero que la
aplicación igual tiene que resolver. Un prototipo navegable ya los contiene; lo que le
falta para servir de especificación es poder leerse como un tablero y tener una dirección
estable por historia. Eso es lo que agrega esta skill.

## Cuándo aplica

- Existe un prototipo navegable, con datos mock y sin backend.
- Existe un backlog con IDs propios (`SPLT-001`) y sus issues.
- Se quiere que un dev externo pueda ver cada historia sin acceso al repo.

Si el prototipo tiene guardas de autenticación, resolver eso primero: cada ruta tiene que
renderizar sola. Es precondición, no un detalle.

## Portabilidad

Esta skill está escrita para un proyecto Next.js con App Router, porque es donde se
implementó primero. La estructura se traslada a cualquier framework con ruteo por archivos:
lo que importa son el mapa, las dos vistas y las cuatro invariantes, no el framework.

Para usarla con un agente que no soporte skills, pegar este archivo como `prompt.md` y
pasarlo junto con el repo del prototipo.

---

## Procedimiento

### 1. Relevar las rutas reales

No inventar rutas ni suponerlas por el nombre de las historias. Listar lo que existe:

```bash
find app -name "page.tsx" | sed 's|/page.tsx||'
```

Verificar además que ninguna redirija por autenticación:

```bash
grep -rn "redirect\|router.push\|isAuthenticated" app components | grep -i auth
```

### 2. Detectar los estados atrapados en estado local

Un estado que solo se alcanza haciendo click **no se puede linkear**, y por lo tanto no
puede ser el destino de una historia. Buscar tabs, modales y vistas alternativas:

```bash
grep -rn "useState.*[Tt]ab\|activeTab\|isOpen" components
```

Para cada uno que corresponda a una historia distinta, hacerlo direccionable por query
param, de forma **aditiva**: prop opcional con default igual al comportamiento actual, y la
página leyendo `searchParams`. Sin el parámetro, la pantalla se comporta exactamente como
antes.

Validar siempre el parámetro contra una lista blanca; un valor inválido cae en el default,
no rompe.

### 3. Escribir el mapa

`lib/prototype-map.ts` es la única fuente de verdad y lo único que el PO mantiene después.

```ts
export const ISSUES_BASE = 'https://github.com/<org>/<repo>/issues'

export type Story = { id: string; title: string; issue: number }
export type Screen = {
  route: string
  title: string
  epic: string
  stories: Story[]
  /** Fuera del canvas por ahora: la pantalla existe pero no se muestra. */
  hidden?: boolean
}

export const screens: Screen[] = [ /* ... */ ]
```

Reglas al armarlo:

- **Una pantalla puede cubrir varias historias.** Es lo normal: un detalle de evento sirve
  a "ver detalle", "registrar gasto" y "modificar gasto". No inventar pantallas para que la
  relación sea uno a uno.
- **Una historia puede aparecer en varias pantallas** (el estado lleno y el vacío). La
  primera en la lista es su dirección; las demás son estados seleccionables.
- **`epic` agrupa la grilla.** Usar las épicas del backlog, no categorías inventadas.
- **`route` es configuración interna.** Sirve para cargar el iframe, pero no se muestra en
  la interfaz del canvas.
- **Esconder es un flag, no un borrado.** Cuando una épica todavía no se muestra —el diseño
  no cerró, la conversación con el equipo va por otro lado— marcar sus pantallas con
  `hidden: true` en vez de sacarlas del mapa. Borrarlas pierde las historias, los issues y
  el trabajo de mapeo; el flag se revierte en un segundo.

Helpers a exponer: `visibleScreens`, `screensOfEpic`, `screensOfStory`, `findStory`,
`allStories`, `issueUrl`, y `canvasHref(screen)` — que devuelve la dirección **dentro del
canvas** de una pantalla, con `?estado=N` cuando no es la primera de su historia.

`visibleScreens` es `screens` sin las escondidas, y es de donde tienen que derivar la
grilla, las épicas, el conteo de la cabecera y `allStories` —si no, queda una épica vacía
con su título, o un contador que promete pantallas que no están. `screensOfStory` y
`findStory` siguen mirando el mapa completo, para no romper una dirección ya repartida.
Esconder una pantalla saca del aire las direcciones de las historias que solo vivían ahí:
si esas URLs ya circularon en tickets, avisarlo.

### 4. La grilla — `/canvas`

Artboards en iframes en vivo, agrupados por épica. **Nunca capturas**: una imagen se
desactualiza en silencio y es exactamente lo que esta metodología viene a evitar.

- Fondo oscuro, artboards con marco y sombra. Tiene que leerse como herramienta de diseño
  al primer vistazo.
- Cabecera fija con badge `PROTOTIPO`, el conteo de pantallas e historias, y la leyenda
  "datos de ejemplo, no es la app en producción".
- Toggle de viewport (mobile / desktop) y control de zoom.
- `loading="lazy"` en los iframes. Con más de ~15 artboards, cargar solo los visibles.
- Cada artboard muestra solo el título, las chapitas de sus historias y la pantalla viva.
  No renderizar paths técnicos ni notas editoriales debajo de la miniatura.

**Invariante 4:** todo lo clickeable lleva a `/canvas/SPLT-XXX`, nunca a la ruta cruda. La
miniatura va envuelta en el link, con `tabIndex={-1}` en el iframe y una capa transparente
por encima que capture el click. Sin eso se puede tipear dentro de un artboard al 40%, que
delata que es una app y no un tablero.

Verificarlo auditando los links, no a ojo:

```bash
curl -s http://localhost:3000/canvas | grep -o 'href="[^"]*"' | sort -u
```

No debe aparecer ninguna ruta de la app.

#### La raíz del deploy abre el canvas

Después de aplicar la skill, `/` deja de ser la entrada al login o al flujo normal del
mock: tiene que redirigir a `/canvas`. El artefacto se presenta primero como especificación
visual; las pantallas del prototipo se abren desde el canvas o por sus rutas directas.

En Next.js con App Router:

```tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/canvas')
}
```

Si el prototipo usaba `/` como una pantalla real (por ejemplo, una landing), moverla o
darle un alias estable como `/inicio` antes de cambiar la raíz, y actualizar el mapa. No
dejar una pantalla del mapa con `route: '/'`: su iframe cargaría el canvas y produciría
una recursión visual.

#### El preview del enlace dice qué es esto

El canvas se comparte pegando el link en Slack, WhatsApp o un ticket, así que el preview es
lo primero que el equipo lee. Un prototipo generado con IA arrastra la metadata que dejó el
generador —marketing del producto, un `generator: 'v0.app'`— y el enlace termina
presentándose como si fuera la app en producción: exactamente lo que la leyenda de la
cabecera trata de evitar, desmentido antes de que nadie abra la página.

Alinear el título y la descripción del layout raíz con lo que el artefacto es, y declarar
`openGraph` y `twitter` con la misma copy: sin eso, cada plataforma improvisa a partir del
`<title>` y lo recorta a su gusto.

```tsx
const title = 'SplitIt · prototipo'
const description =
  'Canvas de pantallas del prototipo. Datos de ejemplo, no es la app en produccion.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary', title, description },
}
```

Es la misma leyenda de la cabecera del canvas, dicha antes de entrar.

### 5. La ficha — `/canvas/[story]`

La dirección estable de cada historia. Es la URL que el PM pega en sus tickets, así que
tiene que sobrevivir a que la historia se parta en varios.

- Cabecera: `← Canvas`, badge `PROTOTIPO`, el ID y título de la historia, el nombre legible
  de la pantalla y un botón **"Criterios de aceptación · issue #N ↗"** hacia GitHub.
- Si la historia tiene varias pantallas, un selector de estado arriba del marco, navegando
  por `?estado=N`.
- La pantalla en un iframe grande. Es interactiva, pero queda contenida en el `pathname`
  representado: puede cambiar estado local o query params sin saltar a otra pantalla.
- Un ID inexistente devuelve 404, no una ficha rota.
- `generateStaticParams` con todas las historias, y `generateMetadata` con el título
  `SPLT-XXX · Título · prototipo <Producto>` — es lo que se ve en el preview del link
  cuando lo pegan en Linear o Slack.

**Invariante 3:** la ficha linkea los criterios, no los copia.

#### Bloquear navegación sin bloquear interacción

La restricción vive en un wrapper del iframe de la ficha, no en las pantallas del mock.
Abrir la ruta directamente fuera del canvas conserva su navegación normal.

El wrapper debe:

- comparar origen y `pathname` normalizado con la ruta del mapa; permitir cambios de query
  y hash porque representan estados de la misma pantalla;
- usar un `sandbox` que permita scripts, formularios, modales y mismo origen, pero no
  navegación de la ventana superior ni popups;
- capturar clicks en links y submits, bloqueando destinos con otro origen o `pathname` y
  cualquier `target` distinto de `_self`;
- escuchar el evento `navigate` de la Navigation API para cancelar también navegación
  programática como `router.push`;
- monitorear la URL del iframe como respaldo y restaurar la ruta original si una navegación
  no cancelable o un navegador sin Navigation API logra cambiarla;
- retirar listeners e intervalos al cambiar de pantalla o desmontar el wrapper.

No alcanza con `sandbox`: sin el guard, un link todavía puede navegar dentro del propio
iframe. Tampoco usar una capa transparente como en las miniaturas, porque bloquearía inputs,
botones, modales y demás interacción que la ficha sí debe permitir.

### 6. Verificar

Con el server levantado:

```bash
npx tsc --noEmit
curl -s http://localhost:3000/canvas | grep -o '<title>[^<]*\|og:description[^>]*'  # no debe hablar del producto en produccion
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/canvas
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/canvas/SPLT-001
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/canvas/SPLT-999   # 404
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/ # 307 -> /canvas
```

Además, probar la ficha en un navegador real:

- una interacción local cambia estado sin modificar el `pathname`;
- un link a otra pantalla no cambia la URL del iframe y conserva el estado local;
- una navegación programática (`router.push` o equivalente) tampoco cambia el `pathname`.

Y confirmar que los tokens sobreviven al build de producción, que es lo que sostiene el
argumento contra Dev Mode:

```bash
pnpm build
grep -oh -- "--primary:[^;]*\|--radius:[^;]*" .next/static/chunks/*.css | sort -u
```

Si los nombres de las variables no aparecen, el CSS se está compilando a valores literales
y hay que revisar la configuración antes de prometer que se pueden inspeccionar.

---

## Qué no hacer

- **No mostrar avance de desarrollo en el canvas.** Vive en la herramienta del PM. Un campo
  de estado mantenido a mano por el PO se pudre en dos sprints y además invade un rol ajeno.
- **No mezclar IDs de dos backlogs.** El canvas habla solo el del producto.
- **No copiar los criterios de aceptación.** Link, siempre.
- **No usar capturas.** Ni como fallback.
- **No mostrar rutas ni comentarios editoriales.** Paths como `/login` o `/events/:id` y
  notas sobre dónde vive una acción son configuración del prototipo, no contenido visual
  para el dev que consume el canvas.
- **No hacer navegable el iframe de la ficha entre pantallas.** Tiene que ser interactivo,
  pero permanecer en el `pathname` asociado a la historia.
- **No dejar una pantalla del prototipo en `/`.** La raíz pertenece al canvas después de la
  conversión; una pantalla mapeada allí terminaría mostrando el canvas dentro de sí mismo.
- **No hardcodear el mapa dentro de la página del canvas.** Si vive ahí no es un patrón, es
  una página: el mapa tiene que poder alimentar la grilla, la ficha y la generación de las
  secciones `## Diseño` de las issues.
- **No tocar el diseño de las pantallas.** Esta conversión es de presentación. Si aparecen
  huecos (estados de error faltantes, mobile roto), se reportan al PO — no se resuelven
  acá.

## Después de la conversión

Con el mapa disponible, generar la sección `## Diseño` de cada issue:

```markdown
## Diseño

- Prototipo: https://<deploy>/canvas/SPLT-006
- Recorrido: Eventos → abrir "Viaje a Bariloche"
```

La línea de **recorrido** reemplaza lo que daba la captura: dónde entrar y cómo llegar. Dos
renglones que no se desactualizan como una imagen.
