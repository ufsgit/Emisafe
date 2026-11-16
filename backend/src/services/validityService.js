const config = require('../config/env');

/**
 * Calculates current validity status for a certificate dynamically.
 * Validity is never stored manually - this is the single source of truth.
 *
 * @param {string|Date} expiryDate
 * @param {'Pass'|'Fail'} status
 * @returns {{ validityStatus: 'Valid' | 'Expiring Soon' | 'Expired' | 'Fail', isValid: boolean, daysRemaining: number }}
 */
function computeCertificateValidity(expiryDate, status) {
  if (status === 'Fail' || status === 'Withdrawn' || status === 'Withheld') {
    return {
      validityStatus: status,
      isValid: false,
      daysRemaining: 0
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      validityStatus: 'Expired',
      isValid: false,
      daysRemaining
    };
  } else if (daysRemaining <= config.EXPIRING_SOON_DAYS) {
    return {
      validityStatus: 'Expiring Soon',
      isValid: true,
      daysRemaining
    };
  } else {
    return {
      validityStatus: 'Valid',
      isValid: true,
      daysRemaining
    };
  }
}

/**
 * Masks an Emirates ID for public display.
 * Rule (spec): show ONLY the first 7 digits and the last 3 digits,
 * everything in between is replaced with '•' (digits only, dashes stripped).
 * Example: 784-1988-1234567-1 -> 7841988•••••671
 */
function maskEmiratesId(emiratesId) {
  if (!emiratesId || typeof emiratesId !== 'string') return '';
  const digits = emiratesId.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length > 10) {
    const head = digits.slice(0, 7);
    const tail = digits.slice(-3);
    const middle = '•'.repeat(digits.length - 10);
    return `${head}${middle}${tail}`;
  }

  // Short/non-standard values: keep first 3 and last 3, mask the rest
  if (digits.length > 6) {
    return digits.slice(0, 3) + '•'.repeat(digits.length - 6) + digits.slice(-3);
  }
  return '•'.repeat(digits.length);
}

module.exports = {
  computeCertificateValidity,
  maskEmiratesId
};

