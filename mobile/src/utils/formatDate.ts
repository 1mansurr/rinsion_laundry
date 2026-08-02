// Mirrors src/utils/formatDate.ts's output ("2 August 2026") without relying
// on toLocaleDateString's ICU locale data, which Hermes doesn't reliably
// bundle on Android — a plain lookup table works everywhere.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
