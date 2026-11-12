const db = require('../config/db');
const { computeCertificateValidity } = require('../services/validityService');
const config = require('../config/env');

async function getDashboardSummary(req, res, next) {
  try {
    // 1. Total employees (and active employees)
    const [empCount] = await db.query(
      'SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active FROM employees'
    );
    const totalEmployees = Number(empCount[0].total) || 0;
    const activeEmployees = Number(empCount[0].active) || 0;

    // 2. Total certificates
    const [certCount] = await db.query('SELECT COUNT(*) AS total FROM certificates');
    const totalCertificates = Number(certCount[0].total) || 0;

    // 3. Pass / Fail count
    const [passFailRows] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN status = 'Fail' THEN 1 ELSE 0 END) AS fail_count
      FROM certificates
    `);
    const passCount = Number(passFailRows[0].pass_count) || 0;
    const failCount = Number(passFailRows[0].fail_count) || 0;

    // 4. Valid vs Expired certificates (among Pass certificates)
    // Valid: status = 'Pass' AND expiry_date >= CURDATE()
    // Expired: status = 'Pass' AND expiry_date < CURDATE()
    const [validityRows] = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'Pass' AND expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS valid_count,
        SUM(CASE WHEN status = 'Pass' AND expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_count
      FROM certificates
    `);
    const validCount = Number(validityRows[0].valid_count) || 0;
    const expiredCount = Number(validityRows[0].expired_count) || 0;

    // 5. Expiring soon certificates list (within next 30 days)
    const [expiringRows] = await db.query(
      `SELECT c.id, c.certificate_number, c.issue_date, c.expiry_date, c.status,
              e.name AS employee_name, e.emirates_id AS employee_emirates_id,
              ct.name AS certificate_type_name
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       INNER JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE c.status = 'Pass'
         AND c.expiry_date >= CURDATE()
         AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY c.expiry_date ASC
       LIMIT 10`,
      [config.EXPIRING_SOON_DAYS]
    );

    const expiringSoon = expiringRows.map(cert => {
      const validityInfo = computeCertificateValidity(cert.expiry_date, cert.status);
      return {
        ...cert,
        validity_status: validityInfo.validityStatus,
        days_remaining: validityInfo.daysRemaining
      };
    });

    // 6. Quarterly trend — last 12 quarters of certificate issues
    const trendStart = (() => {
      const now = new Date();
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const d = new Date(qStart.getFullYear(), qStart.getMonth() - 33, 1); // 11 quarters back
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const [trendCertRows] = await db.query(`
      SELECT YEAR(issue_date) AS yr, QUARTER(issue_date) AS qtr,
             COUNT(*) AS issued,
             SUM(CASE WHEN status = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
             SUM(CASE WHEN status = 'Fail' THEN 1 ELSE 0 END) AS fail_count,
             SUM(CASE WHEN status = 'Pass' AND expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS valid_count,
             SUM(CASE WHEN status = 'Pass' AND expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_count
      FROM certificates
      WHERE issue_date >= ?
      GROUP BY yr, qtr
      ORDER BY yr, qtr
    `, [trendStart]);

    // 7. Quarterly trend — last 12 quarters of new employees
    const [trendEmpRows] = await db.query(`
      SELECT YEAR(created_at) AS yr, QUARTER(created_at) AS qtr,
             COUNT(*) AS total
      FROM employees
      WHERE created_at >= ?
      GROUP BY yr, qtr
      ORDER BY yr, qtr
    `, [trendStart]);

    // 8. Certificates grouped by type
    const [typeRows] = await db.query(`
      SELECT ct.name AS name, COUNT(*) AS total
      FROM certificates c
      INNER JOIN certificate_types ct ON c.certificate_type_id = ct.id
      GROUP BY ct.id, ct.name
      ORDER BY total DESC
      LIMIT 8
    `);

    // Build a continuous 12-quarter series (fill missing quarters with zeros)
    const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
    const certByQuarter = {};
    trendCertRows.forEach(r => { certByQuarter[`${r.yr}-Q${r.qtr}`] = r; });
    const empByQuarter = {};
    trendEmpRows.forEach(r => { empByQuarter[`${r.yr}-Q${r.qtr}`] = r; });

    const trend = [];
    const now = new Date();
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    for (let i = 11; i >= 0; i--) {
      const totalQ = (now.getFullYear() * 4 + (currentQ - 1)) - i;
      const yr = Math.floor(totalQ / 4);
      const qtr = (totalQ % 4) + 1;
      const key = `${yr}-Q${qtr}`;
      const c = certByQuarter[key] || {};
      const e = empByQuarter[key] || {};
      trend.push({
        key,
        label: `${QUARTER_LABELS[qtr - 1]} '${String(yr).slice(2)}`,
        issued: Number(c.issued) || 0,
        pass: Number(c.pass_count) || 0,
        fail: Number(c.fail_count) || 0,
        valid: Number(c.valid_count) || 0,
        expired: Number(c.expired_count) || 0,
        newEmployees: Number(e.total) || 0
      });
    }

    const byType = typeRows.map(r => ({
      name: r.name,
      total: Number(r.total) || 0
    }));

    return res.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          activeEmployees,
          totalCertificates,
          passCount,
          failCount,
          validCount,
          expiredCount,
          expiringSoonCount: expiringSoon.length
        },
        trend,
        byType,
        expiringSoon
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary
};

