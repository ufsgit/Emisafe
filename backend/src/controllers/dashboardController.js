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

    // 2-4. Certificate counts in a single scan
    const [certStatsRows] = await db.query(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
         SUM(CASE WHEN status = 'Fail' THEN 1 ELSE 0 END) AS fail_count,
         SUM(CASE WHEN status IN ('Withdrawn', 'Withheld') THEN 1 ELSE 0 END) AS other_status_count,
         SUM(CASE WHEN status = 'Pass' AND expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS valid_count,
         SUM(CASE WHEN status = 'Pass' AND expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_count,
         SUM(CASE WHEN status = 'Pass' AND expiry_date >= CURDATE() AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS expiring_soon_count,
         SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_approval_count
       FROM certificates`,
      [config.EXPIRING_SOON_DAYS]
    );
    const stats = certStatsRows[0] || {};
    const totalCertificates = Number(stats.total) || 0;
    const passCount = Number(stats.pass_count) || 0;
    const failCount = Number(stats.fail_count) || 0;
    const otherStatusCount = Number(stats.other_status_count) || 0;
    const validCount = Number(stats.valid_count) || 0;
    const expiredCount = Number(stats.expired_count) || 0;
    const expiringSoonTotal = Number(stats.expiring_soon_count) || 0;
    const pendingApprovalCount = Number(stats.pending_approval_count) || 0;

    // 5. Expiring soon certificates list (within next 30 days) — select only displayed columns
    const [expiringRows] = await db.query(
      `SELECT c.id, c.certificate_number, c.scope_name, c.expiry_date,
              e.name AS employee_name, e.emirates_id AS employee_emirates_id,
              ct.name AS certificate_type_name
       FROM certificates c
       INNER JOIN employees e ON c.employee_id = e.id
       LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id
       WHERE c.status = 'Pass'
         AND c.expiry_date >= CURDATE()
         AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY c.expiry_date ASC
       LIMIT 10`,
      [config.EXPIRING_SOON_DAYS]
    );

    const expiringSoon = expiringRows.map(cert => {
      const validityInfo = computeCertificateValidity(cert.expiry_date, 'Pass');
      return {
        ...cert,
        days_remaining: validityInfo.daysRemaining
      };
    });

    // 5b. Pending approval — only queried for Certification Managers and only with displayed columns
    let pendingApproval = [];
    if (req.admin && req.admin.role === 'certification_manager') {
      const [pendingRows] = await db.query(
        `SELECT c.id, c.certificate_number, c.scope_name, c.company_name,
                e.name AS employee_name, e.emirates_id AS employee_emirates_id,
                ct.name AS certificate_type_name
         FROM certificates c
         INNER JOIN employees e ON c.employee_id = e.id
         LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id
         WHERE c.approval_status = 'pending'
         ORDER BY c.id DESC
         LIMIT 10`
      );
      pendingApproval = pendingRows;
    }

    // 6. Quarterly trend — last 12 quarters of certificate issues
    const trendStart = (() => {
      const now = new Date();
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const d = new Date(qStart.getFullYear(), qStart.getMonth() - 33, 1); // 11 quarters back
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const [trendCertRows] = await db.query(`
      SELECT YEAR(issue_date) AS yr, QUARTER(issue_date) AS qtr,
             COUNT(*) AS issued
      FROM certificates
      WHERE issue_date >= ?
      GROUP BY yr, qtr
      ORDER BY yr, qtr
    `, [trendStart]);

    // 7. Certificates grouped by scope (including manual/Other scopes)
    const [typeRows] = await db.query(`
      SELECT COALESCE(ct.name, c.scope_name, 'Other') AS name, COUNT(*) AS total
      FROM certificates c
      LEFT JOIN certificate_types ct ON c.certificate_type_id = ct.id
      GROUP BY COALESCE(ct.name, c.scope_name, 'Other')
      ORDER BY total DESC
      LIMIT 8
    `);

    // Build a continuous 12-quarter series (fill missing quarters with zeros)
    const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
    const certByQuarter = {};
    trendCertRows.forEach(r => { certByQuarter[`${r.yr}-Q${r.qtr}`] = r; });

    const trend = [];
    const now = new Date();
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    for (let i = 11; i >= 0; i--) {
      const totalQ = (now.getFullYear() * 4 + (currentQ - 1)) - i;
      const yr = Math.floor(totalQ / 4);
      const qtr = (totalQ % 4) + 1;
      const key = `${yr}-Q${qtr}`;
      const c = certByQuarter[key] || {};
      trend.push({
        label: `${QUARTER_LABELS[qtr - 1]} '${String(yr).slice(2)}`,
        issued: Number(c.issued) || 0
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
          otherStatusCount,
          validCount,
          expiredCount,
          expiringSoonCount: expiringSoonTotal,
          pendingApprovalCount
        },
        trend,
        byType,
        expiringSoon,
        pendingApproval
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary
};

