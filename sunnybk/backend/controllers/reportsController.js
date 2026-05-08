const pool = require('../db');

// Shared date range helper
function dateRange(from, to) {
  const conditions = [];
  const params = [];
  let i = 1;
  if (from) { conditions.push(`created_at >= $${i++}`); params.push(from); }
  if (to)   { conditions.push(`created_at < $${i++}`); params.push(to); }
  return { conditions, params, next: i };
}

// GET /api/reports/overview?from=&to=
const getOverview = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { conditions, params } = dateRange(from, to);
    const enqWhere  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const ordWhere  = conditions.length ? 'WHERE ' + conditions.map(c => c.replace('created_at', 'o.created_at')).join(' AND ') : '';

    const [enqStats, ordStats, visitStats, convRate] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                              AS total_enquiries,
          COUNT(*) FILTER (WHERE status='New')                 AS new_enq,
          COUNT(*) FILTER (WHERE status='In Progress')         AS in_progress,
          COUNT(*) FILTER (WHERE status='Confirmed')           AS confirmed,
          COUNT(*) FILTER (WHERE status='Converted to Order')  AS converted,
          COUNT(*) FILTER (WHERE status='Cancelled')           AS cancelled
        FROM enquiries ${enqWhere}`, params),

      pool.query(`
        SELECT
          COUNT(*)                                                           AS total_orders,
          COALESCE(SUM(total_amount) FILTER (WHERE status!='Cancelled'),0)  AS pipeline_value,
          COALESCE(SUM(total_amount) FILTER (WHERE status='Completed'),0)   AS completed_value,
          COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_paid=true),0)  AS deposits_collected,
          COALESCE(SUM(total_amount - deposit_amount) FILTER (WHERE balance_paid=true AND total_amount IS NOT NULL AND deposit_amount IS NOT NULL), 0) AS balances_collected
        FROM orders o ${ordWhere}`, params),

      pool.query(`
        SELECT
          COUNT(*)                                         AS total_visits,
          COUNT(*) FILTER (WHERE status='Completed')       AS completed_visits,
          COUNT(*) FILTER (WHERE status='Cancelled')       AS cancelled_visits,
          COUNT(*) FILTER (WHERE status='Scheduled')       AS upcoming_visits
        FROM visits ${enqWhere}`, params),

      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('Confirmed','Converted to Order','Visit Scheduled','Visit Done','Quote Sent')) AS progressed
        FROM enquiries ${enqWhere}`, params),
    ]);

    const total = Number(convRate.rows[0].total) || 1;
    const progressed = Number(convRate.rows[0].progressed);

    res.json({
      success: true,
      data: {
        enquiries: enqStats.rows[0],
        orders:    ordStats.rows[0],
        visits:    visitStats.rows[0],
        conversion_rate: Math.round((progressed / total) * 100),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/reports/enquiries-over-time?from=&to=&group=month
const getEnquiriesOverTime = async (req, res) => {
  try {
    const { from, to, group = 'month' } = req.query;
    const trunc = group === 'week' ? 'week' : group === 'day' ? 'day' : 'month';
    const conditions = [], params = [];
    let i = 1;
    if (from) { conditions.push(`created_at >= $${i++}`); params.push(from); }
    if (to)   { conditions.push(`created_at < $${i++}`); params.push(to); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await pool.query(`
      SELECT
        DATE_TRUNC('${trunc}', created_at) AS period,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('Confirmed','Converted to Order')) AS converted,
        COUNT(*) FILTER (WHERE status='Cancelled') AS cancelled
      FROM enquiries ${where}
      GROUP BY period ORDER BY period ASC`, params);

    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/reports/enquiries-by-source?from=&to=
const getEnquiriesBySource = async (req, res) => {
  try {
    const { from, to } = req.query;
    const conditions = [], params = [];
    let i = 1;
    if (from) { conditions.push(`e.created_at >= $${i++}`); params.push(from); }
    if (to)   { conditions.push(`e.created_at < $${i++}`); params.push(to); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [bySource, byProduct, byChannel] = await Promise.all([
      pool.query(`SELECT c.source, COUNT(*) AS total FROM enquiries e JOIN customers c ON e.customer_id=c.id ${where} GROUP BY c.source ORDER BY total DESC`, params),
      pool.query(`SELECT COALESCE(product_interest,'Unknown') AS name, COUNT(*) AS total FROM enquiries e ${where.replace('e.created_at','created_at')} GROUP BY product_interest ORDER BY total DESC`, params),
      pool.query(`SELECT channel AS name, COUNT(*) AS total FROM enquiries e ${where.replace('e.created_at','created_at')} GROUP BY channel ORDER BY total DESC`, params),
    ]);

    res.json({ success: true, data: { by_source: bySource.rows, by_product: byProduct.rows, by_channel: byChannel.rows } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/reports/revenue?from=&to=
const getRevenue = async (req, res) => {
  try {
    const { from, to } = req.query;
    const conditions = [], params = [];
    let i = 1;
    if (from) { conditions.push(`o.created_at >= $${i++}`); params.push(from); }
    if (to)   { conditions.push(`o.created_at < $${i++}`); params.push(to); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [monthly, byProduct] = await Promise.all([
      pool.query(`
        SELECT
          DATE_TRUNC('month', o.created_at) AS period,
          COUNT(*) AS orders,
          COALESCE(SUM(total_amount) FILTER (WHERE status!='Cancelled'), 0) AS pipeline,
          COALESCE(SUM(total_amount) FILTER (WHERE status='Completed'), 0)  AS completed,
          COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_paid=true), 0) AS deposits
        FROM orders o ${where}
        GROUP BY period ORDER BY period ASC`, params),

      pool.query(`
        SELECT e.product_interest AS product,
               COUNT(o.id) AS orders,
               COALESCE(SUM(o.total_amount) FILTER (WHERE o.status!='Cancelled'), 0) AS value
        FROM orders o JOIN enquiries e ON o.enquiry_id=e.id
        ${where}
        GROUP BY e.product_interest ORDER BY value DESC`, params),
    ]);

    res.json({ success: true, data: { monthly: monthly.rows, by_product: byProduct.rows } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/reports/employee-performance?from=&to=
const getEmployeePerformance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const conditions = [], params = [];
    let i = 1;
    if (from) { conditions.push(`$${i++}`); params.push(from); }
    if (to)   { conditions.push(`$${i++}`); params.push(to); }

    const dateFilter = from && to
      ? `AND created_at BETWEEN $1 AND $2`
      : from ? `AND created_at >= $1`
      : to   ? `AND created_at < $1`
      : '';

    const result = await pool.query(`
      SELECT
        emp.id, emp.first_name || ' ' || emp.last_name AS name, emp.role,
        COUNT(DISTINCT e.id)                                                      AS enquiries_assigned,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status IN ('Confirmed','Converted to Order')) AS enquiries_converted,
        COUNT(DISTINCT v.id)                                                      AS visits_done,
        COUNT(DISTINCT o.id)                                                      AS orders_created,
        COALESCE(SUM(DISTINCT o.total_amount) FILTER (WHERE o.status!='Cancelled'), 0) AS order_value
      FROM employees emp
      LEFT JOIN enquiries e  ON e.assigned_to = emp.id  ${dateFilter.replace('created_at','e.created_at')}
      LEFT JOIN visits v     ON v.engineer_id = emp.id AND v.status='Completed' ${dateFilter.replace('created_at','v.created_at')}
      LEFT JOIN orders o     ON o.assigned_to = emp.id  ${dateFilter.replace('created_at','o.created_at')}
      WHERE emp.is_active = true
      GROUP BY emp.id ORDER BY enquiries_assigned DESC`, params);

    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { getOverview, getEnquiriesOverTime, getEnquiriesBySource, getRevenue, getEmployeePerformance };
