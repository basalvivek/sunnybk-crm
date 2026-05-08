#!/bin/bash
# ============================================================
# SUNNY BK CRM - AUTO SETUP SCRIPT
# Run this on your desktop:  bash setup.sh
# ============================================================

echo "🚀 Setting up Sunny BK CRM..."

mkdir -p sunnybk/backend/{controllers,db,routes,middleware}
mkdir -p sunnybk/frontend/src/{components,pages,api}
mkdir -p sunnybk/frontend/public

cd sunnybk

# ============================================================
# BACKEND FILES
# ============================================================

cat > backend/package.json << 'EOF'
{
  "name": "sunnybk-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js", "dev": "nodemon server.js" },
  "dependencies": { "cors": "^2.8.5", "dotenv": "^16.3.1", "express": "^4.18.2", "pg": "^8.11.3" },
  "devDependencies": { "nodemon": "^3.0.2" }
}
EOF

cat > backend/.env.example << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sunnybk_crm
DB_USER=postgres
DB_PASSWORD=your_postgres_password
PORT=5000
NODE_ENV=development
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_app_password
EOF

cat > backend/server.js << 'EOF'
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use('/api', require('./routes'));
app.get('/', (req, res) => res.json({ message: 'Sunny BK CRM API running', version: '1.0.0' }));
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
EOF

cat > backend/db/index.js << 'EOF'
const { Pool } = require('pg');
require('dotenv').config();
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
EOF

cat > backend/routes/index.js << 'EOF'
const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById, createCustomer, updateCustomer } = require('../controllers/customerController');
const { getEnquiries, getEnquiryById, createEnquiry, updateEnquiry, addEnquiryLog, getEnquiryStats } = require('../controllers/enquiryController');
const { getEmployees, getDepartments } = require('../controllers/employeeController');
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.get('/enquiries/stats', getEnquiryStats);
router.get('/enquiries', getEnquiries);
router.get('/enquiries/:id', getEnquiryById);
router.post('/enquiries', createEnquiry);
router.put('/enquiries/:id', updateEnquiry);
router.post('/enquiries/:id/logs', addEnquiryLog);
router.get('/employees', getEmployees);
router.get('/departments', getDepartments);
module.exports = router;
EOF

cat > backend/controllers/employeeController.js << 'EOF'
const pool = require('../db');
const getEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.phone, e.role, e.is_active,
             COALESCE(json_agg(json_build_object('id', d.id, 'name', d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') AS departments
      FROM employees e
      LEFT JOIN employee_departments ed ON e.id = ed.employee_id
      LEFT JOIN departments d ON ed.department_id = d.id
      WHERE e.is_active = true
      GROUP BY e.id ORDER BY e.first_name`);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
const getDepartments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments WHERE is_active=true ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
module.exports = { getEmployees, getDepartments };
EOF

cat > backend/controllers/customerController.js << 'JSEOF'
const pool = require('../db');
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT id, customer_code, first_name, last_name, email, phone, whatsapp, postcode, city, source, created_at FROM customers`;
    const params = [];
    if (search) {
      query += ` WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR customer_code ILIKE $1 OR postcode ILIKE $1`;
      params.push(`%${search}%`);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    const enquiriesResult = await pool.query(
      `SELECT e.id, e.enquiry_code, e.product_interest, e.status, e.channel, e.created_at,
              emp.first_name || ' ' || emp.last_name AS assigned_to_name
       FROM enquiries e LEFT JOIN employees emp ON e.assigned_to = emp.id
       WHERE e.customer_id = $1 ORDER BY e.created_at DESC`, [id]);
    res.json({ success: true, data: { customer: customerResult.rows[0], enquiries: enquiriesResult.rows } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
const createCustomer = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, whatsapp, address_line1, address_line2, city, postcode, source, notes } = req.body;
    if (!first_name || !last_name || !phone) return res.status(400).json({ success: false, message: 'First name, last name and phone are required' });
    const result = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, phone, whatsapp, address_line1, address_line2, city, postcode, source, notes, customer_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'') RETURNING *`,
      [first_name, last_name, email, phone, whatsapp, address_line1, address_line2, city, postcode, source || 'Phone', notes]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, whatsapp, address_line1, address_line2, city, postcode, source, notes } = req.body;
    const result = await pool.query(
      `UPDATE customers SET first_name=$1, last_name=$2, email=$3, phone=$4, whatsapp=$5,
       address_line1=$6, address_line2=$7, city=$8, postcode=$9, source=$10, notes=$11 WHERE id=$12 RETURNING *`,
      [first_name, last_name, email, phone, whatsapp, address_line1, address_line2, city, postcode, source, notes, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer };
JSEOF

cat > backend/controllers/enquiryController.js << 'JSEOF'
const pool = require('../db');
const getEnquiries = async (req, res) => {
  try {
    const { search, status, product_interest, assigned_to } = req.query;
    let conditions = [], params = [], i = 1;
    if (search) { conditions.push(`(e.enquiry_code ILIKE $${i} OR c.first_name ILIKE $${i} OR c.last_name ILIKE $${i} OR c.phone ILIKE $${i} OR c.email ILIKE $${i} OR c.postcode ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (status) { conditions.push(`e.status = $${i++}`); params.push(status); }
    if (product_interest) { conditions.push(`e.product_interest = $${i++}`); params.push(product_interest); }
    if (assigned_to) { conditions.push(`e.assigned_to = $${i++}`); params.push(assigned_to); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await pool.query(`
      SELECT e.id, e.enquiry_code, e.status, e.product_interest, e.channel, e.priority, e.budget_estimate, e.description, e.enquiry_date, e.created_at,
             c.id AS customer_id, c.customer_code, c.first_name || ' ' || c.last_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email, c.postcode,
             emp.first_name || ' ' || emp.last_name AS assigned_to_name,
             creator.first_name || ' ' || creator.last_name AS created_by_name,
             (SELECT COUNT(*) FROM enquiry_logs el WHERE el.enquiry_id = e.id) AS log_count
      FROM enquiries e JOIN customers c ON e.customer_id = c.id
      LEFT JOIN employees emp ON e.assigned_to = emp.id
      LEFT JOIN employees creator ON e.created_by = creator.id
      ${where} ORDER BY e.created_at DESC`, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const enqR = await pool.query(`
      SELECT e.*, c.customer_code, c.first_name || ' ' || c.last_name AS customer_name,
             c.phone AS customer_phone, c.email AS customer_email, c.address_line1, c.address_line2, c.city, c.postcode,
             emp.first_name || ' ' || emp.last_name AS assigned_to_name, emp.email AS assigned_to_email,
             creator.first_name || ' ' || creator.last_name AS created_by_name
      FROM enquiries e JOIN customers c ON e.customer_id = c.id
      LEFT JOIN employees emp ON e.assigned_to = emp.id
      LEFT JOIN employees creator ON e.created_by = creator.id
      WHERE e.id = $1`, [id]);
    if (enqR.rows.length === 0) return res.status(404).json({ success: false, message: 'Enquiry not found' });
    const logsR = await pool.query(`
      SELECT el.*, emp.first_name || ' ' || emp.last_name AS logged_by_name
      FROM enquiry_logs el LEFT JOIN employees emp ON el.logged_by = emp.id
      WHERE el.enquiry_id = $1 ORDER BY el.log_date DESC`, [id]);
    res.json({ success: true, data: { enquiry: enqR.rows[0], logs: logsR.rows } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
const createEnquiry = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { customer_id, assigned_to, product_interest, channel, description, priority, budget_estimate, created_by, new_customer } = req.body;
    let finalCustomerId = customer_id;
    if (new_customer) {
      const { first_name, last_name, email, phone, whatsapp, address_line1, address_line2, city, postcode, source } = new_customer;
      const cr = await client.query(
        `INSERT INTO customers (first_name,last_name,email,phone,whatsapp,address_line1,address_line2,city,postcode,source,customer_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'') RETURNING id`,
        [first_name, last_name, email, phone, whatsapp, address_line1, address_line2, city, postcode, source || channel || 'Phone']);
      finalCustomerId = cr.rows[0].id;
    }
    if (!finalCustomerId) throw new Error('Customer ID is required');
    const enqR = await client.query(
      `INSERT INTO enquiries (customer_id,assigned_to,product_interest,channel,description,priority,budget_estimate,created_by,enquiry_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'') RETURNING *`,
      [finalCustomerId, assigned_to, product_interest, channel || 'Phone', description, priority || 'Normal', budget_estimate, created_by]);
    await client.query(`INSERT INTO enquiry_logs (enquiry_id,logged_by,channel,notes,status_changed_to) VALUES ($1,$2,'Internal Note','Enquiry created','New')`, [enqR.rows[0].id, created_by]);
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: enqR.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};
const updateEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, product_interest, channel, description, priority, budget_estimate, status } = req.body;
    const result = await pool.query(
      `UPDATE enquiries SET assigned_to=$1,product_interest=$2,channel=$3,description=$4,priority=$5,budget_estimate=$6,status=$7 WHERE id=$8 RETURNING *`,
      [assigned_to, product_interest, channel, description, priority, budget_estimate, status, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Enquiry not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
const addEnquiryLog = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { logged_by, channel, notes, status_changed_to } = req.body;
    if (!notes) return res.status(400).json({ success: false, message: 'Notes are required' });
    const logR = await client.query(
      `INSERT INTO enquiry_logs (enquiry_id,logged_by,channel,notes,status_changed_to) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, logged_by, channel || 'Phone', notes, status_changed_to || null]);
    if (status_changed_to) await client.query('UPDATE enquiries SET status=$1 WHERE id=$2', [status_changed_to, id]);
    await client.query('COMMIT');
    const result = await pool.query(`SELECT el.*, emp.first_name || ' ' || emp.last_name AS logged_by_name FROM enquiry_logs el LEFT JOIN employees emp ON el.logged_by = emp.id WHERE el.id = $1`, [logR.rows[0].id]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};
const getEnquiryStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='New') AS new_count,
             COUNT(*) FILTER (WHERE status='In Progress') AS in_progress,
             COUNT(*) FILTER (WHERE status='Visit Scheduled') AS visit_scheduled,
             COUNT(*) FILTER (WHERE status='Quote Sent') AS quote_sent,
             COUNT(*) FILTER (WHERE status='Confirmed') AS confirmed,
             COUNT(*) FILTER (WHERE status='Hold') AS hold,
             COUNT(*) FILTER (WHERE status='Cancelled') AS cancelled,
             COUNT(*) FILTER (WHERE status='Converted to Order') AS converted,
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today,
             COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS this_month
      FROM enquiries`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
module.exports = { getEnquiries, getEnquiryById, createEnquiry, updateEnquiry, addEnquiryLog, getEnquiryStats };
JSEOF

# ============================================================
# FRONTEND FILES
# ============================================================

cat > frontend/package.json << 'EOF'
{
  "name": "sunnybk-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2"
  },
  "scripts": { "start": "react-scripts start", "build": "react-scripts build" },
  "browserslist": { "production": [">0.2%","not dead","not op_mini all"], "development": ["last 1 chrome version","last 1 firefox version","last 1 safari version"] },
  "proxy": "http://localhost:5000"
}
EOF

cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sunny BK CRM</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF

cat > frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
EOF

cat > frontend/src/api/index.js << 'EOF'
import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
export const getCustomers = (search) => api.get('/customers', { params: { search } });
export const getCustomerById = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const getEnquiries = (params) => api.get('/enquiries', { params });
export const getEnquiryById = (id) => api.get(`/enquiries/${id}`);
export const createEnquiry = (data) => api.post('/enquiries', data);
export const updateEnquiry = (id, data) => api.put(`/enquiries/${id}`, data);
export const addEnquiryLog = (id, data) => api.post(`/enquiries/${id}/logs`, data);
export const getEnquiryStats = () => api.get('/enquiries/stats');
export const getEmployees = () => api.get('/employees');
export const getDepartments = () => api.get('/departments');
export default api;
EOF

cat > frontend/src/components/helpers.js << 'EOF'
export const STATUS_CLASSES = { 'New':'badge-new','In Progress':'badge-progress','Visit Scheduled':'badge-visit','Visit Done':'badge-visitdone','Quote Sent':'badge-quote','Confirmed':'badge-confirmed','Hold':'badge-hold','Cancelled':'badge-cancelled','Converted to Order':'badge-converted' };
export const ALL_STATUSES = Object.keys(STATUS_CLASSES);
export const PRODUCTS = ['Bedroom','Kitchen','Fitted Wardrobe','Sliding Wardrobe','Loft Room','Home Office','Study Room','Commercial','Other'];
export const CHANNELS = ['Phone','Email','WhatsApp','Walk-in','Website','Referral'];
export const PRIORITIES = ['Low','Normal','High'];
export const SOURCES = ['Phone','Email','WhatsApp','Walk-in','Website','Referral','Friend/Family'];
export function StatusBadge({ status }) { return <span className={`badge ${STATUS_CLASSES[status] || 'badge-new'}`}>{status}</span>; }
export function PriorityBadge({ priority }) { const c = { Low:'#888',Normal:'#1a5c8a',High:'#c0392b' }; return <span style={{ fontSize:'11px',color:c[priority]||'#888',fontWeight:600 }}>{priority==='High'?'🔴':priority==='Low'?'⚪':'🔵'} {priority}</span>; }
export function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
export function formatDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
export function getLogIcon(ch) { return {Phone:'📞',Email:'✉️',WhatsApp:'💬','In Person':'🤝','Internal Note':'📝'}[ch]||'📝'; }
export function getLogClass(ch) { return {Phone:'phone',Email:'email',WhatsApp:'whatsapp','In Person':'inperson','Internal Note':'internal'}[ch]||'internal'; }
EOF

cat > frontend/src/components/Sidebar.js << 'EOF'
import { NavLink } from 'react-router-dom';
const navItems = [
  { section:'Overview', items:[{ to:'/', label:'Dashboard', icon:'⬛' }]},
  { section:'Enquiries', items:[{ to:'/enquiries', label:'All Enquiries', icon:'📋' },{ to:'/enquiries/new', label:'New Enquiry', icon:'➕' }]},
  { section:'Customers', items:[{ to:'/customers', label:'Customers', icon:'👥' }]},
  { section:'Team', items:[{ to:'/employees', label:'Employees', icon:'🧑‍💼' }]},
];
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><h2>Sunny BK</h2><p>CRM System</p></div>
      <nav className="sidebar-nav">
        {navItems.map(s => (
          <div key={s.section}>
            <div className="nav-section-label">{s.section}</div>
            {s.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to==='/'} className={({isActive})=>`nav-item${isActive?' active':''}`}>
                <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
EOF

echo ""
echo "✅ All files created!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1️⃣  Setup PostgreSQL:"
echo "    psql -U postgres -c 'CREATE DATABASE sunnybk_crm;'"
echo "    psql -U postgres -d sunnybk_crm -f backend/db/schema.sql"
echo ""
echo "2️⃣  Setup Backend:"
echo "    cd backend"
echo "    npm install"
echo "    cp .env.example .env"
echo "    # Edit .env and set your DB_PASSWORD"
echo "    npm run dev"
echo ""
echo "3️⃣  Setup Frontend (new terminal):"
echo "    cd ../frontend"
echo "    npm install"
echo "    npm start"
echo ""
echo "🌐 Open: http://localhost:3000"
