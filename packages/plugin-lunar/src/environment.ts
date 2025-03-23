import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const lunarEnvSchema = z.object({
    LUNAR_API_KEY: z.string().min(1, "LunarCrush API key is required"),
    LUNAR_API_VERSION: z.string().default('v2'),
    LUNAR_BASE_URL: z.string().default('https://lunarcrush.com/api'),
});

export type LunarConfig = z.infer<typeof lunarEnvSchema>;

export const DEFAULT_CONFIG: Partial<LunarConfig> = {
    LUNAR_API_VERSION: 'v2',
    LUNAR_BASE_URL: 'https://lunarcrush.com/api'
};

export async function validateLunarConfig(runtime: IAgentRuntime): Promise<LunarConfig> {
    return {
        LUNAR_API_KEY: process.env.LUNAR_API_KEY || ''
    };
}

export function getApiUrl(config: LunarConfig): string {
    return `${config.LUNAR_BASE_URL}/${config.LUNAR_API_VERSION}`;
}