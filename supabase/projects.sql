create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  supports_labeling boolean not null default true,
  supports_reviewing boolean not null default false,
  labeling_rate numeric check (labeling_rate is null or labeling_rate > 0),
  reviewing_rate numeric check (reviewing_rate is null or reviewing_rate > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into projects (name, supports_labeling, supports_reviewing, labeling_rate, reviewing_rate)
values
  ('Localized', true, true, 1.50, 25),
  ('DenseFusion', true, true, 2.60, 25),
  ('Textualization', true, true, 2.00, 25)
on conflict (name) do nothing;

alter table projects enable row level security;

create policy projects_select on projects
for select using (true);

create policy projects_insert on projects
for insert with check (true);

create policy projects_update on projects
for update using (true) with check (true);

create policy projects_delete on projects
for delete using (true);

-- Remove the old fixed-project check constraint from entries.project.
-- Run this block once so entries can reference any project name.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where rel.relname = 'entries'
      and att.attname = 'project'
      and con.contype = 'c'
  loop
    execute format('alter table entries drop constraint if exists %I', constraint_name);
  end loop;
end $$;
