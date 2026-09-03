# Horas reales

Fuente versionada de lo que Linear no guarda: el tiempo real que llevó cada
ticket y lo que pasó mientras se hacía. La sección `/horas` de PM Tools lee estos
Markdown durante el build; no hay backoffice ni base de datos.

Un archivo por ticket, un número por archivo.

## Quién completa qué

Cada campo tiene un dueño único. El frontmatter está agrupado en tres bloques que
lo dejan explícito, y esa es la razón de que exista este archivo: nadie tiene que
adivinar de dónde sale un dato.

| Bloque | Dueño | Campos |
|---|---|---|
| Espejo de Linear | se copia, no se edita | `ticket`, `title`, `assignee`, `estimate`, `status`, `completed` |
| Planificación | el PO | `epic`, `planned` |
| Formulario | el developer | `hours`, `progress`, y la sección `## Notas` |

`estimate` se copia del estimate de Linear tal cual: un punto se lee como una
hora. Hace de peso de valor, así que no hace falta repartir porcentajes por épica
a mano. Es línea base congelada: una vez escrito no se toca, aunque en Linear se
reestime después.

`planned` es la semana para la que estaba previsto el ticket. **Es el único dato
que no se recupera más tarde**: sin él no hay valor planificado, y sin valor
planificado no hay SPI ni SV.

## El formulario

Se completa **una vez por ticket, cuando el ticket cierra**. La cadencia semanal
es "estos cerraste esta semana, cargalos", no "contame tu semana". Un ticket que
cruza tres semanas se reporta una sola vez, con su total.

Cada pregunta corresponde a exactamente un campo:

| Pregunta del formulario | Tipo | Campo |
|---|---|---|
| ¿Qué ticket? | texto corto, validado con `^SPT-\d+$` | nombre del archivo |
| ¿Cuántas horas te llevó en total? | número, acepta decimales | `hours` |
| ¿Quedó terminado? | sí / no | `progress` = 100 si sí |
| Si no, ¿qué porcentaje dirías que quedó hecho? | número 0-100 | `progress` |
| ¿Qué se complicó o no estaba en el ticket? | párrafo | `## Notas` |
| Si lo rehicieras hoy, ¿cuánto te llevaría? | texto corto | `## Notas` |
| ¿Trabajaste algo sin ticket? | párrafo, opcional | ver abajo |

Las dos preguntas de texto van juntas a `## Notas` porque son la misma cosa —
por qué el número es el que es— y separarlas en campos obligaría a estructurar
algo que conviene dejar en las palabras del developer.

El trabajo sin ticket (reuniones, investigación que no se usó, ayudar a otro) no
tiene archivo propio. Se registra en un `EXTRA-1.md` con `estimate` vacío: suma
costo real sin sumar valor ganado, que es exactamente lo que es.

## Cargar un ticket

1. Copiar `_template.md` como `SPT-XXX.md`.
2. Completar los bloques de Linear y de planificación.
3. Cuando llegue la respuesta del formulario, escribir `hours`, `progress` si
   corresponde, y pegar las notas.
4. Commit y push. El próximo deploy actualiza la sección.

`hours` acepta `2.5` y `2,5`. Vacío no es error: la app muestra el ticket como
*Sin cargar*. `progress` se puede dejar vacío — un ticket en `Done` cuenta 100 y
el resto 0; solo se completa a mano cuando hay algo entregado a medias.

```md
---
# Espejo de Linear — no editar a mano
ticket: SPT-29
title: Login y acceso privado
assignee: Felicitas Ocampo
estimate: 3
status: Done
completed: 2026-08-31

# De la planificación — lo completa el PO
epic: Autenticación
planned: 2026-08-18

# Del formulario — lo reporta el developer
hours: 7,5
progress:
---

# SPT-29 — Login y acceso privado

## Notas

Lo estimamos como si fuera solo la pantalla, pero el guard de rutas no estaba
en la historia.

Rehacerlo hoy: unas 4 horas.
```

El encabezado de la sección también puede decir `## Dificultades` u
`## Observaciones`. El comentario de ayuda del template se descarta al leerlo.

## Exportar a Excel

La página baja todos los tickets como CSV compatible con Excel en configuración
regional española (`;` como separador y `,` decimal), con épica, estimado, real,
desvío, avance, ganado, fechas y notas en una línea por ticket. Es la entrada
directa para armar el EVM.
