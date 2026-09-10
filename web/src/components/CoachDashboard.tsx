import { useMemo, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { Program, User } from '../types';
import { ProgramBuilder } from './ProgramBuilder';
import { ClientReview } from './ClientReview';

/**
 * What a coach does here:
 *  1. manage their roster of clients
 *  2. build training programs
 *  3. assign a program to a client
 *  4. review what a client actually did (sessions + progress)
 */
export function CoachDashboard({ coach }: { coach: User }) {
  const roster = useAsync(() => api.roster(coach.id), [coach.id]);
  const allClients = useAsync(() => api.listUsers('CLIENT'), []);
  const programs = useAsync(() => api.listPrograms(coach.id), [coach.id]);

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const unlinked = useMemo(() => {
    const onRoster = new Set(roster.data?.map((r) => r.client.id));
    return (allClients.data ?? []).filter((c) => !onRoster.has(c.id));
  }, [roster.data, allClients.data]);

  return (
    <>
      <div className="grid cols-2">
        <div className="panel">
          <h2>Your clients</h2>
          {roster.error && <div className="err">{roster.error}</div>}
          <table>
            <tbody>
              {(roster.data ?? []).map((r) => (
                <tr key={r.relationshipId}>
                  <td>
                    <strong>{r.client.name}</strong>
                    <br />
                    <span className="muted">{r.client.email}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="ghost small"
                      onClick={() => setSelectedClientId(r.client.id)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {roster.data?.length === 0 && (
                <tr>
                  <td className="muted">No clients yet — add one below.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="row" style={{ marginTop: '.75rem' }}>
            <div>
              <label>Add a client to your roster</label>
              <select
                value=""
                onChange={async (e) => {
                  if (!e.target.value) return;
                  await api.addClient(coach.id, e.target.value);
                  roster.reload();
                }}
              >
                <option value="">
                  {unlinked.length ? '— select client —' : 'no unlinked clients'}
                </option>
                {unlinked.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Your programs</h2>
          {programs.error && <div className="err">{programs.error}</div>}
          <ProgramList
            programs={programs.data ?? []}
            roster={roster.data ?? []}
            coachId={coach.id}
          />
        </div>
      </div>

      <div className="panel">
        <h2>New program</h2>
        <ProgramBuilder coachId={coach.id} onCreated={programs.reload} />
      </div>

      {selectedClientId && (
        <ClientReview
          coachId={coach.id}
          clientId={selectedClientId}
          onClose={() => setSelectedClientId('')}
        />
      )}
    </>
  );
}

function ProgramList({
  programs,
  roster,
  coachId,
}: {
  programs: Program[];
  roster: { client: User }[];
  coachId: string;
}) {
  const [msg, setMsg] = useState<string>();

  if (programs.length === 0) {
    return <p className="muted">No programs yet — build one below.</p>;
  }

  return (
    <>
      {msg && <p className="pr">{msg}</p>}
      <table>
        <thead>
          <tr>
            <th>Program</th>
            <th>Days</th>
            <th>Assign to</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.name}</strong>
                <br />
                <span className="tag">{p.discipline}</span>{' '}
                <span className="muted">{p.lengthWeeks} wk</span>
              </td>
              <td>{p.days.length}</td>
              <td>
                <select
                  value=""
                  onChange={async (e) => {
                    if (!e.target.value) return;
                    await api.assignProgram(p.id, {
                      coachId,
                      clientId: e.target.value,
                    });
                    setMsg(`Assigned "${p.name}".`);
                  }}
                >
                  <option value="">— client —</option>
                  {roster.map((r) => (
                    <option key={r.client.id} value={r.client.id}>
                      {r.client.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
