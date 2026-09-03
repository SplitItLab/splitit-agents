"use client";

import { ArrowLeft, Clock3, Download, FileText, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  buildTicketReport,
  buildTicketsCsv,
  type TimeEntryCatalog,
} from "@/lib/time-entry-report";

export function TimeReport({ catalog }: { readonly catalog: TimeEntryCatalog }) {
  const tickets = buildTicketReport(catalog.tickets);
  const pending = tickets.filter((ticket) => ticket.hours === null);
  const withNotes = tickets.filter((ticket) => ticket.notes);
  const totalEstimate = tickets.reduce((total, ticket) => total + (ticket.estimate ?? 0), 0);
  const totalEarned = tickets.reduce((total, ticket) => total + ticket.earned, 0);
  const totalHours = tickets.reduce((total, ticket) => total + (ticket.hours ?? 0), 0);

  const downloadCsv = () => {
    const blob = new Blob([buildTicketsCsv(tickets)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `horas-reales-splitit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              href="/"
            >
              <ArrowLeft className="size-3.5" />
              Sala de control
            </Link>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                <Clock3 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.025em]">Horas reales</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Valor ganado contra costo real, ticket por ticket.
                </p>
              </div>
            </div>
          </div>
          <Button disabled={tickets.length === 0} onClick={downloadCsv} type="button">
            <Download /> Exportar CSV
          </Button>
        </header>

        <section
          aria-label="Origen de los datos"
          className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">
            Fuente: <code className="font-mono text-xs text-foreground">time-entries/*.md</code>.
            Un archivo por ticket: completá <code className="font-mono text-xs text-foreground">hours</code> y
            las dificultades, y hacé commit.
          </p>
          <span className="sm:ml-auto whitespace-nowrap text-xs text-muted-foreground">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </section>

        {catalog.issues.length > 0 ? (
          <section aria-labelledby="errores-carga" className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <div className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-warning-foreground" aria-hidden="true" />
              <h2 className="text-sm font-medium" id="errores-carga">
                {catalog.issues.length} {catalog.issues.length === 1 ? "archivo necesita" : "archivos necesitan"} revisión
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {catalog.issues.map((issue) => (
                <li key={`${issue.sourceFile}:${issue.message}`}>
                  <code className="font-mono text-foreground">{issue.sourceFile}</code>
                  {" — "}{issue.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card sm:grid-cols-5 sm:divide-x">
          <Metric hint="Suma de estimados" label="Planificado" value={totalEstimate > 0 ? formatHours(totalEstimate) : "—"} />
          <Metric hint="Estimado × avance" label="Ganado" value={totalEstimate > 0 ? formatHours(totalEarned) : "—"} />
          <Metric hint="Horas reportadas" label="Real" value={totalHours > 0 ? formatHours(totalHours) : "—"} />
          <Metric
            hint="Ganado − real"
            label="CV"
            value={totalHours === 0 ? "—" : formatVariance(totalEarned - totalHours)}
          />
          <Metric hint="Tickets sin horas" label="Sin cargar" value={`${pending.length} de ${tickets.length}`} />
        </dl>

        {tickets.length === 0 ? (
          <section className="rounded-lg border border-dashed bg-card px-6 py-14 text-center">
            <h2 className="text-sm font-medium">Todavía no hay tickets</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Copiá time-entries/_template.md, renombralo con el ID del ticket y completá el frontmatter.
            </p>
          </section>
        ) : (
          <section aria-labelledby="estado-carga" className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold" id="estado-carga">Detalle por ticket</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Un punto de Linear equivale a una hora, así que el estimado hace de peso de valor.
                El desvío compara solo los tickets que ya tienen horas; los que faltan van primero.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="border-b bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Ticket</th>
                    <th className="px-4 py-2.5 font-medium">Épica</th>
                    <th className="px-4 py-2.5 font-medium">Título</th>
                    <th className="px-4 py-2.5 font-medium">Asignado</th>
                    <th className="px-4 py-2.5 text-right font-medium">Avance</th>
                    <th className="px-4 py-2.5 text-right font-medium">Estimado</th>
                    <th className="px-4 py-2.5 text-right font-medium">Real</th>
                    <th className="px-4 py-2.5 text-right font-medium">Desvío</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tickets.map((ticket) => (
                    <tr className={ticket.hours === null ? "bg-warning/5" : undefined} key={ticket.ticket}>
                      <td className="px-4 py-3 font-mono text-xs font-medium">{ticket.ticket}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ticket.epic || "—"}</td>
                      <td className="px-4 py-3">{ticket.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ticket.assignee || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {ticket.progress}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {ticket.estimate === null ? "—" : formatHours(ticket.estimate)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        {ticket.hours === null ? (
                          <span className="whitespace-nowrap rounded-md bg-warning/15 px-2 py-1 text-xs font-medium text-warning-foreground">
                            Sin cargar
                          </span>
                        ) : formatHours(ticket.hours)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        {ticket.variance === null ? "—" : formatVariance(ticket.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {withNotes.length > 0 ? (
          <section aria-labelledby="notas" className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold" id="notas">Notas por ticket</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Dificultades, contexto y todo lo que haya contado el developer. Es la parte
                del registro que no se puede reconstruir después.
              </p>
            </div>
            <ul className="space-y-3">
              {withNotes.map((ticket) => (
                <li className="rounded-lg border bg-card p-4" key={ticket.ticket}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-xs font-medium">{ticket.ticket}</span>
                    <span className="text-sm">{ticket.title}</span>
                    {ticket.variance === null ? null : (
                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                        {formatHours(ticket.estimate ?? 0)} estimadas → {formatHours(ticket.hours ?? 0)} reales
                        {" "}({formatVariance(ticket.variance)})
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-[70ch] whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {ticket.notes}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Metric(
  { hint, label, value }: {
    readonly hint: string;
    readonly label: string;
    readonly value: string;
  },
) {
  return (
    <div className="border-b p-4 last:border-b-0 sm:border-b-0">
      <dt className="text-xs text-muted-foreground" title={hint}>{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</dd>
      <p className="mt-0.5 text-[0.6875rem] leading-tight text-muted-foreground">{hint}</p>
    </div>
  );
}

function formatVariance(hours: number): string {
  if (hours === 0) return "0";
  return `${hours > 0 ? "+" : "−"}${formatHours(Math.abs(hours))}`;
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(hours);
}

