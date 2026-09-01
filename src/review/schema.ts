import { z } from 'zod';

export const FindingSchema = z.object({
  file: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  side: z.enum(['RIGHT', 'LEFT', 'BOTH']).default('RIGHT'),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  confidence: z.number().min(0).max(1),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  impact: z.string().optional(),
  suggestion: z.string().optional(),
  suggestedCode: z.string().nullable().optional(),
});

export const ReviewSchema = z.object({
  summary: z.object({
    overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    positiveNotes: z.array(z.string()).optional(),
  }),
  findings: z.array(FindingSchema),
});

export type Finding = z.infer<typeof FindingSchema>;
export type Review = z.infer<typeof ReviewSchema>;
