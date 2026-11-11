const { z } = require('zod');
const { KERALA_DISTRICTS, STATUSES, PRIORITIES } = require('../constants');
const { emailSchema } = require('./auth.schema');

const districtSchema = z.enum(KERALA_DISTRICTS, {
  error: 'Select one of the 14 Kerala districts',
});

const statusSchema = z.enum(STATUSES);
const prioritySchema = z.enum(PRIORITIES);

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  email: emailSchema,
  subject: z.string().trim().min(3, 'Subject is required').max(150),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(3000),
});

module.exports = { districtSchema, statusSchema, prioritySchema, contactSchema };
