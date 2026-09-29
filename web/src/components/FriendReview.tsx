import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import { SessionList } from './SessionList';
import { ProgressPanel } from './ProgressPanel';

/**
 * "See what my friend is up to." Progress is visible to any friend. Full
 * session history and their programs are only visible if you're an
 * accepted coach of theirs — a plain friend doesn't get that detail.
 */
export function FriendReview({
  viewerId,
  friendId,
  friendName,
  onClose,
  onProgramsChanged,
  onCoachingChanged,
}: {
  viewerId: string;
  friendId: string;
  friendName: string;
  onClose: () => void;
  onProgramsChanged?: () => void;
  onCoachingChanged?: () => void;
}) {
  const myClients = useAsync(() => api.myClients(viewerId), [viewerId]);
  const myClientLink = myClients.data?.find((c) => c.client.id === friendId);
  const isCoach = !!myClientLink;

  const outgoingCoachRequests = useAsync(
    () => api.coachingRequests(viewerId, 'outgoing'),
    [viewerId],
  );
  const pendingCoachRequest = outgoingCoachRequests.data?.find(
    (r) => r.client.id === friendId,
  );

  const progress = useAsync(
    () => api.friendProgress(viewerId, friendId),
    [viewerId, friendId],
  );
  const sessions = useAsync(
    () => (isCoach ? api.friendHistory(viewerId, friendId) : Promise.resolve([])),
    [viewerId, friendId, isCoach],
  );
  const theirPrograms = useAsync(
    () => (isCoach ? api.clientPrograms(viewerId, friendId) : Promise.resolve([])),
    [viewerId, friendId, isCoach],
  );

  const myPrograms = useAsync(() => api.listPrograms(viewerId), [viewerId]);
  const [msg, setMsg] = useState<string>();
  const [busyId, setBusyId] = useState<string>();

  function refreshCoaching() {
    myClients.reload();
    outgoingCoachRequests.reload();
    onCoachingChanged?.();
  }

  async function askToCoach() {
    setMsg(undefined);
    try {
      await api.requestCoaching(viewerId, friendId);
      setMsg(`Asked to become ${friendName}'s coach.`);
      refreshCoaching();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function stopCoaching() {
    if (!myClientLink) return;
    setMsg(undefined);
    try {
      await api.endCoaching(myClientLink.coachingId, viewerId);
      setMsg(`Stopped coaching ${friendName}.`);
      refreshCoaching();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function share(programId: string, programName: string) {
    setBusyId(programId);
    setMsg(undefined);
    try {
      await api.shareProgram(programId, viewerId, friendId);
      setMsg(`Shared "${programName}" with ${friendName}.`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusyId(undefined);
    }
  }

  async function unshare(programId: string, programName: string) {
    setBusyId(programId);
    setMsg(undefined);
    try {
      await api.unshareProgram(programId, viewerId, friendId);
      setMsg(`Unshared "${programName}" from ${friendName}.`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusyId(undefined);
    }
  }

  async function sendCopy(programId: string, programName: string) {
    setBusyId(programId);
    setMsg(undefined);
    try {
      await api.copyProgram(programId, friendId);
      setMsg(`Sent "${programName}" to ${friendName} as their own program.`);
      onProgramsChanged?.();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="panel">
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h2>{friendName}</h2>
        <button className="ghost small" onClick={onClose}>
          Close
        </button>
      </div>

      {isCoach ? (
        <div className="row" style={{ alignItems: 'center' }}>
          <p className="pr" style={{ margin: 0 }}>
            You coach {friendName} — you can see their history and programs.
          </p>
          <button type="button" className="ghost small" onClick={stopCoaching}>
            Stop coaching
          </button>
        </div>
      ) : pendingCoachRequest ? (
        <p className="muted">Coaching request sent — waiting on {friendName} to accept.</p>
      ) : (
        <div className="row" style={{ alignItems: 'center' }}>
          <p className="muted" style={{ margin: 0 }}>
            As a friend you can see their progress. Ask to become their coach to also see
            their full history and programs.
          </p>
          <button type="button" className="ghost small" onClick={askToCoach}>
            Ask to become their coach
          </button>
        </div>
      )}

      {(sessions.error || progress.error || myPrograms.error) && (
        <div className="err">{sessions.error ?? progress.error ?? myPrograms.error}</div>
      )}
      {msg && <p className="pr">{msg}</p>}

      <h3 style={{ marginTop: '1rem' }}>Share your programs with {friendName}</h3>
      {myPrograms.data && myPrograms.data.length === 0 && (
        <p className="muted">You don't have any programs yet.</p>
      )}
      {(myPrograms.data ?? []).map((p) => (
        <div
          key={p.id}
          className="row"
          style={{ justifyContent: 'space-between', marginBottom: '.5rem' }}
        >
          <div>
            <strong>{p.name}</strong>{' '}
            <span className="muted">
              {p.days.length} day{p.days.length === 1 ? '' : 's'} · {p.lengthWeeks} wk
            </span>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button
              className="ghost small"
              disabled={busyId === p.id}
              onClick={() => share(p.id, p.name)}
            >
              Share
            </button>{' '}
            <button
              className="ghost small"
              disabled={busyId === p.id}
              onClick={() => unshare(p.id, p.name)}
            >
              Unshare
            </button>{' '}
            {isCoach && (
              <button
                className="ghost small"
                disabled={busyId === p.id}
                onClick={() => sendCopy(p.id, p.name)}
                title="Give them their own independent, editable copy"
              >
                Send a copy
              </button>
            )}
          </div>
        </div>
      ))}

      {isCoach && (
        <>
          <h3 style={{ marginTop: '1.25rem' }}>{friendName}'s programs</h3>
          {theirPrograms.data && theirPrograms.data.length === 0 && (
            <p className="muted">No programs yet.</p>
          )}
          {(theirPrograms.data ?? []).map((p) => (
            <div key={p.id} style={{ marginBottom: '.4rem' }}>
              <strong>{p.name}</strong>{' '}
              <span className="muted">
                {p.days.length} day{p.days.length === 1 ? '' : 's'} · {p.lengthWeeks} wk
              </span>
            </div>
          ))}

          <h3 style={{ marginTop: '1.25rem' }}>Recent sessions</h3>
          <SessionList sessions={sessions.data ?? []} />
        </>
      )}

      <h3 style={{ marginTop: '1.25rem' }}>Progress</h3>
      <ProgressPanel data={progress.data ?? []} />
    </div>
  );
}
