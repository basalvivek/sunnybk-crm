const pool = require('../db');
const { sendEmailAsync, ADMIN_EMAIL } = require('../utils/mailer');
const tmpl = require('../utils/emailTemplates');

const ORDER_STATUSES = ['Confirmed','Deposit Paid','In Production','Ready to Install','Installation Scheduled','Installed','Completed','Cancelled'];

const getOrders = async (req, res) => {
  try {
    const { status, assigned_to, search } = req.query;
    let conditions = [], params = [], i = 1;
    if (status)      { conditions.push(`o.status = $${i++}`); params.push(status); }
    if (assigned_to) { conditions.push(`o.assigned_to = $${i++}`); params.push(assigned_to); }
    if (search)      { conditions.push(`(o.order_code ILIKE $${i} OR c.first_name ILIKE $${i} OR c.last_name ILIKE $${i} OR c.phone ILIKE $${i} OR c.postcode ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await pool.query(`
      SELECT o.id, o.order_code, o.enquiry_id, o.status, o.total_amount, o.deposit_amount,
             o.deposit_paid, o.deposit_paid_date, o.balance_paid, o.balance_paid_date,
             o.expected_install_date, o.created_at,
             c.first_name || ' ' || c.last_name AS customer_name,
             c.phone AS customer_phone, c.postcode,
             e.enquiry_code, e.product_interest,
             emp.first_name || ' ' || emp.last_name AS assigned_to_name,
             (SELECT COUNT(*) FROM order_logs ol WHERE ol.order_id = o.id) AS log_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN enquiries e ON o.enquiry_id = e.id
      LEFT JOIN employees emp ON o.assigned_to = emp.id
      ${where}
      ORDER BY o.created_at DESC`, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const orderR = await pool.query(`
      SELECT o.*,
             c.first_name || ' ' || c.last_name AS customer_name,
             c.phone AS customer_phone, c.email AS customer_email,
             c.address_line1, c.address_line2, c.city, c.postcode,
             e.enquiry_code, e.product_interest, e.description AS enquiry_description, e.budget_estimate,
             emp.first_name || ' ' || emp.last_name AS assigned_to_name,
             creator.first_name || ' ' || creator.last_name AS created_by_name,
             COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id=o.id AND payment_type='deposit'), 0) AS deposit_paid_total,
             COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id=o.id AND payment_type='balance'), 0) AS balance_paid_total
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN enquiries e ON o.enquiry_id = e.id
      LEFT JOIN employees emp ON o.assigned_to = emp.id
      LEFT JOIN employees creator ON o.created_by = creator.id
      WHERE o.id = $1`, [id]);
    if (orderR.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    const [logsR, paymentsR] = await Promise.all([
      pool.query(`SELECT ol.*, emp.first_name || ' ' || emp.last_name AS logged_by_name FROM order_logs ol LEFT JOIN employees emp ON ol.logged_by = emp.id WHERE ol.order_id = $1 ORDER BY ol.log_date DESC`, [id]),
      pool.query(`SELECT op.*, emp.first_name || ' ' || emp.last_name AS recorded_by_name FROM order_payments op LEFT JOIN employees emp ON op.recorded_by = emp.id WHERE op.order_id = $1 ORDER BY op.payment_date ASC, op.created_at ASC`, [id]),
    ]);
    res.json({ success: true, data: { order: orderR.rows[0], logs: logsR.rows, payments: paymentsR.rows } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { enquiry_id, assigned_to, total_amount, deposit_amount, expected_install_date, notes, created_by } = req.body;
    if (!enquiry_id) throw new Error('Enquiry ID is required');

    const enqR = await client.query('SELECT customer_id, enquiry_code, product_interest FROM enquiries WHERE id=$1', [enquiry_id]);
    if (enqR.rows.length === 0) throw new Error('Enquiry not found');

    // Check not already converted
    const existing = await client.query('SELECT id FROM orders WHERE enquiry_id=$1', [enquiry_id]);
    if (existing.rows.length > 0) throw new Error('An order already exists for this enquiry');

    const orderR = await client.query(
      `INSERT INTO orders (enquiry_id, customer_id, assigned_to, total_amount, deposit_amount, expected_install_date, notes, created_by, order_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'') RETURNING *`,
      [enquiry_id, enqR.rows[0].customer_id, assigned_to || null,
       total_amount || null, deposit_amount || null,
       expected_install_date || null, notes || null, created_by || null]);

    await client.query(`INSERT INTO order_logs (order_id, logged_by, notes, status_changed_to) VALUES ($1,$2,'Order created from enquiry','Confirmed')`, [orderR.rows[0].id, created_by || null]);
    await client.query(`UPDATE enquiries SET status='Converted to Order' WHERE id=$1`, [enquiry_id]);
    await client.query(`INSERT INTO enquiry_logs (enquiry_id, logged_by, channel, notes, status_changed_to) VALUES ($1,$2,'Internal Note',$3,'Converted to Order')`,
      [enquiry_id, created_by || null, `Converted to order ${orderR.rows[0].order_code}`]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: orderR.rows[0] });

    // Email admin
    const custR = await pool.query('SELECT * FROM customers WHERE id=$1', [enqR.rows[0].customer_id]);
    if (tmpl.orderCreated) {
      sendEmailAsync({ to: ADMIN_EMAIL(), ...tmpl.orderCreated({ order: orderR.rows[0], customer: custR.rows[0], enquiry: enqR.rows[0] }) });
    }
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, total_amount, deposit_amount, deposit_paid, deposit_paid_date, deposit_due_date,
            balance_paid, balance_paid_date, balance_due_date, expected_install_date, notes, status } = req.body;
    const result = await pool.query(
      `UPDATE orders SET assigned_to=$1, total_amount=$2, deposit_amount=$3,
       deposit_paid=$4, deposit_paid_date=$5, deposit_due_date=$6,
       balance_paid=$7, balance_paid_date=$8, balance_due_date=$9,
       expected_install_date=$10, notes=$11, status=$12 WHERE id=$13 RETURNING *`,
      [assigned_to || null, total_amount || null, deposit_amount || null,
       deposit_paid || false, deposit_paid_date || null, deposit_due_date || null,
       balance_paid || false, balance_paid_date || null, balance_due_date || null,
       expected_install_date || null, notes || null, status, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const addOrderLog = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { logged_by, status_changed_to } = req.body;
    const notes = req.body.notes || (status_changed_to ? `Status updated to: ${status_changed_to}` : null);
    if (!notes) return res.status(400).json({ success: false, message: 'Please add a note or select a status change' });

    const logR = await client.query(
      `INSERT INTO order_logs (order_id, logged_by, notes, status_changed_to) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, logged_by || null, notes, status_changed_to || null]);
    if (status_changed_to) await client.query('UPDATE orders SET status=$1 WHERE id=$2', [status_changed_to, id]);
    await client.query('COMMIT');

    const result = await pool.query(
      `SELECT ol.*, emp.first_name || ' ' || emp.last_name AS logged_by_name
       FROM order_logs ol LEFT JOIN employees emp ON ol.logged_by = emp.id WHERE ol.id=$1`, [logR.rows[0].id]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

const getOrderStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status='Confirmed')              AS confirmed,
             COUNT(*) FILTER (WHERE status='Deposit Paid')           AS deposit_paid,
             COUNT(*) FILTER (WHERE status='In Production')          AS in_production,
             COUNT(*) FILTER (WHERE status='Ready to Install')       AS ready_to_install,
             COUNT(*) FILTER (WHERE status='Installation Scheduled') AS install_scheduled,
             COUNT(*) FILTER (WHERE status='Installed')              AS installed,
             COUNT(*) FILTER (WHERE status='Completed')              AS completed,
             COUNT(*) FILTER (WHERE status='Cancelled')              AS cancelled,
             COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('Cancelled')), 0) AS total_value,
             COALESCE(SUM(total_amount) FILTER (WHERE status='Completed'), 0)          AS completed_value
      FROM orders`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const PAYMENT_SUMMARY_SQL = `
  COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id=o.id AND payment_type='deposit'), 0) AS deposit_paid_total,
  COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id=o.id AND payment_type='balance'), 0) AS balance_paid_total,
  COALESCE((SELECT COUNT(*)   FROM order_payments WHERE order_id=o.id AND payment_type='balance'), 0) AS balance_installments`;

const getPendingPayments = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(`
      SELECT
        o.id, o.order_code, o.status,
        o.total_amount, o.deposit_amount,
        o.deposit_paid, o.deposit_due_date, o.deposit_paid_date,
        o.balance_paid, o.balance_due_date, o.balance_paid_date,
        o.expected_install_date, o.created_at,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.phone AS customer_phone, c.email AS customer_email,
        e.enquiry_code, e.product_interest,
        COALESCE(o.deposit_due_date < $1 AND NOT o.deposit_paid, false) AS deposit_overdue,
        COALESCE(o.balance_due_date < $1 AND NOT o.balance_paid,  false) AS balance_overdue,
        emp.first_name || ' ' || emp.last_name AS assigned_to_name,
        ${PAYMENT_SUMMARY_SQL}
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN enquiries e ON o.enquiry_id = e.id
      LEFT JOIN employees emp ON o.assigned_to = emp.id
      WHERE o.status != 'Cancelled'
        AND (NOT o.deposit_paid OR NOT o.balance_paid)
      ORDER BY
        CASE
          WHEN (o.deposit_due_date < $1 AND NOT o.deposit_paid)
            OR (o.balance_due_date  < $1 AND NOT o.balance_paid) THEN 0
          WHEN o.deposit_due_date IS NOT NULL OR o.balance_due_date IS NOT NULL THEN 1
          ELSE 2
        END,
        LEAST(
          CASE WHEN NOT o.deposit_paid THEN o.deposit_due_date ELSE NULL END,
          CASE WHEN NOT o.balance_paid THEN o.balance_due_date  ELSE NULL END
        ) ASC NULLS LAST,
        o.created_at ASC`, [today]);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getOrderPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT op.*, emp.first_name || ' ' || emp.last_name AS recorded_by_name
      FROM order_payments op
      LEFT JOIN employees emp ON op.recorded_by = emp.id
      WHERE op.order_id = $1
      ORDER BY op.payment_date ASC, op.created_at ASC`, [id]);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const recordPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { payment_type, amount, payment_date, notes, logged_by } = req.body;
    if (!payment_type || !amount || !payment_date) throw new Error('Payment type, amount and date are required');
    if (Number(amount) <= 0) throw new Error('Amount must be greater than zero');

    const orderR = await client.query('SELECT * FROM orders WHERE id=$1', [id]);
    if (orderR.rows.length === 0) throw new Error('Order not found');
    const order = orderR.rows[0];

    // Insert installment record
    await client.query(
      `INSERT INTO order_payments (order_id, payment_type, amount, payment_date, notes, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, payment_type, amount, payment_date, notes || null, logged_by || null]);

    // Recalculate totals
    const totals = await client.query(
      `SELECT payment_type, SUM(amount) AS total FROM order_payments WHERE order_id=$1 GROUP BY payment_type`, [id]);
    const depositPaidTotal = Number(totals.rows.find(r => r.payment_type === 'deposit')?.total || 0);
    const balancePaidTotal = Number(totals.rows.find(r => r.payment_type === 'balance')?.total || 0);
    const depositDue       = Number(order.deposit_amount || 0);
    const balanceDue       = Number(order.total_amount || 0) - depositDue;

    const depositNowFull = depositDue > 0 && depositPaidTotal >= depositDue;
    const balanceNowFull = balanceDue > 0 && balancePaidTotal >= balanceDue;

    // Update order paid flags
    const updates = [];
    if (depositNowFull && !order.deposit_paid) {
      updates.push(`deposit_paid=true, deposit_paid_date='${payment_date}'`);
    }
    if (balanceNowFull && !order.balance_paid) {
      updates.push(`balance_paid=true, balance_paid_date='${payment_date}'`);
    }
    // Auto-advance status
    let newStatus = null;
    if (depositNowFull && !order.deposit_paid && order.status === 'Confirmed') newStatus = 'Deposit Paid';
    if (newStatus) updates.push(`status='${newStatus}'`);
    if (updates.length) await client.query(`UPDATE orders SET ${updates.join(',')} WHERE id=$1`, [id]);

    // Log entry
    const typeLabel  = payment_type === 'deposit' ? 'Deposit' : 'Balance';
    const remaining  = payment_type === 'balance' ? Math.max(0, balanceDue - balancePaidTotal) : null;
    const logNote = `${typeLabel} instalment of £${Number(amount).toLocaleString()} received on ${payment_date}` +
      (remaining !== null && remaining > 0 ? ` — £${remaining.toLocaleString()} remaining` : '') +
      (remaining === 0 ? ' — Balance fully paid ✓' : '') +
      (notes ? `. ${notes}` : '');
    await client.query(`INSERT INTO order_logs (order_id, logged_by, notes) VALUES ($1,$2,$3)`, [id, logged_by || null, logNote]);
    if (newStatus) {
      await client.query(`INSERT INTO order_logs (order_id, logged_by, notes, status_changed_to) VALUES ($1,$2,$3,$4)`,
        [id, logged_by || null, 'Status auto-updated after full deposit received', newStatus]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: { deposit_paid_total: depositPaidTotal, balance_paid_total: balancePaidTotal, balance_remaining: Math.max(0, balanceDue - balancePaidTotal) } });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

module.exports = { getOrders, getOrderById, createOrder, updateOrder, addOrderLog, getOrderStats, getPendingPayments, getOrderPayments, recordPayment };
