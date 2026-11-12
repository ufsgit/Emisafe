const db = require('../config/db');
const { computeCertificateValidity } = require('../services/validityService');
const config = require('../config/env');

async function listCertificates(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : '';
    const employeeId = req.query.employee_id;
    const certificateTypeId = req.query.certificate_type_id;
    const status = req.query.status; // 'Pass', 'Fail'
    const validityTab = req.query.validity; // 'all', 'expired', 'expiring_soon', 'valid'

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(c.certificate_number LIKE ? OR e.name LIKE ? OR ct.name LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (employeeId) {
      whereClauses.push('c.employee_id = ?');
      params.push(employeeId);
    }

    if (certificateTypeId) {
      whereClauses.push('c.certificate_type_id = ?');
      params.push(certificateTypeId);
    }

    if (status && (status === 'Pass' || status === 'Fail')) {
      whereClauses.push('c.status = ?');
      params.push(status);
    }

    // Validity tab filter based on database date comparisons
    if (validityTab === 'expired') {
      whereClauses.push('c.expiry_date < CURDATE()');
    } else if (validityTab === 'expiring_soon') {
      whereClauses.push(`c.expiry_date >= CURDATE() AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ${config.EXPIRING_SOON_DAYS} DAY)`);
    } else if (validityTab === 'valid') {
      whereClauses.push(`c.expiry_date >= CURDATE()`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       INNER JOIN certificate_types ct ON c.certificate_type_id = ct.id
       ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    // Data
    const [rows] = await db.query(
      `SELECT c.*, 
              e.name AS employee_name, 
              e.emirates_id AS employee_emirates_id,
              e.job_title AS employee_job_title,
              ct.name AS certificate_type_name,
              ct.category AS certificate_type_category
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       INNER JOIN certificate_types ct ON c.certificate_type_id = ct.id
       ${whereSql}
       ORDER BY c.issue_date DESC, c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Compute dynamic validity status
    const certificates = rows.map(cert => {
      const validityInfo = computeCertificateValidity(cert.expiry_date, cert.status);
      return {
        ...cert,
        validity_status: validityInfo.validityStatus,
        is_valid: validityInfo.isValid,
        days_remaining: validityInfo.daysRemaining
      };
    });

    return res.json({
      success: true,
      data: {
        certificates,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getCertificateById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT c.*, 
              e.name AS employee_name, 
              e.emirates_id AS employee_emirates_id,
              e.job_title AS employee_job_title,
              ct.name AS certificate_type_name,
              ct.category AS certificate_type_category
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       INNER JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE c.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    const cert = rows[0];
    const validityInfo = computeCertificateValidity(cert.expiry_date, cert.status);

    return res.json({
      success: true,
      data: {
        certificate: {
          ...cert,
          validity_status: validityInfo.validityStatus,
          is_valid: validityInfo.isValid,
          days_remaining: validityInfo.daysRemaining
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createCertificate(req, res, next) {
  try {
    const {
      employee_id,
      certificate_type_id,
      certificate_number,
      issue_date,
      expiry_date,
      status,
      description,
      scope
    } = req.body;

    // Validate employee exists
    const [empRows] = await db.query('SELECT id, is_active FROM employees WHERE id = ?', [employee_id]);
    if (empRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected employee does not exist.'
      });
    }

    // Validate certificate type exists and is ACTIVE
    const [typeRows] = await db.query('SELECT id, is_active FROM certificate_types WHERE id = ?', [certificate_type_id]);
    if (typeRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected certificate type does not exist.'
      });
    }
    if (!typeRows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot issue certificate for an inactive certificate type.'
      });
    }

    // Validate dates: expiry must be after issue date
    if (new Date(expiry_date) <= new Date(issue_date)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be after the issue date.'
      });
    }

    // Check unique certificate number
    const [existing] = await db.query('SELECT id FROM certificates WHERE certificate_number = ?', [certificate_number]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A certificate with this certificate number already exists.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO certificates 
        (employee_id, certificate_type_id, certificate_number, issue_date, expiry_date, status, description, scope)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        certificate_type_id,
        certificate_number.trim(),
        issue_date,
        expiry_date,
        status || 'Pass',
        description || null,
        scope || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Certificate created successfully.',
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateCertificate(req, res, next) {
  try {
    const { id } = req.params;
    const {
      employee_id,
      certificate_type_id,
      certificate_number,
      issue_date,
      expiry_date,
      status,
      description,
      scope
    } = req.body;

    const [existing] = await db.query('SELECT * FROM certificates WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    // Check unique certificate number if changed
    if (certificate_number && certificate_number !== existing[0].certificate_number) {
      const [conflict] = await db.query(
        'SELECT id FROM certificates WHERE certificate_number = ? AND id != ?',
        [certificate_number, id]
      );
      if (conflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Another certificate with this certificate number already exists.'
        });
      }
    }

    // Validate dates
    const effectiveIssue = issue_date || existing[0].issue_date;
    const effectiveExpiry = expiry_date || existing[0].expiry_date;
    if (new Date(effectiveExpiry) <= new Date(effectiveIssue)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be after the issue date.'
      });
    }

    // If certificate type is updated, verify it exists
    const effectiveTypeId = certificate_type_id || existing[0].certificate_type_id;
    const [typeRows] = await db.query('SELECT id FROM certificate_types WHERE id = ?', [effectiveTypeId]);
    if (typeRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected certificate type does not exist.'
      });
    }

    await db.query(
      `UPDATE certificates SET
        employee_id = ?,
        certificate_type_id = ?,
        certificate_number = ?,
        issue_date = ?,
        expiry_date = ?,
        status = ?,
        description = ?,
        scope = ?
       WHERE id = ?`,
      [
        employee_id || existing[0].employee_id,
        effectiveTypeId,
        (certificate_number || existing[0].certificate_number).trim(),
        effectiveIssue,
        effectiveExpiry,
        status || existing[0].status,
        description !== undefined ? description : existing[0].description,
        scope !== undefined ? scope : existing[0].scope,
        id
      ]
    );

    return res.json({
      success: true,
      message: 'Certificate updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCertificate(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      'SELECT id, certificate_number FROM certificates WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    await db.query('DELETE FROM certificates WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Certificate ${existing[0].certificate_number} deleted successfully.`,
      data: { id: parseInt(id, 10) }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCertificates,
  getCertificateById,
  createCertificate,
  updateCertificate,
  deleteCertificate
};

