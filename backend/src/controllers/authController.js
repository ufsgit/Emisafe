const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/env');

const ROLES = ['admin', 'certification_manager', 'examiner', 'technical_coordinator'];

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const raw = fwd ? String(fwd).split(',')[0].trim() : req.ip;
  return (raw || '').replace(/^::ffff:/i, '').slice(0, 64);
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      'SELECT id, name, email, password_hash, role, photo, is_active FROM admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated'
      });
    }

    // JWT carries the role so downstream checks can be made without a DB hit
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    // Record every successful login
    try {
      await db.query(
        `INSERT INTO login_history (user_id, name, email, role, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          admin.id,
          admin.name,
          admin.email,
          admin.role || null,
          clientIp(req),
          (req.headers['user-agent'] || '').slice(0, 500)
        ]
      );
    } catch (historyError) {
      // Never fail a login because history logging failed
      console.error('[auth] failed to record login history:', historyError.message);
    }

    // Set HttpOnly cookie (SameSite=None + Secure in production for cross-subdomain requests)
    const isProd = config.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const profile = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      photo: admin.photo || null,
      is_active: admin.is_active
    };

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        admin: profile,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res) {
  const isProd = config.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}

async function me(req, res) {
  // authenticateAdmin attaches id, name, email, role, photo, is_active
  const a = req.admin;
  const profile = {
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    photo: a.photo || null,
    is_active: a.is_active
  };
  return res.json({
    success: true,
    data: {
      admin: profile
    }
  });
}

async function loginHistory(req, res, next) {
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
      `SELECT COUNT(*) AS total FROM login_history ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT id, name, email, role, ip, user_agent, login_at
       FROM login_history
       ${whereSql}
       ORDER BY login_at DESC, id DESC
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

module.exports = {
  login,
  logout,
  me,
  loginHistory
};
