import { Provider, IAgentRuntime, Memory, State, elizaLogger } from "@ai16z/eliza";
import { validateLunarConfig } from '../environment';
import { API_ENDPOINTS } from '../utils/constants';
import { TopicData, TopicsResponse } from "../types/lunar";

export class LunarProvider {
    private cachedData: Map<string, any>;
    private pollingInterval: NodeJS.Timeout | null = null;
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.cachedData = new Map();
        this.runtime = runtime;
        this.startPolling();
    }

    private startPolling() {
        // Poll every 4 hours
        this.pollingInterval = setInterval(() => {
            this.fetchTopics();
        }, 4 * 60 * 60 * 1000);
    }

    private async fetchWithRetry(url: string, options: RequestInit = {}) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        let lastError: Error;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                elizaLogger.log(`🌙 Attempting Lunar API call to: ${url}`);
                const config = await validateLunarConfig(this.runtime);
                elizaLogger.log("🌙 Using API key:", config.LUNAR_API_KEY ? "Present" : "Missing");

                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Authorization': `Bearer ${config.LUNAR_API_KEY}`,
                        'Accept': 'application/json',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
                }

                const data = await response.json();
                elizaLogger.log("🌙 Lunar API response received:", JSON.stringify(data, null, 2));
                return data;
            } catch (error) {
                lastError = error as Error;
                elizaLogger.error(`🌙 Lunar API attempt ${i + 1} failed:`, error);
                if (i < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
                    continue;
                }
            }
        }
        throw lastError;
    }

    private getCachedData<T>(key: string): T | null {
        const data = this.cachedData.get(key);
        if (data && Date.now() - data.timestamp < 5 * 60 * 1000) { // 5 min cache
            return data.value;
        }
        return null;
    }

    private setCachedData(key: string, value: any) {
        this.cachedData.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    async fetchTopics(): Promise<TopicsResponse> {
        const cacheKey = 'lunar_topics';
        const cached = this.getCachedData<TopicsResponse>(cacheKey);
        if (cached) return cached;

        try {
            const data = await this.fetchWithRetry(API_ENDPOINTS.TOPICS.LIST, {
                headers: {
                    'Authorization': `Bearer ${process.env.LUNAR_API_KEY}`,
                    'Accept': 'application/json',
                }
            });
            this.setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            elizaLogger.error("Error fetching lunar topics:", error);
            throw error;
        }
    }

    async getTopTrending(limit: number = 3): Promise<any[]> {
        try {
            const config = await validateLunarConfig(this.runtime);

            const response = await fetch(API_ENDPOINTS.TOPICS.LIST, {
                headers: {
                    'Authorization': `Bearer ${config.LUNAR_API_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data?.data) {
                throw new Error('Invalid response format from Lunar API');
            }

            // Sort by interactions and get top N
            return data.data
                .sort((a: any, b: any) => b.interactions_1h - a.interactions_1h)
                .slice(0, limit);

        } catch (error) {
            elizaLogger.error('Error fetching Lunar trends:', error);
            throw error;
        }
    }
}

// Export the provider interface
export const lunarProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory) => {
        const provider = new LunarProvider(runtime);
        return await provider.getTopTrending(3);
    }
};