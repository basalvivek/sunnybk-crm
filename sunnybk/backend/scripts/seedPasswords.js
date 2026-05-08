const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sunnybk_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function seed() {
  const adminHash = await bcrypt.hash('admin@123', 10);
  const empHash   = await bcrypt.hash('sunny@123', 10);

  await pool.query(`UPDATE employees SET password_hash = $1 WHERE employee_code = 'EMP-00001'`, [adminHash]);
  await pool.query(`UPDATE employees SET password_hash = $1 WHERE employee_code != 'EMP-00001'`, [empHash]);

  console.log('Passwords seeded.');
  console.log('  Admin (EMP-00001 / admin@sunnybk.com) → admin@123');
  console.log('  All other employees                   → sunny@123');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
