const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool(config.DB);

// Test connectivity on startup
pool.getConnection()
  .then((conn) => {
    console.log(`[Database] Connected successfully to MySQL database: ${config.DB.database}`);
    conn.release();
  })
  .catch((err) => {
    console.error('[Database] MySQL Connection Failed:', err.message);
  });

module.exports = pool;

