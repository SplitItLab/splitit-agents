import type { Metadata } from "next";
import { listTickets } from "@/lib/time-entries";
import { TimeReport } from "./time-report";

export const metadata: Metadata = {
  title: "Horas reales · SplitIt",
  description: "Tiempo real contra estimado y dificultades por ticket, para el seguimiento de valor ganado.",
};

export default async function TimeEntriesPage() {
  const catalog = await listTickets();
  return <TimeReport catalog={catalog} />;
}
