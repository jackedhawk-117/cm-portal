const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { publicUser, signToken, setAuthCookie, clearAuthCookie, USER_SELECT } = require('../middleware/auth');
const { conflict } = require('../utils/AppError');

const BCRYPT_ROUNDS = 10;

/** POST /api/auth/register – citizens only. */
async function register(req, res, next) {
  try {
    const { name, email, mobile, password } = req.body;
    const existing = await query('SELECT id FROM users WHERE lower(email) = $1', [email]);
    if (existing.rows.length) {
      throw conflict('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let result;
    try {
      result = await query(
        `INSERT INTO users (name, email, mobile, password_hash, role)
         VALUES ($1, $2, $3, $4, 'CITIZEN')
         RETURNING id`,
        [name, email, mobile, passwordHash],
      );
    } catch (err) {
      if (err.code === '23505') throw conflict('An account with this email already exists');
      throw err;
    }
    const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [result.rows[0].id]);
    const user = publicUser(rows[0]);
    setAuthCookie(res, signToken(user));
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login – all roles. */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { rows } = await query(
      `SELECT u.*, d.code AS dept_code, d.name AS dept_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE lower(u.email) = $1`,
      [email],
    );
    // Compare even when the user does not exist to keep timing roughly uniform.
    // (Valid bcrypt hash of a random string; never matches user input.)
    const hash =
      rows[0]?.password_hash || '$2b$10$YQ3Xzpz9s1q0bz5oc4Yjcue3gZCXqM1XmXcISTEnulctkl2MHQpna';
    const ok = await bcrypt.compare(password, hash);
    if (!rows.length || !ok || !rows[0].is_active) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }
    const user = publicUser(rows[0]);
    setAuthCookie(res, signToken(user));
    return res.json({ data: user });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/logout */
function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ data: { message: 'Signed out' } });
}

/** GET /api/auth/me */
function me(req, res) {
  res.json({ data: req.user });
}

module.exports = { register, login, logout, me };
