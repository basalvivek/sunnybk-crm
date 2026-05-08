const pool = require('../db');

const getDashboard = async (req, res) => {
  try {
    const today   = new Date().toISOString().slice(0, 10);
    const in14    = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const [enqR, ordR, visitsR, installsR, overdueR, recentR] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*)                                                      AS total,
          COUNT(*) FILTER (WHERE status='New')                         AS new_count,
          COUNT(*) FILTER (WHERE status='In Progress')                 AS in_progress,
          COUNT(*) FILTER (WHERE status='Visit Scheduled')             AS visit_scheduled,
          COUNT(*) FILTER (WHERE status='Quote Sent')                  AS quote_sent,
          COUNT(*) FILTER (WHERE status='Confirmed')                   AS confirmed,
          COUNT(*) FILTER (WHERE status='Converted to Order')          AS converted,
          COUNT(*) FILTER (WHERE status NOT IN ('Cancelled','Converted to Order')) AS active,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)           AS today,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS this_month
        FROM enquiries`),

      pool.query(`
        SELECT
          COUNT(*)                                                            AS total,
          COUNT(*) FILTER (WHERE status='Confirmed')                         AS confirmed,
          COUNT(*) FILTER (WHERE status='Deposit Paid')                      AS deposit_paid,
          COUNT(*) FILTER (WHERE status='In Production')                     AS in_production,
          COUNT(*) FILTER (WHERE status='Ready to Install')                  AS ready_to_install,
          COUNT(*) FILTER (WHERE status='Installation Scheduled')            AS install_scheduled,
          COUNT(*) FILTER (WHERE status='Installed')                         AS installed,
          COUNT(*) FILTER (WHERE status='Completed')                         AS completed,
          COUNT(*) FILTER (WHERE status NOT IN ('Cancelled','Completed'))     AS active,
          COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('Cancelled')), 0) AS pipeline_value,
          COALESCE(SUM(total_amount) FILTER (WHERE status='Completed'), 0)          AS completed_value
        FROM orders`),

      pool.query(`
        SELECT v.id, v.visit_code, v.scheduled_time, v.visit_type, v.status, v.duration_minutes,
               c.first_name || ' ' || c.last_name AS customer_name, c.postcode,
               eng.first_name || ' ' || eng.last_name AS engineer_name
        FROM visits v
        JOIN enquiries e  ON v.enquiry_id  = e.id
        JOIN customers c  ON v.customer_id = c.id
        LEFT JOIN employees eng ON v.engineer_id = eng.id
        WHERE v.scheduled_date = $1
          AND v.status NOT IN ('Cancelled','Rescheduled')
        ORDER BY v.scheduled_time ASC NULLS LAST`, [today]),

      pool.query(`
        SELECT o.id, o.order_code, o.status, o.expected_install_date,
               e.product_interest,
               c.first_name || ' ' || c.last_name AS customer_name, c.postcode,
               emp.first_name || ' ' || emp.last_name AS assigned_to_name
        FROM orders o
        JOIN customers   c   ON o.customer_id  = c.id
        JOIN enquiries   e   ON o.enquiry_id   = e.id
        LEFT JOIN employees emp ON o.assigned_to = emp.id
        WHERE o.expected_install_date >= $1 AND o.expected_install_date <= $2
          AND o.status NOT IN ('Cancelled','Completed','Installed')
        ORDER BY o.expected_install_date ASC
        LIMIT 8`, [today, in14]),

      pool.query(`
        SELECT o.id, o.order_code, o.total_amount, o.deposit_amount,
               o.deposit_paid, o.deposit_due_date, o.balance_paid, o.balance_due_date,
               c.first_name || ' ' || c.last_name AS customer_name,
               c.phone AS customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.status != 'Cancelled'
          AND (
            (NOT o.deposit_paid AND o.deposit_due_date IS NOT NULL AND o.deposit_due_date < $1) OR
            (NOT o.balance_paid  AND o.balance_due_date  IS NOT NULL AND o.balance_due_date  < $1)
          )
        ORDER BY LEAST(
          CASE WHEN NOT o.deposit_paid THEN o.deposit_due_date ELSE NULL END,
          CASE WHEN NOT o.balance_paid  THEN o.balance_due_date  ELSE NULL END
        ) ASC NULLS LAST
        LIMIT 5`, [today]),

      pool.query(`
        SELECT e.id, e.enquiry_code, e.status, e.product_interest, e.priority, e.created_at,
               c.first_name || ' ' || c.last_name AS customer_name,
               c.phone AS customer_phone,
               emp.first_name || ' ' || emp.last_name AS assigned_to_name
        FROM enquiries e
        JOIN customers c ON e.customer_id = c.id
        LEFT JOIN employees emp ON e.assigned_to = emp.id
        ORDER BY e.created_at DESC
        LIMIT 8`),
    ]);

    res.json({
      success: true,
      data: {
        enquiry_stats:     enqR.rows[0],
        order_stats:       ordR.rows[0],
        todays_visits:     visitsR.rows,
        upcoming_installs: installsR.rows,
        overdue_payments:  overdueR.rows,
        recent_enquiries:  recentR.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboard };
