import { createPortal } from 'react-dom';

/**
 * Renders a pop-up (sheet, player, dialog) at the end of <body>. Rows that
 * can be swiped or dragged each form their own stacking layer, so a
 * pop-up opened from inside one would otherwise be painted *under* the
 * rows that follow it.
 */
export function Overlay({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
