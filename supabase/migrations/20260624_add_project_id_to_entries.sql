alter table entries
add column if not exists project_id uuid references projects(id) on delete set null;

update entries
set project_id = projects.id
from projects
where entries.project_id is null
  and entries.project = projects.name;

create index if not exists entries_project_id_idx on entries(project_id);
