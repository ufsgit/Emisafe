const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/env');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      'SELECT id, name, email, password_hash FROM admins WHERE email = ?',
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

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    // Set HttpOnly, SameSite cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production'
  });
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}

async function me(req, res) {
  return res.json({
    success: true,
    data: {
      admin: req.admin
    }
  });
}

module.exports = {
  login,
  logout,
  me
};

