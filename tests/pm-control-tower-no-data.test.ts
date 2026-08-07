import { test } from "node:test";
import assert from "node:assert/strict";
import { insufficientDataReport } from "../lib/insufficient-data.ts";

test("PM Control Tower responde cuando no hay datos suficientes (sin inventar datos)", () => {
  const report = insufficientDataReport("Linear aún no autorizada");

  assert.equal(report.estado, "datos-insuficientes");
  assert.equal(report.avance, "amarillo");
  assert.match(report.resumenEjecutivo, /No hay datos suficientes/);
  assert.match(report.resumenEjecutivo, /no se generó información inventada/i);

  assert.deepEqual(report.tareasCompletadas, []);
  assert.deepEqual(report.tareasEnCurso, []);
  assert.deepEqual(report.tareasAtrasadas, []);
  assert.deepEqual(report.pullRequestsPendientes, []);
  assert.deepEqual(report.bloqueos, []);
  assert.deepEqual(report.riesgos, []);

  assert.ok(report.proximasAcciones.length >= 1);
  assert.ok(report.decisiones.length >= 1);
});
