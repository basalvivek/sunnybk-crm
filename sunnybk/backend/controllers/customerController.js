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
