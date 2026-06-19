create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null check (amount > 0),
  issa_amount numeric not null check (issa_amount >= 0),
  eva_amount numeric not null check (eva_amount >= 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

create policy payments_select on payments
for select using (true);

create policy payments_insert on payments
for insert with check (true);

create policy payments_delete on payments
for delete using (true);
