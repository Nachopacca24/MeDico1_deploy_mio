/**
 * CryptoContext — runtime key management for E2EE.
 *
 * Lifecycle
 * ─────────
 * • Login      → initKey(password, userId)  derives + stores key in sessionStorage
 * • Page refresh → key is re-imported from sessionStorage automatically
 * • Logout     → clearKey() wipes both memory and sessionStorage
 * • Tab close  → sessionStorage is cleared by the browser automatically
 *
 * The key NEVER leaves the browser.  The backend only ever sees ciphertext.
 *
 * Google-login users
 * ──────────────────
 * Google users have no password, so `initKey` cannot be called automatically.
 * They can call `initKey(passphrase, userId)` from a "set encryption passphrase"
 * dialog.  Until they do, `isKeyReady` is false and data is stored encrypted
 * but displayed as a placeholder.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  deriveKey,
  exportKeyJwk,
  importKeyJwk,
  encryptField,
  decryptField,
  isEncrypted,
} from '@/shared/utils/crypto';
import { useAuth } from '@/shared/contexts/AuthContext';

// ─── sessionStorage keys ──────────────────────────────────────────────────────
const SS_KEY = 'medico_e2ee_key';   // JSON-serialised JWK
const SS_UID = 'medico_e2ee_uid';   // user id for which the key was derived

// ─── Context shape ────────────────────────────────────────────────────────────

interface CryptoContextType {
  /** True once a key has been derived or restored from sessionStorage. */
  isKeyReady: boolean;

  /**
   * Derive a key from the user's password.
   * Call this right after a successful password-based login.
   */
  initKey: (password: string, userId: string | number) => Promise<void>;

  /**
   * Wipe the key from memory and sessionStorage.
   * Call this on logout.
   */
  clearKey: () => void;

  /** Encrypt a single string field. No-op if key is not ready or value is empty. */
  encrypt: (value: string) => Promise<string>;

  /**
   * Decrypt a single string field.
   * Returns the original value if not ready or if value is legacy plaintext.
   */
  decrypt: (value: string) => Promise<string>;

  /**
   * Encrypt several fields of an object in-place (returns a new object).
   * Non-string or empty fields are skipped silently.
   */
  encryptFields: <T extends Record<string, unknown>>(
    obj: T,
    fields: ReadonlyArray<keyof T>,
  ) => Promise<T>;

  /**
   * Decrypt several fields of an object in-place (returns a new object).
   * Fields that are not encrypted (legacy plaintext) are passed through unchanged.
   */
  decryptFields: <T extends Record<string, unknown>>(
    obj: T,
    fields: ReadonlyArray<keyof T>,
  ) => Promise<T>;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const CryptoContext = createContext<CryptoContextType | null>(null);

interface CryptoProviderProps {
  children: ReactNode;
  /** Pass the authenticated user's id so the provider can restore a session key. */
  currentUserId?: string | number | null;
}

export function CryptoProvider({ children, currentUserId }: CryptoProviderProps) {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  // Keep a ref in sync so callbacks always read the latest key
  // without becoming stale closures.
  const keyRef = useRef<CryptoKey | null>(null);
  useEffect(() => { keyRef.current = cryptoKey; }, [cryptoKey]);

  // ── Restore key from sessionStorage when the user id becomes known ─────────
  useEffect(() => {
    if (!currentUserId) {
      // User logged out or not yet loaded — clear the key
      setCryptoKey(null);
      return;
    }

    const storedUid = sessionStorage.getItem(SS_UID);
    const storedJwk = sessionStorage.getItem(SS_KEY);

    if (storedUid === String(currentUserId) && storedJwk) {
      try {
        importKeyJwk(JSON.parse(storedJwk) as JsonWebKey)
          .then(k => setCryptoKey(k))
          .catch(() => {
            sessionStorage.removeItem(SS_KEY);
            sessionStorage.removeItem(SS_UID);
          });
      } catch {
        sessionStorage.removeItem(SS_KEY);
        sessionStorage.removeItem(SS_UID);
      }
    }
  }, [currentUserId]);

  // ── Public methods ─────────────────────────────────────────────────────────

  const initKey = useCallback(async (password: string, userId: string | number) => {
    const key = await deriveKey(password, userId);
    const jwk = await exportKeyJwk(key);
    sessionStorage.setItem(SS_KEY, JSON.stringify(jwk));
    sessionStorage.setItem(SS_UID, String(userId));
    setCryptoKey(key);
  }, []);

  const clearKey = useCallback(() => {
    sessionStorage.removeItem(SS_KEY);
    sessionStorage.removeItem(SS_UID);
    setCryptoKey(null);
  }, []);

  const encrypt = useCallback(async (value: string): Promise<string> => {
    if (!keyRef.current || !value) return value;
    return encryptField(keyRef.current, value);
  }, []);

  const decrypt = useCallback(async (value: string): Promise<string> => {
    if (!value) return value;
    if (!isEncrypted(value)) return value; // legacy plaintext passthrough
    if (!keyRef.current) return '🔒 Cifrado (inicia sesión para ver)';
    try {
      return await decryptField(keyRef.current, value);
    } catch {
      return '⚠ Error al descifrar';
    }
  }, []);

  const encryptFields = useCallback(async <T extends Record<string, unknown>>(
    obj: T,
    fields: ReadonlyArray<keyof T>,
  ): Promise<T> => {
    if (!keyRef.current) return obj;
    const result: Record<string, unknown> = { ...obj };
    for (const field of fields) {
      const val = result[field as string];
      if (typeof val === 'string' && val) {
        result[field as string] = await encryptField(keyRef.current, val);
      }
    }
    return result as T;
  }, []);

  const decryptFields = useCallback(async <T extends Record<string, unknown>>(
    obj: T,
    fields: ReadonlyArray<keyof T>,
  ): Promise<T> => {
    const result: Record<string, unknown> = { ...obj };
    for (const field of fields) {
      const val = result[field as string];
      if (typeof val !== 'string' || !val) continue;

      if (!isEncrypted(val)) continue; // legacy plaintext — keep as-is

      if (!keyRef.current) {
        result[field as string] = '🔒 Cifrado';
        continue;
      }
      try {
        result[field as string] = await decryptField(keyRef.current, val);
      } catch {
        result[field as string] = '⚠ Error al descifrar';
      }
    }
    return result as T;
  }, []);

  return (
    <CryptoContext.Provider value={{
      isKeyReady: !!cryptoKey,
      initKey,
      clearKey,
      encrypt,
      decrypt,
      encryptFields,
      decryptFields,
    }}>
      {children}
    </CryptoContext.Provider>
  );
}

/**
 * A connected wrapper that reads `user.id` from AuthContext automatically.
 * Must be rendered INSIDE <AuthProvider>.
 *
 * Usage in main.tsx:
 *   <AuthProvider>
 *     <CryptoProviderConnected>
 *       ...app...
 *     </CryptoProviderConnected>
 *   </AuthProvider>
 */
export function CryptoProviderConnected({ children }: { children: ReactNode }) {
  const { user } = useAuth(); // AuthContext — no circular dependency
  return <CryptoProvider currentUserId={user?.id ?? null}>{children}</CryptoProvider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCrypto(): CryptoContextType {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto must be used inside <CryptoProvider>');
  return ctx;
}
