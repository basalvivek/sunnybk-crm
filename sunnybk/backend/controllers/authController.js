const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sunnybk_jwt_secret_2024';

const login = async (req, res) => {
  try {
    const { login: loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Email/code and password are required' });
    }

    const result = await pool.query(
      `SELECT id, employee_code, first_name, last_name, email, role, is_active, password_hash
       FROM employees WHERE (LOWER(email) = LOWER($1) OR LOWER(employee_code) = LOWER($1)) AND is_active = true`,
      [loginId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ success: false, message: 'Account not activated. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, employee_code: user.employee_code },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        employee_code: user.employee_code,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const me = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, employee_code, first_name, last_name, email, role FROM employees WHERE id = $1 AND is_active = true`,
      [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { login, me };
