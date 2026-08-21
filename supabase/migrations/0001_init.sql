-- Workout templates
create table workouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Standard exercises + set count for a workout template
create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null,
  sets integer not null default 3,
  position integer not null default 0
);

-- One logged instance of actually doing a workout
create table sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  performed_at timestamptz not null default now()
);

-- Actual weight/reps logged per set during a session
-- (exercise_name is stored directly so a session still makes sense
-- even if the template's exercises change later, and so extra
-- exercises can be logged ad hoc for that session only)
create table session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null,
  weight numeric,
  reps integer,
  skipped boolean not null default false
);

-- No auth yet, so open access for the anon key (personal single-user app for now).
-- Revisit before this app is ever exposed publicly.
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table sessions enable row level security;
alter table session_sets enable row level security;

create policy "allow all on workouts" on workouts for all using (true) with check (true);
create policy "allow all on workout_exercises" on workout_exercises for all using (true) with check (true);
create policy "allow all on sessions" on sessions for all using (true) with check (true);
create policy "allow all on session_sets" on session_sets for all using (true) with check (true);
