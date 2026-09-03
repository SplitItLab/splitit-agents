import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  TicketRecord,
  TimeEntryCatalog,
  TimeEntryIssue,
} from "@/lib/time-entry-report";

const TIME_ENTRIES_DIR = path.join(process.cwd(), "time-entries");

export function parseTicketFile(source: string, sourceFile: string): TimeEntryCatalog {
  const lines = source.split(/\r?\n/);
  const frontmatter = readFrontmatter(lines);
  const issues: TimeEntryIssue[] = [];
  const rawTicket = frontmatter.ticket?.trim() ?? "";
  const ticket = rawTicket.toUpperCase();

  if (!ticket) {
    issues.push({ sourceFile, message: "Falta `ticket` en el frontmatter." });
    return { tickets: [], issues };
  }
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(ticket)) {
    issues.push({
      sourceFile,
      message: `El ticket \`${rawTicket}\` no tiene un identificador válido (por ejemplo, SPT-29).`,
    });
    return { tickets: [], issues };
  }

  const estimate = readHours(frontmatter.estimate);
  if (estimate === "invalid") {
    issues.push({ sourceFile, message: "`estimate` tiene que ser un número mayor que 0." });
  }

  const hours = readHours(frontmatter.hours);
  if (hours === "invalid") {
    issues.push({ sourceFile, message: "`hours` tiene que ser un número mayor que 0." });
  }

  const status = frontmatter.status?.trim() ?? "";
  const progress = readProgress(frontmatter.progress, status);
  if (progress === "invalid") {
    issues.push({ sourceFile, message: "`progress` tiene que ser un número entre 0 y 100." });
  }

  return {
    tickets: [{
      ticket,
      title: frontmatter.title?.trim() || ticket,
      epic: frontmatter.epic?.trim() ?? "",
      assignee: frontmatter.assignee?.trim() ?? "",
      estimate: estimate === "invalid" ? null : estimate,
      hours: hours === "invalid" ? null : hours,
      progress: progress === "invalid" ? 0 : progress,
      status,
      planned: frontmatter.planned?.trim() ?? "",
      completed: frontmatter.completed?.trim() ?? "",
      notes: readNotes(lines),
      sourceFile,
    }],
    issues,
  };
}

export async function listTickets(): Promise<TimeEntryCatalog> {
  let dirents: Dirent[];
  try {
    dirents = await readdir(TIME_ENTRIES_DIR, { withFileTypes: true });
  } catch {
    return {
      tickets: [],
      issues: [{
        sourceFile: "time-entries",
        message: "No se encontró el directorio de cargas de tiempo.",
      }],
    };
  }

  const files = dirents
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md") && !dirent.name.startsWith("_") && dirent.name !== "README.md")
    .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));

  const catalogs = await Promise.all(
    files.map(async (file) => {
      const sourceFile = `time-entries/${file.name}`;
      try {
        const source = await readFile(path.join(TIME_ENTRIES_DIR, file.name), "utf8");
        return parseTicketFile(source, sourceFile);
      } catch {
        return {
          tickets: [],
          issues: [{ sourceFile, message: "No se pudo leer el archivo." }],
        } satisfies TimeEntryCatalog;
      }
    }),
  );

  return {
    tickets: catalogs.flatMap((catalog) => catalog.tickets),
    issues: catalogs.flatMap((catalog) => catalog.issues),
  };
}

// Acepta tanto `2.5` como `2,5`. Distingue "no cargado" de "cargado mal": lo
// primero es normal al principio, lo segundo hay que mostrarlo.
function readHours(raw: string | undefined): number | null | "invalid" {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const hours = Number(value.replace(",", "."));
  return Number.isFinite(hours) && hours > 0 ? hours : "invalid";
}

// Un ticket terminado vale el 100% aunque nadie complete `progress`; el resto
// arranca en 0 y se sube a mano si hay algo entregado a medias.
function readProgress(raw: string | undefined, status: string): number | "invalid" {
  const value = raw?.trim().replace("%", "") ?? "";
  if (!value) return /^(done|completado|completed)$/i.test(status.trim()) ? 100 : 0;
  const progress = Number(value.replace(",", "."));
  return Number.isFinite(progress) && progress >= 0 && progress <= 100 ? progress : "invalid";
}

// Texto libre: dificultades, contexto, lo que haya contado el developer. Es la
// parte del registro que no se puede reconstruir después.
function readNotes(lines: readonly string[]): string {
  const heading = lines.findIndex((line) => /^#{2,3}\s+(notas|dificultades|complicaciones|observaciones)\s*$/i.test(line.trim()));
  if (heading === -1) return "";

  const body: string[] = [];
  for (let index = heading + 1; index < lines.length; index += 1) {
    if (/^#{1,3}\s/.test(lines[index])) break;
    body.push(lines[index]);
  }

  return body.join("\n").replace(/<!--[\s\S]*?-->/g, "").trim();
}

function readFrontmatter(lines: readonly string[]): Record<string, string> {
  if (lines[0]?.trim() !== "---") return {};
  const closingLine = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingLine === -1) return {};

  const entries: Record<string, string> = {};
  for (const line of lines.slice(1, closingLine)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) entries[key] = value;
  }
  return entries;
}
