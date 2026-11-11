const { query } = require('../db/pool');
const { overdueSql } = require('../utils/sla');
const config = require('../config');

/** Aggregates used on the public home page. */
async function getPublicStats() {
  const [g, d] = await Promise.all([
    query(`
      SELECT
        count(*)::int AS total_grievances,
        count(*) FILTER (WHERE status = 'Resolved')::int AS resolved_grievances,
        count(*) FILTER (WHERE status <> 'Resolved')::int AS pending_grievances,
        count(*) FILTER (WHERE status = 'In Progress')::int AS in_progress_grievances,
        count(DISTINCT district)::int AS districts_covered,
        round(
          (avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)
            FILTER (WHERE resolved_at IS NOT NULL))::numeric, 1
        ) AS avg_resolution_days
      FROM grievances g
    `),
    query('SELECT count(*)::int AS c FROM departments WHERE is_active'),
  ]);
  const row = g.rows[0];
  const total = row.total_grievances;
  return {
    ...row,
    departments_count: d.rows[0].c,
    resolution_rate: total ? Math.round((row.resolved_grievances / total) * 100) : 0,
    as_of: new Date().toISOString(),
  };
}

/** Dashboard aggregates for the CMO. All figures come from real rows. */
async function getCmoStats() {
  const overdue = overdueSql('g');

  const [counts, byDistrict, byDepartment, byStatus, byPriority, byCategory, monthly] =
    await Promise.all([
      query(`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status <> 'Resolved')::int AS pending,
          count(*) FILTER (WHERE status = 'Resolved')::int AS resolved,
          count(*) FILTER (WHERE ${overdue})::int AS overdue,
          count(*) FILTER (WHERE status = 'Submitted')::int AS submitted,
          count(*) FILTER (WHERE status = 'Under Review')::int AS under_review,
          count(*) FILTER (WHERE status = 'In Progress')::int AS in_progress,
          count(*) FILTER (WHERE status = 'Reopened')::int AS reopened,
          round(
            (avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)
              FILTER (WHERE resolved_at IS NOT NULL))::numeric, 1
          ) AS avg_resolution_days
        FROM grievances g
      `),
      query(`
        SELECT district AS name, count(*)::int AS count
          FROM grievances
         GROUP BY district
         ORDER BY count DESC, district ASC
      `),
      query(`
        SELECT d.id, d.code, d.name, count(g.id)::int AS count
          FROM departments d
          LEFT JOIN grievances g ON g.department_id = d.id
         GROUP BY d.id, d.code, d.name
         ORDER BY count DESC, d.name ASC
      `),
      query(`SELECT status AS name, count(*)::int AS count FROM grievances GROUP BY status`),
      query(`SELECT priority AS name, count(*)::int AS count FROM grievances GROUP BY priority`),
      query(`
        SELECT c.id, c.name, count(g.id)::int AS count
          FROM categories c
          LEFT JOIN grievances g ON g.category_id = c.id
         GROUP BY c.id, c.name
         ORDER BY count DESC, c.name ASC
      `),
      query(`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               count(*)::int AS submitted
          FROM grievances
         WHERE created_at >= date_trunc('month', now()) - interval '5 months'
         GROUP BY 1
         ORDER BY 1
      `),
    ]);

  const resolvedMonthly = await query(`
    SELECT to_char(date_trunc('month', resolved_at), 'YYYY-MM') AS month,
           count(*)::int AS resolved
      FROM grievances
     WHERE resolved_at IS NOT NULL
       AND resolved_at >= date_trunc('month', now()) - interval '5 months'
     GROUP BY 1
     ORDER BY 1
  `);

  // Build a dense six-month series (oldest → newest) for the line chart.
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const submittedMap = Object.fromEntries(monthly.rows.map((r) => [r.month, r.submitted]));
  const resolvedMap = Object.fromEntries(resolvedMonthly.rows.map((r) => [r.month, r.resolved]));

  const statusOrder = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Reopened'];
  const statusMap = Object.fromEntries(byStatus.rows.map((r) => [r.name, r.count]));

  return {
    counts: counts.rows[0],
    by_district: byDistrict.rows,
    by_department: byDepartment.rows,
    by_status: statusOrder.map((name) => ({ name, count: statusMap[name] || 0 })),
    by_priority: ['High', 'Medium', 'Low'].map((name) => ({
      name,
      count: byPriority.rows.find((r) => r.name === name)?.count || 0,
    })),
    by_category: byCategory.rows,
    monthly_trend: months.map((month) => ({
      month,
      submitted: submittedMap[month] || 0,
      resolved: resolvedMap[month] || 0,
    })),
    sla_days: config.slaDays,
    as_of: new Date().toISOString(),
  };
}

module.exports = { getPublicStats, getCmoStats };
