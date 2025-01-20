import { IAgentRuntime } from "@elizaos/core";
import { Service, ServiceType } from "@elizaos/core";
import { baseUrls, COINGECKO_API_KEY, GOLD_RUSH_API_KEY } from "./constants";

export type ITokenAnalysisService = Service & {
    generateInsightData(symbol: string): Promise<InsightData | string>;
};

export type InsightData = {
    chain: string;
    metrics: {
        holders: any;
        prices: any;
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
        return "fake stuff";
    }
}

export default TokenAnalysisService.getInstance();
