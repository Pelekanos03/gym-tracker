-- Each workout and body weight entry belongs to the user who created it.
-- New rows are auto-tagged with the logged-in user via the default.
alter table workouts add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table body_weight_logs add column user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- Replace the old "anyone can do anything" policies with per-user ones.

drop policy "allow all on workouts" on workouts;
create policy "workouts: owner only" on workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy "allow all on body_weight_logs" on body_weight_logs;
create policy "body_weight_logs: owner only" on body_weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- These tables don't have their own user_id — ownership is checked by
-- following the foreign-key chain back up to the owning workout.

drop policy "allow all on workout_exercises" on workout_exercises;
create policy "workout_exercises: owner only" on workout_exercises
  for all using (
    exists (select 1 from workouts w where w.id = workout_exercises.workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts w where w.id = workout_exercises.workout_id and w.user_id = auth.uid())
  );

drop policy "allow all on sessions" on sessions;
create policy "sessions: owner only" on sessions
  for all using (
    exists (select 1 from workouts w where w.id = sessions.workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts w where w.id = sessions.workout_id and w.user_id = auth.uid())
  );

drop policy "allow all on session_sets" on session_sets;
create policy "session_sets: owner only" on session_sets
  for all using (
    exists (
      select 1 from sessions s
      join workouts w on w.id = s.workout_id
      where s.id = session_sets.session_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from sessions s
      join workouts w on w.id = s.workout_id
      where s.id = session_sets.session_id and w.user_id = auth.uid()
    )
  );

drop policy "allow all on drop_sets" on drop_sets;
create policy "drop_sets: owner only" on drop_sets
  for all using (
    exists (
      select 1 from session_sets ss
      join sessions s on s.id = ss.session_id
      join workouts w on w.id = s.workout_id
      where ss.id = drop_sets.session_set_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from session_sets ss
      join sessions s on s.id = ss.session_id
      join workouts w on w.id = s.workout_id
      where ss.id = drop_sets.session_set_id and w.user_id = auth.uid()
    )
  );
