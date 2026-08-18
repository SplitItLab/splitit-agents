import type { Metadata } from "next";
import { listSkills } from "@/lib/skills";

export const metadata: Metadata = {
  title: "Skills · SplitIt",
  description: "Herramientas de trabajo de cada rol de gestión del proyecto SplitIt.",
};

export default async function SkillsPage() {
  const groups = await listSkills();
  const total = groups.reduce((count, group) => count + group.skills.length, 0);
  const most = Math.max(1, ...groups.map((group) => group.skills.length));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          SplitIt · Gestión
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Skills</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Herramientas de trabajo de cada rol. Son instrucciones versionadas en este repo, que
          se ejecutan desde Claude Code o Codex: esta página las lee y las muestra.
        </p>
      </header>

      <section aria-label="Skills por rol" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-card-foreground">Por rol</h2>
          <p className="font-mono text-xs text-muted-foreground">
            {total} {total === 1 ? "skill" : "skills"}
          </p>
        </div>
        <dl className="flex flex-col gap-2">
          {groups.map((group) => (
            <div key={group.role} className="grid grid-cols-[8rem_1fr_2ch] items-center gap-3">
              <dt className="text-sm text-muted-foreground">{group.label}</dt>
              <dd aria-hidden className="h-1.5 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(group.skills.length / most) * 100}%` }}
                />
              </dd>
              <dd className="text-right font-mono text-sm tabular-nums text-card-foreground">
                {group.skills.length}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {groups.map((group) => (
        <section key={group.role} aria-labelledby={`rol-${group.role}`} className="flex flex-col gap-3">
          <h2
            id={`rol-${group.role}`}
            className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
          >
            {group.label}
          </h2>

          {group.skills.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Todavía no hay skills de este rol.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {group.skills.map((skill) => (
                <li
                  key={`${skill.role}/${skill.slug}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-5"
                >
                  <p className="font-mono text-sm text-card-foreground">/{skill.name}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{skill.description}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    skills/{skill.role}/{skill.slug}/SKILL.md
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
