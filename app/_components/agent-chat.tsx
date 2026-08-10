"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import {
  AlertCircleIcon,
  ArrowRight,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Gauge,
  GitBranch,
  Link2,
  ListChecks,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";

type AgentName = "control-tower" | "backlog-refiner" | "meeting-steering";
type EventType = "hito" | "steering" | "parcial" | "final";
type ConnectionStatus = "loading" | "connected" | "disconnected" | "not-configured";

type AgentDef = {
  id: AgentName;
  title: string;
  subtitle: string;
  icon: typeof Gauge;
  actions: readonly { label: string; prompt: string }[];
  placeholder: string;
  hint: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: EventType;
  fixed?: boolean;
};

type ConnectionState = {
  status: ConnectionStatus;
  detail: string;
};

type Connections = {
  linear: ConnectionState;
  github: ConnectionState;
};

type AgentCommand = {
  id: string;
  agent: AgentName;
  prompt: string;
};

const AGENTS: readonly AgentDef[] = [
  {
    id: "control-tower",
    title: "Control Tower",
    subtitle: "Estado, hitos, bloqueos y decisiones",
    icon: Gauge,
    placeholder: "Pedí una acción de control…",
    hint: "Consultá el estado real del proyecto en Linear.",
    actions: [
      { label: "Reporte semanal", prompt: "Generá el reporte semanal del proyecto SplitIt." },
      { label: "Próximo hito", prompt: "Mostrá el avance hacia el próximo hito de SplitIt." },
      { label: "Tareas atrasadas", prompt: "Detectá las tareas atrasadas de SplitIt." },
      { label: "Bloqueos", prompt: "Detectá los bloqueos actuales de SplitIt." },
      { label: "Riesgos", prompt: "Identificá riesgos y decisiones necesarias en SplitIt." },
    ],
  },
  {
    id: "backlog-refiner",
    title: "Backlog Refiner",
    subtitle: "Requerimientos listos para desarrollo",
    icon: ListChecks,
    placeholder: "Describí el requerimiento para convertirlo en una user story…",
    hint: "La creación en Linear siempre requiere confirmación.",
    actions: [],
  },
  {
    id: "meeting-steering",
    title: "Meeting & Steering",
    subtitle: "Agendas, Steering y próximos pasos",
    icon: Users,
    placeholder: "Pedí una acción de reunión…",
    hint: "Prepará la reunión usando el estado actual del proyecto.",
    actions: [
      { label: "Preparar agenda", prompt: "Prepará la agenda de la próxima reunión del proyecto SplitIt." },
      { label: "Resumir estado", prompt: "Resumí el estado actual del proyecto SplitIt." },
      { label: "Informe Steering", prompt: "Prepará el informe para el comité Steering de SplitIt." },
      { label: "Decisiones", prompt: "Generá las decisiones pendientes de SplitIt." },
      { label: "Tareas post-reunión", prompt: "Generá las tareas posteriores a la reunión de SplitIt." },
    ],
  },
];

const PROJECT_DATES: readonly CalendarEvent[] = [
  { id: "dev", title: "Entorno operativo", date: "2026-08-20", type: "hito", fixed: true },
  { id: "events", title: "Creación de eventos", date: "2026-09-17", type: "hito", fixed: true },
  { id: "expenses", title: "MVP gastos", date: "2026-10-15", type: "hito", fixed: true },
  { id: "delivery", title: "Entrega final", date: "2026-11-12", type: "hito", fixed: true },
];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const STORAGE_KEY = "splitit-academic-dates";

const INITIAL_CONNECTIONS: Connections = {
  linear: { status: "loading", detail: "Verificando Vercel Connect" },
  github: { status: "not-configured", detail: "Todavía no existe un repositorio" },
};

type AgentStatus = ReturnType<typeof useEveAgent>["status"];

export function AgentChat() {
  const [selected, setSelected] = useState<AgentName>("control-tower");
  const [command, setCommand] = useState<AgentCommand>();
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
        linear: { status: "disconnected", detail: "No se pudo consultar la conexión" },
        github: INITIAL_CONNECTIONS.github,
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

  const openAgent = (agent: AgentName, prompt?: string) => {
    setSelected(agent);
    if (prompt) setCommand({ id: crypto.randomUUID(), agent, prompt });
    requestAnimationFrame(() => document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">S</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-primary">SplitIt · Sala de control</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lo importante, antes de que se atrase.</h1>
              <p className="text-sm text-muted-foreground">
                Estado, decisiones y próximos pasos del proyecto en un solo lugar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" />
            <span>{formatLongDate(new Date())}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <DailyBrief connections={connections} events={events} onOpenAgent={openAgent} />

        <section className="overflow-hidden rounded-xl border bg-card ring-1 ring-primary/10" aria-labelledby="agents-title" id="agents">
          <div className="flex flex-col gap-4 border-b bg-primary/5 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold" id="agents-title">Resolver con los agentes</h2>
                <p className="text-sm text-muted-foreground">Abrí el detalle cuando necesites investigar o ejecutar una acción.</p>
              </div>
              <Badge variant="secondary">3 agentes</Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row" role="tablist" aria-label="Agentes PM">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                const active = agent.id === selected;
                return (
                  <button
                    aria-selected={active}
                    className={cn(
                      "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-accent",
                    )}
                    key={agent.id}
                    onClick={() => setSelected(agent.id)}
                    role="tab"
                    type="button"
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{agent.title}</span>
                      <span className={cn("block truncate text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{agent.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {AGENTS.map((agent) => (
            <AgentWorkspace
              agent={agent}
              command={command?.agent === agent.id ? command : undefined}
              hidden={selected !== agent.id}
              key={agent.id}
              onCommandConsumed={(id) => setCommand((current) => current?.id === id ? undefined : current)}
            />
          ))}
        </section>

        <ConnectionPanel
          connections={connections}
          onRefresh={() => void refreshConnections()}
          refreshing={refreshing}
        />

        <section className="flex flex-col gap-4" aria-labelledby="planning-title">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-semibold" id="planning-title">Hitos y seguimiento</h2>
              <p className="text-sm text-muted-foreground">Fechas comprometidas y señales que requieren atención.</p>
            </div>
            <Badge variant="outline">Complementario</Badge>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)]">
            <ProjectCalendar events={events} onChange={saveEvents} />
            <AlertsPanel connections={connections} events={events} />
          </div>
        </section>
      </div>
    </main>
  );
}

function DailyBrief({
  connections,
  events,
  onOpenAgent,
}: {
  connections: Connections;
  events: CalendarEvent[];
  onOpenAgent: (agent: AgentName, prompt?: string) => void;
}) {
  const today = new Date();
  const nextMilestone = PROJECT_DATES.find((event) => event.date >= dateKey(today));
  const nextSteering = events
    .filter((event) => event.type === "steering" && event.date >= dateKey(today))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const remaining = nextMilestone ? daysUntil(nextMilestone.date) : 0;

  return (
    <section className="overflow-hidden rounded-xl bg-foreground text-background" aria-labelledby="brief-title">
      <div className="grid gap-8 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-2xl">
          <div className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-background/60">
            <Sparkles className="size-3.5" />
            Brief de hoy · {formatLongDate(today)}
          </div>
          <p className="text-sm text-background/65">Próximo compromiso</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl" id="brief-title">
            {nextMilestone?.title ?? "Plan completado"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-background/65">
            {nextMilestone
              ? `La fecha comprometida es el ${formatShortDate(nextMilestone.date)}. Actualizá el estado con Linear antes de priorizar el día.`
              : "No quedan hitos futuros cargados en el plan actual."}
          </p>
        </div>
        {nextMilestone ? (
          <div className="flex items-baseline gap-2 lg:flex-col lg:items-end lg:gap-0" aria-label={`${remaining} días para el próximo hito`}>
            <span className="font-mono text-6xl font-semibold leading-none tracking-[-0.08em] text-primary sm:text-7xl">{remaining}</span>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-background/60">días restantes</span>
          </div>
        ) : null}
      </div>

      <div className="grid border-t border-background/10 lg:grid-cols-3">
        <BriefAction
          action="Actualizar estado"
          detail={connections.linear.status === "connected" ? "Linear conectado" : "Linear requiere atención"}
          icon={Gauge}
          onClick={() => onOpenAgent("control-tower", "Generá el brief diario de SplitIt: estado, atrasos, bloqueos, riesgos, decisiones pendientes y las próximas 3 acciones.")}
          title="Situación del proyecto"
        />
        <BriefAction
          action="Refinar requerimiento"
          detail="Convertir una necesidad en trabajo listo"
          icon={ClipboardCheck}
          onClick={() => onOpenAgent("backlog-refiner")}
          title="Próxima acción"
        />
        <BriefAction
          action="Preparar reunión"
          detail={nextSteering ? `${nextSteering.title} · ${formatShortDate(nextSteering.date)}` : "Todavía no hay Steering agendado"}
          icon={Users}
          onClick={() => onOpenAgent("meeting-steering", "Prepará la próxima reunión de Steering de SplitIt con estado, decisiones requeridas, responsables y próximos pasos.")}
          title="Seguimiento"
        />
      </div>
    </section>
  );
}

function BriefAction({
  action,
  detail,
  icon: Icon,
  onClick,
  title,
}: {
  action: string;
  detail: string;
  icon: typeof Gauge;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="group flex min-h-28 items-center gap-4 border-background/10 px-5 py-4 text-left transition-colors hover:bg-background/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:border-r last:lg:border-r-0"
      onClick={onClick}
      type="button"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-background/55">{detail}</span>
        <span className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
          {action} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

function ConnectionPanel({
  connections,
  onRefresh,
  refreshing,
}: {
  connections: Connections;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="connections-title">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Link2 aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold" id="connections-title">Fuentes del proyecto</h2>
          <p className="text-xs text-muted-foreground">Estado de las integraciones usadas por los agentes.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ConnectionBadge icon={BookOpenCheck} label="Linear" state={connections.linear} />
        <ConnectionBadge icon={GitBranch} label="GitHub" state={connections.github} />
        <Button disabled={refreshing} onClick={onRefresh} size="sm" type="button" variant="ghost">
          <RefreshCw className={cn(refreshing && "animate-spin")} data-icon="inline-start" />
          Revisar
        </Button>
      </div>
    </section>
  );
}

function ConnectionBadge({ icon: Icon, label, state }: { icon: typeof Link2; label: string; state: ConnectionState }) {
  const tone =
    state.status === "connected"
      ? "border-success/30 text-success-foreground"
      : state.status === "disconnected"
        ? "border-destructive/30 text-destructive"
        : "border-warning/30 text-warning-foreground";
  const text =
    state.status === "connected"
      ? "Conectado"
      : state.status === "loading"
        ? "Verificando"
        : state.status === "not-configured"
          ? "No configurado"
          : "Sin conexión";

  return (
    <div className="flex min-w-52 items-center gap-2 rounded-lg bg-muted/55 px-3 py-2">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground" title={state.detail}>{state.detail}</p>
      </div>
      <Badge className={tone} variant="outline">{text}</Badge>
    </div>
  );
}

function ProjectCalendar({ events, onChange }: { events: CalendarEvent[]; onChange: (events: CalendarEvent[]) => void }) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<EventType>("steering");
  const allEvents = [...PROJECT_DATES, ...events];
  const calendarDays = buildCalendarDays(month);
  const upcoming = allEvents
    .filter((event) => event.date >= dateKey(today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !date) return;
    onChange([...events, { id: crypto.randomUUID(), title: title.trim(), date, type }]);
    setTitle("");
    setDate("");
  };

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="calendar-title">
      <div className="flex flex-col gap-4 border-b px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold" id="calendar-title">Calendario del proyecto</h2>
            <p className="text-sm text-muted-foreground">Hitos, reuniones y entregas en un solo lugar.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button aria-label="Mes anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} size="icon-sm" type="button" variant="ghost">
              <ChevronLeft />
            </Button>
            <span className="min-w-36 text-center text-sm font-medium capitalize">{formatMonth(month)}</span>
            <Button aria-label="Mes siguiente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} size="icon-sm" type="button" variant="ghost">
              <ChevronRight />
            </Button>
          </div>
        </div>

        <form onSubmit={addEvent}>
          <FieldGroup className="gap-3 md:grid md:grid-cols-[minmax(180px,1fr)_minmax(150px,0.7fr)_minmax(130px,0.6fr)_auto] md:items-end">
            <Field>
              <FieldLabel htmlFor="event-title">Nombre</FieldLabel>
              <Input id="event-title" onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Steering de alcance" value={title} />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-date">Fecha</FieldLabel>
              <Input id="event-date" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-type">Tipo</FieldLabel>
              <Select onValueChange={(value) => setType(value as EventType)} value={type}>
                <SelectTrigger className="w-full" id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="steering">Steering</SelectItem>
                    <SelectItem value="parcial">Revisión</SelectItem>
                    <SelectItem value="final">Entrega</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Button disabled={!title.trim() || !date} type="submit">
              <Plus data-icon="inline-start" />
              Agregar fecha
            </Button>
          </FieldGroup>
        </form>
      </div>

      <div className="overflow-x-auto px-4 py-4 sm:px-5">
        <div className="min-w-[680px] overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 bg-muted/70">
            {WEEKDAYS.map((day) => (
              <div className="px-2 py-2 text-center text-xs font-medium text-muted-foreground" key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              if (day === null) return <div className="min-h-24 border-r border-t bg-muted/20" key={`blank-${index}`} />;
              const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
              const dayEvents = allEvents.filter((event) => event.date === key);
              const isToday = key === dateKey(today);
              return (
                <div className={cn("min-h-24 border-r border-t p-1.5", isToday && "bg-primary/5")} key={key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs", isToday && "bg-primary font-semibold text-primary-foreground")}>{day}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span className={cn("truncate rounded px-1.5 py-1 text-[11px] font-medium", eventTone(event.type))} key={event.id} title={event.title}>{event.title}</span>
                    ))}
                    {dayEvents.length > 2 ? <span className="px-1 text-[11px] text-muted-foreground">+{dayEvents.length - 2} más</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-4 sm:px-5">
        <h3 className="mb-3 text-sm font-semibold">Próximas fechas</h3>
        <div className="flex flex-col gap-2">
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Agregá una fecha para empezar a organizar el proyecto.</p> : upcoming.map((event) => (
            <div className="flex items-center gap-3 rounded-lg bg-muted/55 px-3 py-2" key={event.id}>
              <span className={cn("size-2 rounded-full", eventDot(event.type))} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{formatShortDate(event.date)} · {eventTypeLabel(event.type)}</p>
              </div>
              {!event.fixed ? (
                <Button aria-label={`Eliminar ${event.title}`} onClick={() => onChange(events.filter((item) => item.id !== event.id))} size="icon-xs" type="button" variant="ghost">
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AlertsPanel({ connections, events }: { connections: Connections; events: CalendarEvent[] }) {
  const today = new Date();
  const nextMilestone = PROJECT_DATES.find((event) => event.date >= dateKey(today));
  const upcomingDelivery = events
    .filter((event) => (event.type === "parcial" || event.type === "final") && event.date >= dateKey(today))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <section className="flex flex-col gap-4" aria-labelledby="alerts-title">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" id="alerts-title">Alertas</h2>
          <p className="text-sm text-muted-foreground">Lo que necesita atención ahora.</p>
        </div>
        <BellRing aria-hidden="true" className="text-primary" />
      </div>

      {connections.linear.status === "disconnected" ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Linear sin conexión</AlertTitle>
          <AlertDescription>Revisá Vercel Connect antes de generar reportes.</AlertDescription>
        </Alert>
      ) : null}

      {nextMilestone ? (
        <Alert className="border-primary/25 bg-primary/5">
          <Gauge />
          <AlertTitle>Próximo hito en {daysUntil(nextMilestone.date)} días</AlertTitle>
          <AlertDescription>{nextMilestone.title} · {formatShortDate(nextMilestone.date)}</AlertDescription>
        </Alert>
      ) : null}

      {upcomingDelivery ? (
        <Alert className="border-warning/35 bg-warning/10">
          <CalendarDays className="text-warning-foreground" />
          <AlertTitle>{eventTypeLabel(upcomingDelivery.type)} próxima</AlertTitle>
          <AlertDescription>{upcomingDelivery.title} · {formatShortDate(upcomingDelivery.date)}</AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-info/30 bg-info/10">
          <CalendarDays className="text-info-foreground" />
          <AlertTitle>Sin revisiones ni entregas adicionales</AlertTitle>
          <AlertDescription>Agregalas cuando el equipo confirme las fechas.</AlertDescription>
        </Alert>
      )}

    </section>
  );
}

function AgentWorkspace({
  agent: agentDef,
  command,
  hidden,
  onCommandConsumed,
}: {
  agent: AgentDef;
  command?: AgentCommand;
  hidden: boolean;
  onCommandConsumed: (id: string) => void;
}) {
  const agent = useEveAgent({ agent: agentDef.id });
  const Icon = agentDef.icon;
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isEmpty = agent.data.messages.length === 0;
  const consumedCommand = useRef<string | undefined>(undefined);
  const context = () => ({ date: new Date().toISOString(), project: "SplitIt", pm: "Marcos" });

  useEffect(() => {
    if (!command || isBusy || consumedCommand.current === command.id) return;
    consumedCommand.current = command.id;
    onCommandConsumed(command.id);
    void agent.send(command.prompt, { clientContext: context() });
  }, [command?.id, isBusy]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isBusy) return;
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
    <div className={cn("flex-col", hidden ? "hidden" : "flex")} role="tabpanel">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-5">
        <StatusDot status={agent.status} />
        {agentDef.actions.map((action) => (
          <Button disabled={isBusy} key={action.label} onClick={() => void agent.send(action.prompt, { clientContext: context() })} size="sm" type="button" variant="outline">
            {action.label}
          </Button>
        ))}
      </div>

      {agent.error ? (
        <Alert className="m-4" variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>No se pudo completar la solicitud</AlertTitle>
          <AlertDescription>{agent.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {isEmpty ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-4 text-center">
          <Icon aria-hidden="true" className="text-primary" />
          <p className="font-medium">{agentDef.title} listo</p>
          <p className="max-w-md text-sm text-muted-foreground">{agentDef.hint}</p>
        </div>
      ) : (
        <Conversation className="h-[420px] min-h-0">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
            {agent.data.messages.map((message, index) => (
              <AgentMessage canRespond={!isBusy} isStreaming={agent.status === "streaming" && index === agent.data.messages.length - 1} key={message.id} message={message} onInputResponses={(responses) => agent.respond(responses)} />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="border-t bg-muted/30 px-4 py-4 sm:px-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea placeholder={agentDef.placeholder} />
            <PromptInputSubmit onStop={agent.stop} status={agent.status} />
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  const isLive = status === "submitted" || status === "streaming";
  return (
    <div className="mr-1 flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", status === "error" ? "bg-destructive" : isLive ? "bg-success" : "bg-muted-foreground")} />
      {isLive ? "Trabajando" : status === "error" ? "Error" : "Disponible"}
    </div>
  );
}

function buildCalendarDays(month: Date): Array<number | null> {
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: totalDays }, (_, index) => index + 1)];
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

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(parseDate(value));
}

function daysUntil(value: string): number {
  return Math.max(0, Math.ceil((parseDate(value).getTime() - new Date().getTime()) / 86_400_000));
}

function eventTypeLabel(type: EventType): string {
  return { hito: "Hito", steering: "Steering", parcial: "Revisión", final: "Entrega" }[type];
}

function eventTone(type: EventType): string {
  return {
    hito: "bg-primary/10 text-primary",
    steering: "bg-steering/10 text-steering",
    parcial: "bg-warning/15 text-warning-foreground",
    final: "bg-destructive/10 text-destructive",
  }[type];
}

function eventDot(type: EventType): string {
  return {
    hito: "bg-primary",
    steering: "bg-steering",
    parcial: "bg-warning",
    final: "bg-destructive",
  }[type];
}
