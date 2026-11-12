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
  if (status === 'Fail') {
    return {
      validityStatus: 'Fail',
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
 * Masks an Emirates ID for public display according to requirements.
 * Format: 784-YYYY-XXXXXXX-X -> 784-****-*******-X (shows only last 4 digits/character or standard mask)
 * Requirement: "Emirates ID, masked (show only the last 4 digits, e.g. 784-****-*******-3)"
 */
function maskEmiratesId(emiratesId) {
  if (!emiratesId || typeof emiratesId !== 'string') return '';
  const parts = emiratesId.split('-');
  if (parts.length === 4) {
    return `${parts[0]}-****-*******-${parts[3]}`;
  }
  // Fallback mask if not dashed
  if (emiratesId.length >= 8) {
    return emiratesId.slice(0, 3) + '-****-*******-' + emiratesId.slice(-1);
  }
  return '***-****-****-***';
}

module.exports = {
  computeCertificateValidity,
  maskEmiratesId
};

