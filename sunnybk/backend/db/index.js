const { Pool, types } = require('pg');
require('dotenv').config();
// Return DATE columns as plain strings (YYYY-MM-DD) to avoid timezone shifts
types.setTypeParser(1082, val => val);
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sunnybk_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});
pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error', (err) => console.error('❌ PostgreSQL error:', err));
module.exports = pool;
