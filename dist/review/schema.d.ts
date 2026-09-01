import { z } from 'zod';
export declare const FindingSchema: z.ZodObject<{
    file: z.ZodString;
    line: z.ZodNumber;
    endLine: z.ZodOptional<z.ZodNumber>;
    side: z.ZodDefault<z.ZodEnum<{
        RIGHT: "RIGHT";
        LEFT: "LEFT";
        BOTH: "BOTH";
    }>>;
    severity: z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    confidence: z.ZodNumber;
    category: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    impact: z.ZodOptional<z.ZodString>;
    suggestion: z.ZodOptional<z.ZodString>;
    suggestedCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ReviewSchema: z.ZodObject<{
    summary: z.ZodObject<{
        overallRisk: z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        description: z.ZodString;
        positiveNotes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
    findings: z.ZodArray<z.ZodObject<{
        file: z.ZodString;
        line: z.ZodNumber;
        endLine: z.ZodOptional<z.ZodNumber>;
        side: z.ZodDefault<z.ZodEnum<{
            RIGHT: "RIGHT";
            LEFT: "LEFT";
            BOTH: "BOTH";
        }>>;
        severity: z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        confidence: z.ZodNumber;
        category: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        impact: z.ZodOptional<z.ZodString>;
        suggestion: z.ZodOptional<z.ZodString>;
        suggestedCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Finding = z.infer<typeof FindingSchema>;
export type Review = z.infer<typeof ReviewSchema>;
