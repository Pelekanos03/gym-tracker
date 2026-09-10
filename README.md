# gym-app

A powerlifting & bodybuilding **coaching platform**. Coaches build training
programs and assign them to their clients; clients log what they actually did;
coaches review sessions and progress.

Built as a learning project with an object-oriented backend.

## Tech stack

| Layer    | Choice                                             | Why |
|----------|---------------------------------------------------|-----|
| Language | TypeScript everywhere                             | One language to learn for both sides |
| Backend  | [NestJS](https://nestjs.com) + TypeORM            | Class-based modules, dependency injection, decorators — OOP by design |
| Database | SQLite (dev)                                      | Zero setup; swap the driver in `api/src/database/data-source-options.ts` for Postgres later |
| Frontend | React + Vite                                      | Fast, standard, minimal config |

## Project layout

```
gym-app/
├── api/                     NestJS backend
│   └── src/
│       ├── domain/          entity classes = the object model
│       ├── common/          enums, password hashing
│       ├── database/        connection options + seed script
│       ├── users/           create users, roles
│       ├── coaching/        coach ⇄ client relationships
│       ├── exercises/       exercise library
│       ├── programs/        build programs, assign to clients
│       ├── workouts/        clients log sessions & sets
│       └── progress/        estimated-1RM trends
└── web/                     React frontend (Vite dev server proxies /api → :3000)
```

### The domain model (`api/src/domain`)

- **User** — one class for coaches and clients; `role` drives behaviour (`isCoach()` / `isClient()`).
- **CoachingRelationship** — links a coach to a client (the roster).
- **Exercise** — a movement in the library (Back Squat, Bench Press, …).
- **Program → ProgramDay → ProgramExercise** — a coach's training plan and its prescribed sets/reps/RPE/%1RM.
- **ProgramAssignment** — makes a program live for one client.
- **WorkoutSession → SetLog** — what the client actually did. `SetLog.estimatedOneRepMax()` (Epley) powers the progress charts.

## Running it

Requires Node 20+.

```bash
# 1. install everything (npm workspaces)
npm install

# 2. seed a starter exercise library + a demo coach and client
npm run seed --workspace api
#   → coach@example.com / client@example.com, password: password123

# 3. start the API (http://localhost:3000/api)
npm run dev:api

# 4. in another terminal, start the frontend (http://localhost:5173)
npm run dev:web
```

Open http://localhost:5173, pick "Demo Coach" or "Demo Client" in the top-right,
and click around.

## Try the full flow

1. As **Demo Coach**: add Demo Client to your roster → build a program → assign it.
2. Switch to **Demo Client**: log a workout (a few sets of Back Squat).
3. Back as **Demo Coach**: click **Review** on the client to see their sessions
   and estimated-1RM progress.

## API quick reference

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/users` | create a coach or client |
| `GET`  | `/api/users?role=CLIENT` | list users |
| `GET`  | `/api/exercises` | exercise library |
| `POST` | `/api/coaches/:coachId/clients` | add client to roster |
| `GET`  | `/api/coaches/:coachId/clients` | the roster |
| `POST` | `/api/programs` | create a program (days + exercises) |
| `POST` | `/api/programs/:id/assignments` | assign a program to a client |
| `POST` | `/api/workout-sessions` | client logs a session |
| `GET`  | `/api/coaches/:coachId/clients/:clientId/workout-sessions` | coach views client history |
| `GET`  | `/api/coaches/:coachId/clients/:clientId/progress` | coach views client progress |

## Not done yet (good next steps)

- **Authentication** — there is no login. The frontend just picks a user id.
  Add `@nestjs/passport` + JWT and a guard that reads the current user.
- Multi-week / multi-day program builder in the UI (the API already supports it).
- Editing and deleting programs, sessions, exercises.
- Real charts (e.g. Recharts) instead of the CSS sparklines.
- Migrations instead of `synchronize: true`, and a move to Postgres.
- Tests.
