import { api } from '../api';
import { useAsync } from '../hooks';
import { SessionList } from './SessionList';
import { ProgressPanel } from './ProgressPanel';

/**
 * The "see what my client did" view. Same session + progress data the client
 * sees, but fetched through the coach-scoped endpoints (which check the
 * coaching relationship on the server).
 */
export function ClientReview({
  coachId,
  clientId,
  onClose,
}: {
  coachId: string;
  clientId: string;
  onClose: () => void;
}) {
  const sessions = useAsync(
    () => api.coachViewHistory(coachId, clientId),
    [coachId, clientId],
  );
  const progress = useAsync(
    () => api.coachViewProgress(coachId, clientId),
    [coachId, clientId],
  );

  return (
    <div className="panel">
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h2>Client review</h2>
        <button className="ghost small" onClick={onClose}>
          Close
        </button>
      </div>

      {(sessions.error || progress.error) && (
        <div className="err">{sessions.error ?? progress.error}</div>
      )}

      <h3>Recent sessions</h3>
      <SessionList sessions={sessions.data ?? []} />

      <h3 style={{ marginTop: '1.25rem' }}>Progress</h3>
      <ProgressPanel data={progress.data ?? []} />
    </div>
  );
}
