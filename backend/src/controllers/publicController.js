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
        c.description,
        c.scope,
        e.name AS employee_name,
        e.emirates_id,
        e.job_title,
        ct.name AS certificate_type_name
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       INNER JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE UPPER(c.certificate_number) = UPPER(?)`,
      [certificateNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid / Certificate not found'
      });
    }

    const cert = rows[0];
    const validityInfo = computeCertificateValidity(cert.expiry_date, cert.certificate_status);

    // Return strictly sanitized public fields
    return res.json({
      success: true,
      message: 'Certificate verified successfully.',
      data: {
        employee: {
          name: cert.employee_name,
          emirates_id_masked: maskEmiratesId(cert.emirates_id),
          job_title: cert.job_title || 'N/A'
        },
        certificate: {
          certificate_number: cert.certificate_number,
          certificate_type: cert.certificate_type_name,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          certificate_status: cert.certificate_status, // 'Pass' or 'Fail'
          description: cert.description || '',
          scope: cert.scope || '',
          validity_status: validityInfo.validityStatus, // 'Valid', 'Expiring Soon', 'Expired', 'Fail'
          is_valid: validityInfo.isValid,
          days_remaining: validityInfo.daysRemaining
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

