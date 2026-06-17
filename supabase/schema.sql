create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('Eva', 'Issa')),
  work_type text not null check (work_type in ('Labeling', 'Reviewing')),
  project text not null check (project in ('Localized', 'DenseFusion', 'Textualization')),
  amount numeric not null check (amount > 0),
  unit text not null check (unit in ('DR', 'hours')),
  date date not null default current_date,
  created_at timestamptz not null default now()
);
