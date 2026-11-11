const config = require('./config');

const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
];

const STATUSES = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Reopened'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const ROLES = ['CITIZEN', 'CMO_ADMIN', 'DEPT_OFFICER'];

const apiMeta = () => ({
  districts: KERALA_DISTRICTS,
  statuses: STATUSES,
  priorities: PRIORITIES,
  roles: ROLES,
  sla_days: config.slaDays,
  upload_max_mb: config.uploads.maxBytes / (1024 * 1024),
  upload_types: config.uploads.allowedMime,
  ai_configured: Boolean(config.gemini.apiKey) && !config.isTest,
  ai_model: config.gemini.model,
  demo_mode: !config.isProduction,
});

module.exports = { KERALA_DISTRICTS, STATUSES, PRIORITIES, ROLES, apiMeta };
