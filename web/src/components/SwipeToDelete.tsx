import { useRef, useState } from 'react';
import { useIsPhone } from '../hooks';

const OPEN = 88; // px the row slides to reveal the button
const THRESHOLD = 44; // past this on release it stays open

/**
 * Phone gesture for removing something: swipe the row left or right and a
 * red Delete button is revealed on that side — nothing is deleted until
 * it's tapped. Swiping back (or tapping the row) closes it again.
 *
 * Only active at phone width; on desktop it renders the row untouched
 * (desktop keeps its ✕ buttons). Elements marked `data-no-swipe` (drag
 * handles) never start a swipe, and a mostly-vertical movement is left to
 * the browser so the page still scrolls.
 */
export function SwipeToDelete({
  onDelete,
  label = 'Delete',
  onPanel = false,
  children,
}: {
  onDelete: () => void;
  label?: string;
  /** The row sits directly on a panel (not inside a darker box) — match its background. */
  onPanel?: boolean;
  children: React.ReactNode;
}) {
  const isPhone = useIsPhone();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; base: number; axis?: 'x' | 'y'; id: number }>(null);
  /** Set after a sideways swipe, so the click that ends it doesn't also press a button. */
  const swiped = useRef(false);

  if (!isPhone) return <>{children}</>;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    swiped.current = false;
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) return;
    gesture.current = { x: e.clientX, y: e.clientY, base: offset, id: e.pointerId };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'x') {
        e.currentTarget.setPointerCapture(e.pointerId);
        swiped.current = true;
        setDragging(true);
      }
    }
    if (g.axis !== 'x') return;
    setOffset(Math.max(-OPEN * 1.2, Math.min(OPEN * 1.2, g.base + dx)));
  }

  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!g?.axis) {
      // A plain tap on an open row closes it.
      if (offset !== 0) setOffset(0);
      return;
    }
    if (g.axis === 'x') {
      setOffset(offset <= -THRESHOLD ? -OPEN : offset >= THRESHOLD ? OPEN : 0);
    }
  }

  return (
    <div className="swipe">
      {offset > 0 && (
        <button type="button" className="swipe-action left" onClick={onDelete}>
          {label}
        </button>
      )}
      {offset < 0 && (
        <button type="button" className="swipe-action right" onClick={onDelete}>
          {label}
        </button>
      )}
      <div
        className={`swipe-content${dragging ? ' dragging' : ''}${onPanel ? ' on-panel' : ''}`}
        onClickCapture={(e) => {
          if (swiped.current) {
            swiped.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
