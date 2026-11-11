const config = require('../config');

/**
 * SQL expression that evaluates the SLA rule for a grievances alias.
 * Overdue = not Resolved AND older than the priority SLA.
 * Kept in one place so dashboards, lists and escalation agree.
 */
function overdueSql(alias = 'g') {
  const { High, Medium, Low } = config.slaDays;
  return `(${alias}.status <> 'Resolved' AND ${alias}.created_at < now() - (CASE ${alias}.priority
    WHEN 'High' THEN interval '${High} days'
    WHEN 'Medium' THEN interval '${Medium} days'
    ELSE interval '${Low} days' END))`;
}

/** SLA deadline in days for a priority. */
const slaDaysFor = (priority) => config.slaDays[priority] ?? config.slaDays.Medium;

module.exports = { overdueSql, slaDaysFor };
