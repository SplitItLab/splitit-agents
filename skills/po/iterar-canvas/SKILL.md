---
name: iterar-canvas
owner: "@n-mangini"
role: po
description: Trabaja una historia sobre el canvas ya construido: cruza sus criterios de aceptación contra la pantalla, cierra los huecos iterando con el PO, y deja la issue y el deploy al día. Usar cuando el PO quiere avanzar una historia sobre el prototipo, revisar si una pantalla cumple sus criterios, o iterar el diseño de una pantalla que ya existe.
---

# Iterar una historia sobre el canvas

## Dónde entra

La metodología tiene un orden, y esta skill es el último paso:

1. **Las historias** — se escriben y se publican como issues de GitHub, con sus criterios de
   aceptación. Son la fuente de verdad de **qué tiene que hacer** el producto.
2. **El prototipo** — se construye la app mockeada entera, conversando, contra esas historias.
3. **`to-canvas`** — se corre una vez por proyecto y convierte el prototipo en canvas: la
   grilla de artboards y una dirección estable por historia.
4. **La iteración** — esta skill. Se corre en cada sesión de trabajo, sobre una historia por vez.

Cuando esta skill entra, **las dos puntas ya existen**: los criterios están escritos y la
pantalla está construida. No genera ninguna de las dos. El trabajo es hacerlas converger:
encontrar dónde la pantalla todavía no cumple lo que la historia ya dice, y cerrarlo.

Si aparece algo que ningún criterio cubre, no se resuelve solo — es una decisión del PO.

## Invocación

```
/iterar-canvas               se charla qué se trabaja (lo normal)
/iterar-canvas 6             directo a una historia, si el PO ya sabe cuál
/iterar-canvas 6 --auditar   solo cruza y reporta, no toca nada
```

La forma habitual es sin argumentos. El PO no piensa en números de issue: piensa en épicas y
en pantallas —"los tickets de eventos", "la de crear evento"—. La skill acepta ese lenguaje y
lo resuelve ella.

## Con quién se está hablando

El PO. Le interesan **los criterios y lo que ve en pantalla**. No le interesa qué archivo se
tocó, qué componente se creó ni cómo se resolvió por dentro.

### Cómo se reporta

Lo que pasó, en términos de la pantalla y del criterio que cierra:

> El botón "Crear evento" ya no se puede apretar hasta que escribas el nombre. Si dejás el
> campo vacío y salís de él, el error aparece debajo del campo, no al pie del modal.
> Cierra los criterios #11 y #14.

Nunca así:

> Agregué `disabled={isLoading || isNameMissing}` en `create-event-dialog.tsx:245` y moví el
> error a estado por campo con `aria-invalid`. `tsc` limpio, `/events/new` 200.

**Lo técnico aparece solo cuando el PO no puede decidir sin eso**, y solo la parte que
necesita para decidir:

> No pude cerrar el criterio #13: mostrar la confirmación necesita una pieza que hoy no
> existe en la app, y agregarla toca todas las pantallas, no solo esta. ¿La sumamos?

Si pregunta dónde se tocó algo, ahí sí se le dice. No antes.

### Cómo se decide

- **Se arregla y se avisa** lo que está objetivamente mal: un texto que nombra algo que no
  existe en el producto, algo que contradice un criterio, un error de escritura.
- **Se pregunta** todo lo que tenga más de una respuesta defendible, **de a una por vez**,
  con una recomendación y con la consecuencia de cada opción. El ida y vuelta es el método,
  no una demora.
- Nunca se disfraza de pregunta algo que ya está roto. Si un texto nombra una feature que no
  existe, no hay nada que elegir.

## El ciclo

### 0. Elegir qué se trabaja

Sin argumentos, la skill no pregunta "¿qué número de issue?". Abre el mapa del canvas y
**muestra con qué se puede trabajar**: las historias que tienen pantalla, agrupadas por
épica, con su título. Esa lista es la que le permite al PO elegir.

Desde ahí se conversa. Si dice "los de eventos", son todas las historias de esa épica; si
dice "la de crear evento", es una. Si nombra algo que no tiene pantalla en el canvas, decirlo
en vez de improvisar: esa historia todavía no pasó por el prototipo.

Cuando son varias, preguntar en qué orden conviene, y respetarlo. El PO suele tener un motivo
—una historia de la que dependen las otras, o la que entra al ciclo primero—.

### 1. Leer los criterios

```bash
gh issue view <n> --repo <owner>/<repo> --json title,body -q '.title + "\n" + .body'
```

Los criterios viven en la issue, no en la ficha del repo de documentación. No trabajar de
memoria ni de la ficha.

### 2. Cruzar contra la pantalla

Abrir la pantalla de la historia en el canvas (`/canvas/SPLT-XXX`) y recorrer los criterios
**uno por uno**, verificando contra lo que la pantalla realmente hace, no contra lo que
debería hacer. Un control dibujado que no funciona no cumple el criterio: un buscador que no
filtra es un adorno.

Además de lo que el criterio dice literal, mirar **lo que implica**. Es el hallazgo que se
repite en cada pasada, y casi siempre es un estado que nadie dibujó:

| El criterio dice | Lo que hay que mirar |
|---|---|
| "el campo X es opcional" | cómo se ve la pantalla cuando ese campo viene vacío |
| "puede buscar / filtrar" | qué se ve cuando no hay coincidencias, y cómo se limpia la búsqueda |
| "muestra los N que cumplen tal condición" | si los datos de ejemplo incluyen ese caso |
| "el sistema crea / guarda y confirma" | qué confirma, y dónde queda parado el usuario después |
| "si el dato no es válido, mensaje claro" | dónde aparece el mensaje: junto al campo que falló |
| "queda asociado como dueño / responsable" | en qué pantalla se ve eso, si es que se ve |
| "el usuario sin permiso no puede" | qué pasa si entra igual |

Dos reglas que salen de la experiencia:

- **Un criterio que no se puede ver con los datos de ejemplo actuales no está cumplido.** Si
  la historia dice "muestra los eventos donde el usuario participa" y todos los eventos mock
  son propios, el criterio no se puede demostrar. Agregar ese caso a los datos es parte del
  trabajo.
- **Mirar en 390px de ancho, no solo en desktop.** Ahí aparecen los problemas: botones que no
  entran, áreas táctiles de 16px, controles apilados que quedan raros.

### 3. Reportar el cruce

Cuántos criterios cumple, y de los que no, qué le falta a la pantalla. Agrupar los que se
resuelven juntos: un buscador que no filtra suele tumbar tres o cuatro criterios de una, y
conviene decirlo así en vez de listarlos sueltos.

Separar el hueco real de lo que no se puede demostrar en un prototipo sin backend — sesión,
permisos, persistencia. Eso se nombra y se deja anotado, no se fuerza.

Con `--auditar`, la skill termina acá.

### 4. Iterar

Cerrar los huecos de a uno, preguntando lo opinable y arreglando lo roto. Después de cada
cambio, decir en una línea qué se ve distinto y qué criterio cierra.

El PO va a corregir sobre lo hecho —"eso no se ve bien en mobile", "el botón va al lado del
buscador"—. Eso es el método funcionando: rinde mucho más corregir algo concreto que decidir
en abstracto. No hace falta pedirle que especifique todo de antemano.

### 5. Cerrar

Cuando la historia queda cubierta:

- **La issue** — borrar de la sección `## Diseño` lo que ya quedó resuelto, y dejar el link a
  `/canvas/SPLT-XXX`. No se explican decisiones de diseño ahí ni se agregan notas sobre por
  qué la pantalla es como es: confunde a quien abre la issue buscando qué tiene que construir.
  El porqué va al decision log.
- **El deploy** — el link de la issue apunta al canvas publicado. Si los cambios no están
  desplegados, la issue muestra una pantalla que no los tiene. Verificar que el deploy
  levantó antes de dar la historia por cerrada: puede tardar y servir la versión vieja
  mientras rota.
- **El resumen** — criterios cumplidos, los que quedaron abiertos y por qué, y qué queda
  pendiente para otra sesión.

## Lo que esta skill no hace

- **No compara con Figma.** El canvas es la fuente de verdad del diseño. Cruzar contra un
  Figma es un caso aparte y tiene su propia skill (`revisar-diseno`).
- **No reescribe criterios.** Si uno está mal planteado o es imposible de incumplir —una
  moneda "obligatoria" que ya viene con un valor por defecto— se dice, y lo decide el PO.
- **No muestra avance de desarrollo.** El estado de las tareas vive en Linear y es del PM.
- **No toca las historias que no se pidieron.** Si una pantalla vecina tiene un problema, se
  menciona en una línea al cerrar; no se arregla de paso.
