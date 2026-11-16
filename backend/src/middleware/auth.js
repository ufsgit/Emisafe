const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/db');

async function authenticateAdmin(req, res, next) {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback to Authorization Header (useful for SSR/direct API calls)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Verify admin still exists in database and load the full profile
    const [rows] = await db.query(
      'SELECT id, name, email, role, photo, is_active FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.'
      });
    }

    // Deactivated accounts lose access immediately (even with a valid token)
    if (!rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated'
      });
    }

    req.admin = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
}

/**
 * Role gate. Must be used AFTER authenticateAdmin so req.admin is populated.
 * Usage: router.get('/', authenticateAdmin, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !req.admin.role || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.'
      });
    }
    next();
  };
}

module.exports = {
  authenticateAdmin,
  requireRole
};

