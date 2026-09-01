"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ConfigSchema = void 0;
exports.loadConfig = loadConfig;
const dotenv = __importStar(require("dotenv"));
const zod_1 = require("zod");
dotenv.config();
exports.ConfigSchema = zod_1.z.object({
    GITHUB_TOKEN: zod_1.z.string().min(1).default('dummy'),
    GROQ_API_KEY: zod_1.z.string().min(1).default('dummy'),
    GROQ_MODEL: zod_1.z.string().default('openai/gpt-oss-120b'),
    GROQ_FALLBACK_MODEL: zod_1.z.string().default('openai/gpt-oss-20b'),
    GROQ_BASE_URL: zod_1.z.string().optional(),
    MAX_TOKENS: zod_1.z.number().default(4000),
    MIN_CONFIDENCE: zod_1.z.number().default(0.8),
    MAX_CONCURRENT_REVIEWS: zod_1.z.number().default(2),
    SEVERITY_LEVELS: zod_1.z.array(zod_1.z.string()).default(['critical', 'high', 'medium']),
    EXCLUDE_PATTERNS: zod_1.z.array(zod_1.z.string()).default(['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js']),
});
function loadConfig() {
    const config = {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN || 'dummy',
        GROQ_API_KEY: process.env.GROQ_API_KEY || process.env.INPUT_GROQ_API_KEY || 'dummy',
        GROQ_MODEL: process.env.GROQ_MODEL || process.env.INPUT_GROQ_MODEL || 'openai/gpt-oss-120b',
        GROQ_FALLBACK_MODEL: process.env.GROQ_FALLBACK_MODEL || process.env.INPUT_GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b',
        GROQ_BASE_URL: process.env.GROQ_BASE_URL || process.env.INPUT_GROQ_BASE_URL,
        MAX_TOKENS: process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS, 10) : 2500,
        MIN_CONFIDENCE: process.env.MIN_CONFIDENCE ? parseFloat(process.env.MIN_CONFIDENCE) : 0.8,
        MAX_CONCURRENT_REVIEWS: process.env.MAX_CONCURRENT_REVIEWS ? parseInt(process.env.MAX_CONCURRENT_REVIEWS, 10) : 1,
    };
    try {
        return exports.ConfigSchema.parse(config);
    }
    catch (error) {
        console.error('Configuration error:', error);
        throw new Error('Invalid configuration', { cause: error });
    }
}
exports.config = loadConfig();
