import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

/** A vertical list whose items can be dragged into a new order by their grip handle. */
export function SortableList({
  ids,
  onMove,
  children,
}: {
  ids: string[];
  /** Called with the dragged item's id and the id it was dropped on. */
  onMove: (activeId: string, overId: string) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    // A few px of movement before a drag starts, so a tap on the handle isn't a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id) onMove(String(e.active.id), String(e.over.id));
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * One draggable item. `children` gets the grip handle to render wherever
 * it fits — only the handle starts a drag, so inputs and swipes in the
 * rest of the item keep working.
 */
export function SortableItem({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="drag-handle"
      aria-label="Drag to reorder"
      data-no-swipe
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''}${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(handle)}
    </div>
  );
}
