/* One-off restructure migration (Nov 2026). Idempotent: checks information_schema first. */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');

const NOTES = [];

async function hasCol(conn, table, col) {
  const [r] = await conn.query(
    'SELECT COUNT(*) c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [config.DB.database, table, col]
  );
  return r[0].c > 0;
}
async function hasTable(conn, table) {
  const [r] = await conn.query(
    'SELECT COUNT(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [config.DB.database, table]
  );
  return r[0].c > 0;
}
async function hasIndex(conn, table, indexName) {
  const [r] = await conn.query(
    'SELECT COUNT(*) c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [config.DB.database, table, indexName]
  );
  return r[0].c > 0;
}
async function col(conn, table, column, ddl) {
  if (await hasCol(conn, table, column)) return;
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  NOTES.push(`+ ${table}.${column}`);
}

(async () => {
  const conn = await mysql.createConnection({ ...config.DB, multipleStatements: true });
  console.log('[migrate] connected to', config.DB.database);

  // ---------- admins = users ----------
  await col(conn, 'admins', 'role', "role ENUM('admin','certification_manager','examiner') NOT NULL DEFAULT 'examiner'");
  await col(conn, 'admins', 'is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
  await col(conn, 'admins', 'photo', 'photo VARCHAR(255) NULL');
  await col(conn, 'admins', 'created_by', 'created_by INT UNSIGNED NULL');
  await conn.query("UPDATE admins SET role='admin' WHERE id=1 AND role='examiner'");
  await conn.query("UPDATE admins SET is_active=1 WHERE is_active IS NULL");

  // ---------- employees = candidates ----------
  await col(conn, 'employees', 'photo', 'photo VARCHAR(255) NULL AFTER name');
  await col(conn, 'employees', 'company', 'company VARCHAR(255) NULL AFTER job_title');
  await conn.query('ALTER TABLE employees MODIFY email VARCHAR(255) NULL');
  await conn.query('ALTER TABLE employees MODIFY phone VARCHAR(50) NULL');
  if (await hasIndex(conn, 'employees', 'email')) {
    await conn.query('ALTER TABLE employees DROP INDEX email');
    NOTES.push('~ employees: unique index on email dropped (email now optional)');
  }

  // ---------- certificate_types = scopes ----------
  await col(conn, 'certificate_types', 'accreditation_status',
    "accreditation_status ENUM('EIAC','Non-EIAC') NOT NULL DEFAULT 'EIAC' AFTER name");
  for (const c of ['category', 'description', 'scope']) {
    if (await hasCol(conn, 'certificate_types', c)) {
      await conn.query(`ALTER TABLE certificate_types DROP COLUMN \`${c}\``);
      NOTES.push(`- certificate_types.${c}`);
    }
  }

  // ---------- certificates ----------
  await conn.query(
    "ALTER TABLE certificates MODIFY status ENUM('Pass','Fail','Withdrawn','Withheld') NOT NULL DEFAULT 'Pass'"
  );
  await conn.query('ALTER TABLE certificates MODIFY certificate_type_id INT UNSIGNED NULL');
  await col(conn, 'certificates', 'scope_name', 'scope_name VARCHAR(255) NULL AFTER certificate_type_id');
  await col(conn, 'certificates', 'accreditation_status',
    "accreditation_status ENUM('EIAC','Non-EIAC') NULL AFTER scope_name");
  await col(conn, 'certificates', 'company_name', 'company_name VARCHAR(255) NULL AFTER expiry_date');
  await col(conn, 'certificates', 'work_order', 'work_order VARCHAR(32) NULL AFTER company_name');
  await col(conn, 'certificates', 'approval_status',
    "approval_status ENUM('pending','approved') NOT NULL DEFAULT 'pending' AFTER status");
  await col(conn, 'certificates', 'approved_by', 'approved_by INT UNSIGNED NULL AFTER approval_status');
  await col(conn, 'certificates', 'approved_at', 'approved_at TIMESTAMP NULL AFTER approved_by');
  await conn.query(
    `UPDATE certificates c LEFT JOIN certificate_types t ON t.id = c.certificate_type_id
     SET c.scope_name = COALESCE(c.scope_name, t.name, '—') WHERE c.scope_name IS NULL OR c.scope_name = ''`
  );
  await conn.query(
    `UPDATE certificates c LEFT JOIN certificate_types t ON t.id = c.certificate_type_id
     SET c.accreditation_status = t.accreditation_status WHERE c.accreditation_status IS NULL`
  );
  await conn.query("UPDATE certificates SET approval_status='approved' WHERE approval_status='pending'");

  // Backfill demo certificates into the new number format: WOR-yy/xxxx/ddmm-xx-Cz
  // (work order is per company so candidates under one work order share the C1..Cn sequence)
  {
    const [emps] = await conn.query('SELECT id, company FROM employees');
    const [certs] = await conn.query('SELECT id, employee_id, issue_date FROM certificates ORDER BY id');
    const woByCompany = new Map();
    const seqByWo = new Map();
    let nextWo = 1001;
    for (const c of certs) {
      const emp = emps.find(e => e.id === c.employee_id);
      const key = (emp && emp.company) || 'UNASSIGNED';
      if (!woByCompany.has(key)) woByCompany.set(key, String(nextWo++));
      const wo = woByCompany.get(key);
      const [y, m, d] = String(c.issue_date).slice(0, 10).split('-');
      const yy = y.slice(2);
      const ddmm = `${d}${m}`;
      const n = (seqByWo.get(wo) || 0) + 1;
      seqByWo.set(wo, n);
      await conn.query('UPDATE certificates SET certificate_number = ?, work_order = ? WHERE id = ?',
        [`WOR-${yy}/${wo}/${ddmm}-GT-C${n}`, wo, c.id]);
    }
    NOTES.push('~ certificates: numbers backfilled to WOR-yy/xxxx/ddmm-xx-Cz (work order per company)');
  }
  if (!(await hasIndex(conn, 'certificates', 'idx_certificates_work_order'))) {
    await conn.query('CREATE INDEX idx_certificates_work_order ON certificates (work_order)');
  }
  await conn.query('ALTER TABLE certificates MODIFY scope_name VARCHAR(255) NOT NULL');
  for (const c of ['description', 'scope']) {
    if (await hasCol(conn, 'certificates', c)) {
      await conn.query(`ALTER TABLE certificates DROP COLUMN \`${c}\``);
      NOTES.push(`- certificates.${c}`);
    }
  }

  // ---------- new tables ----------
  if (!(await hasTable(conn, 'candidate_documents'))) {
    await conn.query(`CREATE TABLE candidate_documents (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      employee_id INT UNSIGNED NOT NULL,
      doc_type VARCHAR(100) NOT NULL DEFAULT 'Other',
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_doc_employee (employee_id),
      CONSTRAINT fk_doc_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    NOTES.push('+ candidate_documents');
  }
  if (!(await hasTable(conn, 'login_history'))) {
    await conn.query(`CREATE TABLE login_history (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NULL,
      name VARCHAR(255) NULL,
      email VARCHAR(255) NULL,
      role VARCHAR(50) NULL,
      ip VARCHAR(64) NULL,
      user_agent VARCHAR(500) NULL,
      login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_login_at (login_at),
      KEY idx_login_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    NOTES.push('+ login_history');
  }

  // ---------- certificate raw format (client format pending) ----------
  if (!(await hasTable(conn, 'certificate_formats'))) {
    await conn.query(`CREATE TABLE certificate_formats (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(150) NULL,
      file_size INT UNSIGNED NULL,
      uploaded_by INT UNSIGNED NULL,
      uploaded_by_name VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    NOTES.push('+ certificate_formats');
  }

  // ---------- demo users ----------
  const hash = bcrypt.hashSync('123', 10);
  for (const [name, email, role] of [
    ['Certification Manager', 'manager@emisafe.ae', 'certification_manager'],
    ['Examiner', 'examiner@emisafe.ae', 'examiner']
  ]) {
    const [ex] = await conn.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (ex.length === 0) {
      await conn.query('INSERT INTO admins (name, email, password_hash, role, is_active) VALUES (?,?,?,?,1)',
        [name, email, hash, role]);
      NOTES.push(`+ user ${email} (${role}) / 123`);
    }
  }

  await conn.end();
  console.log('[migrate] done:\n' + (NOTES.length ? NOTES.map(n => '  ' + n).join('\n') : '  (nothing to change)'));
})().catch(err => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
