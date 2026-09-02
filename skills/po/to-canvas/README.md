# Metodología PO — prototipo como especificación visual

> Metodología de trabajo del PO documentada a partir de SplitIt y reutilizable en otros
> productos que trabajen con un backlog visual.

Esta carpeta describe una forma de resolver el problema de **cómo especificar visualmente
un backlog sin depender de que un diseñador dibuje cada pantalla en Figma**, y sin que el
PO cruce la frontera de rol hacia el código.

Nació resolviendo un caso concreto de SplitIt. El contexto está abajo porque sin él la
metodología parece una preferencia de herramienta, y no lo es.

---

## El problema

En SplitIt las historias se escriben antes que el diseño. Cuando el Figma llega después,
aparecen desajustes que **no se ven mirando una sola fuente**: la historia está bien, el
diseño está bien, y el problema recién aparece al cruzarlos.

Cruzamos tres historias contra su Figma. El resultado fue consistente y revelador:

| Historia | Lo que faltaba en el diseño |
|---|---|
| SPLT-003 | Ícono con iniciales, datos cargados, errores de validación, confirmación, mobile roto |
| SPLT-005 | Lista de integrantes agregados, creador precargado, errores, confirmación, selector de íconos |
| SPLT-006 | Estado vacío, mensaje de "sin coincidencias", control para limpiar la búsqueda |

**Casi todo lo encontrado es un estado que el diseño no dibujó.** Ese es el patrón que
importa: un frame de Figma puede omitir un estado sin que se note. Una app corriendo no
puede — si no escribiste el empty state, entrás a la pantalla y ves el hueco.

Y después estaba el problema de cobertura. Al contar las 18 historias:

- **6 con diseño** — SPLT-001, 002, 003, 005, 006, 018
- **12 sin diseño** — SPLT-004 y SPLT-007 a 017

Las 12 sin diseño eran el corazón del producto: registrar gasto, consultar gastos,
modificar, eliminar, saldo por integrante, pagos sugeridos, conversión de moneda. Un dev
que agarrara SPLT-015 no tenía nada que mirar.

Mientras tanto, el mock que el PO había construido con IA para validar el producto ya
tenía todas esas pantallas implementadas.

---

## La idea

**El prototipo navegable reemplaza al Figma como especificación visual del backlog.**

No como fuente de verdad del desarrollo: como el artefacto que un dev abre para ver qué
tiene que construir. Los criterios de aceptación siguen viviendo en la historia.

El obstáculo no es técnico, es de forma. Un prototipo abierto en el navegador se lee como
"una app a medio hacer" y se navega mal (¿qué usuario pongo?, ¿cómo salgo de acá?, ¿esto
es la app de verdad?). Un Figma se lee como especificación porque **está presentado como
un canvas de pantallas etiquetadas**.

La metodología consiste en darle al prototipo esa presentación.

---

## Las tres fases

### Fase 0 — Las historias (el PO, en el repo de documentación)

El PO escribe las historias en la capa de release del repo de documentación (`03-release`
en SplitIt) y las publica como issues de GitHub. Esto ya existía y no cambia. Las historias
son la fuente de verdad de **qué tiene que hacer** el producto.

La ficha en `03-release` lleva el encuadre — épica, sprint, milestone, la historia en
formato Como/Quiero/Para que, las capturas— y **los criterios de aceptación viven en la
issue**. La ficha linkea, no copia. El refinamiento de un criterio pasa en la issue, que
es donde lo lee el equipo.

Lo importante es el orden: **las historias primero**. El prototipo se construye contra
ellas, no al revés. Si el prototipo dicta la historia, se pierde el criterio de negocio y
queda un producto que hace lo que la IA improvisó.

### Fase 1 — El mock (el PO, hablando)

El PO construye una app mockeada con herramientas de IA. **Cero código escrito a mano.**
Se conversa: voice mode o chat, iterando pantalla por pantalla contra las historias.

En SplitIt esto produjo un Next.js con datos en `lib/mock-data.ts`, sin backend, con las
pantallas del producto navegables.

Reglas de la fase:

- **Datos mock, nunca reales.** El prototipo se despliega público; no puede haber nada
  sensible adentro.
- **Sin backend.** Si necesita servidor deja de ser descartable y empieza a ser producto.
- **Todas las rutas accesibles sin login.** El mock no debe tener guardas de auth: cada
  pantalla tiene que renderizar sola, o el canvas no la puede mostrar. En SplitIt esto
  salió por accidente y resultó ser una precondición.
- **Un archivo de intención** (`AGENTS.md` o equivalente) con la paleta, los radios, el
  tono. Es lo que mantiene coherentes las pantallas generadas en sesiones distintas, y
  termina siendo el design system del proyecto.

Si un diseñador quiere ponerse específico, corrige acá: puede medir e inspeccionar con
las DevTools del navegador y pedir los ajustes en la misma conversación.

### Fase 2 — El canvas (la conversión)

Con el mock funcionando, se le agrega una capa de presentación que lo hace legible como
herramienta de diseño. Esto es lo que hace la skill `/to-canvas`
([`SKILL.md`](SKILL.md)) y se ejecuta una sola vez por proyecto.

Produce tres cosas:

```
lib/prototype-map.ts     el mapa: historia -> pantalla -> issue
/canvas                  la grilla de artboards
/canvas/SPLT-XXX         la dirección estable de cada historia
```

**El mapa es lo único que el PO mantiene.** Es una tabla, no código de UI:

```ts
{
  route: '/events',
  title: 'Mis eventos',
  epic: 'Eventos',
  stories: [{ id: 'SPLT-006', title: 'Consultar mis eventos', issue: 6 }],
}
```

### Fase 3 — El consumo

- Cada historia lleva en su sección `## Diseño` el link a `/canvas/SPLT-XXX`.
- El PM toma las historias y las parte en Linear (back, front, tests). Los N tickets
  resultantes pegan **el mismo** link al canvas.
- El dev abre el link, ve la pantalla, y con click derecho → Inspeccionar accede a los
  tokens y estilos reales.

---

## Las cuatro invariantes

Lo que hace que esto sea una metodología y no un truco. Si se rompe alguna, el artefacto
se degrada a "una app que alguien dejó dando vueltas".

### 1. La referencia va en una sola dirección

```
Linear LAB-42  ──┐
Linear LAB-43  ──┼──►  /canvas/SPLT-015  ──►  GitHub issue #15
Linear LAB-44  ──┘
     (del PM)          (del PO)                (del PO)
```

El canvas habla **solo** el lenguaje del backlog de producto: SPLT y GitHub. Nunca
menciona un ID de Linear. Los dos sistemas de identificación no conviven en ninguna
pantalla, así que no hay nada que confundir: hay una jerarquía.

### 2. El canvas no muestra avance de desarrollo

El estado de las tareas vive en Linear, es del PM, y el PO no lo controla. Si el canvas lo
mostrara, el PO estaría manteniendo a mano un dato ajeno que se pudre en dos sprints.

### 3. Los criterios no se duplican

La ficha de la historia linkea a la issue de GitHub; no copia el texto. Un criterio
copiado es un criterio que va a divergir.

Esto vale para el canvas y también para la propia ficha en `03-release`: los criterios
estuvieron duplicados entre el `.md` y la issue hasta que SPLT-001 divergió — el `.md`
decía "reglas mínimas definidas" mientras la issue ya especificaba los 8 caracteres. Se
dejó un único lugar: la issue.

### 4. Desde el canvas no se salta a la app

Todo lo clickeable en la grilla lleva a `/canvas/SPLT-XXX`. La miniatura del artboard es
una imagen viva, no una app usable — lleva una capa encima que captura el click. Dentro de
la ficha la pantalla sí es interactiva, pero queda contenida en el `pathname` de la historia:
se pueden probar sus controles sin perder la referencia visual saltando a otra pantalla.

---

## Por qué esto no rompe la frontera de rol

La objeción esperable es que un PO no toca código. La respuesta no es discutir la
doctrina, es encuadrar bien el artefacto:

**El PO no entrega un repo. Entrega un producto navegable.** El prototipado es trabajo de
discovery, canónicamente del PO. Que la herramienta haya sido Next en vez de Figma es una
decisión de herramienta, no un cruce de rol — nadie acusa a un PO de tocar código cuando
prototipa en Figma, y Figma también produce artefactos ejecutables.

La distinción que lo blinda: **el prototipo no es el incremento.** No se despliega a
producción, no tiene backend, y el equipo de desarrollo no lo extiende — lo reimplementa.
Es descartable por diseño.

Fórmula para un acta: *"prototipo navegable de validación, construido con asistencia de
IA, usado como especificación visual mientras el diseño formal alcanza al backlog."*

Y en la práctica los devs reciben **menos** acceso que antes: no el repo, solo la URL.

---

## La objeción del Dev Mode

Es la única objeción con filo: *"nosotros usamos el Dev Mode de Figma para sacar layouts y
estilos"*. Se da vuelta sola, porque **Dev Mode existe para adivinar código a partir de un
dibujo**, y acá el dibujo no existe: existe la implementación.

| Dev Mode da | El prototipo da |
|---|---|
| `#21B894` como color de un rectángulo | `--primary: #21b894`, token con nombre, ya cableado |
| `border-radius: 20px` | `--radius: 1.25rem` y el componente que lo consume |
| El ícono exportado como SVG | Un paquete de npm que ya tienen instalado |
| CSS generado, absoluto y sin responsive | El componente responsive real |

Verificado en SplitIt: el build de producción **conserva los nombres de las variables CSS**.
Un dev abre el deploy, inspecciona un elemento, y ve `--primary`, `--secondary`, `--radius`
tal cual. No necesita el repo.

Efecto lateral que vale la pena: acostumbra a los devs a las DevTools, que van a usar toda
su carrera, en lugar de a una herramienta que depende de que alguien pague la licencia.

---

## Lo que esta metodología no resuelve

- **El prototipo tiene una sola versión de cada pantalla**, igual que el Figma. Los estados
  de error y validación siguen faltando si nadie los pide. La diferencia es que agregarlos
  cuesta una conversación, no una sesión de diseño.
- **El "vistazo" se pierde.** Con Figma se abría la issue y se veía algo; con un link hay
  que salir a otra pestaña. Lo compensa que lo que se abre está vivo, pero no es gratis.
- **DevTools da el CSS computado, no la intención.** Por qué un saldo va en violeta y no en
  verde sigue estando en los criterios de la historia.
- **El canvas solo muestra lo que existe.** Si se recorta a las pantallas construidas,
  pierde la propiedad de radiador y las historias sin pantalla vuelven a ser invisibles —
  exactamente el problema que tenía el Figma. Para conservarla hay que listar en el mapa
  las historias sin ruta, en gris.
- **Un deploy es público** para cualquiera con el link. Con datos mock no hay riesgo real,
  pero hay que saberlo antes de repartir la URL.

---
