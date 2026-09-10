import { useEffect, useState } from 'react';
import { api } from './api';
import { useAsync } from './hooks';
import type { User, UserRole } from './types';
import { CoachDashboard } from './components/CoachDashboard';
import { ClientDashboard } from './components/ClientDashboard';

const ACTING_KEY = 'gym-app.actingUserId';

export default function App() {
  const users = useAsync(() => api.listUsers(), []);
  const [actingId, setActingId] = useState<string | null>(
    () => localStorage.getItem(ACTING_KEY),
  );

  useEffect(() => {
    if (actingId) localStorage.setItem(ACTING_KEY, actingId);
  }, [actingId]);

  const acting = users.data?.find((u) => u.id === actingId) ?? null;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <strong>🏋️ gym-app</strong>
          <span>powerlifting &amp; bodybuilding coaching</span>
        </div>
        {users.data && users.data.length > 0 && (
          <div>
            <label>Acting as</label>
            <select
              value={actingId ?? ''}
              onChange={(e) => setActingId(e.target.value || null)}
            >
              <option value="">— choose a user —</option>
              {users.data.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {users.error && <div className="err">{users.error}</div>}
      {users.loading && <p className="muted">Loading…</p>}

      {users.data && users.data.length === 0 && (
        <CreateFirstUser onCreated={users.reload} />
      )}

      {users.data && users.data.length > 0 && !acting && (
        <div className="panel">
          <h2>Pick who you are</h2>
          <p className="muted">
            This demo has no login yet — choose a user in the top-right to act as
            a coach or a client.
          </p>
          <CreateUserInline onCreated={users.reload} />
        </div>
      )}

      {acting?.role === 'COACH' && <CoachDashboard coach={acting} />}
      {acting?.role === 'CLIENT' && <ClientDashboard client={acting} />}
    </div>
  );
}

function CreateFirstUser({ onCreated }: { onCreated: () => void }) {
  return (
    <div className="panel">
      <h2>Welcome — create your first user</h2>
      <p className="muted">
        Make a coach and a client to try the full flow. (Or run{' '}
        <code>npm run seed --workspace api</code> for demo data.)
      </p>
      <CreateUserInline onCreated={onCreated} />
    </div>
  );
}

function CreateUserInline({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'COACH' as UserRole,
  });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.createUser(form);
      setForm({ name: '', email: '', password: '', role: form.role });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="err">{error}</div>}
      <div className="row">
        <div>
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Password (min 8)</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as UserRole })
            }
          >
            <option value="COACH">Coach</option>
            <option value="CLIENT">Client</option>
          </select>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button disabled={busy}>Create</button>
        </div>
      </div>
    </form>
  );
}

export type { User };
