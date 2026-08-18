import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type Role = "po" | "qa" | "tl";

export type Skill = {
  readonly role: Role;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly owner: string;
};

export type RoleGroup = {
  readonly role: Role;
  readonly label: string;
  readonly skills: readonly Skill[];
};

const ROLES: readonly { role: Role; label: string }[] = [
  { role: "po", label: "Product Owner" },
  { role: "qa", label: "QA Leader" },
  { role: "tl", label: "Tech Leader" },
];

const SKILLS_DIR = path.join(process.cwd(), "skills");

/**
 * Lee el frontmatter YAML de un SKILL.md. Solo se usan `name` y `description`,
 * que son claves de una línea, así que no hace falta un parser de YAML.
 */
function readFrontmatter(source: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) return {};

  const entries: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) entries[key] = value.replace(/^["']|["']$/g, "");
  }
  return entries;
}

async function readRole(role: Role): Promise<Skill[]> {
  let dirents: Dirent[];
  try {
    dirents = await readdir(path.join(SKILLS_DIR, role), { withFileTypes: true });
  } catch {
    return [];
  }

  const skills = await Promise.all(
    dirents
      .filter((dirent) => dirent.isDirectory())
      .map(async (dirent): Promise<Skill | null> => {
        const file = path.join(SKILLS_DIR, role, dirent.name, "SKILL.md");
        let source: string;
        try {
          source = await readFile(file, "utf8");
        } catch {
          return null;
        }
        const frontmatter = readFrontmatter(source);
        return {
          role,
          slug: dirent.name,
          name: frontmatter.name ?? dirent.name,
          description: frontmatter.description ?? "",
          owner: frontmatter.owner ?? "",
        };
      }),
  );

  return skills
    .filter((skill): skill is Skill => skill !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function listSkills(): Promise<RoleGroup[]> {
  return Promise.all(
    ROLES.map(async ({ role, label }) => ({
      role,
      label,
      skills: await readRole(role),
    })),
  );
}
