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

## Running it with Docker

Needs Docker with Compose v2. Three containers: `db` (PostgreSQL), `api`
(NestJS) and `web` (nginx serving the React build and proxying `/api`).
Data lives in two volumes — `db-data` (Postgres) and `uploads` (set
videos) — so it survives restarts and rebuilds.

```bash
cp .env.example .env              # then fill in POSTGRES_PASSWORD and JWT_SECRET
                                  # (openssl rand -hex 32), and COOKIE_SECURE=false
                                  # while testing on plain http://localhost
docker compose up -d --build      # build + start → http://localhost:8080
docker compose exec api node dist/database/seed.js   # demo data (optional, never in prod)
docker compose logs -f api        # watch logs
docker compose down               # stop (data is kept)
```

Local dev (`npm run dev:api`) still uses a SQLite file with no setup;
Docker/production use Postgres, whose schema is owned by migrations in
`api/src/database/migrations` and applied automatically on startup.
After changing an entity, generate a migration against a Postgres
database and commit it:

```bash
DATABASE_URL=postgres://… npm run migration:generate --workspace api -- src/database/migrations/<Name>
```

## Sharing it for a test (no server)

Runs the Docker app on your PC and gives it a public https link through a
free Cloudflare quick tunnel. In `.env`: set `SIGNUP_INVITE_CODE`,
`ADMIN_EMAILS` (you — to read feedback), `COOKIE_SECURE=true`,
`MAX_VIDEO_MB=100` (the free tunnel's upload cap), `TRUST_PROXY_HOPS=2`.

```bash
docker compose --profile share up -d --build
docker compose logs tunnel | grep trycloudflare.com    # the link
# then put that link in .env as APP_URL and WEB_ORIGIN, and:
docker compose --profile share up -d api
```

Your PC has to stay on (and not sleep). The link changes whenever the
tunnel container restarts — send testers the new one. Testers' notes
("Send feedback" in the footer) show up on your Account page.

## Testing

```bash
npm test                          # API unit tests
npm run smoke                     # end-to-end + security checks vs http://localhost:8080
npm run smoke -- https://your-domain   # same checks against production (read-only, safe)
```

## Production (VPS)

1. **Server**: a small Ubuntu VPS (2 GB RAM is plenty) with Docker installed.
   Open only ports 22, 80, 443 (`ufw`), log in with SSH keys, not passwords.
2. **Domain**: point an `A` record at the server's IP.
3. **Code + secrets**: `git clone` the repo, `cp .env.example .env`, set
   fresh `POSTGRES_PASSWORD` / `JWT_SECRET` (`openssl rand -hex 32`),
   `COOKIE_SECURE=true`, `WEB_ORIGIN` and `APP_URL` = `https://your-domain`,
   `WEB_PORT=8080`. For a closed beta set `SIGNUP_INVITE_CODE`; for
   password-reset emails set `SMTP_URL` + `MAIL_FROM` (without SMTP the
   reset link appears in `docker compose logs api` and you pass it on).
   Fill in `web/src/legal.ts` (your name, contact email, country, providers).
4. **HTTPS**: put Caddy in front — it gets and renews the certificate
   by itself. `/etc/caddy/Caddyfile`:
   ```
   your-domain {
     reverse_proxy localhost:8080
     request_body { max_size 500MB }
   }
   ```
5. **Start**: `docker compose up -d --build`, then
   `npm run smoke -- https://your-domain` from your PC with two real accounts.
6. **Backups** (daily cron), and test restoring one:
   ```bash
   docker compose exec -T db pg_dump -U gym gym | gzip > db-$(date +%F).sql.gz
   docker run --rm -v gym-app_uploads:/data -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /data .
   ```
   Copy them off the server (another machine or object storage).
7. **Updates**: `git pull && docker compose up -d --build` — migrations run on start.

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

- **Email verification** at sign-up (password reset by email already works).
- Have the privacy policy / terms (`web/src/legal.ts`, `LegalPage.tsx`) checked before opening sign-up widely.
- **Video storage off the server** (S3-compatible object storage) once uploads grow;
  and transcoding iPhone HEVC clips so every browser can play them.
- **Monitoring**: uptime check on `/api/health`, error tracking (e.g. Sentry).
- **CI**: run `npm test` + a build on every push (GitHub Actions).
- More tests: frontend components and a Playwright end-to-end run.
