import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeReferralToClipboard, readReferralFromClipboard, resolvePendingReferralCode } from './referralClipboard';

function mockClipboard(overrides: { writeText?: any; readText?: any } = {}) {
  const writeText = overrides.writeText ?? vi.fn().mockResolvedValue(undefined);
  const readText = overrides.readText ?? vi.fn().mockResolvedValue('');
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText, readText },
    configurable: true,
    writable: true,
  });
  return { writeText, readText };
}

const HOUR = 60 * 60 * 1000;

describe('referralClipboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('writeReferralToClipboard', () => {
    it('writes the marker with the code and a fresh timestamp', async () => {
      const before = Date.now();
      const { writeText } = mockClipboard();

      await writeReferralToClipboard('ABC123');

      expect(writeText).toHaveBeenCalledTimes(1);
      const written = writeText.mock.calls[0][0] as string;
      expect(written.startsWith('MEDICO-REF:ABC123:')).toBe(true);
      const ts = Number(written.split(':')[2]);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(Date.now());
    });

    it('never throws even if the clipboard API rejects — the store redirect must still happen', async () => {
      mockClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });

      await expect(writeReferralToClipboard('ABC123')).resolves.toBeUndefined();
    });
  });

  describe('readReferralFromClipboard', () => {
    it('extracts a fresh code', async () => {
      mockClipboard({ readText: vi.fn().mockResolvedValue(`MEDICO-REF:ABC123:${Date.now()}`) });

      await expect(readReferralFromClipboard()).resolves.toBe('ABC123');
    });

    it('returns null when the clipboard has unrelated content (a verification code, a WiFi password, etc.)', async () => {
      mockClipboard({ readText: vi.fn().mockResolvedValue('123456') });

      await expect(readReferralFromClipboard()).resolves.toBeNull();
    });

    it('returns null for a marker older than the 48h TTL', async () => {
      const staleTs = Date.now() - 49 * HOUR;
      mockClipboard({ readText: vi.fn().mockResolvedValue(`MEDICO-REF:ABC123:${staleTs}`) });

      await expect(readReferralFromClipboard()).resolves.toBeNull();
    });

    it('accepts a marker just under the 48h TTL', async () => {
      const freshTs = Date.now() - 47 * HOUR;
      mockClipboard({ readText: vi.fn().mockResolvedValue(`MEDICO-REF:ABC123:${freshTs}`) });

      await expect(readReferralFromClipboard()).resolves.toBe('ABC123');
    });

    it('returns null for a marker with no timestamp (pre-TTL format) instead of trusting it indefinitely', async () => {
      mockClipboard({ readText: vi.fn().mockResolvedValue('MEDICO-REF:ABC123') });

      await expect(readReferralFromClipboard()).resolves.toBeNull();
    });

    it('returns null when the clipboard read is denied', async () => {
      mockClipboard({ readText: vi.fn().mockRejectedValue(new Error('denied')) });

      await expect(readReferralFromClipboard()).resolves.toBeNull();
    });

    it('trims and uppercases the extracted code', async () => {
      mockClipboard({ readText: vi.fn().mockResolvedValue(`MEDICO-REF: abc123 :${Date.now()}`) });

      await expect(readReferralFromClipboard()).resolves.toBe('ABC123');
    });
  });

  describe('resolvePendingReferralCode', () => {
    it('prefers an already-known localStorage code and never touches the clipboard', async () => {
      localStorage.setItem('referral_code', 'FROMSTORAGE');
      const { readText } = mockClipboard();

      await expect(resolvePendingReferralCode()).resolves.toBe('FROMSTORAGE');
      expect(readText).not.toHaveBeenCalled();
    });

    it('falls back to the clipboard and persists what it finds to localStorage', async () => {
      mockClipboard({ readText: vi.fn().mockResolvedValue(`MEDICO-REF:FROMCLIP:${Date.now()}`) });

      await expect(resolvePendingReferralCode()).resolves.toBe('FROMCLIP');
      expect(localStorage.getItem('referral_code')).toBe('FROMCLIP');
    });

    it('returns null and leaves localStorage untouched when nothing is found anywhere', async () => {
      mockClipboard({ readText: vi.fn().mockResolvedValue('') });

      await expect(resolvePendingReferralCode()).resolves.toBeNull();
      expect(localStorage.getItem('referral_code')).toBeNull();
    });
  });
});
