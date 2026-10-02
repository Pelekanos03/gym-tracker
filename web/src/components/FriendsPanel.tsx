import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { User } from '../types';
import { FriendReview } from './FriendReview';

export function FriendsPanel({
  me,
  onProgramsChanged,
  onRequestsChanged,
}: {
  me: User;
  onProgramsChanged?: () => void;
  onRequestsChanged?: () => void;
}) {
  const friends = useAsync(() => api.friendsOf(me.id), [me.id]);
  const incoming = useAsync(
    () => api.friendRequests(me.id, 'incoming'),
    [me.id],
  );
  const outgoing = useAsync(
    () => api.friendRequests(me.id, 'outgoing'),
    [me.id],
  );
  const coachIncoming = useAsync(
    () => api.coachingRequests(me.id, 'incoming'),
    [me.id],
  );
  const coachOutgoing = useAsync(
    () => api.coachingRequests(me.id, 'outgoing'),
    [me.id],
  );
  const myCoaches = useAsync(() => api.myCoaches(me.id), [me.id]);
  const myClients = useAsync(() => api.myClients(me.id), [me.id]);
  const [reviewing, setReviewing] = useState<User | null>(null);

  function refreshAll() {
    friends.reload();
    incoming.reload();
    outgoing.reload();
    onRequestsChanged?.();
  }

  function refreshCoaching() {
    coachIncoming.reload();
    coachOutgoing.reload();
    myCoaches.reload();
    myClients.reload();
  }

  return (
    <div className="grid cols-2">
      <div className="panel">
        <h2>Your friends</h2>
        {friends.error && <div className="err">{friends.error}</div>}
        <div className="table-scroll people">
        <table>
          <tbody>
            {(friends.data ?? []).map((f) => (
              <tr key={f.friendshipId}>
                <td>
                  <strong>{f.friend.name}</strong>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="ghost small"
                    onClick={() => setReviewing(f.friend)}
                  >
                    View
                  </button>{' '}
                  <button
                    className="ghost small"
                    onClick={async () => {
                      await api.unfriend(f.friendshipId, me.id);
                      refreshAll();
                    }}
                  >
                    Unfriend
                  </button>
                </td>
              </tr>
            ))}
            {friends.data?.length === 0 && (
              <tr>
                <td className="muted">No friends yet — add one on the right.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {(incoming.data?.length ?? 0) > 0 && (
          <>
            <h3 style={{ marginTop: '1rem' }}>Requests</h3>
            <div className="table-scroll people">
            <table>
              <tbody>
                {incoming.data!.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.from.name}</strong>{' '}
                      <span className="muted">wants to be friends</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="small"
                        onClick={async () => {
                          await api.acceptFriendRequest(r.id, me.id);
                          refreshAll();
                        }}
                      >
                        Accept
                      </button>{' '}
                      <button
                        className="ghost small"
                        onClick={async () => {
                          await api.declineFriendRequest(r.id, me.id);
                          refreshAll();
                        }}
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}

        {(outgoing.data?.length ?? 0) > 0 && (
          <>
            <h3 style={{ marginTop: '1rem' }}>Sent, awaiting reply</h3>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {outgoing.data!.map((r) => (
                <li key={r.id} className="muted">
                  {r.to.name}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Add a friend</h2>
        <AddFriend me={me} onSent={outgoing.reload} />
      </div>

      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <h2>Coaching</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          A coach can see a client's full workout history and programs — more than a plain
          friend sees (just progress). It only ever builds on an existing friendship, and
          the client has to accept before anything is visible.
        </p>

        {(coachIncoming.data?.length ?? 0) > 0 && (
          <>
            <h3>Requests to coach you</h3>
            <div className="table-scroll people">
              <table>
                <tbody>
                  {coachIncoming.data!.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.coach.name}</strong>{' '}
                        <span className="muted">wants to be your coach</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="small"
                          onClick={async () => {
                            await api.acceptCoaching(r.id, me.id);
                            refreshCoaching();
                          }}
                        >
                          Accept
                        </button>{' '}
                        <button
                          className="ghost small"
                          onClick={async () => {
                            await api.declineCoaching(r.id, me.id);
                            refreshCoaching();
                          }}
                        >
                          Decline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(coachOutgoing.data?.length ?? 0) > 0 && (
          <>
            <h3 style={{ marginTop: '1rem' }}>Coaching requests you sent</h3>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {coachOutgoing.data!.map((r) => (
                <li key={r.id} className="muted">
                  {r.client.name} — awaiting their acceptance
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="grid cols-2" style={{ marginTop: '1rem' }}>
          <div>
            <h3>Coaching you</h3>
            {(myCoaches.data?.length ?? 0) === 0 && <p className="muted">No one, yet.</p>}
            {(myCoaches.data ?? []).map((c) => (
              <div
                key={c.coachingId}
                className="row-between"
              >
                <span>{c.coach.name}</span>
                <button
                  className="ghost small"
                  onClick={async () => {
                    await api.endCoaching(c.coachingId, me.id);
                    refreshCoaching();
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div>
            <h3>People you coach</h3>
            {(myClients.data?.length ?? 0) === 0 && <p className="muted">No one, yet.</p>}
            {(myClients.data ?? []).map((c) => (
              <div
                key={c.coachingId}
                className="row-between"
              >
                <span>{c.client.name}</span>
                <button
                  className="ghost small"
                  onClick={async () => {
                    await api.endCoaching(c.coachingId, me.id);
                    refreshCoaching();
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {reviewing && (
        <div style={{ gridColumn: '1 / -1' }}>
          <FriendReview
            viewerId={me.id}
            friendId={reviewing.id}
            friendName={reviewing.name}
            onClose={() => setReviewing(null)}
            onProgramsChanged={onProgramsChanged}
            onCoachingChanged={refreshCoaching}
          />
        </div>
      )}
    </div>
  );
}

function AddFriend({ me, onSent }: { me: User; onSent: () => void }) {
  const [q, setQ] = useState('');
  const results = useAsync(() => (q.trim() ? api.listUsers(q) : Promise.resolve([])), [q]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();

  async function send(userId: string) {
    setError(undefined);
    try {
      await api.sendFriendRequest(me.id, userId);
      setSentTo((s) => new Set(s).add(userId));
      onSent();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      {error && <div className="err">{error}</div>}
      <div className="field">
        <label>Search by name, or their full email</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. sam" />
      </div>
      <div className="table-scroll people">
      <table>
        <tbody>
          {(results.data ?? [])
            .filter((u) => u.id !== me.id)
            .map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="small"
                    disabled={sentTo.has(u.id)}
                    onClick={() => send(u.id)}
                  >
                    {sentTo.has(u.id) ? 'Sent' : 'Add friend'}
                  </button>
                </td>
              </tr>
            ))}
          {q.trim() && results.data?.length === 0 && (
            <tr>
              <td className="muted">No matches.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
