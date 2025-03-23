import { z } from 'zod';

export const TokenAnalysisConfig = z.object({
    apiKey: z.string().min(1, 'LunarCrush API key is required'),
    supabaseUrl: z.string().url('Valid Supabase URL is required'),
    supabaseKey: z.string().min(1, 'Supabase key is required'),
});

export type TokenAnalysisConfigType = z.infer<typeof TokenAnalysisConfig>;

export const validateConfig = (config: unknown) => {
    return TokenAnalysisConfig.parse(config);
};