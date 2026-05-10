const { z } = require("zod");

const generateEmailSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  tone: z.enum(["formal", "casual"]),
  keywords: z.string().optional(),
  userId: z.string().uuid(),
});

const sendBulkSchema = z.object({
  userId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  subject: z.string(),
  templateBody: z.string(),
  recipients: z
    .array(z.record(z.any()))
    .min(1, "At least one recipient is required"),
});

module.exports = { generateEmailSchema, sendBulkSchema };
