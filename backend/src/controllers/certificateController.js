const path = require('path');
const db = require('../config/db');
const { computeCertificateValidity } = require('../services/validityService');
const { saveBase64Upload, deleteUploadedFile } = require('../services/uploadService');
const config = require('../config/env');

/** Default 2-letter certificate code when the admin leaves the field empty. */
const DEFAULT_CERTIFICATE_CODE = 'GT';

/** How many sequence steps we try when the generated number collides. */
const MAX_SEQUENCE_ATTEMPTS = 10;

/**
 * Splits an issue date (YYYY-MM-DD) into its calendar parts without any timezone
 * conversion, so the day/month never shift. Falls back to today when absent/invalid.
 */
function resolveIssueDateParts(issueDate) {
  const now = new Date();
  const fallback = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(issueDate || '').trim());
  if (!match) return fallback;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (!year || !month || !day || month > 12 || day > 31) return fallback;

  return { year, month, day };
}

/**
 * Certificate number prefix: WOR-yy/<work order>/<ddmm>-<CODE>-C
 * The sequence (C1, C2, ...) is appended by the caller.
 */
function buildCertificatePrefix(workOrder, code, issueDate) {
  const order = String(workOrder || '').trim();
  const certCode = String(code || '').trim().toUpperCase() || DEFAULT_CERTIFICATE_CODE;
  const { year, month, day } = resolveIssueDateParts(issueDate);

  const yy = String(year).slice(-2);
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');

  return `WOR-${yy}/${order}/${dd}${mm}-${certCode}-C`;
}

/**
 * Next sequence for a work order: highest existing trailing number + 1.
 * Single indexed lookup on certificates.work_order.
 */
async function getNextSequenceForWorkOrder(workOrder) {
  const [rows] = await db.query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(certificate_number, '-C', -1) AS UNSIGNED)) AS max_sequence
     FROM certificates
     WHERE work_order = ?`,
    [workOrder]
  );

  const maxSequence = rows[0] && rows[0].max_sequence !== null ? Number(rows[0].max_sequence) : 0;
  return (Number.isFinite(maxSequence) && maxSequence > 0 ? maxSequence : 0) + 1;
}

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
    const approval = req.query.approval; // 'pending', 'approved'

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(c.certificate_number LIKE ? OR e.name LIKE ? OR e.emirates_id LIKE ? OR c.scope_name LIKE ? OR ct.name LIKE ? OR c.company_name LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    if (employeeId) {
      whereClauses.push('c.employee_id = ?');
      params.push(employeeId);
    }

    if (certificateTypeId) {
      whereClauses.push('c.certificate_type_id = ?');
      params.push(certificateTypeId);
    }

    if (status && ['Pass', 'Fail', 'Withdrawn', 'Withheld'].includes(status)) {
      whereClauses.push('c.status = ?');
      params.push(status);
    }

    if (approval === 'pending' || approval === 'approved') {
      whereClauses.push('c.approval_status = ?');
      params.push(approval);
    }

    // Validity tab filter based on database date comparisons (only 'Pass' certificates can be Valid / Expiring Soon / Expired)
    if (validityTab === 'expired') {
      whereClauses.push("c.status = 'Pass' AND c.expiry_date < CURDATE()");
    } else if (validityTab === 'expiring_soon') {
      whereClauses.push(`c.status = 'Pass' AND c.expiry_date >= CURDATE() AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ${config.EXPIRING_SOON_DAYS} DAY)`);
    } else if (validityTab === 'valid') {
      whereClauses.push("c.status = 'Pass' AND c.expiry_date >= CURDATE()");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count (only join employees/certificate_types when search filter is active)
    const countFromSql = search
      ? `FROM certificates c
         INNER JOIN employees e ON c.employee_id = e.id
         LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id`
      : `FROM certificates c`;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total ${countFromSql} ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    // Select only the columns rendered on the Certificates page and Edit modal
    const [rows] = await db.query(
      `SELECT c.id, c.employee_id, c.certificate_type_id,
              c.scope_name, c.accreditation_status, c.certificate_number,
              c.work_order, c.issue_date, c.expiry_date,
              c.company_name, c.status, c.approval_status,
              e.name AS employee_name, 
              e.emirates_id AS employee_emirates_id,
              e.photo AS employee_photo,
              ct.name AS certificate_type_name
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id
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
        validity_status: validityInfo.validityStatus
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
      `SELECT c.id, c.scope_name, c.accreditation_status,
              c.certificate_number, c.issue_date, c.expiry_date,
              c.company_name, c.status, c.approval_status,
              e.name AS employee_name, 
              e.emirates_id AS employee_emirates_id,
              e.photo AS employee_photo,
              ct.name AS certificate_type_name
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE c.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    return res.json({
      success: true,
      data: {
        certificate: rows[0]
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
      scope_name,
      accreditation_status,
      certificate_number,
      issue_date,
      expiry_date,
      status,
      company_name,
      work_order,
      code
    } = req.body;

    const trimmedScope = scope_name ? String(scope_name).trim() : '';
    if (!trimmedScope) {
      return res.status(400).json({
        success: false,
        message: 'Certification scope is required.'
      });
    }

    const trimmedWorkOrder = work_order ? String(work_order).trim() : '';
    const trimmedCode = code ? String(code).trim().toUpperCase() : '';

    // Validate candidate exists
    const [empRows] = await db.query('SELECT id, is_active FROM employees WHERE id = ?', [employee_id]);
    if (empRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected candidate does not exist.'
      });
    }

    // certificate_type_id is NULL when the scope was entered manually ("Other")
    const typeId = (certificate_type_id === undefined || certificate_type_id === null || certificate_type_id === '')
      ? null
      : certificate_type_id;

    let effectiveAccreditation = accreditation_status || null;

    if (typeId !== null) {
      const [typeRows] = await db.query(
        'SELECT id, is_active, accreditation_status FROM certificate_types WHERE id = ?',
        [typeId]
      );
      if (typeRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected certification scope does not exist.'
        });
      }
      if (!typeRows[0].is_active) {
        return res.status(400).json({
          success: false,
          message: 'Cannot issue a certificate for an inactive certification scope.'
        });
      }
      if (!effectiveAccreditation) {
        effectiveAccreditation = typeRows[0].accreditation_status;
      }
    }

    // Validate dates: expiry must be after issue date
    if (new Date(expiry_date) <= new Date(issue_date)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be after the issue date.'
      });
    }

    // The certificate number is always generated on the server when a work order is
    // supplied: WOR-yy/<work order>/<ddmm>-<CODE>-C<sequence>. Any client supplied
    // number is ignored in that case.
    if (trimmedWorkOrder) {
      const prefix = buildCertificatePrefix(trimmedWorkOrder, trimmedCode, issue_date);
      let sequence = await getNextSequenceForWorkOrder(trimmedWorkOrder);

      for (let attempt = 0; attempt < MAX_SEQUENCE_ATTEMPTS; attempt++) {
        const candidate = `${prefix}${sequence}`;

        // Unique-index check (certificates.certificate_number is UNIQUE)
        const [existing] = await db.query('SELECT id FROM certificates WHERE certificate_number = ?', [candidate]);
        if (existing.length > 0) {
          sequence += 1;
          continue;
        }

        try {
          const [result] = await db.query(
            `INSERT INTO certificates 
              (employee_id, certificate_type_id, scope_name, accreditation_status, certificate_number,
               issue_date, expiry_date, status, company_name, work_order, approval_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
              employee_id,
              typeId,
              trimmedScope,
              effectiveAccreditation,
              candidate,
              issue_date,
              expiry_date,
              status || 'Pass',
              company_name || null,
              trimmedWorkOrder
            ]
          );

          return res.status(201).json({
            success: true,
            message: 'Certificate created successfully. Pending approval.',
            data: {
              id: result.insertId,
              approval_status: 'pending',
              certificate_number: candidate,
              work_order: trimmedWorkOrder,
              sequence
            }
          });
        } catch (insertError) {
          // Lost the race for this sequence number — retry with the next one.
          if (insertError && insertError.code === 'ER_DUP_ENTRY') {
            sequence += 1;
            continue;
          }
          throw insertError;
        }
      }

      return res.status(400).json({
        success: false,
        message: 'A certificate with this certificate number already exists. Please try again.'
      });
    }

    // No work order supplied — fall back to the number provided by the admin.
    const finalNumber = certificate_number ? String(certificate_number).trim() : '';
    if (!finalNumber) {
      return res.status(400).json({
        success: false,
        message: 'Work order is required to generate the certificate number.'
      });
    }

    const [existing] = await db.query('SELECT id FROM certificates WHERE certificate_number = ?', [finalNumber]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A certificate with this certificate number already exists.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO certificates 
        (employee_id, certificate_type_id, scope_name, accreditation_status, certificate_number,
         issue_date, expiry_date, status, company_name, work_order, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        employee_id,
        typeId,
        trimmedScope,
        effectiveAccreditation,
        finalNumber,
        issue_date,
        expiry_date,
        status || 'Pass',
        company_name || null,
        null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Certificate created successfully. Pending approval.',
      data: {
        id: result.insertId,
        approval_status: 'pending',
        certificate_number: finalNumber,
        work_order: null
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/certificates/next-number?work_order=&code=&issue_date=
 * Returns the certificate number the server would generate next.
 */
async function getNextCertificateNumber(req, res, next) {
  try {
    const workOrder = req.query.work_order ? String(req.query.work_order).trim() : '';
    if (!workOrder) {
      return res.status(400).json({
        success: false,
        message: 'Work order is required.'
      });
    }

    const code = req.query.code ? String(req.query.code).trim() : '';
    const issueDate = req.query.issue_date ? String(req.query.issue_date).trim() : '';

    const prefix = buildCertificatePrefix(workOrder, code, issueDate);
    const sequence = await getNextSequenceForWorkOrder(workOrder);
    const certificateNumber = `${prefix}${sequence}`;

    return res.json({
      success: true,
      certificate_number: certificateNumber,
      sequence,
      work_order: workOrder,
      prefix,
      data: {
        certificate_number: certificateNumber,
        sequence,
        work_order: workOrder,
        prefix
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
      scope_name,
      accreditation_status,
      certificate_number,
      issue_date,
      expiry_date,
      status,
      company_name,
      work_order
    } = req.body;

    const [existing] = await db.query(
      `SELECT id, employee_id, certificate_type_id, scope_name, accreditation_status,
              certificate_number, issue_date, expiry_date, status, company_name, work_order
       FROM certificates WHERE id = ?`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }
    const current = existing[0];

    // Check unique certificate number if changed
    if (certificate_number && certificate_number !== current.certificate_number) {
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
    const effectiveIssue = issue_date || current.issue_date;
    const effectiveExpiry = expiry_date || current.expiry_date;
    if (new Date(effectiveExpiry) <= new Date(effectiveIssue)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be after the issue date.'
      });
    }

    // certificate_type_id may be explicitly null (scope entered as "Other")
    const effectiveTypeId = certificate_type_id !== undefined ? certificate_type_id : current.certificate_type_id;
    let effectiveAccreditation = accreditation_status !== undefined ? accreditation_status : current.accreditation_status;

    if (effectiveTypeId !== null && effectiveTypeId !== undefined && effectiveTypeId !== '') {
      const [typeRows] = await db.query(
        'SELECT id, accreditation_status FROM certificate_types WHERE id = ?',
        [effectiveTypeId]
      );
      if (typeRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected certification scope does not exist.'
        });
      }
      if (!effectiveAccreditation) {
        effectiveAccreditation = typeRows[0].accreditation_status;
      }
    }

    await db.query(
      `UPDATE certificates SET
        employee_id = ?,
        certificate_type_id = ?,
        scope_name = ?,
        accreditation_status = ?,
        certificate_number = ?,
        issue_date = ?,
        expiry_date = ?,
        status = ?,
        company_name = ?,
        work_order = ?
       WHERE id = ?`,
      [
        employee_id || current.employee_id,
        effectiveTypeId === '' ? null : effectiveTypeId,
        scope_name !== undefined && scope_name !== null && String(scope_name).trim()
          ? String(scope_name).trim()
          : current.scope_name,
        effectiveAccreditation || null,
        (certificate_number || current.certificate_number).trim(),
        effectiveIssue,
        effectiveExpiry,
        status || current.status,
        company_name !== undefined ? (company_name || null) : current.company_name,
        work_order !== undefined
          ? (work_order ? String(work_order).trim() : null)
          : (current.work_order || null),
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

async function approveCertificate(req, res, next) {
  try {
    const { id } = req.params;

    // Role gate lives in the route (requireRole('certification_manager')) —
    // admins are explicitly NOT allowed to approve.
    const [rows] = await db.query(
      'SELECT id, certificate_number, approval_status FROM certificates WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found.'
      });
    }

    if (rows[0].approval_status === 'approved') {
      return res.json({
        success: true,
        message: 'Certificate is already approved.',
        data: rows[0]
      });
    }

    await db.query(
      `UPDATE certificates
       SET approval_status = 'approved', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [req.admin.id, id]
    );

    const [updated] = await db.query(
      'SELECT id, certificate_number, approval_status FROM certificates WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Certificate approved successfully.',
      data: updated[0]
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

async function getCertificateFormat(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT id, file_name, file_path, mime_type, created_at
       FROM certificate_formats
       ORDER BY id DESC
       LIMIT 1`
    );
    return res.json({
      success: true,
      data: {
        format: rows.length > 0 ? rows[0] : null
      }
    });
  } catch (error) {
    next(error);
  }
}

async function uploadCertificateFormat(req, res, next) {
  try {
    const { file_name, mime_type, file_size, dataBase64, data } = req.body || {};
    const payload = dataBase64 || data;

    if (!payload || typeof payload !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Raw certificate format file data (dataBase64) is required.'
      });
    }

    const originalName = path.basename(String(file_name || 'certificate-format')).slice(0, 255) || 'certificate-format';
    const filePath = saveBase64Upload(payload, 'formats', originalName);
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file data. Please upload a valid certificate format file.'
      });
    }

    // Remove previous uploaded format files so the latest uploaded format is active
    const [oldRows] = await db.query('SELECT id, file_path FROM certificate_formats');
    for (const old of oldRows) {
      if (old.file_path) deleteUploadedFile(old.file_path);
    }
    if (oldRows.length > 0) {
      await db.query('DELETE FROM certificate_formats');
    }

    const uploadedBy = req.admin ? req.admin.id : null;
    const uploadedByName = req.admin ? (req.admin.name || req.admin.email || 'Admin') : 'Admin';

    const [result] = await db.query(
      `INSERT INTO certificate_formats (file_name, file_path, mime_type, file_size, uploaded_by, uploaded_by_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        originalName,
        filePath,
        mime_type || null,
        Number.isFinite(Number(file_size)) ? Number(file_size) : null,
        uploadedBy,
        uploadedByName
      ]
    );

    const [rows] = await db.query(
      `SELECT id, file_name, file_path, mime_type, created_at
       FROM certificate_formats
       WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Raw certificate format uploaded successfully.',
      data: {
        format: rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCertificateFormat(req, res, next) {
  try {
    const [rows] = await db.query('SELECT id, file_path FROM certificate_formats');
    for (const row of rows) {
      if (row.file_path) deleteUploadedFile(row.file_path);
    }
    await db.query('DELETE FROM certificate_formats');

    return res.json({
      success: true,
      message: 'Reverted to demo certificate format.'
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
  approveCertificate,
  deleteCertificate,
  getNextCertificateNumber,
  getCertificateFormat,
  uploadCertificateFormat,
  deleteCertificateFormat
};

