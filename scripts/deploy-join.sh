#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

expected_project="prj_FfMEg8gMejjvHr1bF3CtK3KaDLwM"
expected_team="team_4RKAt4DQiM8CxdB40vP0wPxh"
link_file=".vercel/project.json"

if [[ ! -f "$link_file" ]]; then
  echo "Vercel project link is missing. Run: vercel link --yes --scope big-vision --project $expected_project" >&2
  exit 1
fi

read -r linked_project linked_team < <(python3 -c 'import json; data=json.load(open(".vercel/project.json")); print(data.get("projectId", ""), data.get("orgId", ""))')

if [[ "$linked_project" != "$expected_project" || "$linked_team" != "$expected_team" ]]; then
  echo "This directory is linked to the wrong Vercel project. Run: vercel link --yes --scope big-vision --project $expected_project" >&2
  exit 1
fi

exec vercel deploy --prod --yes --scope big-vision
