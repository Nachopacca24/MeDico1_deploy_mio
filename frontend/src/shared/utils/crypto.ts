/**
 * E2EE crypto primitives for MéDico.
 *
 * Algorithm : AES-256-GCM  (authenticated encryption)
 * Key derivation: PBKDF2-SHA256, 310 000 iterations (NIST SP 800-132 recommendation)
 * IV  : 12 random bytes per field per save (never reused)
 *
 * Wire format (stored in DB as TEXT):
 *   "e2ee:v1:<base64(iv)>:<base64(ciphertext+tag)>"
 *
 * Plaintext values that do NOT start with this prefix are treated as
 * legacy unencrypted data and passed through unchanged — this allows
 * a zero-downtime migration where old and new records coexist.
 *
 * The backend stores and returns ciphertext as-is; it cannot decrypt.
 */

export const E2EE_PREFIX = 'e2ee:v1:';

const PBKDF2_ITERATIONS = 310_000;
const AES_KEY_BITS = 256;
const IV_BYTES = 12; // 96 bits — GCM standard
// Salt suffix mixed with userId makes each user's key unique even if they share a password
const SALT_SUFFIX = ':medico-e2ee-v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toB64(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)));
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(E2EE_PREFIX);
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from the user's password.
 * The key is extractable so it can be persisted to sessionStorage (see CryptoContext).
 * Salt is non-secret; it only needs to be unique per user and stable over time.
 */
export async function deriveKey(password: string, userId: string | number): Promise<CryptoKey> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`${userId}${SALT_SUFFIX}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    true,                     // extractable — allows sessionStorage persistence
    ['encrypt', 'decrypt'],
  );
}

/** Export a CryptoKey to JWK so it can be stored in sessionStorage. */
export async function exportKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

/** Import a JWK back to a CryptoKey. */
export async function importKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a single string field.
 * Returns the e2ee:v1 wire format.
 * Empty / nullish values are returned unchanged.
 */
export async function encryptField(key: CryptoKey, plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );

  return `${E2EE_PREFIX}${toB64(iv)}:${toB64(ciphertext)}`;
}

/**
 * Decrypt a single field.
 * If the value does not start with the e2ee prefix it is returned as-is
 * (backward-compatible with existing plaintext records).
 */
export async function decryptField(key: CryptoKey, value: string): Promise<string> {
  if (!isEncrypted(value)) return value; // legacy plaintext passthrough

  const payload = value.slice(E2EE_PREFIX.length);
  const sep = payload.indexOf(':');
  if (sep === -1) throw new Error('E2EE: malformed ciphertext — missing separator');

  const iv = fromB64(payload.slice(0, sep));
  const ciphertext = fromB64(payload.slice(sep + 1));

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Re-encrypt all encrypted fields in an object from oldKey → newKey.
 * Used during password change.
 */
export async function reEncryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  oldKey: CryptoKey,
  newKey: CryptoKey,
): Promise<T> {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string' && isEncrypted(val)) {
      const plain = await decryptField(oldKey, val);
      (result as Record<string, unknown>)[field as string] = await encryptField(newKey, plain);
    }
  }
  return result;
}
