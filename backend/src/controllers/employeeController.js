const path = require('path');
const db = require('../config/db');
const { computeCertificateValidity } = require('../services/validityService');
const { saveBase64Upload, deleteUploadedFile } = require('../services/uploadService');

const DOC_TYPES = ['Passport', 'Emirates ID', 'Photo', 'Other'];

async function listEmployees(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status; // 'all', 'active', 'inactive'

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(e.name LIKE ? OR e.email LIKE ? OR e.emirates_id LIKE ? OR e.job_title LIKE ? OR e.company LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (status === 'active') {
      whereClauses.push('e.is_active = 1');
    } else if (status === 'inactive') {
      whereClauses.push('e.is_active = 0');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM employees e ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    // Select only the columns rendered on the Candidates list table
    const [rows] = await db.query(
      `SELECT e.id, e.name, e.photo, e.email, e.phone,
              e.emirates_id, e.job_title, e.company, e.is_active,
              (SELECT COUNT(*) FROM certificates c WHERE c.employee_id = e.id) AS certificates_count
       FROM employees e
       ${whereSql}
       ORDER BY e.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: {
        employees: rows,
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

async function getEmployeeById(req, res, next) {
  try {
    const { id } = req.params;

    const [empRows] = await db.query(
      `SELECT e.id, e.name, e.photo, e.email, e.phone, e.emirates_id,
              e.date_of_birth, e.nationality, e.gender, e.job_title,
              e.address, e.company, e.is_active
       FROM employees e
       WHERE e.id = ?`,
      [id]
    );
    if (empRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    const employee = empRows[0];

    // Select only the certificate columns rendered on the Candidate Detail page
    const [certRows] = await db.query(
      `SELECT c.id, c.scope_name, c.accreditation_status,
              c.certificate_number, c.issue_date, c.expiry_date,
              c.company_name, c.status,
              ct.name AS certificate_type_name
       FROM certificates c
       LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE c.employee_id = ?
       ORDER BY c.issue_date DESC, c.id DESC`,
      [id]
    );

    // Distinct previous companies for this candidate, most recent first
    const [prevRows] = await db.query(
      `SELECT c.company_name, MAX(c.issue_date) AS last_issue
       FROM certificates c
       WHERE c.employee_id = ?
         AND c.company_name IS NOT NULL
         AND c.company_name <> COALESCE(?, '')
       GROUP BY c.company_name
       ORDER BY last_issue DESC, MAX(c.id) DESC
       LIMIT 1`,
      [id, employee.company]
    );
    const previousCompany = prevRows.length > 0 ? prevRows[0].company_name : null;

    // Compute dynamic validity status for each certificate
    const certificates = certRows.map(cert => {
      const validityInfo = computeCertificateValidity(cert.expiry_date, cert.status);
      return {
        ...cert,
        validity_status: validityInfo.validityStatus,
        is_valid: validityInfo.isValid
      };
    });

    return res.json({
      success: true,
      data: {
        employee: {
          ...employee,
          previous_company: previousCompany
        },
        certificates
      }
    });
  } catch (error) {
    next(error);
  }
}

async function lookupEmployee(req, res, next) {
  try {
    const emiratesId = req.query.emirates_id ? String(req.query.emirates_id).trim() : '';

    if (!emiratesId) {
      return res.status(400).json({
        success: false,
        message: 'Emirates ID is required.'
      });
    }

    const [rows] = await db.query(
      'SELECT id, name, photo, company, emirates_id FROM employees WHERE emirates_id = ?',
      [emiratesId]
    );

    return res.json({
      success: true,
      data: {
        found: rows.length > 0,
        candidate: rows.length > 0 ? rows[0] : null
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createEmployee(req, res, next) {
  try {
    const {
      name,
      photo,
      email,
      phone,
      emirates_id,
      date_of_birth,
      nationality,
      gender,
      job_title,
      address,
      company,
      is_active
    } = req.body;

    if (!photo) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required.'
      });
    }

    // Emirates ID must be unique
    const [existing] = await db.query(
      'SELECT id, emirates_id FROM employees WHERE emirates_id = ?',
      [emirates_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A candidate with this Emirates ID already exists.'
      });
    }

    const photoPath = saveBase64Upload(photo, 'candidates', 'photo');
    if (!photoPath) {
      return res.status(400).json({
        success: false,
        message: 'Invalid photo data. Please provide a valid base64 image.'
      });
    }

    try {
      const [result] = await db.query(
        `INSERT INTO employees
          (name, photo, email, phone, emirates_id, date_of_birth, nationality, gender, job_title, address, company, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          photoPath,
          email || null,
          phone || null,
          emirates_id,
          date_of_birth || null,
          nationality || null,
          gender || null,
          job_title || null,
          address || null,
          company || null,
          is_active !== undefined ? (is_active ? 1 : 0) : 1
        ]
      );

      const [created] = await db.query(
        `SELECT e.id, e.name, e.photo, e.email, e.phone,
                e.emirates_id, e.job_title, e.company, e.is_active
         FROM employees e
         WHERE e.id = ?`,
        [result.insertId]
      );

      return res.status(201).json({
        success: true,
        message: 'Candidate created successfully.',
        data: {
          employee: created[0]
        }
      });
    } catch (dbError) {
      // Clean up the orphaned upload if the insert fails
      deleteUploadedFile(photoPath);
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      photo,
      email,
      phone,
      emirates_id,
      date_of_birth,
      nationality,
      gender,
      job_title,
      address,
      company,
      is_active
    } = req.body;

    const [existing] = await db.query(
      `SELECT e.id, e.name, e.photo, e.email, e.phone, e.emirates_id,
              e.date_of_birth, e.nationality, e.gender, e.job_title,
              e.address, e.company, e.is_active
       FROM employees e
       WHERE e.id = ?`,
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }
    const current = existing[0];

    // Check uniqueness conflicts on Emirates ID (email is no longer unique)
    const [conflict] = await db.query(
      'SELECT id FROM employees WHERE emirates_id = ? AND id != ?',
      [emirates_id, id]
    );

    if (conflict.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another candidate with this Emirates ID already exists.'
      });
    }

    let photoPath = current.photo;
    if (photo !== undefined && photo !== null && photo !== '') {
      const saved = saveBase64Upload(photo, 'candidates', 'photo');
      if (!saved) {
        return res.status(400).json({
          success: false,
          message: 'Invalid photo data. Please provide a valid base64 image.'
        });
      }
      if (current.photo && current.photo !== saved) {
        deleteUploadedFile(current.photo);
      }
      photoPath = saved;
    }

    await db.query(
      `UPDATE employees SET
        name = ?,
        photo = ?,
        email = ?,
        phone = ?,
        emirates_id = ?,
        date_of_birth = ?,
        nationality = ?,
        gender = ?,
        job_title = ?,
        address = ?,
        company = ?,
        is_active = ?
       WHERE id = ?`,
      [
        name !== undefined ? name : current.name,
        photoPath,
        email !== undefined ? (email || null) : current.email,
        phone !== undefined ? (phone || null) : current.phone,
        emirates_id !== undefined ? emirates_id : current.emirates_id,
        date_of_birth !== undefined ? (date_of_birth || null) : current.date_of_birth,
        nationality !== undefined ? (nationality || null) : current.nationality,
        gender !== undefined ? (gender || null) : current.gender,
        job_title !== undefined ? (job_title || null) : current.job_title,
        address !== undefined ? (address || null) : current.address,
        company !== undefined ? (company || null) : current.company,
        is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
        id
      ]
    );

    const [updated] = await db.query(
      `SELECT e.id, e.name, e.photo, e.email, e.phone,
              e.emirates_id, e.job_title, e.company, e.is_active
       FROM employees e
       WHERE e.id = ?`,
      [id]
    );

    return res.json({
      success: true,
      message: 'Candidate updated successfully.',
      data: {
        employee: updated[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      'SELECT id, name, photo FROM employees WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    // Count certificates first — they cascade on delete
    const [certCount] = await db.query(
      'SELECT COUNT(*) AS total FROM certificates WHERE employee_id = ?',
      [id]
    );
    const deletedCertificates = certCount[0].total || 0;

    // Gather files to remove after the rows are gone
    const [docRows] = await db.query(
      'SELECT file_path FROM candidate_documents WHERE employee_id = ?',
      [id]
    );

    await db.query('DELETE FROM employees WHERE id = ?', [id]);

    // Documents rows cascade; remove their files from disk
    if (existing[0].photo) deleteUploadedFile(existing[0].photo);
    docRows.forEach(d => deleteUploadedFile(d.file_path));

    return res.json({
      success: true,
      message: deletedCertificates > 0
        ? `Candidate deleted along with ${deletedCertificates} associated certificate${deletedCertificates > 1 ? 's' : ''}.`
        : 'Candidate deleted successfully.',
      data: { id: parseInt(id, 10), deletedCertificates }
    });
  } catch (error) {
    next(error);
  }
}

async function toggleEmployeeStatus(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id, is_active FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    const newStatus = existing[0].is_active ? 0 : 1;
    await db.query('UPDATE employees SET is_active = ? WHERE id = ?', [newStatus, id]);

    return res.json({
      success: true,
      message: `Candidate ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      data: {
        id: parseInt(id, 10),
        is_active: newStatus
      }
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// Candidate documents (multi-file, base64 JSON — no multer)
// ---------------------------------------------------------------------------

async function listDocuments(req, res, next) {
  try {
    const { id } = req.params;

    const [empRows] = await db.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (empRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    const [rows] = await db.query(
      `SELECT id, doc_type, file_name, file_path, created_at
       FROM candidate_documents
       WHERE employee_id = ?
       ORDER BY id DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: { data: rows }
    });
  } catch (error) {
    next(error);
  }
}

async function uploadDocuments(req, res, next) {
  try {
    const { id } = req.params;
    const { files } = req.body;

    const [empRows] = await db.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (empRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one file is required. Expected { files: [{ doc_type, file_name, dataBase64 }] }.'
      });
    }

    const savedPaths = [];
    const inserted = [];

    for (const file of files) {
      if (!file || !file.dataBase64) {
        savedPaths.forEach(p => deleteUploadedFile(p));
        return res.status(400).json({
          success: false,
          message: 'Each file must include dataBase64.'
        });
      }

      const docType = DOC_TYPES.includes(file.doc_type) ? file.doc_type : 'Other';
      const originalName = path.basename(String(file.file_name || 'document')).slice(0, 255) || 'document';

      const filePath = saveBase64Upload(file.dataBase64, 'candidates', originalName);
      if (!filePath) {
        savedPaths.forEach(p => deleteUploadedFile(p));
        return res.status(400).json({
          success: false,
          message: `Invalid file data for "${originalName}". Provide a valid base64 image/document.`
        });
      }
      savedPaths.push(filePath);

      try {
        const [result] = await db.query(
          `INSERT INTO candidate_documents (employee_id, doc_type, file_name, file_path)
           VALUES (?, ?, ?, ?)`,
          [id, docType, originalName, filePath]
        );
        inserted.push({
          id: result.insertId,
          doc_type: docType,
          file_name: originalName,
          file_path: filePath,
          created_at: new Date()
        });
      } catch (dbError) {
        savedPaths.forEach(p => deleteUploadedFile(p));
        throw dbError;
      }
    }

    return res.status(201).json({
      success: true,
      message: `${inserted.length} document${inserted.length > 1 ? 's' : ''} uploaded successfully.`,
      data: {
        data: inserted
      }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { id, docId } = req.params;

    const [rows] = await db.query(
      'SELECT id, file_path FROM candidate_documents WHERE id = ? AND employee_id = ?',
      [docId, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.'
      });
    }

    await db.query('DELETE FROM candidate_documents WHERE id = ?', [docId]);
    deleteUploadedFile(rows[0].file_path);

    return res.json({
      success: true,
      message: 'Document deleted successfully.',
      data: { id: parseInt(docId, 10) }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listEmployees,
  getEmployeeById,
  lookupEmployee,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  listDocuments,
  uploadDocuments,
  deleteDocument
};
