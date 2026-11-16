/* Ensure the work_order index exists (fast next-number lookup on 100k rows). */
const mysql = require('mysql2/promise');
const c = require('../src/config/env');
(async () => {
  const cn = await mysql.createConnection(c.DB);
  const [idx] = await cn.query(
    "SELECT COUNT(*) n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'certificates' AND INDEX_NAME = 'idx_certificates_work_order'",
    [c.DB.database]
  );
  if (idx[0].n === 0) {
    console.time('create index');
    await cn.query('CREATE INDEX idx_certificates_work_order ON certificates (work_order)');
    console.timeEnd('create index');
    console.log('index created');
  } else {
    console.log('index already present');
  }
  const [show] = await cn.query('SHOW INDEX FROM certificates');
  console.log('indexes:', show.map(i => i.Key_name).filter((v, i, a) => a.indexOf(v) === i).join(', '));
  await cn.end();
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
