const db = require('../config/db');
const { computeCertificateValidity } = require('../services/validityService');

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
      whereClauses.push('(e.name LIKE ? OR e.email LIKE ? OR e.emirates_id LIKE ? OR e.job_title LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
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

    // Data with certificates count
    const [rows] = await db.query(
      `SELECT e.*, 
              (SELECT COUNT(*) FROM certificates c WHERE c.employee_id = e.id) AS certificates_count
       FROM employees e
       ${whereSql}
       ORDER BY e.created_at DESC
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

    const [empRows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (empRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    const employee = empRows[0];

    // Certificates list associated with employee
    const [certRows] = await db.query(
      `SELECT c.*, ct.name AS certificate_type_name, ct.category AS certificate_type_category
       FROM certificates c
       INNER JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE c.employee_id = ?
       ORDER BY c.issue_date DESC`,
      [id]
    );

    // Compute dynamic validity status for each certificate
    const certificates = certRows.map(cert => {
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
        employee,
        certificates
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
      email,
      phone,
      emirates_id,
      date_of_birth,
      nationality,
      gender,
      job_title,
      address,
      is_active
    } = req.body;

    // Check unique email and emirates_id
    const [existing] = await db.query(
      'SELECT id, email, emirates_id FROM employees WHERE email = ? OR emirates_id = ?',
      [email, emirates_id]
    );

    if (existing.length > 0) {
      if (existing[0].email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'An employee with this email address already exists.'
        });
      }
      if (existing[0].emirates_id === emirates_id) {
        return res.status(400).json({
          success: false,
          message: 'An employee with this Emirates ID already exists.'
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO employees 
        (name, email, phone, emirates_id, date_of_birth, nationality, gender, job_title, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phone,
        emirates_id,
        date_of_birth || null,
        nationality || null,
        gender || null,
        job_title || null,
        address || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const [created] = await db.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      data: {
        employee: created[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      emirates_id,
      date_of_birth,
      nationality,
      gender,
      job_title,
      address,
      is_active
    } = req.body;

    const [existing] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    // Check uniqueness conflicts
    const [conflict] = await db.query(
      'SELECT id, email, emirates_id FROM employees WHERE (email = ? OR emirates_id = ?) AND id != ?',
      [email, emirates_id, id]
    );

    if (conflict.length > 0) {
      if (conflict[0].email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Another employee with this email address already exists.'
        });
      }
      if (conflict[0].emirates_id === emirates_id) {
        return res.status(400).json({
          success: false,
          message: 'Another employee with this Emirates ID already exists.'
        });
      }
    }

    await db.query(
      `UPDATE employees SET
        name = ?,
        email = ?,
        phone = ?,
        emirates_id = ?,
        date_of_birth = ?,
        nationality = ?,
        gender = ?,
        job_title = ?,
        address = ?,
        is_active = ?
       WHERE id = ?`,
      [
        name,
        email,
        phone,
        emirates_id,
        date_of_birth || null,
        nationality || null,
        gender || null,
        job_title || null,
        address || null,
        is_active !== undefined ? (is_active ? 1 : 0) : existing[0].is_active,
        id
      ]
    );

    const [updated] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Employee updated successfully.',
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
      'SELECT id, name FROM employees WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    // Count certificates first — they cascade on delete
    const [certCount] = await db.query(
      'SELECT COUNT(*) AS total FROM certificates WHERE employee_id = ?',
      [id]
    );
    const deletedCertificates = certCount[0].total || 0;

    await db.query('DELETE FROM employees WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: deletedCertificates > 0
        ? `Employee deleted along with ${deletedCertificates} associated certificate${deletedCertificates > 1 ? 's' : ''}.`
        : 'Employee deleted successfully.',
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
        message: 'Employee not found.'
      });
    }

    const newStatus = existing[0].is_active ? 0 : 1;
    await db.query('UPDATE employees SET is_active = ? WHERE id = ?', [newStatus, id]);

    return res.json({
      success: true,
      message: `Employee ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      data: {
        id: parseInt(id, 10),
        is_active: newStatus
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee
};

