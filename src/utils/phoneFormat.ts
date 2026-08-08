/**
 * Utility functions for Uzbek phone number formatting and validation.
 * Mask format: +998(XX) XXX-XX-XX
 * Clean format: +998XXXXXXXXX (used for database/state storage)
 */

export function extractUzbekDigits(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('8') && digits.length === 10) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

export function isUzbekPhoneValid(phoneStr: string): boolean {
  if (!phoneStr) return false;
  const digits = extractUzbekDigits(phoneStr);
  return digits.length === 9;
}

export function getCleanPhone(raw: string): string {
  const digits = extractUzbekDigits(raw);
  if (digits.length === 0) return '';
  return `+998${digits}`;
}

export function formatPhoneInput(raw: string): string {
  const digits = extractUzbekDigits(raw);
  const len = digits.length;
  if (len === 0) return '+998(';
  if (len <= 2) return `+998(${digits}`;
  if (len <= 5) return `+998(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (len <= 7) return `+998(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5)}`;
  return `+998(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
}
