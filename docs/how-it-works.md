# How Home.tsx and Session.tsx work

Plain-language walkthrough of what happens, in order, when these two pages run.

## Home.tsx (the "/" page — your list of workouts)

1. **Page opens.** React runs `useEffect(() => { loadWorkouts() }, [])`. The empty
   `[]` at the end means "only run this once, right when the page first loads" —
   not on every re-render.

2. **`loadWorkouts()` runs.** It asks Supabase: "give me every row in the
   `workouts` table, and for each one, also give me its related rows from
   `workout_exercises`." That's what `.select('*, workout_exercises(*)')` means.
   The result gets saved into the `workouts` state variable.

3. **React re-renders.** Because `workouts` state changed, React redraws the
   `<ul>` list — one `<li>` per workout, showing its name and exercise count.
   This is the core React idea: you don't manually update the DOM, you update
   state and React figures out what needs to redraw.

4. **You click "+".** This calls `openNew()`, which clears out the form fields
   (`name`, `exercises`) and sets `isOpen = true`. That state change is what
   makes the popup appear — the popup's JSX is wrapped in `{isOpen && (...)}`,
   meaning "only render this if isOpen is true."

5. **You type a workout name / add exercise rows.** Every keystroke fires
   `onChange`, which updates state (`setName`, or `updateExercise` for a
   specific exercise row). The input's `value={name}` means the box always
   shows whatever is currently in state — this is called a "controlled input."

6. **You click "Create".** This runs `handleSave()`:
   - If you're creating a new workout (`editingId` is `null`), it inserts a
     new row into the `workouts` table and grabs back the new row's `id`.
   - If you're editing an existing one, it updates the workout's name, then
     **deletes all its existing exercises and re-inserts the current list**.
     This is a deliberate shortcut: instead of figuring out which exercises
     were added/removed/renamed, it's simpler and safe here to just wipe and
     rewrite them every time you save.
   - Either way, it then inserts a `workout_exercises` row for each exercise
     you typed a name for.
   - Finally it closes the popup and calls `loadWorkouts()` again, so the
     list reflects the database's new state.

7. **You click "Edit" on a workout.** `openEdit()` fills the form state with
   that workout's existing name/exercises and opens the same popup — so
   "New workout" and "Edit workout" reuse one form.

8. **You click "Delete" inside the popup.** This doesn't delete anything yet —
   it just sets `confirmDelete = true`, which shows a second small popup
   asking "are you sure?". Only clicking **that** popup's Delete button
   actually runs `handleDelete()`, which deletes the workout row. (Deleting a
   workout automatically deletes its exercises too — that's the `on delete
   cascade` rule set up in the database, not something the app code does.)

## Session.tsx (the "/workout/:id" page — logging a session)

1. **Page opens with a URL like `/workout/abc123`.** `useParams()` reads that
   `abc123` out of the URL and calls it `id`.

2. **`useEffect` calls `load()`** whenever `id` changes (e.g. you navigate to
   a different workout).

3. **`load()` does three things:**
   - Fetches that one workout and its exercises from Supabase (sorted by
     `position`, so they show in the order you added them).
   - Builds `exerciseLogs`: for each exercise, creates an empty "set" for
     every standard set the template defines (e.g. 3 sets of Bench Press
     becomes 3 blank `{weight: '', reps: '', skipped: false}` entries). This
     is local-only state — nothing saved yet.
   - Looks up the **most recent previous session** for this same workout
     (`order by performed_at desc, limit 1`), fetches its logged sets, and
     groups them by exercise name into `lastTime`. That's the data behind
     the "Last time: 135x8, 140x7" text.

4. **You type a weight/rep.** `updateSet()` finds that one exercise + set
   combination in the `exerciseLogs` array and updates just that entry,
   leaving everything else untouched.

5. **"+ Add set"** pushes one more blank set onto that exercise's array —
   this only affects *this session's* log, it never touches the workout
   template.

6. **"Skip"** toggles a `skipped` flag on that set (and grays out/disables
   its inputs). **"x"** removes the set from this session entirely.

7. **You click "Save session".** `handleSaveSession()`:
   - Inserts one row into `sessions` (just `workout_id` + a timestamp) —
     this represents "you did this workout, right now."
   - Builds one row per set to insert into `session_sets`, but **skips any
     set you left completely blank and didn't mark as Skip** — otherwise
     empty sets would get saved as meaningless `null, null` rows.
   - Inserts all those rows in one call, then shows "Session saved."

## Why two separate database ideas: "template" vs "session"

- `workouts` + `workout_exercises` = the **plan** (what you intend to do,
  and how many sets, normally).
- `sessions` + `session_sets` = the **history** (what you actually did, one
  timestamped record per time you worked out).

Keeping these separate is what lets you deviate on any given day — add an
extra set, skip one, whatever — without ever changing your standard plan,
while still keeping a permanent log of every session you've done.
