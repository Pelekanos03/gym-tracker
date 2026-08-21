-- Standard cardio activities for a workout template (name + target minutes)
create table workout_cardio (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null,
  minutes integer not null default 20,
  position integer not null default 0
);

-- Actual cardio logged during a session
create table session_cardio (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  minutes integer,
  skipped boolean not null default false
);

alter table workout_cardio enable row level security;
alter table session_cardio enable row level security;

create policy "workout_cardio: owner only" on workout_cardio
  for all using (
    exists (select 1 from workouts w where w.id = workout_cardio.workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts w where w.id = workout_cardio.workout_id and w.user_id = auth.uid())
  );

create policy "session_cardio: owner only" on session_cardio
  for all using (
    exists (
      select 1 from sessions s
      join workouts w on w.id = s.workout_id
      where s.id = session_cardio.session_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from sessions s
      join workouts w on w.id = s.workout_id
      where s.id = session_cardio.session_id and w.user_id = auth.uid()
    )
  );
