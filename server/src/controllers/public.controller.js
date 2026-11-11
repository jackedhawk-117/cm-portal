const { query } = require('../db/pool');
const { apiMeta } = require('../constants');
const { getPublicStats } = require('../services/stats.service');

async function listDepartments(_req, res, next) {
  try {
    const { rows } = await query(`
      SELECT d.id, d.code, d.name, d.short_description, d.contact_email,
             (SELECT count(*)::int FROM users u
               WHERE u.department_id = d.id AND u.role = 'DEPT_OFFICER' AND u.is_active) AS officer_count,
             (SELECT count(*)::int FROM grievances g
               WHERE g.department_id = d.id) AS grievance_count
        FROM departments d
       WHERE d.is_active
       ORDER BY d.name ASC
    `);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

async function listCategories(_req, res, next) {
  try {
    const { rows } = await query(`
      SELECT c.id, c.slug, c.name, c.description,
             c.default_department_id,
             d.code AS department_code, d.name AS department_name
        FROM categories c
        LEFT JOIN departments d ON d.id = c.default_department_id
       WHERE c.is_active
       ORDER BY c.name ASC
    `);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

function meta(_req, res) {
  res.json({ data: apiMeta() });
}

async function publicStats(_req, res, next) {
  try {
    res.json({ data: await getPublicStats() });
  } catch (err) {
    next(err);
  }
}

async function contact(req, res, next) {
  try {
    const { name, email, subject, message } = req.body;
    const { rows } = await query(
      `INSERT INTO contact_enquiries (name, email, subject, message)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [name, email, subject, message],
    );
    res.status(201).json({
      data: {
        id: rows[0].id,
        message: 'Thank you. Your enquiry has been recorded by the prototype portal.',
        created_at: rows[0].created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDepartments, listCategories, meta, publicStats, contact };
