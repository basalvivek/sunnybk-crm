const pool = require('../db');

const getEmployees = async (req, res) => {
  try {
    const { include_inactive } = req.query;
    const where = include_inactive === 'true' ? '' : 'WHERE e.is_active = true';
    const result = await pool.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.phone, e.role, e.is_active, e.created_at,
             COALESCE(json_agg(json_build_object('id', d.id, 'name', d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') AS departments
      FROM employees e
      LEFT JOIN employee_departments ed ON e.id = ed.employee_id
      LEFT JOIN departments d ON ed.department_id = d.id
      ${where}
      GROUP BY e.id ORDER BY e.first_name`);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getDepartments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, COUNT(ed.employee_id) AS employee_count
      FROM departments d
      LEFT JOIN employee_departments ed ON d.id = ed.department_id
      LEFT JOIN employees e ON ed.employee_id = e.id AND e.is_active = true
      GROUP BY d.id ORDER BY d.name`);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const createEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { first_name, last_name, email, phone, role, department_ids } = req.body;
    if (!first_name || !last_name) return res.status(400).json({ success: false, message: 'First name and last name are required' });

    const countR = await client.query('SELECT COUNT(*) FROM employees');
    const employee_code = 'EMP-' + String(parseInt(countR.rows[0].count) + 1).padStart(5, '0');

    const result = await client.query(
      `INSERT INTO employees (employee_code, first_name, last_name, email, phone, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [employee_code, first_name, last_name, email || null, phone || null, role || 'Staff']);

    const empId = result.rows[0].id;
    if (Array.isArray(department_ids)) {
      for (const deptId of department_ids) {
        await client.query(`INSERT INTO employee_departments (employee_id, department_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [empId, deptId]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

const updateEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { first_name, last_name, email, phone, role, is_active, department_ids } = req.body;

    const result = await client.query(
      `UPDATE employees SET first_name=$1, last_name=$2, email=$3, phone=$4, role=$5, is_active=$6 WHERE id=$7 RETURNING *`,
      [first_name, last_name, email || null, phone || null, role || 'Staff', is_active !== false, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });

    await client.query('DELETE FROM employee_departments WHERE employee_id=$1', [id]);
    if (Array.isArray(department_ids)) {
      for (const deptId of department_ids) {
        await client.query(`INSERT INTO employee_departments (employee_id, department_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, deptId]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });
    const result = await pool.query(`INSERT INTO departments (name) VALUES ($1) RETURNING *`, [name]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Department name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;
    const result = await pool.query(`UPDATE departments SET name=$1, is_active=$2 WHERE id=$3 RETURNING *`, [name, is_active !== false, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Department name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getEmployees, getDepartments, createEmployee, updateEmployee, createDepartment, updateDepartment };
