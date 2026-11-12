const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { publicUser, signToken, setAuthCookie, clearAuthCookie, USER_SELECT } = require('../middleware/auth');
const { conflict } = require('../utils/AppError');

const BCRYPT_ROUNDS = 10;

/** POST /api/auth/register – citizens only. */
async function register(req, res, next) {
  try {
    const { name, email, mobile, password } = req.body;
    const cleanMobile = mobile ? mobile.replace(/[\s-]/g, '') : null;
    const normalizedMobile = cleanMobile ? (cleanMobile.startsWith('+91') ? cleanMobile.slice(3) : cleanMobile) : null;

    if (email) {
      const existingEmail = await query('SELECT id FROM users WHERE lower(email) = $1', [email]);
      if (existingEmail.rows.length) {
        throw conflict('An account with this email already exists');
      }
    }

    if (normalizedMobile) {
      const existingMobile = await query(
        `SELECT id FROM users 
          WHERE regexp_replace(mobile, '[^0-9]', '', 'g') = $1
             OR regexp_replace(mobile, '[^0-9]', '', 'g') = $2`,
        [normalizedMobile, `91${normalizedMobile}`],
      );
      if (existingMobile.rows.length) {
        throw conflict('An account with this mobile number already exists');
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let result;
    try {
      result = await query(
        `INSERT INTO users (name, email, mobile, password_hash, role)
         VALUES ($1, $2, $3, $4, 'CITIZEN')
         RETURNING id`,
        [name, email || null, cleanMobile, passwordHash],
      );
    } catch (err) {
      if (err.code === '23505') {
        if (err.constraint === 'users_mobile_unique') {
          throw conflict('An account with this mobile number already exists');
        }
        throw conflict('An account with this email or mobile number already exists');
      }
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

/** POST /api/auth/login – all roles (supports email OR mobile number). */
async function login(req, res, next) {
  try {
    const identifier = (req.body.identifier || req.body.email || '').trim();
    const { password } = req.body;

    const isEmail = identifier.includes('@');
    const cleanDigits = identifier.replace(/[^0-9]/g, '');
    const mobile10 = cleanDigits.length === 12 && cleanDigits.startsWith('91') ? cleanDigits.slice(2) : cleanDigits;

    let rows;
    if (isEmail) {
      const resQuery = await query(
        `SELECT u.*, d.code AS dept_code, d.name AS dept_name
           FROM users u
           LEFT JOIN departments d ON d.id = u.department_id
          WHERE lower(u.email) = $1`,
        [identifier.toLowerCase()],
      );
      rows = resQuery.rows;
    } else {
      const resQuery = await query(
        `SELECT u.*, d.code AS dept_code, d.name AS dept_name
           FROM users u
           LEFT JOIN departments d ON d.id = u.department_id
          WHERE regexp_replace(u.mobile, '[^0-9]', '', 'g') = $1
             OR regexp_replace(u.mobile, '[^0-9]', '', 'g') = $2`,
        [mobile10, `91${mobile10}`],
      );
      rows = resQuery.rows;
    }

    // Compare even when the user does not exist to keep timing roughly uniform.
    // (Valid bcrypt hash of a random string; never matches user input.)
    const hash =
      rows[0]?.password_hash || '$2b$10$YQ3Xzpz9s1q0bz5oc4Yjcue3gZCXqM1XmXcISTEnulctkl2MHQpna';
    const ok = await bcrypt.compare(password, hash);
    if (!rows.length || !ok || !rows[0].is_active) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials or password' },
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
