"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  Gauge,
  Link2,
  ListChecks,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";

type AgentName = "control-tower" | "backlog-refiner" | "meeting-steering";
type EventType = "hito" | "steering" | "parcial" | "final";
type ConnectionStatus = "loading" | "connected" | "disconnected";

type AgentDef = {
  id: AgentName;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: typeof Gauge;
  actions: readonly { label: string; prompt: string }[];
  placeholder: string;
  prompt: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: EventType;
  fixed?: boolean;
};

type ConnectionState = { status: ConnectionStatus; detail: string };
type Connections = { linear: ConnectionState };
type AgentStatus = ReturnType<typeof useEveAgent>["status"];
const AGENTS: readonly AgentDef[] = [
  {
    id: "control-tower",
    title: "Control Tower",
    shortTitle: "Control",
    subtitle: "Estado, riesgos y bloqueos",
    icon: Gauge,
    placeholder: "Preguntá por el estado del proyecto…",
    prompt: "Consultá el estado real del proyecto y definí qué necesita atención.",
    actions: [
      { label: "Brief de hoy", prompt: "Generá el brief diario de SplitIt: estado, atrasos, bloqueos, riesgos, decisiones pendientes y próximas 3 acciones." },
      { label: "Bloqueos", prompt: "Detectá los bloqueos actuales de SplitIt." },
      { label: "Próximo hito", prompt: "Mostrá el avance hacia el próximo hito de SplitIt." },
    ],
  },
  {
    id: "backlog-refiner",
    title: "Backlog Refiner",
    shortTitle: "Backlog",
    subtitle: "Historias listas para desarrollar",
    icon: ListChecks,
    placeholder: "Describí el requerimiento…",
    prompt: "Describí una necesidad y obtené una user story lista para desarrollar.",
    actions: [],
  },
  {
    id: "meeting-steering",
    title: "Meeting & Steering",
    shortTitle: "Reuniones",
    subtitle: "Agendas, decisiones y seguimiento",
    icon: Users,
    placeholder: "Pedí una agenda o un informe…",
    prompt: "Prepará reuniones con contexto real, decisiones y próximos pasos.",
    actions: [
      { label: "Próxima agenda", prompt: "Prepará la agenda de la próxima reunión del proyecto SplitIt." },
      { label: "Informe Steering", prompt: "Prepará el informe para el comité Steering de SplitIt." },
      { label: "Próximos pasos", prompt: "Generá las tareas posteriores a la reunión de SplitIt." },
    ],
  },
];

const PROJECT_DATES: readonly CalendarEvent[] = [
  { id: "dev", title: "Entorno operativo", date: "2026-08-20", type: "hito", fixed: true },
  { id: "events", title: "Creación de eventos", date: "2026-09-17", type: "hito", fixed: true },
  { id: "expenses", title: "MVP gastos", date: "2026-10-15", type: "hito", fixed: true },
  { id: "delivery", title: "Entrega final", date: "2026-11-12", type: "hito", fixed: true },
];

const STORAGE_KEY = "splitit-academic-dates";
const INITIAL_CONNECTIONS: Connections = {
  linear: { status: "loading", detail: "Verificando" },
};

export function AgentChat() {
  const [selected, setSelected] = useState<AgentName>("control-tower");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connections, setConnections] = useState<Connections>(INITIAL_CONNECTIONS);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setEvents(JSON.parse(saved) as CalendarEvent[]);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refreshConnections = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      if (!response.ok) throw new Error("Connection check failed");
      setConnections((await response.json()) as Connections);
    } catch {
      setConnections({
        linear: { status: "disconnected", detail: "Sin conexión" },
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshConnections();
  }, []);

  const saveEvents = (next: CalendarEvent[]) => {
    setEvents(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const selectedAgent = AGENTS.find((agent) => agent.id === selected) ?? AGENTS[0];
  const nextMilestone = PROJECT_DATES.find((event) => event.date >= dateKey(new Date()));

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:flex-row lg:overflow-hidden">
      <aside className="flex shrink-0 flex-col border-b bg-sidebar lg:h-dvh lg:w-60 lg:overflow-y-auto lg:border-r lg:border-b-0" aria-label="Workspace SplitIt">
        <div className="flex h-14 items-center gap-3 px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">S</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">SplitIt</p>
            <p className="text-[11px] text-muted-foreground">Sala de control PM</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t p-2 lg:flex-col lg:overflow-visible lg:border-t-0 lg:px-2 lg:py-3" aria-label="Agentes">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const active = selected === agent.id;
            return (
              <Button
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-auto min-w-max justify-start gap-3 px-3 py-2.5 text-left lg:min-w-0",
                  active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                key={agent.id}
                onClick={() => setSelected(agent.id)}
                type="button"
                variant="ghost"
              >
                <Icon className="size-4 shrink-0" />
                <span className="lg:min-w-0">
                  <span className="block text-sm font-medium lg:truncate">{agent.shortTitle}</span>
                  <span className="hidden text-[11px] text-muted-foreground lg:block lg:truncate">{agent.subtitle}</span>
                </span>
              </Button>
            );
          })}
        </nav>

        <nav className="border-t p-2 lg:px-2 lg:py-3" aria-label="Proyecto">
          <Link
            className="flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:min-w-0"
            href="/skills"
          >
            <Wrench className="size-4 shrink-0" />
            <span className="lg:min-w-0">
              <span className="block text-sm font-medium lg:truncate">Skills</span>
              <span className="hidden text-[11px] text-muted-foreground lg:block lg:truncate">
                Herramientas por rol
              </span>
            </span>
          </Link>
        </nav>

        <ProjectPanel
          connections={connections}
          events={events}
          nextMilestone={nextMilestone}
          onChange={saveEvents}
          onRefresh={() => void refreshConnections()}
          refreshing={refreshing}
        />
      </aside>

      <section className="flex min-h-[calc(100dvh-137px)] min-w-0 flex-1 flex-col bg-card lg:min-h-0" aria-label={selectedAgent.title}>
        <header className="flex min-h-14 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{selectedAgent.title}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{selectedAgent.subtitle}</p>
          </div>
        </header>

        <AgentWorkspace
          agent={selectedAgent}
          key={selected}
        />
      </section>
    </main>
  );
}

function ProjectPanel({
  connections,
  events,
  nextMilestone,
  onChange,
  onRefresh,
  refreshing,
}: {
  connections: Connections;
  events: CalendarEvent[];
  nextMilestone?: CalendarEvent;
  onChange: (events: CalendarEvent[]) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <>
      <details className="border-t lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
          <Settings2 className="size-4 text-muted-foreground" />
          Proyecto
          <span className="ml-auto text-xs text-muted-foreground">Agenda y conexiones</span>
        </summary>
        <div className="border-t bg-card px-3 py-3">
          <Agenda events={events} onChange={onChange} />
          <div className="mt-3 border-t pt-3">
            <ConnectionRow icon={BookOpenCheck} label="Linear" state={connections.linear} />
            <Button className="mt-1 w-full justify-start" disabled={refreshing} onClick={onRefresh} size="sm" variant="ghost">
              <RefreshCw className={cn(refreshing && "animate-spin")} /> Revisar conexiones
            </Button>
          </div>
        </div>
      </details>

      <div className="hidden min-h-0 flex-1 flex-col border-t lg:flex">
      <div className="border-y bg-secondary px-5 py-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-secondary-foreground">
          <CalendarDays className="size-4" />
          Próximo hito
        </div>
        {nextMilestone ? (
          <>
            <p className="text-base font-semibold leading-snug text-balance">{nextMilestone.title}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-secondary-foreground">{formatShortDate(nextMilestone.date)}</span>
              <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background">
                Faltan {daysUntil(nextMilestone.date)} días
              </span>
            </div>
          </>
        ) : <p className="text-sm font-medium text-secondary-foreground">Plan completado</p>}
      </div>

      <details className="group border-t">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium hover:bg-accent">
          <CalendarDays className="size-4 text-muted-foreground" />
          Agenda
          <span className="ml-auto text-xs text-muted-foreground">{events.length + PROJECT_DATES.length}</span>
        </summary>
        <Agenda events={events} onChange={onChange} />
      </details>

      <details className="group border-y">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium hover:bg-accent">
          <Settings2 className="size-4 text-muted-foreground" />
          Conexiones
        </summary>
        <div className="space-y-1 px-3 pb-3">
          <ConnectionRow icon={BookOpenCheck} label="Linear" state={connections.linear} />
          <Button className="mt-1 w-full justify-start" disabled={refreshing} onClick={onRefresh} size="sm" variant="ghost">
            <RefreshCw className={cn(refreshing && "animate-spin")} /> Revisar conexiones
          </Button>
        </div>
      </details>

      <p className="mt-auto px-5 py-4 text-xs text-muted-foreground">{formatLongDate(new Date())}</p>
      </div>
    </>
  );
}

function ConnectionRow({ icon: Icon, label, state }: { icon: typeof Link2; label: string; state: ConnectionState }) {
  const connected = state.status === "connected";
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-2 text-xs">
      <Icon className="size-4 text-muted-foreground" />
      <span>{label}</span>
      <span className={cn("ml-auto", connected ? "text-success-foreground" : "text-muted-foreground")}>
        {connected ? <Check className="size-4" aria-label="Conectado" /> : state.detail}
      </span>
    </div>
  );
}

function Agenda({ events, onChange }: { events: CalendarEvent[]; onChange: (events: CalendarEvent[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<EventType>("steering");
  const upcoming = [...PROJECT_DATES, ...events]
    .filter((event) => event.date >= dateKey(new Date()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !date) return;
    onChange([...events, { id: crypto.randomUUID(), title: title.trim(), date, type }]);
    setTitle("");
    setDate("");
    setAdding(false);
  };

  return (
    <div className="px-3 pb-3">
      <div className="space-y-1">
        {upcoming.map((event) => (
          <div className="flex items-center gap-2 rounded-md px-2 py-2" key={event.id}>
            <span className={cn("size-1.5 shrink-0 rounded-full", eventDot(event.type))} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{event.title}</p>
              <p className="text-[11px] text-muted-foreground">{formatShortDate(event.date)}</p>
            </div>
            {!event.fixed ? (
              <Button aria-label={`Eliminar ${event.title}`} onClick={() => onChange(events.filter((item) => item.id !== event.id))} size="icon-xs" type="button" variant="ghost">
                <Trash2 />
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {adding ? (
        <form className="mt-2 space-y-2 border-t pt-3" onSubmit={addEvent}>
          <Input aria-label="Nombre del evento" onChange={(event) => setTitle(event.target.value)} placeholder="Nombre" value={title} />
          <Input aria-label="Fecha del evento" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          <select
            aria-label="Tipo de evento"
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onChange={(event) => setType(event.target.value as EventType)}
            value={type}
          >
            <option value="steering">Steering</option>
            <option value="parcial">Revisión</option>
            <option value="final">Entrega</option>
          </select>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!title.trim() || !date} size="sm" type="submit">Agregar</Button>
            <Button onClick={() => setAdding(false)} size="sm" type="button" variant="ghost">Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button className="mt-2 w-full justify-start" onClick={() => setAdding(true)} size="sm" variant="ghost">
          <Plus /> Agregar fecha
        </Button>
      )}
    </div>
  );
}

function AgentWorkspace({ agent: agentDef }: { agent: AgentDef }) {
  const agent = useEveAgent({ agent: agentDef.id });
  const Icon = agentDef.icon;
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const hasPendingInput = agent.data.messages.at(-1)?.parts.some(
    (part) => part.type === "dynamic-tool" && part.toolMetadata?.eve?.inputRequest !== undefined && part.toolMetadata?.eve?.inputResponse === undefined,
  ) ?? false;
  const canSend = !isBusy && !hasPendingInput;
  const isEmpty = agent.data.messages.length === 0;
  const context = () => ({ date: new Date().toISOString(), project: "SplitIt", pm: "Marcos" });

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || !canSend) return;
    if (message.files.length === 0) {
      await agent.send(text, { clientContext: context() });
      return;
    }
    const parts: UserContent = [];
    if (text.length > 0) parts.push({ text, type: "text" });
    for (const file of message.files) {
      parts.push({ data: file.url, filename: file.filename, mediaType: file.mediaType, type: "file" });
    }
    await agent.send(parts, { clientContext: context() });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" role="tabpanel">
      {agent.error ? (
        <Alert className="m-4 mb-0 sm:mx-6" variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>No se pudo completar la solicitud</AlertTitle>
          <AlertDescription>{agent.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {isEmpty ? (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
          <span className="mb-5 flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance">{agentDef.prompt}</h2>
          {agentDef.actions.length > 0 ? (
            <div className="mt-7 divide-y border-y">
              {agentDef.actions.map((action) => (
                <Button
                  className="group h-auto w-full justify-between rounded-none px-0 py-3.5 hover:bg-transparent hover:text-primary"
                  disabled={!canSend}
                  key={action.label}
                  onClick={() => void agent.send(action.prompt, { clientContext: context() })}
                  type="button"
                  variant="ghost"
                >
                  {action.label}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Button>
              ))}
            </div>
          ) : (
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">La creación en Linear siempre requiere tu confirmación.</p>
          )}
        </div>
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-2xl gap-8 px-4 py-8 sm:px-8">
            {agent.data.messages.map((message, index) => (
              <AgentMessage canRespond={hasPendingInput} isStreaming={agent.status === "streaming" && index === agent.data.messages.length - 1} key={message.id} message={message} onInputResponses={(responses) => agent.respond(responses)} />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="border-t bg-background px-4 pb-4 pt-4 sm:px-6 sm:pb-5">
        <div className="mx-auto max-w-2xl">
          <PromptInput className="rounded-xl border-input bg-card shadow-xs" onSubmit={handleSubmit}>
            <PromptInputTextarea className="min-h-16" placeholder={agentDef.placeholder} />
            <PromptInputSubmit disabled={!canSend && !isBusy} onStop={agent.stop} status={hasPendingInput ? "ready" : agent.status} />
          </PromptInput>
          <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <Status status={agent.status} waiting={hasPendingInput} />
            <span>Enter para enviar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Status({ status, waiting }: { status: AgentStatus; waiting: boolean }) {
  const isLive = !waiting && (status === "submitted" || status === "streaming");
  const label = waiting ? "Esperando tu respuesta" : isLive ? "Trabajando" : status === "error" ? "Error" : "Disponible";
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", waiting ? "bg-warning" : status === "error" ? "bg-destructive" : isLive ? "bg-success" : "bg-muted-foreground")} />
      {label}
    </span>
  );
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(parseDate(value));
}

function daysUntil(value: string): number {
  return Math.max(0, Math.ceil((parseDate(value).getTime() - new Date().getTime()) / 86_400_000));
}

function eventDot(type: EventType): string {
  return { hito: "bg-primary", steering: "bg-steering", parcial: "bg-warning", final: "bg-destructive" }[type];
}
