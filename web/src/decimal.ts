/**
 * Cleans what's typed into a decimal field (weight, RPE, distance).
 *
 * These fields are type="text" with inputMode="decimal", not type="number":
 * on an iPhone set to a comma-decimal region (Greece, Cyprus, most of
 * Europe) the keypad offers "," — and Safari's number input treats "82,5"
 * as invalid and hands the app an empty value, so the weight vanishes.
 * Here a comma becomes a dot and anything that isn't part of a number is dropped.
 */
export function decimalInput(raw: string): string {
  const s = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  return dot < 0 ? s : s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
}
