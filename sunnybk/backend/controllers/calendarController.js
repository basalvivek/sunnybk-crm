const pool = require('../db');

const getCalendarData = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ success: false, message: 'year and month are required' });

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`;
    const dateTo   = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;

    const [visitsR, installsR] = await Promise.all([
      pool.query(`
        SELECT v.id, v.visit_code, v.scheduled_date, v.scheduled_time, v.duration_minutes,
               v.visit_type, v.status,
               c.first_name || ' ' || c.last_name AS customer_name,
               c.postcode,
               eng.first_name || ' ' || eng.last_name AS engineer_name
        FROM visits v
        JOIN enquiries e ON v.enquiry_id = e.id
        JOIN customers c ON v.customer_id = c.id
        LEFT JOIN employees eng ON v.engineer_id = eng.id
        WHERE v.scheduled_date >= $1 AND v.scheduled_date <= $2
        ORDER BY v.scheduled_date ASC, v.scheduled_time ASC NULLS LAST`,
        [dateFrom, dateTo]
      ),
      pool.query(`
        SELECT o.id, o.order_code, o.status, o.expected_install_date,
               e.product_interest,
               c.first_name || ' ' || c.last_name AS customer_name,
               c.postcode,
               emp.first_name || ' ' || emp.last_name AS assigned_to_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN enquiries e ON o.enquiry_id = e.id
        LEFT JOIN employees emp ON o.assigned_to = emp.id
        WHERE o.expected_install_date >= $1 AND o.expected_install_date <= $2
          AND o.status != 'Cancelled'
        ORDER BY o.expected_install_date ASC`,
        [dateFrom, dateTo]
      ),
    ]);

    res.json({ success: true, data: { visits: visitsR.rows, installs: installsR.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCalendarData };
