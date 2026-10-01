#!/usr/bin/env node
/**
 * Smoke test for a running gym-app: is it up, and is the security holding?
 *
 *   node scripts/smoke-test.mjs [baseUrl]
 *
 * baseUrl defaults to http://localhost:8080 (Docker). Two accounts are
 * needed for the "can't touch someone else's data" checks:
 *
 *   SMOKE_USER_A=alex@example.com SMOKE_PASS_A=... \
 *   SMOKE_USER_B=sam@example.com  SMOKE_PASS_B=... \
 *   node scripts/smoke-test.mjs https://gym.example.com
 *
 * (Without them it falls back to the seeded demo accounts.)
 *
 * Safe against production: it only reads, and every write it tries is one
 * that must be refused — nothing is created, changed or deleted.
 */

const base = (process.argv[2] ?? 'http://localhost:8080').replace(/\/$/, '');
const accountA = { email: process.env.SMOKE_USER_A ?? 'alex@example.com', password: process.env.SMOKE_PASS_A ?? 'password123' };
const accountB = { email: process.env.SMOKE_USER_B ?? 'sam@example.com', password: process.env.SMOKE_PASS_B ?? 'password123' };

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok || !detail ? '' : `  — ${detail}`}`);
  if (!ok) failures++;
}

async function call(path, { cookie, method = 'GET', body } = {}) {
  const res = await fetch(base + '/api' + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, json, headers: res.headers };
}

async function login(account) {
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const user = res.ok ? await res.json() : undefined;
  return { status: res.status, user, setCookie, cookie: setCookie.split(';')[0] };
}

console.log(`Smoke-testing ${base}\n`);

console.log('Up');
const health = await call('/health').catch((e) => ({ status: 0, error: e.message }));
check('API health endpoint answers', health.status === 200, `got ${health.status} ${health.error ?? ''}`);
const page = await fetch(base + '/').catch(() => ({ status: 0 }));
check('web app page loads', page.status === 200, `got ${page.status}`);
if (health.status !== 200) {
  console.log('\nNot reachable — stopping.');
  process.exit(1);
}

console.log('\nLogged out');
check('history needs login', (await call('/users/x/workout-sessions')).status === 401);
check('user search needs login', (await call('/users?q=a')).status === 401);
check('videos need login', (await call('/set-logs/00000000-0000-0000-0000-000000000000/video')).status === 401);
check('wrong password is refused', (await login({ ...accountA, password: 'definitely-wrong' })).status === 401);

console.log('\nLogged in');
const a = await login(accountA);
const b = await login(accountB);
check(`log in as ${accountA.email}`, a.status === 200, `got ${a.status}`);
check(`log in as ${accountB.email}`, b.status === 200, `got ${b.status}`);
if (!a.user || !b.user) {
  console.log('\nCould not log in both accounts — stopping.');
  process.exit(1);
}
check('session cookie is HttpOnly', /httponly/i.test(a.setCookie));
check('session cookie is SameSite', /samesite=lax|samesite=strict/i.test(a.setCookie));
if (base.startsWith('https://')) check('session cookie is Secure (HTTPS only)', /;\s*secure/i.test(a.setCookie));
const me = await call('/auth/me', { cookie: a.cookie });
check('/auth/me returns the logged-in user', me.json?.id === a.user.id);
check('own history readable', (await call(`/users/${a.user.id}/workout-sessions`, { cookie: a.cookie })).status === 200);
check('own stats readable', (await call(`/users/${a.user.id}/progress`, { cookie: a.cookie })).status === 200);
check('own body weight readable', (await call(`/users/${a.user.id}/body-weight`, { cookie: a.cookie })).status === 200);
const exercises = await call(`/exercises?userId=${a.user.id}`, { cookie: a.cookie });
check('exercise library loads', exercises.status === 200 && Array.isArray(exercises.json) && exercises.json.length > 0);

console.log("\nCan't touch someone else's data");
const other = b.user.id;
check("can't read another user's history", (await call(`/users/${other}/workout-sessions`, { cookie: a.cookie })).status === 403);
check("can't read another user's body weight", (await call(`/users/${other}/body-weight`, { cookie: a.cookie })).status === 403);
check("can't list everyone", JSON.stringify((await call('/users', { cookie: a.cookie })).json) === '[]');
check(
  "can't log a workout as someone else",
  (await call('/workout-sessions', { cookie: a.cookie, method: 'POST', body: { userId: other, date: '2000-01-01', sets: [] } })).status === 403,
);
check(
  "can't add body weight for someone else",
  (await call(`/users/${other}/body-weight`, { cookie: a.cookie, method: 'POST', body: { date: '2000-01-01', weight: 80 } })).status === 403,
);
check(
  "can't create an exercise in someone else's library",
  (await call('/exercises', { cookie: a.cookie, method: 'POST', body: { ownerId: other, name: 'x', category: 'COMPOUND', primaryMuscle: 'x' } })).status === 403,
);
const forged = await call('/auth/me', { cookie: 'gym_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.forged' });
check('a forged session token is refused', forged.status === 401);

console.log('\nLogout');
const out = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: a.cookie } });
check('logout clears the cookie', /gym_session=;/.test(out.headers.get('set-cookie') ?? ''));

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
