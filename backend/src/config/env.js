const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const parsedCorsOrigins = (process.env.CORS_ORIGIN || 'https://emisafe.ufstech.co.in')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 4411,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'emisafe_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00'
  },
  JWT_SECRET: process.env.JWT_SECRET || 'emisafe_super_secret_jwt_key_2026_secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: parsedCorsOrigins,
  EXPIRING_SOON_DAYS: parseInt(process.env.EXPIRING_SOON_DAYS, 10) || 30
};
