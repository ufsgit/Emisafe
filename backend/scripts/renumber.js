/* Rebuild all certificate numbers as WOR-yy/xxxx/ddmm-xx-Cz (work order = one per company). */
const mysql = require('mysql2/promise');
const c = require('../src/config/env');

const SQL = `
WITH company_wo AS (
  SELECT company, 1000 + ROW_NUMBER() OVER (ORDER BY company) AS wo
  FROM (SELECT DISTINCT COALESCE(company, 'UNASSIGNED') AS company FROM employees) d
),
base AS (
  SELECT ct.id, ct.issue_date, cw.wo
  FROM certificates ct
  JOIN employees e ON e.id = ct.employee_id
  JOIN company_wo cw ON cw.company = COALESCE(e.company, 'UNASSIGNED')
),
numbered AS (
  SELECT id,
         CONCAT('WOR-', RIGHT(YEAR(issue_date), 2), '/', CAST(wo AS CHAR), '/',
                LPAD(DAYOFMONTH(issue_date), 2, '0'), LPAD(MONTH(issue_date), 2, '0'), '-GT-C',
                ROW_NUMBER() OVER (PARTITION BY wo ORDER BY id)) AS num,
         CAST(wo AS CHAR) AS wo_str
  FROM base
)
UPDATE certificates c JOIN numbered n ON n.id = c.id
SET c.certificate_number = n.num, c.work_order = n.wo_str`;

(async () => {
  const cn = await mysql.createConnection(c.DB);
  console.time('renumber');
  const [res] = await cn.query(SQL);
  console.timeEnd('renumber');
  console.log('updated rows:', res.affectedRows);
  const [sample] = await cn.query(`SELECT certificate_number, work_order FROM certificates WHERE id IN (1,2,100,5000,50000,100000) ORDER BY id`);
  console.table(sample);
  const [perWo] = await cn.query(`SELECT work_order, COUNT(*) n, MIN(certificate_number) first_no, MAX(certificate_number) last_no FROM certificates GROUP BY work_order ORDER BY work_order`);
  console.table(perWo);
  await cn.end();
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
