const { z } = require('zod');

const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include a letter and a number';

const passwordSchema = z
  .string()
  .min(8, PASSWORD_MESSAGE)
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, PASSWORD_MESSAGE)
  .regex(/[0-9]/, PASSWORD_MESSAGE);

const emailSchema = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(255);

const optionalEmailSchema = z
  .union([
    z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
    z.literal(''),
    z.null(),
    z.undefined(),
  ])
  .optional()
  .transform((v) => (v && typeof v === 'string' && v.trim().length > 0 ? v.trim().toLowerCase() : null));

const mobileSchema = z
  .string({ error: 'Mobile number is required' })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: optionalEmailSchema,
  mobile: mobileSchema,
  password: passwordSchema,
});

const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().optional(),
    password: z.string().min(1, 'Password is required').max(72),
  })
  .refine(
    (data) => Boolean((data.identifier && data.identifier.length > 0) || (data.email && data.email.length > 0)),
    {
      message: 'Email or mobile number is required',
      path: ['email'],
    },
  );

module.exports = { registerSchema, loginSchema, passwordSchema, emailSchema, optionalEmailSchema, mobileSchema };
