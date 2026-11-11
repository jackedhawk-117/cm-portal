const { z } = require('zod');
const { districtSchema, statusSchema, prioritySchema } = require('./common.schema');

const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((v) => v === true || v === 'true' || v === '1');

/** Multipart/form-data fields arrive as strings, so ids/numbers are coerced. */
const createGrievanceSchema = z.object({
  district: districtSchema,
  category_id: z.coerce.number().int().positive('Select a category'),
  department_id: z.coerce.number().int().positive().optional().nullable(),
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(150),
  description: z
    .string()
    .trim()
    .min(30, 'Please describe the grievance in at least 30 characters')
    .max(5000),
  priority: prioritySchema.default('Medium'),
  ai_category: z.string().trim().max(120).optional().nullable(),
  ai_department: z.string().trim().max(40).optional().nullable(),
  ai_priority: z.union([prioritySchema, z.literal('')]).optional().nullable(),
  ai_priority_reason: z.string().trim().max(500).optional().nullable(),
  ai_summary: z.string().trim().max(1200).optional().nullable(),
  ai_language: z.string().trim().max(20).optional().nullable(),
  ai_source: z.string().trim().max(40).optional().nullable(),
  ai_confidence: z.coerce.number().min(0).max(1).optional().nullable(),
  ai_accepted: boolish,
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: statusSchema.optional(),
  district: districtSchema.optional(),
  category_id: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  priority: prioritySchema.optional(),
  search: z.string().trim().max(80).optional(),
  overdue: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'oldest', 'priority']).default('newest'),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid grievance id'),
});

const trackParamSchema = z.object({
  refNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^CMK-\d{4}-\d{6}$/, 'Reference ID must look like CMK-2026-000123'),
});

const statusUpdateSchema = z.object({
  status: statusSchema,
  remark: z.string().trim().max(1000).optional(),
  is_internal: boolish,
});

const assignSchema = z.object({
  department_id: z.coerce.number().int().positive(),
  officer_id: z.coerce.number().int().positive(),
  remark: z.string().trim().max(1000).optional(),
});

const remarkSchema = z.object({
  remark: z.string().trim().min(3, 'Remark is too short').max(2000),
  is_internal: boolish,
});

const escalateSchema = z.object({
  remark: z.string().trim().max(1000).optional(),
});

const reportSchema = z.object({
  report: z
    .string()
    .trim()
    .min(20, 'The action-taken report must be at least 20 characters')
    .max(5000),
});

const reportReviewSchema = z.object({
  decision: z.enum(['ACCEPT', 'SEND_BACK']),
  remark: z.string().trim().max(1000).optional(),
});

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

const reopenSchema = z.object({
  reason: z.string().trim().min(10, 'Please explain why the grievance is being reopened').max(2000),
});

const overrideSchema = z.object({
  category_id: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().nullable().optional(),
  priority: prioritySchema.optional(),
});

module.exports = {
  createGrievanceSchema,
  listQuerySchema,
  idParamSchema,
  trackParamSchema,
  statusUpdateSchema,
  assignSchema,
  remarkSchema,
  escalateSchema,
  reportSchema,
  reportReviewSchema,
  feedbackSchema,
  reopenSchema,
  overrideSchema,
};
