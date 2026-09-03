export type TicketRecord = {
  readonly ticket: string;
  readonly title: string;
  /** Agrupa el valor. Linear no lo tiene: las issues de SPT tienen `project` vacío. */
  readonly epic: string;
  readonly assignee: string;
  /** Horas estimadas. Un punto de Linear se lee como una hora. */
  readonly estimate: number | null;
  /** Horas reales. `null` mientras nadie las haya reportado. */
  readonly hours: number | null;
  /** Porcentaje completado, 0 a 100. Es lo que convierte el estimado en ganado. */
  readonly progress: number;
  readonly status: string;
  /** Semana para la que estaba planificado. Sin esto no hay valor planificado. */
  readonly planned: string;
  /** Semana real de entrega: donde se imputa el valor ganado. */
  readonly completed: string;
  readonly notes: string;
  readonly sourceFile: string;
};

export type TicketReport = TicketRecord & {
  /** Horas reales menos estimadas. `null` si falta alguno de los dos. */
  readonly variance: number | null;
  /** Valor ganado en horas: estimado por el porcentaje completado. */
  readonly earned: number;
};

export type TimeEntryIssue = {
  readonly sourceFile: string;
  readonly message: string;
};

export type TimeEntryCatalog = {
  readonly tickets: readonly TicketRecord[];
  readonly issues: readonly TimeEntryIssue[];
};

export function buildTicketReport(tickets: readonly TicketRecord[]): TicketReport[] {
  return tickets
    .map((ticket) => ({
      ...ticket,
      variance: ticket.hours === null || ticket.estimate === null
        ? null
        : ticket.hours - ticket.estimate,
      earned: (ticket.estimate ?? 0) * ticket.progress / 100,
    }))
    .sort(
      // Los que todavía no tienen horas van primero: son los que hay que salir a buscar.
      (a, b) => Number(a.hours !== null) - Number(b.hours !== null)
        || a.ticket.localeCompare(b.ticket, "es", { numeric: true }),
    );
}

export function buildTicketsCsv(tickets: readonly TicketReport[]): string {
  const header = [
    "Ticket",
    "Épica",
    "Título",
    "Asignado",
    "Horas estimadas",
    "Horas reales",
    "Desvío",
    "Avance %",
    "Ganado",
    "Estado",
    "Planificado",
    "Completado",
    "Notas",
    "Archivo fuente",
  ];

  const rows = tickets.map((ticket) => [
    ticket.ticket,
    ticket.epic,
    ticket.title,
    ticket.assignee,
    formatDecimal(ticket.estimate),
    formatDecimal(ticket.hours),
    formatDecimal(ticket.variance),
    formatDecimal(ticket.progress),
    formatDecimal(ticket.earned),
    ticket.status,
    ticket.planned,
    ticket.completed,
    ticket.notes.replaceAll("\n", " "),
    ticket.sourceFile,
  ]);

  return `﻿sep=;\r\n${[header, ...rows]
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\r\n")}\r\n`;
}

function formatDecimal(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",");
}

function escapeCsvCell(value: string): string {
  if (!/[;"\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
