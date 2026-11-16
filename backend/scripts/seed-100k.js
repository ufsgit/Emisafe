/**
 * Installs the SQL Stored Procedure `sp_seed_100k_data(IN p_flag INT)`
 * which ONLY executes when parameter `1` is passed, ensures composite indexes
 * for 100k-row performance, removes leftover test accounts/tables, and runs
 * `CALL sp_seed_100k_data(1)` to seed 100,000 candidates + 100,000 certificates.
 */
const mysql = require('mysql2/promise');
const config = require('../src/config/env');

const CREATE_SP_SQL = `
CREATE PROCEDURE sp_seed_100k_data(IN p_flag INT)
BEGIN
  IF p_flag IS NULL OR p_flag <> 1 THEN
    SELECT
      0 AS success,
      'Execution blocked: This stored procedure works ONLY when parameter 1 is input.' AS message,
      p_flag AS input_parameter;
  ELSE
    SET FOREIGN_KEY_CHECKS = 0;

    TRUNCATE TABLE candidate_documents;
    TRUNCATE TABLE certificates;
    TRUNCATE TABLE employees;
    TRUNCATE TABLE certificate_types;

    SET FOREIGN_KEY_CHECKS = 1;

    -- 1. Seed 7 Official EIAC Scopes
    INSERT INTO certificate_types (id, name, accreditation_status, is_active, created_at) VALUES
      (1, 'Signal Man', 'EIAC', 1, NOW()),
      (2, 'Rigger Level 1', 'EIAC', 1, NOW()),
      (3, 'Rigger Level 2', 'EIAC', 1, NOW()),
      (4, 'Forklift Operator', 'EIAC', 1, NOW()),
      (5, 'EOT Crane Operator', 'EIAC', 1, NOW()),
      (6, 'Mobile Crane Operator', 'EIAC', 1, NOW()),
      (7, 'Tower Crane Operator', 'EIAC', 1, NOW());

    -- 2. Seed 100,000 Candidates (employees) with realistic 3-part names
    INSERT INTO employees (
      id, name, photo, email, phone, emirates_id,
      date_of_birth, nationality, gender, address,
      job_title, company, is_active, created_at
    )
    SELECT
      seq AS id,
      CONCAT(
        ELT(MOD(seq, 16) + 1,
          'Ahmed', 'Mohammed', 'Omar', 'Zayed', 'Rashid', 'Khalid', 'Saeed', 'Fatima',
          'Sara', 'Tariq', 'Hamdan', 'Mansoor', 'Mariam', 'Noura', 'Sultan', 'Yousef'
        ),
        ' ',
        ELT(MOD(seq * 7, 15) + 1,
          'Abdullah', 'Ibrahim', 'Hassan', 'Ali', 'Salim', 'Nasser', 'Majid', 'Kareem',
          'Hamad', 'Faisal', 'Jassim', 'Obaid', 'Saif', 'Adel', 'Badr'
        ),
        ' ',
        ELT(MOD(seq * 13, 17) + 1,
          'Al Mansoori', 'Al Nahyan', 'Al Hashimi', 'Al Suwaidi', 'Al Maktoum', 'Al Nuaimi',
          'Al Qasimi', 'Al Mazrouei', 'Al Shamsi', 'Al Ketbi', 'Al Dhaheri', 'Al Kaabi',
          'Al Muhairi', 'Al Zaabi', 'Al Falasi', 'Al Balooshi', 'Al Hammadi'
        )
      ) AS name,
      '/assets/logo/logo-navy.svg' AS photo,
      CASE WHEN MOD(seq, 5) = 0 THEN NULL ELSE CONCAT('candidate.', seq, '@emisafe-training.ae') END AS email,
      CASE WHEN MOD(seq, 4) = 0 THEN NULL ELSE CONCAT('+971-50-', LPAD(MOD(seq * 37, 10000000), 7, '0')) END AS phone,
      CONCAT('784-', 1975 + MOD(seq, 25), '-', LPAD(1000000 + seq, 7, '0'), '-', MOD(seq, 9) + 1) AS emirates_id,
      CASE WHEN MOD(seq, 6) = 0 THEN NULL ELSE DATE_SUB('1998-06-15', INTERVAL MOD(seq, 7000) DAY) END AS date_of_birth,
      CASE WHEN MOD(seq, 5) = 0 THEN NULL ELSE ELT(MOD(seq, 6) + 1, 'United Arab Emirates', 'India', 'Pakistan', 'Egypt', 'Jordan', 'Philippines') END AS nationality,
      CASE WHEN MOD(seq, 16) IN (7, 8, 12, 13) THEN 'Female' ELSE 'Male' END AS gender,
      'Abu Dhabi / Dubai Industrial Zone, UAE' AS address,
      CASE WHEN MOD(seq, 4) = 0 THEN NULL ELSE ELT(MOD(seq, 6) + 1, 'HSE Officer', 'Lifting Supervisor', 'Rigger Level 2', 'Scaffold Inspector', 'Fire Warden', 'Forklift Operator') END AS job_title,
      ELT(MOD(seq, 10) + 1,
        'ADNOC Drilling',
        'Emirates Steel Arkan',
        'DP World UAE',
        'DEWA',
        'Arabtec Construction',
        'Petrofac Emirates',
        'NPCC Abu Dhabi',
        'Target Engineering',
        'Al Naboodah Group',
        'Drydocks World'
      ) AS company,
      CASE WHEN MOD(seq, 20) = 0 THEN 0 ELSE 1 END AS is_active,
      DATE_SUB(NOW(), INTERVAL MOD(seq, 1000) DAY) AS created_at
    FROM (
      SELECT (d0.n + d1.n * 10 + d2.n * 100 + d3.n * 1000 + d4.n * 10000 + 1) AS seq
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d0
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
    ) gen;

    -- 3. Seed 100,000 Certificates (certificates)
    INSERT INTO certificates (
      id, employee_id, certificate_type_id, scope_name,
      accreditation_status, company_name, certificate_number,
      issue_date, expiry_date, status, approval_status,
      approved_by, approved_at, created_at
    )
    SELECT
      seq AS id,
      CASE
        WHEN seq <= 1000 THEN 99000 + seq
        ELSE seq
      END AS employee_id,
      CASE
        WHEN MOD(seq, 20) IN (0, 1, 2, 3) THEN 1
        WHEN MOD(seq, 20) IN (4, 5, 6) THEN 2
        WHEN MOD(seq, 20) IN (7, 8, 9) THEN 3
        WHEN MOD(seq, 20) IN (10, 11, 12) THEN 4
        WHEN MOD(seq, 20) IN (13, 14) THEN 5
        WHEN MOD(seq, 20) IN (15, 16) THEN 6
        ELSE 7
      END AS certificate_type_id,
      CASE
        WHEN MOD(seq, 20) IN (0, 1, 2, 3) THEN 'Signal Man'
        WHEN MOD(seq, 20) IN (4, 5, 6) THEN 'Rigger Level 1'
        WHEN MOD(seq, 20) IN (7, 8, 9) THEN 'Rigger Level 2'
        WHEN MOD(seq, 20) IN (10, 11, 12) THEN 'Forklift Operator'
        WHEN MOD(seq, 20) IN (13, 14) THEN 'EOT Crane Operator'
        WHEN MOD(seq, 20) IN (15, 16) THEN 'Mobile Crane Operator'
        ELSE 'Tower Crane Operator'
      END AS scope_name,
      'EIAC' AS accreditation_status,
      CASE
        WHEN seq <= 1000 THEN ELT(MOD(seq + 3, 10) + 1,
          'ADNOC Drilling',
          'Emirates Steel Arkan',
          'DP World UAE',
          'DEWA',
          'Arabtec Construction',
          'Petrofac Emirates',
          'NPCC Abu Dhabi',
          'Target Engineering',
          'Al Naboodah Group',
          'Drydocks World'
        )
        ELSE ELT(MOD(seq, 10) + 1,
          'ADNOC Drilling',
          'Emirates Steel Arkan',
          'DP World UAE',
          'DEWA',
          'Arabtec Construction',
          'Petrofac Emirates',
          'NPCC Abu Dhabi',
          'Target Engineering',
          'Al Naboodah Group',
          'Drydocks World'
        )
      END AS company_name,
      CONCAT(
        'WOR-',
        DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL FLOOR(POW(MOD(seq * 31, 1000) / 1000, 1.4) * 900) DAY), '%y'),
        '/',
        LPAD(seq, 6, '0'),
        '/',
        DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL FLOOR(POW(MOD(seq * 31, 1000) / 1000, 1.4) * 900) DAY), '%d/%m'),
        '-',
        LPAD(MOD(seq, 99) + 1, 2, '0'),
        '-C',
        MOD(seq, 5) + 1
      ) AS certificate_number,
      DATE_SUB(CURDATE(), INTERVAL FLOOR(POW(MOD(seq * 31, 1000) / 1000, 1.4) * 900) DAY) AS issue_date,
      CASE
        WHEN MOD(seq, 25) = 0 THEN DATE_ADD(CURDATE(), INTERVAL MOD(seq * 7, 28) + 1 DAY)
        WHEN MOD(seq, 6) = 0 THEN DATE_SUB(CURDATE(), INTERVAL MOD(seq, 300) + 1 DAY)
        ELSE DATE_ADD(CURDATE(), INTERVAL MOD(seq, 330) + 31 DAY)
      END AS expiry_date,
      CASE
        WHEN MOD(seq, 20) = 0 THEN 'Fail'
        WHEN MOD(seq, 25) = 1 THEN 'Withdrawn'
        WHEN MOD(seq, 25) = 2 THEN 'Withheld'
        ELSE 'Pass'
      END AS status,
      CASE
        WHEN seq > 99950 THEN 'pending'
        ELSE 'approved'
      END AS approval_status,
      CASE
        WHEN seq > 99950 THEN NULL
        ELSE 2
      END AS approved_by,
      CASE
        WHEN seq > 99950 THEN NULL
        ELSE NOW()
      END AS approved_at,
      NOW() AS created_at
    FROM (
      SELECT (d0.n + d1.n * 10 + d2.n * 100 + d3.n * 1000 + d4.n * 10000 + 1) AS seq
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d0
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
    ) gen;

    SELECT
      1 AS success,
      '1,00,000 test data records seeded successfully via sp_seed_100k_data(1).' AS message,
      (SELECT COUNT(*) FROM employees) AS total_candidates,
      (SELECT COUNT(*) FROM certificates) AS total_certificates,
      (SELECT COUNT(*) FROM certificate_types) AS total_scopes;
  END IF;
END
`;

async function ensureIndex(conn, table, indexName, columnsSql) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [config.DB.database, table, indexName]
  );
  if (rows[0].c === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columnsSql})`);
    console.log(`[seed-100k] Added index ${table}.${indexName}`);
  }
}

(async () => {
  const startTime = Date.now();
  const conn = await mysql.createConnection({ ...config.DB, multipleStatements: true });
  console.log('[seed-100k] Connected to database:', config.DB.database);

  // Drop unused legacy exams table and temporary test user if present
  await conn.query('DROP TABLE IF EXISTS exams');
  await conn.query("DELETE FROM admins WHERE email = 'temp.tester@emisafe.ae'");

  await conn.query('DROP PROCEDURE IF EXISTS sp_seed_100k_data');
  await conn.query(CREATE_SP_SQL);
  console.log('[seed-100k] Created stored procedure: sp_seed_100k_data(IN p_flag INT)');

  // 1. Verify guard when parameter != 1
  const [blockedRes] = await conn.query('CALL sp_seed_100k_data(0)');
  console.log('[seed-100k] Test CALL sp_seed_100k_data(0):', blockedRes[0][0]);

  // 2. Execute with parameter = 1
  console.log('[seed-100k] Running CALL sp_seed_100k_data(1)...');
  const [execRes] = await conn.query('CALL sp_seed_100k_data(1)');
  console.log('[seed-100k] Result:', execRes[0][0]);

  // 3. Ensure composite covering indexes for sub-10ms queries on 100k rows
  await ensureIndex(conn, 'certificates', 'idx_cert_issue_id', 'issue_date, id');
  await ensureIndex(conn, 'certificates', 'idx_cert_status_expiry', 'status, expiry_date');
  await ensureIndex(conn, 'certificates', 'idx_cert_type_status_expiry', 'certificate_type_id, status, expiry_date');
  await ensureIndex(conn, 'certificates', 'idx_cert_emp_company_issue', 'employee_id, company_name, issue_date, id');
  await ensureIndex(conn, 'certificates', 'idx_cert_approval_id', 'approval_status, id');
  await ensureIndex(conn, 'employees', 'idx_emp_active_id', 'is_active, id');

  console.log(`[seed-100k] Completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  await conn.end();
})().catch(err => {
  console.error('[seed-100k] ERROR:', err.message);
  process.exit(1);
});
