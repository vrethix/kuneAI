import { IAgentRuntime } from "@elizaos/core";
import { Service, ServiceType } from "@elizaos/core";
import { baseUrls, COINGECKO_API_KEY, GOLD_RUSH_API_KEY } from "./constants";

export type ITokenAnalysisService = TokenAnalysisService & Service;

export type InsightData = {
    chain: string;
    metrics: {
        holders: {
            numCurrentHolders: number;
            numNewHolders24h: number;
            numHolders24hChange: number;
            numHolders24hChangePercentage: number;
        };
        prices: {
            currentPrice: number;
            priceChange24h: number;
            percentageChange24h: number;
            marketCap: number;
            marketCapChange24hPercentage: number;
        };
    };
};

class TokenAnalysisService extends Service {
    private coinGeckoApiUrl: string;
    private goldRushApiUrl: string;
    private goldRushApiKey: string;
    private coingGeckoApiKey: string;

    private constructor() {
        super();
        this.coinGeckoApiUrl = baseUrls.coingecko;
        this.goldRushApiUrl = baseUrls.goldrush;
        this.goldRushApiKey = GOLD_RUSH_API_KEY;
        this.coingGeckoApiKey = COINGECKO_API_KEY;
    }

    public get serviceType(): ServiceType {
        return ServiceType.TOKEN_ANALYSIS;
    }

    async initialize(_: IAgentRuntime): Promise<void> {
        // For example, validating API keys
        if (!GOLD_RUSH_API_KEY || !COINGECKO_API_KEY) {
            throw new Error("Missing required API keys");
        }
    }

    public async generateInsightData(
        symbol: string
    ): Promise<InsightData | string> {
        return {
            chain: "ETH",
            metrics: {
                holders: {
                    numCurrentHolders: 1000000,
                    numNewHolders24h: 1000000,
                    numHolders24hChange: 1000000,
                    numHolders24hChangePercentage: 1000000,
                },
                prices: {
                    currentPrice: 1200,
                    priceChange24h: 1000,
                    percentageChange24h: 20,
                    marketCap: 1000000,
                    marketCapChange24hPercentage: 5,
                },
            },
        };
    }

    public getInsightDataSchema(): string {
        return `
        InsightData Schema:
        - chain: string (The blockchain network, e.g., "ETH", "BSC")
        - metrics:
        - holders:
            - numCurrentHolders: number (Total current holders of the token)
            - numNewHolders24h: number (New holders in the last 24 hours)
            - numHolders24hChange: number (Absolute change in holders over 24 hours)
            - numHolders24hChangePercentage: number (Percentage change in holders over 24 hours)
        - prices:
            - currentPrice: number (Current token price in USD)
            - priceChange24h: number (Absolute price change in last 24 hours)
            - percentageChange24h: number (Percentage price change in last 24 hours)
            - marketCap: number (Current market capitalization in USD)
            - marketCapChange24hPercentage: number (Percentage change in market cap over 24 hours)`;
    }
}

export default TokenAnalysisService.getInstance();
