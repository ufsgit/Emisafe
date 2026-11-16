const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { saveBase64Upload, deleteUploadedFile } = require('../services/uploadService');

const ROLES = ['admin', 'certification_manager', 'examiner'];

const USER_COLUMNS = 'id, name, email, role, is_active, photo, created_at';

async function listUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR email LIKE ? OR role LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM admins ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT ${USER_COLUMNS} FROM admins ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: {
        data: rows,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role, photo } = req.body;

    if (!ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin, certification_manager or examiner.'
      });
    }

    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    let photoPath = null;
    if (photo) {
      photoPath = saveBase64Upload(photo, 'users', 'photo');
      if (!photoPath) {
        return res.status(400).json({
          success: false,
          message: 'Invalid photo data. Please provide a valid base64 image.'
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO admins (name, email, password_hash, role, is_active, photo, created_by)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [name, email.trim().toLowerCase(), passwordHash, role, photoPath, req.admin.id]
    );

    const [created] = await db.query(
      `SELECT ${USER_COLUMNS} FROM admins WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { user: created[0] }
    });
  } catch (error) {
    next(error);
  }
}

function isDeactivating(value) {
  return value === false || value === 0 || value === '0';
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, password, photo, is_active } = req.body;

    const [existing] = await db.query(`SELECT ${USER_COLUMNS} FROM admins WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    const current = existing[0];
    const isSelf = parseInt(id, 10) === parseInt(req.admin.id, 10);

    // Self-protection: you cannot deactivate or demote your own account.
    if (isSelf && is_active !== undefined && isDeactivating(is_active)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot deactivate your own account.'
      });
    }
    if (isSelf && role !== undefined && role !== current.role) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change the role of your own account.'
      });
    }

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin, certification_manager or examiner.'
      });
    }

    const newEmail = email !== undefined ? String(email).trim().toLowerCase() : current.email;
    if (newEmail !== current.email) {
      const [conflict] = await db.query(
        'SELECT id FROM admins WHERE email = ? AND id != ?',
        [newEmail, id]
      );
      if (conflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Another user with this email address already exists.'
        });
      }
    }

    let photoPath = current.photo;
    if (photo !== undefined && photo !== null && photo !== '') {
      const saved = saveBase64Upload(photo, 'users', 'photo');
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

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    await db.query(
      `UPDATE admins SET
        name = ?,
        email = ?,
        role = ?,
        photo = ?,
        is_active = ?,
        password_hash = COALESCE(?, password_hash)
       WHERE id = ?`,
      [
        name !== undefined ? name : current.name,
        newEmail,
        role !== undefined ? role : current.role,
        photoPath,
        is_active !== undefined ? (isDeactivating(is_active) ? 0 : 1) : current.is_active,
        passwordHash,
        id
      ]
    );

    const [updated] = await db.query(`SELECT ${USER_COLUMNS} FROM admins WHERE id = ?`, [id]);

    return res.json({
      success: true,
      message: 'User updated successfully.',
      data: { user: updated[0] }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser
};
