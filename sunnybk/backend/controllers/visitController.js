const pool = require('../db');
const { sendEmailAsync, ADMIN_EMAIL } = require('../utils/mailer');
const tmpl = require('../utils/emailTemplates');

// Helper: fetch customer + engineer + enquiry details for email
async function getVisitEmailData(visitRow) {
  const custR = await pool.query('SELECT * FROM customers WHERE id=$1', [visitRow.customer_id]);
  const engR  = visitRow.engineer_id ? await pool.query('SELECT * FROM employees WHERE id=$1', [visitRow.engineer_id]) : null;
  const enqR  = await pool.query('SELECT enquiry_code, product_interest, description FROM enquiries WHERE id=$1', [visitRow.enquiry_id]);
  return {
    customer: custR.rows[0] || {},
    engineer: engR?.rows[0] || null,
    enquiry:  enqR.rows[0] || {},
  };
}

const getVisits = async (req, res) => {
  try {
    const { date_from, date_to, engineer_id, status, enquiry_id } = req.query;
    let conditions = [], params = [], i = 1;
    if (date_from) { conditions.push(`v.scheduled_date >= $${i++}`); params.push(date_from); }
    if (date_to)   { conditions.push(`v.scheduled_date <= $${i++}`); params.push(date_to); }
    if (engineer_id) { conditions.push(`v.engineer_id = $${i++}`); params.push(engineer_id); }
    if (status)    { conditions.push(`v.status = $${i++}`); params.push(status); }
    if (enquiry_id){ conditions.push(`v.enquiry_id = $${i++}`); params.push(enquiry_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await pool.query(`
      SELECT v.id, v.visit_code, v.scheduled_date, v.scheduled_time, v.duration_minutes,
             v.visit_type, v.status, v.notes, v.created_at,
             e.enquiry_code, e.product_interest,
             c.first_name || ' ' || c.last_name AS customer_name,
             c.phone AS customer_phone, c.postcode, c.city,
             c.address_line1, c.address_line2,
             eng.first_name || ' ' || eng.last_name AS engineer_name,
             eng.phone AS engineer_phone
      FROM visits v
      JOIN enquiries e ON v.enquiry_id = e.id
      JOIN customers c ON v.customer_id = c.id
      LEFT JOIN employees eng ON v.engineer_id = eng.id
      ${where}
      ORDER BY v.scheduled_date ASC, v.scheduled_time ASC NULLS LAST`, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getVisitById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT v.*,
             e.enquiry_code, e.product_interest, e.status AS enquiry_status, e.description AS enquiry_description,
             c.first_name || ' ' || c.last_name AS customer_name,
             c.phone AS customer_phone, c.email AS customer_email,
             c.address_line1, c.address_line2, c.city, c.postcode,
             eng.first_name || ' ' || eng.last_name AS engineer_name,
             eng.phone AS engineer_phone,
             creator.first_name || ' ' || creator.last_name AS created_by_name,
             prev.visit_code AS rescheduled_from_code
      FROM visits v
      JOIN enquiries e ON v.enquiry_id = e.id
      JOIN customers c ON v.customer_id = c.id
      LEFT JOIN employees eng ON v.engineer_id = eng.id
      LEFT JOIN employees creator ON v.created_by = creator.id
      LEFT JOIN visits prev ON v.rescheduled_from = prev.id
      WHERE v.id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Visit not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const createVisit = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { enquiry_id, engineer_id, scheduled_date, scheduled_time, duration_minutes, visit_type, notes, created_by } = req.body;
    if (!enquiry_id || !scheduled_date) throw new Error('Enquiry and scheduled date are required');

    const enqR = await client.query('SELECT customer_id FROM enquiries WHERE id = $1', [enquiry_id]);
    if (enqR.rows.length === 0) throw new Error('Enquiry not found');

    const visitR = await client.query(
      `INSERT INTO visits (enquiry_id, customer_id, engineer_id, scheduled_date, scheduled_time, duration_minutes, visit_type, notes, created_by, visit_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'') RETURNING *`,
      [enquiry_id, enqR.rows[0].customer_id, engineer_id || null, scheduled_date,
       scheduled_time || null, duration_minutes || 60, visit_type || 'Survey', notes || null, created_by || null]);

    await client.query(`UPDATE enquiries SET status='Visit Scheduled' WHERE id=$1`, [enquiry_id]);

    const logNote = `Visit scheduled for ${scheduled_date}${scheduled_time ? ' at ' + scheduled_time : ''}${engineer_id ? '' : ' (engineer TBC)'}`;
    await client.query(
      `INSERT INTO enquiry_logs (enquiry_id, logged_by, channel, notes, status_changed_to) VALUES ($1,$2,'Internal Note',$3,'Visit Scheduled')`,
      [enquiry_id, created_by || null, logNote]);

    await client.query('COMMIT');
    const visit = visitR.rows[0];
    res.status(201).json({ success: true, data: visit });

    // Emails (fire and forget)
    getVisitEmailData(visit).then(({ customer, engineer, enquiry }) => {
      // Confirmation to customer
      if (customer.email) sendEmailAsync({ to: customer.email, ...tmpl.visitScheduled({ visit, customer, engineer }) });
      // Job details to engineer
      if (engineer?.email) sendEmailAsync({ to: engineer.email, ...tmpl.visitAssignedToEngineer({ visit, customer, engineer, enquiry }) });
    }).catch(() => {});

  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

const updateVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { engineer_id, scheduled_date, scheduled_time, duration_minutes, visit_type, notes, status, cancellation_reason } = req.body;
    const result = await pool.query(
      `UPDATE visits SET engineer_id=$1, scheduled_date=$2, scheduled_time=$3, duration_minutes=$4,
       visit_type=$5, notes=$6, status=$7, cancellation_reason=$8 WHERE id=$9 RETURNING *`,
      [engineer_id || null, scheduled_date, scheduled_time || null, duration_minutes || 60,
       visit_type, notes || null, status, cancellation_reason || null, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Visit not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const rescheduleVisit = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { scheduled_date, scheduled_time, engineer_id, duration_minutes, reason, created_by } = req.body;
    if (!scheduled_date) throw new Error('New scheduled date is required');

    const oldR = await client.query(`UPDATE visits SET status='Rescheduled' WHERE id=$1 RETURNING *`, [id]);
    if (oldR.rows.length === 0) throw new Error('Visit not found');
    const old = oldR.rows[0];

    const newVisit = await client.query(
      `INSERT INTO visits (enquiry_id, customer_id, engineer_id, scheduled_date, scheduled_time, duration_minutes, visit_type, notes, created_by, rescheduled_from, visit_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'') RETURNING *`,
      [old.enquiry_id, old.customer_id, engineer_id || old.engineer_id || null, scheduled_date,
       scheduled_time || null, duration_minutes || old.duration_minutes, old.visit_type,
       reason || null, created_by || null, old.id]);

    const logNote = `Visit rescheduled to ${scheduled_date}${scheduled_time ? ' at ' + scheduled_time : ''}${reason ? '. Reason: ' + reason : ''}`;
    await client.query(
      `INSERT INTO enquiry_logs (enquiry_id, logged_by, channel, notes) VALUES ($1,$2,'Internal Note',$3)`,
      [old.enquiry_id, created_by || null, logNote]);

    await client.query('COMMIT');
    const newV = newVisit.rows[0];
    res.status(201).json({ success: true, data: newV });

    // Emails (fire and forget)
    getVisitEmailData(newV).then(({ customer, engineer }) => {
      if (customer.email) sendEmailAsync({ to: customer.email, ...tmpl.visitRescheduled({ visit: newV, customer, engineer, oldDate: old.scheduled_date, reason }) });
      if (engineer?.email) sendEmailAsync({ to: engineer.email, ...tmpl.visitAssignedToEngineer({ visit: newV, customer, engineer, enquiry: {} }) });
    }).catch(() => {});

  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

const completeVisit = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { notes, created_by } = req.body;

    const visitR = await client.query(
      `UPDATE visits SET status='Completed', notes=COALESCE(NULLIF($1,''), notes) WHERE id=$2 RETURNING *`,
      [notes || null, id]);
    if (visitR.rows.length === 0) throw new Error('Visit not found');

    await client.query(`UPDATE enquiries SET status='Visit Done' WHERE id=$1`, [visitR.rows[0].enquiry_id]);
    await client.query(
      `INSERT INTO enquiry_logs (enquiry_id, logged_by, channel, notes, status_changed_to) VALUES ($1,$2,'In Person',$3,'Visit Done')`,
      [visitR.rows[0].enquiry_id, created_by || null, notes || 'Visit completed']);

    await client.query('COMMIT');
    const completedV = visitR.rows[0];
    res.json({ success: true, data: completedV });

    // Notify admin (fire and forget)
    getVisitEmailData(completedV).then(({ customer, enquiry }) => {
      sendEmailAsync({ to: ADMIN_EMAIL(), ...tmpl.visitCompleted({ visit: completedV, customer, enquiry }) });
    }).catch(() => {});

  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

const cancelVisit = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { cancellation_reason, created_by } = req.body;

    const visitR = await client.query(
      `UPDATE visits SET status='Cancelled', cancellation_reason=$1 WHERE id=$2 RETURNING *`,
      [cancellation_reason || null, id]);
    if (visitR.rows.length === 0) throw new Error('Visit not found');

    await client.query(
      `INSERT INTO enquiry_logs (enquiry_id, logged_by, channel, notes) VALUES ($1,$2,'Internal Note',$3)`,
      [visitR.rows[0].enquiry_id, created_by || null, `Visit cancelled${cancellation_reason ? '. Reason: ' + cancellation_reason : ''}`]);

    await client.query('COMMIT');
    res.json({ success: true, data: visitR.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, message: err.message }); }
  finally { client.release(); }
};

module.exports = { getVisits, getVisitById, createVisit, updateVisit, rescheduleVisit, completeVisit, cancelVisit };
