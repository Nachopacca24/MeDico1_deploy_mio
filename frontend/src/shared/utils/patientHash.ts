/**
 * One-way SHA-256 hash for patient identifiers.
 * Stored in DB as 64 hex chars — the original name is never recoverable.
 * Doctor identifies cases by date/hospital/procedures, not by name.
 */

export async function hashPatientField(value: string): Promise<string> {
  if (!value.trim()) return '';
  const encoded = new TextEncoder().encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns true if value is a 64-char hex SHA-256 hash (already hashed). */
export function isPatientHash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/** Short display label for a patient hash: "#A3F4B2C8" */
export function formatPatientHash(value: string): string {
  if (isPatientHash(value)) {
    return `#${value.slice(0, 8).toUpperCase()}`;
  }
  return value; // legacy plaintext — show as-is
}
