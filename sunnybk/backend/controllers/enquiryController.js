const pool = require('../db');
const { sendEmailAsync, ADMIN_EMAIL } = require('../utils/mailer');
const tmpl = require('../utils/emailTemplates');

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
    const safeAssignedTo = assigned_to || null;
    const safeCreatedBy = created_by || null;
    const safeBudget = budget_estimate || null;
    const enqR = await client.query(
      `INSERT INTO enquiries (customer_id,assigned_to,product_interest,channel,description,priority,budget_estimate,created_by,enquiry_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'') RETURNING *`,
      [finalCustomerId, safeAssignedTo, product_interest, channel || 'Phone', description, priority || 'Normal', safeBudget, safeCreatedBy]);
    await client.query(`INSERT INTO enquiry_logs (enquiry_id,logged_by,channel,notes,status_changed_to) VALUES ($1,$2,'Internal Note','Enquiry created','New')`, [enqR.rows[0].id, safeCreatedBy]);
    await client.query('COMMIT');

    // Send email notification to admin (fire and forget)
    const custR = await pool.query('SELECT * FROM customers WHERE id=$1', [finalCustomerId]);
    const assignedR = safeAssignedTo ? await pool.query('SELECT first_name, last_name FROM employees WHERE id=$1', [safeAssignedTo]) : null;
    const enquiry = {
      ...enqR.rows[0],
      assigned_to_name: assignedR?.rows[0] ? `${assignedR.rows[0].first_name} ${assignedR.rows[0].last_name}` : null,
    };
    const email = tmpl.newEnquiry({ enquiry, customer: custR.rows[0] });
    sendEmailAsync({ to: ADMIN_EMAIL(), ...email });

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
      [assigned_to || null, product_interest, channel, description, priority, budget_estimate || null, status, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Enquiry not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const addEnquiryLog = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { logged_by, channel, status_changed_to } = req.body;
    const notes = req.body.notes || (status_changed_to ? `Status updated to: ${status_changed_to}` : null);
    if (!notes) return res.status(400).json({ success: false, message: 'Please add a note or select a status change' });
    const logR = await client.query(
      `INSERT INTO enquiry_logs (enquiry_id,logged_by,channel,notes,status_changed_to) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, logged_by, channel || 'Phone', notes, status_changed_to || null]);
    if (status_changed_to) await client.query('UPDATE enquiries SET status=$1 WHERE id=$2', [status_changed_to, id]);
    await client.query('COMMIT');

    const result = await pool.query(`SELECT el.*, emp.first_name || ' ' || emp.last_name AS logged_by_name FROM enquiry_logs el LEFT JOIN employees emp ON el.logged_by = emp.id WHERE el.id = $1`, [logR.rows[0].id]);

    // Email customer on status change (fire and forget)
    if (status_changed_to) {
      const enqR = await pool.query(
        `SELECT e.enquiry_code, e.product_interest, c.first_name, c.last_name, c.email
         FROM enquiries e JOIN customers c ON e.customer_id = c.id WHERE e.id=$1`, [id]);
      if (enqR.rows.length > 0 && enqR.rows[0].email) {
        const { enquiry_code, product_interest, first_name, last_name, email } = enqR.rows[0];
        const emailContent = tmpl.enquiryStatusUpdate({
          enquiry: { enquiry_code, product_interest },
          customer: { first_name, last_name },
          newStatus: status_changed_to,
          notes,
        });
        sendEmailAsync({ to: email, ...emailContent });
      }
    }

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
