import assert from "node:assert/strict";
import test from "node:test";
import { buildTicketReport, buildTicketsCsv } from "../lib/time-entry-report.ts";
import { parseTicketFile } from "../lib/time-entries.ts";

const CARGADO = `---
ticket: spt-31
title: Login, sesión y protección de rutas
epic: Autenticación
assignee: Mateo
estimate: 3
hours: 7,5
progress:
status: Done
planned: 2026-08-18
completed: 2026-08-27
---

# SPT-31 — Login, sesión y protección de rutas

## Notas

<!-- ayuda del template -->

El refresh token no estaba en la historia.
Hubo que rehacer el middleware dos veces.
`;

const SIN_CARGAR = `---
ticket: SPT-44
title: Ver y editar mi cuenta
epic: Perfil de usuario
assignee: Felicitas Ocampo
estimate: 5
hours:
progress:
status: In Progress
planned:
completed:
---

## Notas
`;

test("lee un ticket cargado, normalizando el id y el decimal con coma", () => {
  const { tickets, issues } = parseTicketFile(CARGADO, "time-entries/SPT-31.md");

  assert.deepEqual(issues, []);
  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].ticket, "SPT-31");
  assert.equal(tickets[0].assignee, "Mateo");
  assert.equal(tickets[0].epic, "Autenticación");
  assert.equal(tickets[0].estimate, 3);
  assert.equal(tickets[0].hours, 7.5);
  assert.equal(tickets[0].planned, "2026-08-18");
});

test("lee las notas como texto libre y descarta el comentario del template", () => {
  const { tickets } = parseTicketFile(CARGADO, "time-entries/SPT-31.md");

  assert.equal(
    tickets[0].notes,
    "El refresh token no estaba en la historia.\nHubo que rehacer el middleware dos veces.",
  );
});

test("un ticket sin horas no es un error", () => {
  const { tickets, issues } = parseTicketFile(SIN_CARGAR, "time-entries/SPT-44.md");

  assert.deepEqual(issues, []);
  assert.equal(tickets[0].hours, null);
  assert.equal(tickets[0].notes, "");
});

test("avisa cuando las horas están cargadas con un valor inválido", () => {
  const source = SIN_CARGAR.replace("hours:", "hours: ocho");
  const { tickets, issues } = parseTicketFile(source, "time-entries/SPT-44.md");

  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /`hours` tiene que ser un número mayor que 0/);
  assert.equal(tickets[0].hours, null);
});

test("compara estimado contra real tratando un punto como una hora", () => {
  const { tickets } = parseTicketFile(CARGADO, "time-entries/SPT-31.md");
  const [report] = buildTicketReport(tickets);

  assert.equal(report.variance, 4.5);
});

test("un ticket terminado gana todo su estimado sin declarar progress", () => {
  const { tickets } = parseTicketFile(CARGADO, "time-entries/SPT-31.md");
  const [report] = buildTicketReport(tickets);

  assert.equal(report.progress, 100);
  assert.equal(report.earned, 3);
});

test("un ticket en curso no gana valor hasta que se declare el avance", () => {
  const abierto = parseTicketFile(SIN_CARGAR, "time-entries/SPT-44.md");
  const [sinAvance] = buildTicketReport(abierto.tickets);
  assert.equal(sinAvance.progress, 0);
  assert.equal(sinAvance.earned, 0);

  const conAvance = parseTicketFile(
    SIN_CARGAR.replace("progress:", "progress: 40"),
    "time-entries/SPT-44.md",
  );
  const [report] = buildTicketReport(conAvance.tickets);
  assert.equal(report.earned, 2);
});

test("avisa cuando el avance está fuera de rango", () => {
  const { issues } = parseTicketFile(
    SIN_CARGAR.replace("progress:", "progress: 140"),
    "time-entries/SPT-44.md",
  );

  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /entre 0 y 100/);
});

test("los tickets sin horas quedan primero y no calculan desvío", () => {
  const cargado = parseTicketFile(CARGADO, "time-entries/SPT-31.md");
  const vacio = parseTicketFile(SIN_CARGAR, "time-entries/SPT-44.md");
  const report = buildTicketReport([...cargado.tickets, ...vacio.tickets]);

  assert.deepEqual(
    report.map(({ ticket, variance }) => ({ ticket, variance })),
    [
      { ticket: "SPT-44", variance: null },
      { ticket: "SPT-31", variance: 4.5 },
    ],
  );
});

test("genera un CSV para Excel con decimal español y las notas en una línea", () => {
  const { tickets } = parseTicketFile(CARGADO, "time-entries/SPT-31.md");
  const csv = buildTicketsCsv(buildTicketReport(tickets));

  assert.ok(csv.startsWith("﻿sep=;\r\n"));
  assert.match(csv, /Ticket;Épica;Título;Asignado;Horas estimadas;Horas reales;Desvío;Avance %;Ganado/);
  assert.match(csv, /SPT-31;Autenticación;Login, sesión y protección de rutas;Mateo;3;7,5;4,5;100;3;Done;2026-08-18;2026-08-27/);
  assert.match(csv, /El refresh token no estaba en la historia\. Hubo que rehacer/);
});

test("ignora comentarios y líneas en blanco del frontmatter agrupado", () => {
  const source = `---
# Espejo de Linear — no editar a mano
ticket: SPT-33
title: Deploy en Vercel
estimate: 2

# Del formulario — lo reporta el developer
hours: 3
progress: 60
---

## Notas
`;
  const { tickets, issues } = parseTicketFile(source, "time-entries/SPT-33.md");

  assert.deepEqual(issues, []);
  assert.equal(tickets[0].title, "Deploy en Vercel");
  assert.equal(tickets[0].hours, 3);
  assert.equal(tickets[0].progress, 60);
});
