#!/usr/bin/env bash
# Enlaza las skills de este repo a ~/.claude/skills.
# Se corre una vez por máquina, y de nuevo al agregar una skill nueva.
set -euo pipefail

repo_skills="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dest="$HOME/.claude/skills"
mkdir -p "$dest"

for rol in po qa tl; do
  [ -d "$repo_skills/$rol" ] || continue
  for skill in "$repo_skills/$rol"/*/; do
    [ -d "$skill" ] || continue
    nombre="$(basename "$skill")"
    ln -sfn "${skill%/}" "$dest/$nombre"
    echo "enlazada: $nombre ($rol)"
  done
done
