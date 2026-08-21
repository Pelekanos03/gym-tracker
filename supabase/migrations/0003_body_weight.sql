create table body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  logged_at timestamptz not null default now(),
  weight numeric not null
);

alter table body_weight_logs enable row level security;
create policy "allow all on body_weight_logs" on body_weight_logs for all using (true) with check (true);
