/** Stable client-side keys for list items that get dragged around (never sent to the API). */
let last = 0;
export const newKey = () => `k${++last}`;
