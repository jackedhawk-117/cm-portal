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

const mobileSchema = z
  .string({ error: 'Mobile number is required' })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: emailSchema,
  mobile: mobileSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

module.exports = { registerSchema, loginSchema, passwordSchema, emailSchema };
