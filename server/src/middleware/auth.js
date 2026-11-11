const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db/pool');
const { unauthorized, forbidden } = require('../utils/AppError');

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.mobile, u.role, u.department_id, u.is_active,
         u.created_at,
         d.code AS dept_code, d.name AS dept_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
`;

/** Shape a DB user row for API responses (never expose password_hash). */
function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    department_id: row.department_id,
    department: row.dept_code
      ? { id: row.department_id, code: row.dept_code, name: row.dept_name }
      : null,
    created_at: row.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setAuthCookie(res, token) {
  res.cookie(config.jwt.cookieName, token, cookieOptions);
}

function clearAuthCookie(res) {
  const { maxAge, ...rest } = cookieOptions;
  res.clearCookie(config.jwt.cookieName, rest);
}

function extractToken(req) {
  const fromCookie = req.cookies?.[config.jwt.cookieName];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Require a valid JWT (httpOnly cookie or Bearer token) and load the current
 * user from the database so role/department changes take effect immediately.
 */
async function authenticate(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next(unauthorized());
    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (_) {
      return next(unauthorized('Your session has expired. Please sign in again.'));
    }
    const { rows } = await query(`${USER_SELECT} WHERE u.id = $1`, [payload.sub]);
    if (!rows.length || !rows[0].is_active) {
      return next(unauthorized('Account not found or deactivated'));
    }
    req.user = publicUser(rows[0]);
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Role gate – use after `authenticate`. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden('This action is not available for your role'));
    }
    return next();
  };
}

module.exports = {
  authenticate,
  authorize,
  publicUser,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  USER_SELECT,
  cookieOptions,
};
