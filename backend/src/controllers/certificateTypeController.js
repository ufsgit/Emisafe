const db = require('../config/db');

const ACCREDITATION_STATUSES = ['EIAC', 'Non-EIAC'];

async function listCertificateTypes(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status; // 'all', 'active', 'inactive'
    const active = req.query.active; // '1' | '0' (dropdown helper)

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR accreditation_status LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term);
    }

    if (status === 'active' || active === '1') {
      whereClauses.push('is_active = 1');
    } else if (status === 'inactive' || active === '0') {
      whereClauses.push('is_active = 0');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count (for pagination)
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM certificate_types ct ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT ct.id, ct.name, ct.accreditation_status, ct.is_active
       FROM certificate_types ct
       ${whereSql}
       ORDER BY ct.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: {
        certificateTypes: rows,
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

async function getCertificateTypeById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT id, name, accreditation_status, is_active FROM certificate_types WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certification scope not found.'
      });
    }

    return res.json({
      success: true,
      data: {
        certificateType: rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createCertificateType(req, res, next) {
  try {
    const { name, accreditation_status, is_active } = req.body;

    if (accreditation_status !== undefined && !ACCREDITATION_STATUSES.includes(accreditation_status)) {
      return res.status(400).json({
        success: false,
        message: "Accreditation status must be 'EIAC' or 'Non-EIAC'."
      });
    }

    const [existing] = await db.query('SELECT id FROM certificate_types WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A certification scope with this name already exists.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO certificate_types (name, accreditation_status, is_active)
       VALUES (?, ?, ?)`,
      [
        name,
        accreditation_status || 'EIAC',
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const [created] = await db.query(
      'SELECT id, name, accreditation_status, is_active FROM certificate_types WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Certification scope created successfully.',
      data: {
        certificateType: created[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateCertificateType(req, res, next) {
  try {
    const { id } = req.params;
    const { name, accreditation_status, is_active } = req.body;

    const [existing] = await db.query(
      'SELECT id, name, accreditation_status, is_active FROM certificate_types WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certification scope not found.'
      });
    }
    const current = existing[0];

    if (accreditation_status !== undefined && !ACCREDITATION_STATUSES.includes(accreditation_status)) {
      return res.status(400).json({
        success: false,
        message: "Accreditation status must be 'EIAC' or 'Non-EIAC'."
      });
    }

    const newName = name !== undefined ? name : current.name;
    const [conflict] = await db.query(
      'SELECT id FROM certificate_types WHERE name = ? AND id != ?',
      [newName, id]
    );
    if (conflict.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another certification scope with this name already exists.'
      });
    }

    await db.query(
      `UPDATE certificate_types SET
        name = ?,
        accreditation_status = ?,
        is_active = ?
       WHERE id = ?`,
      [
        newName,
        accreditation_status !== undefined ? accreditation_status : current.accreditation_status,
        is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
        id
      ]
    );

    const [updated] = await db.query(
      'SELECT id, name, accreditation_status, is_active FROM certificate_types WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Certification scope updated successfully.',
      data: {
        certificateType: updated[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function toggleCertificateTypeStatus(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id, is_active FROM certificate_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Certification scope not found.'
      });
    }

    const newStatus = existing[0].is_active ? 0 : 1;
    await db.query('UPDATE certificate_types SET is_active = ? WHERE id = ?', [newStatus, id]);

    return res.json({
      success: true,
      message: `Certification scope ${newStatus ? 'activated' : 'deactivated'} successfully.`,
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
  listCertificateTypes,
  getCertificateTypeById,
  createCertificateType,
  updateCertificateType,
  toggleCertificateTypeStatus
};
