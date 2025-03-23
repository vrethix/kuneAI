import { Action, elizaLogger, ServiceType } from "@elizaos/core";
import { ITokenAnalysisService } from "@elizaos/core";

export const cryptoTweet: Action = {
    name: "CRYPTO_TWEET",
    description: "Generate a tweet about crypto market insights",
    examples: [
        [{
            user: "user",
            content: {
                text: "Give me a crypto update",
                action: "CRYPTO_TWEET"
            }
        }]
    ],
    handler: async (runtime) => {
        const tokenService = runtime.getService<ITokenAnalysisService>(ServiceType.TOKEN_ANALYSIS);
        if (!tokenService) {
            elizaLogger.info("TokenAnalysisService not available");
            return null;
        }

        try {
            elizaLogger.info("Fetching BTC data from LunarCrush");
            const data = await tokenService.generateInsightData("BTC");
            elizaLogger.info("LunarCrush data received:", data);

            return {
                type: "TWEET",
                content: `#Bitcoin Update\n\n` +
                        `Price: $${data.price}\n` +
                        `24h Change: ${data.percent_change_24h}%\n` +
                        `Sentiment: ${data.sentiment}\n\n` +
                        `#BTC #Crypto`
            };
        } catch (error) {
            elizaLogger.error("Error in cryptoTweet:", error);
            throw error;
        }
    },
    similes: [],
    validate: async () => true
};