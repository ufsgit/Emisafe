const db = require('../config/db');
const { computeCertificateValidity } = require('../services/validityService');

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function getEmployeeWiseReport(req, res, next) {
  try {
    const format = req.query.format; // 'json' or 'csv'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const baseSql = `
      SELECT 
        e.id AS employee_id,
        e.name AS employee_name,
        e.email AS employee_email,
        e.emirates_id,
        e.job_title,
        e.is_active AS employee_active,
        COUNT(c.id) AS total_certificates,
        SUM(CASE WHEN c.status = 'Pass' AND c.expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS valid_certificates,
        SUM(CASE WHEN c.status = 'Pass' AND c.expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_certificates,
        SUM(CASE WHEN c.status = 'Fail' THEN 1 ELSE 0 END) AS failed_certificates
      FROM employees e
      LEFT JOIN certificates c ON e.id = c.employee_id
      GROUP BY e.id
      ORDER BY e.name ASC
    `;

    // CSV export always returns ALL rows (not paginated)
    if (format === 'csv') {
      const [rows] = await db.query(baseSql);

      const headers = [
        'Employee ID',
        'Name',
        'Email',
        'Emirates ID',
        'Job Title',
        'Account Status',
        'Total Certificates',
        'Valid Certificates',
        'Expired Certificates',
        'Failed Certificates'
      ];

      const csvLines = [headers.join(',')];

      rows.forEach(r => {
        const line = [
          r.employee_id,
          escapeCsvField(r.employee_name),
          escapeCsvField(r.employee_email),
          escapeCsvField(r.emirates_id),
          escapeCsvField(r.job_title),
          r.employee_active ? 'Active' : 'Inactive',
          r.total_certificates,
          r.valid_certificates || 0,
          r.expired_certificates || 0,
          r.failed_certificates || 0
        ];
        csvLines.push(line.join(','));
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="emisafe-employee-wise-report.csv"');
      return res.send(csvLines.join('\r\n'));
    }

    // JSON: total count + one page of rows
    const [countRows] = await db.query('SELECT COUNT(*) AS total FROM employees');
    const total = countRows[0].total;

    const [rows] = await db.query(`${baseSql} LIMIT ? OFFSET ?`, [limit, offset]);

    return res.json({
      success: true,
      data: {
        report: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getTypeWiseReport(req, res, next) {
  try {
    const format = req.query.format;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const baseSql = `
      SELECT 
        ct.id AS certificate_type_id,
        ct.name AS certificate_type_name,
        ct.category,
        ct.is_active AS type_active,
        COUNT(c.id) AS total_issued,
        SUM(CASE WHEN c.status = 'Pass' AND c.expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS valid_count,
        SUM(CASE WHEN c.status = 'Pass' AND c.expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_count,
        SUM(CASE WHEN c.status = 'Fail' THEN 1 ELSE 0 END) AS failed_count
      FROM certificate_types ct
      LEFT JOIN certificates c ON ct.id = c.certificate_type_id
      GROUP BY ct.id
      ORDER BY ct.name ASC
    `;

    // CSV export always returns ALL rows (not paginated)
    if (format === 'csv') {
      const [rows] = await db.query(baseSql);

      const headers = [
        'Type ID',
        'Certificate Type Name',
        'Category',
        'Status',
        'Total Issued',
        'Valid Count',
        'Expired Count',
        'Failed Count'
      ];

      const csvLines = [headers.join(',')];

      rows.forEach(r => {
        const line = [
          r.certificate_type_id,
          escapeCsvField(r.certificate_type_name),
          escapeCsvField(r.category),
          r.type_active ? 'Active' : 'Inactive',
          r.total_issued,
          r.valid_count || 0,
          r.expired_count || 0,
          r.failed_count || 0
        ];
        csvLines.push(line.join(','));
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="emisafe-type-wise-report.csv"');
      return res.send(csvLines.join('\r\n'));
    }

    // JSON: total count + one page of rows
    const [countRows] = await db.query('SELECT COUNT(*) AS total FROM certificate_types');
    const total = countRows[0].total;

    const [rows] = await db.query(`${baseSql} LIMIT ? OFFSET ?`, [limit, offset]);

    return res.json({
      success: true,
      data: {
        report: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEmployeeWiseReport,
  getTypeWiseReport
};

