-- What kind of set this was. 'working' is the default/normal set.
alter table session_sets add column type text not null default 'working';

-- Extra reps done past failure, assisted or with momentum (only used when type = 'partial')
alter table session_sets add column partial_reps integer;

-- One or more reduced-weight continuations right after a set, no rest
-- (only used when type = 'drop'; a set can have multiple drop continuations)
create table drop_sets (
  id uuid primary key default gen_random_uuid(),
  session_set_id uuid not null references session_sets(id) on delete cascade,
  weight numeric,
  reps integer,
  position integer not null default 0
);

alter table drop_sets enable row level security;
create policy "allow all on drop_sets" on drop_sets for all using (true) with check (true);
