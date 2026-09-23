# gym-app

A powerlifting & bodybuilding **training tracker for friends**. Everyone is a
peer: you build your own training programs, log what you actually did, add
friends, and copy a friend's program into your own library to run it
yourself.

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
│       ├── auth/            login (email + password)
│       ├── users/           create/search users
│       ├── friendship/      friend requests, friends list
│       ├── exercises/       exercise library
│       ├── programs/        build programs (templates), copy a friend's
│       ├── workouts/        log sessions & sets
│       └── progress/        estimated-1RM trends
└── web/                     React frontend (Vite dev server proxies /api → :3000)
```

### The domain model (`api/src/domain`)

- **User** — one class for everyone; no roles.
- **Friendship** — a request/accept link between two users (`PENDING` → `ACCEPTED`).
- **Exercise** — a movement in the library (Back Squat, Bench Press, …).
- **Program → ProgramDay → ProgramExercise** — a reusable training template
  (prescribed sets/reps/RPE/%1RM) owned by a user. Copying a friend's program
  deep-clones it into your own library — it's a real, independent copy.
- **WorkoutSession → SetLog** — what a user actually did. `SetLog.estimatedOneRepMax()`
  (Epley) powers the progress charts.

## Running it

Requires Node 20+.

```bash
# 1. install everything (npm workspaces)
npm install

# 2. seed a starter exercise library + two demo users who are already friends
npm run seed --workspace api
#   → alex@example.com / sam@example.com, password: password123

# 3. start the API (http://localhost:3000/api)
npm run dev:api

# 4. in another terminal, start the frontend (http://localhost:5173)
npm run dev:web
```

Open http://localhost:5173 and log in.

## Try the full flow

1. Log in as **alex@example.com**: build a program under "My programs" (Alex
   already has one from the seed, "Starter Strength").
2. Log in as **sam@example.com**: go to **Friends** → View Alex → **Copy to
   mine**. The program now shows up under Sam's own "My programs".
3. As Sam, log a workout under "Log workout", then check **History** and
   **Progress**.
4. From **Friends**, search by name/email to send a new friend request; the
   other user accepts it from their own Friends tab before you can see their
   programs or copy from them.

## API quick reference

| Method   | Path | Purpose |
|----------|------|---------|
| `POST`   | `/api/auth/login` | log in with email + password |
| `POST`   | `/api/users` | create a user |
| `GET`    | `/api/users?q=` | search users by name/email |
| `POST`   | `/api/friend-requests` | send a friend request |
| `POST`   | `/api/friend-requests/:id/accept` | accept a request |
| `DELETE` | `/api/friend-requests/:id` | decline/cancel a request |
| `DELETE` | `/api/friendships/:id` | unfriend |
| `GET`    | `/api/users/:userId/friends` | a user's friends |
| `GET`    | `/api/users/:userId/friend-requests?direction=incoming\|outgoing` | pending requests |
| `GET`    | `/api/exercises` | exercise library |
| `POST`   | `/api/programs` | create a program (days + exercises) |
| `GET`    | `/api/programs?ownerId=` | a user's own programs |
| `POST`   | `/api/programs/:id/copy` | deep-copy a program into a friend's (or your own) library |
| `POST`   | `/api/workout-sessions` | log a session |
| `GET`    | `/api/users/:userId/workout-sessions` | a user's own history |
| `GET`    | `/api/users/:viewerId/friends/:friendId/workout-sessions` | a friend's history |
| `GET`    | `/api/users/:userId/progress` | a user's own progress |
| `GET`    | `/api/users/:viewerId/friends/:friendId/progress` | a friend's progress |

## Not done yet (good next steps)

- **Real session auth** — login checks the password, but the app still tracks
  "who you are" client-side (localStorage), not via a server session/JWT.
  Add `@nestjs/passport` + JWT and a guard that reads the current user.
- Multi-week / multi-day program builder in the UI (the API already supports it).
- Editing and deleting programs, sessions, exercises.
- Real charts (e.g. Recharts) instead of the CSS sparklines.
- Migrations instead of `synchronize: true`, and a move to Postgres.
- Tests.
