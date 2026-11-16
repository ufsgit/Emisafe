/**
 * Helpers shared by the certificate print (A4) and alternate format documents.
 * These views are client-rendered only (admin/** is RenderMode.Client),
 * but every browser global access is still guarded for safety.
 */

export interface CertificateDocument {
  id: number | null;
  number: string;
  scope: string;
  accreditation: string;
  company: string;
  issueDate: string | null;
  expiryDate: string | null;
  status: string;
  approval: string;
  candidateName: string;
  candidatePhoto: string;
  emiratesId: string;
  emiratesIdMasked: string;
}

/**
 * Emirates ID masked to the first 7 and last 3 digits,
 * e.g. 7841988•••••671.
 */
export function maskEmiratesId(value?: string | null): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    // Too short to mask meaningfully — show the middle hidden anyway.
    if (digits.length < 6) return value;
    return digits.slice(0, 3) + '•'.repeat(Math.max(1, digits.length - 6)) + digits.slice(-3);
  }
  return digits.slice(0, 7) + '•'.repeat(digits.length - 10) + digits.slice(-3);
}

/** Plain verification URL so a phone camera opens it directly. */
export function buildVerifyUrl(certNumber: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  return `${origin}/?certificate=${encodeURIComponent(certNumber)}`;
}

/** QR data URL for the verification URL (browser only). */
export async function makeVerifyQrDataUrl(certNumber: string): Promise<string> {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toDataURL(buildVerifyUrl(certNumber), {
    width: 240,
    margin: 1,
    color: {
      dark: '#183E5D',
      light: '#FFFFFF'
    }
  });
}

/** Normalizes `GET /api/certificates/:id` responses into the document model. */
export function toCertificateDocument(res: any): CertificateDocument | null {
  const c = res?.data?.certificate ?? res?.data ?? null;
  if (!c || (!c.certificate_number && !c.scope_name)) return null;

  const emp = c.employee || {};
  const emiratesId =
    c.employee_emirates_id ?? emp.emirates_id ?? c.emirates_id ?? '';

  return {
    id: c.id ?? null,
    number: c.certificate_number || '',
    scope: c.scope_name || c.certificate_type_name || c.scope || '',
    accreditation: c.accreditation_status || '',
    company: c.company_name || '',
    issueDate: c.issue_date || null,
    expiryDate: c.expiry_date || null,
    status: c.status || '',
    approval: c.approval_status || '',
    candidateName: c.employee_name || emp.name || '',
    candidatePhoto: c.employee_photo || c.photo || emp.photo || '',
    emiratesId,
    emiratesIdMasked: c.emirates_id_masked || maskEmiratesId(emiratesId)
  };
}
