const db = require('../config/db');
const { computeCertificateValidity, maskEmiratesId } = require('../services/validityService');

async function verifyCertificate(req, res, next) {
  try {
    // Set no-store cache headers so verification results are never cached across users
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const certificateNumber = req.params.certificateNumber ? req.params.certificateNumber.trim() : '';

    if (!certificateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Certificate number is required for verification.'
      });
    }

    const [rows] = await db.query(
      `SELECT 
        c.certificate_number,
        c.issue_date,
        c.expiry_date,
        c.status AS certificate_status,
        c.scope_name,
        c.accreditation_status,
        c.company_name,
        c.approval_status,
        e.name AS employee_name,
        e.emirates_id,
        e.job_title,
        e.company AS employee_company,
        ct.name AS certificate_type_name
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE UPPER(c.certificate_number) = UPPER(?)
          OR REPLACE(UPPER(e.emirates_id), '-', '') = REPLACE(UPPER(?), '-', '')
       ORDER BY c.id DESC
       LIMIT 1`,
      [certificateNumber, certificateNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid / Certificate not found'
      });
    }

    const cert = rows[0];
    const validityInfo = computeCertificateValidity(cert.expiry_date, cert.certificate_status);

    // Return strictly sanitized public fields rendered on the Verification Portal
    return res.json({
      success: true,
      message: 'Certificate verified successfully.',
      data: {
        employee: {
          name: cert.employee_name,
          emirates_id_masked: maskEmiratesId(cert.emirates_id),
          job_title: cert.job_title || null,
          company: cert.company_name || cert.employee_company || null
        },
        certificate: {
          certificate_number: cert.certificate_number,
          certificate_type: cert.certificate_type_name || cert.scope_name,
          scope_name: cert.scope_name,
          accreditation_status: cert.accreditation_status,
          company_name: cert.company_name,
          approval_status: cert.approval_status,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          certificate_status: cert.certificate_status,
          validity_status: validityInfo.validityStatus,
          is_valid: validityInfo.isValid
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  verifyCertificate
};

