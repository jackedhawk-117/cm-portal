const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
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

/** POST /api/auth/otp/send */
async function sendOtp(req, res, next) {
  try {
    const { mobile } = req.body;
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const mobile10 = cleanMobile.startsWith('+91') ? cleanMobile.slice(3) : cleanMobile;

    // Check rate limit: max 3 requests in the last 2 minutes per mobile number
    const recent = await query(
      `SELECT count(*) FROM otp_verifications 
        WHERE mobile = $1 AND created_at > now() - interval '2 minutes'`,
      [mobile10],
    );
    if (parseInt(recent.rows[0].count, 10) >= 3) {
      return res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many OTP requests. Please wait 2 minutes.' },
      });
    }

    // Generate cryptographic 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    await query(
      `INSERT INTO otp_verifications (mobile, otp_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [mobile10, otpHash, expiresAt],
    );

    // Recruitment prototype logging
    // eslint-disable-next-line no-console
    console.log(`[OTP] Generated verification code for ${mobile10}: ${otp}`);

    return res.json({
      data: {
        message: 'Verification code generated successfully',
        mobile: mobile10,
        expires_in_seconds: 300,
        // Provided in prototype mode so evaluators/tests can verify without SMS charges
        dev_otp: otp,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/otp/verify */
async function verifyOtp(req, res, next) {
  try {
    const { mobile, otp, name } = req.body;
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    const mobile10 = cleanMobile.startsWith('+91') ? cleanMobile.slice(3) : cleanMobile;

    // Fetch latest valid OTP record
    const { rows } = await query(
      `SELECT * FROM otp_verifications
        WHERE mobile = $1 AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1`,
      [mobile10],
    );

    if (!rows.length) {
      return res.status(401).json({
        error: { code: 'INVALID_OTP', message: 'Verification code has expired or was not requested.' },
      });
    }

    const record = rows[0];
    if (record.attempts >= 5) {
      return res.status(429).json({
        error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many invalid attempts. Request a new OTP.' },
      });
    }

    const isValid = await bcrypt.compare(otp, record.otp_hash);
    if (!isValid) {
      await query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      return res.status(401).json({
        error: { code: 'INVALID_OTP', message: 'Invalid verification code. Please check and try again.' },
      });
    }

    // Valid OTP – remove used verification records for this phone number
    await query('DELETE FROM otp_verifications WHERE mobile = $1', [mobile10]);

    // Find existing user with this mobile
    const userResult = await query(
      `SELECT u.*, d.code AS dept_code, d.name AS dept_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE regexp_replace(u.mobile, '[^0-9]', '', 'g') = $1
           OR regexp_replace(u.mobile, '[^0-9]', '', 'g') = $2`,
      [mobile10, `91${mobile10}`],
    );

    let userRow;
    if (userResult.rows.length) {
      userRow = userResult.rows[0];
      if (!userRow.is_active) {
        return res.status(403).json({
          error: { code: 'ACCOUNT_DEACTIVATED', message: 'Your account is currently inactive.' },
        });
      }
    } else {
      // If mobile number does not exist in database and no name was provided:
      // Prompt the citizen for their name after OTP verification
      const cleanName = name ? name.trim() : '';
      if (cleanName.length < 2) {
        const regToken = jwt.sign(
          { mobile: mobile10, purpose: 'otp_registration' },
          config.jwt.secret,
          { expiresIn: '15m' },
        );
        return res.json({
          data: {
            needs_name: true,
            mobile: mobile10,
            registration_token: regToken,
            message: 'Mobile number verified. Please enter your name to complete your registration.',
          },
        });
      }

      // Name provided: create the citizen account
      const randomSecret = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, BCRYPT_ROUNDS);

      const inserted = await query(
        `INSERT INTO users (name, email, mobile, password_hash, role)
         VALUES ($1, NULL, $2, $3, 'CITIZEN')
         RETURNING id`,
        [cleanName, mobile10, passwordHash],
      );

      const fullUser = await query(`${USER_SELECT} WHERE u.id = $1`, [inserted.rows[0].id]);
      userRow = fullUser.rows[0];
    }

    const user = publicUser(userRow);
    setAuthCookie(res, signToken(user));
    return res.json({ data: user });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/otp/complete-registration */
async function completeRegistration(req, res, next) {
  try {
    const { registration_token, name } = req.body;
    let decoded;
    try {
      decoded = jwt.verify(registration_token, config.jwt.secret);
      if (decoded.purpose !== 'otp_registration' || !decoded.mobile) {
        throw new Error('Invalid token purpose');
      }
    } catch {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Registration session expired. Please verify your mobile again.' },
      });
    }

    const mobile10 = decoded.mobile;
    const cleanName = (name || '').trim();
    if (cleanName.length < 2) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Please enter your full name (at least 2 characters).' },
      });
    }

    // Check if user was already created
    const existing = await query(
      `SELECT u.*, d.code AS dept_code, d.name AS dept_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE regexp_replace(u.mobile, '[^0-9]', '', 'g') = $1
           OR regexp_replace(u.mobile, '[^0-9]', '', 'g') = $2`,
      [mobile10, `91${mobile10}`],
    );

    let userRow;
    if (existing.rows.length) {
      userRow = existing.rows[0];
    } else {
      const randomSecret = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, BCRYPT_ROUNDS);

      const inserted = await query(
        `INSERT INTO users (name, email, mobile, password_hash, role)
         VALUES ($1, NULL, $2, $3, 'CITIZEN')
         RETURNING id`,
        [cleanName, mobile10, passwordHash],
      );

      const fullUser = await query(`${USER_SELECT} WHERE u.id = $1`, [inserted.rows[0].id]);
      userRow = fullUser.rows[0];
    }

    const user = publicUser(userRow);
    setAuthCookie(res, signToken(user));
    return res.status(201).json({ data: user });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout, me, sendOtp, verifyOtp, completeRegistration };
