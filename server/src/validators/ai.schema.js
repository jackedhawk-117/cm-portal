const { z } = require('zod');
const { districtSchema } = require('./common.schema');

const analyzeSchema = z.object({
  description: z
    .string()
    .trim()
    .min(30, 'Provide at least 30 characters so the assistant has enough context')
    .max(5000),
  district: districtSchema.optional(),
});

module.exports = { analyzeSchema };
