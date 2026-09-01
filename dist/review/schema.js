"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewSchema = exports.FindingSchema = void 0;
const zod_1 = require("zod");
exports.FindingSchema = zod_1.z.object({
    file: zod_1.z.string(),
    line: zod_1.z.number(),
    endLine: zod_1.z.number().optional(),
    side: zod_1.z.enum(['RIGHT', 'LEFT', 'BOTH']).default('RIGHT'),
    severity: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
    confidence: zod_1.z.number().min(0).max(1),
    category: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    impact: zod_1.z.string().optional(),
    suggestion: zod_1.z.string().optional(),
    suggestedCode: zod_1.z.string().nullable().optional(),
});
exports.ReviewSchema = zod_1.z.object({
    summary: zod_1.z.object({
        overallRisk: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
        description: zod_1.z.string(),
        positiveNotes: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    findings: zod_1.z.array(exports.FindingSchema),
});
