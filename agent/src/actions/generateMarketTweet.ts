import { elizaLogger } from "@elizaos/core";
import TokenAnalysisService from "../services/tokenAnalysis";

export const generateMarketTweet = {
    name: "GENERATE_MARKET_TWEET",
    description: "Generate a tweet about crypto market using real-time data",
    examples: [
        {
            input: "What's happening with Bitcoin?",
            output: "🚀 $BTC showing real strength! Price: $69,420 (+4.20%)\nGalaxy Score: 75/100 - Bullish vibes only!\n\nEven my pet hamster is trading better than me! Not financial advice, but charts looking juicier than my meme folder! 📈"
        }
    ],
    handler: async (runtime: any) => {
        try {
            const btcData = await TokenAnalysisService.generateInsightData("BTC");

            // Format tweet text using real data
            const tweetText = `🚀 $BTC at $${btcData.data.price.toFixed(2)} (${btcData.data.percent_change_24h > 0 ? '+' : ''}${btcData.data.percent_change_24h.toFixed(2)}%)\nGalaxy Score: ${btcData.data.galaxy_score}/100\n\n${btcData.data.percent_change_24h > 0 ? 'Bullish vibes only!' : 'Stay strong, fam!'} 📈 #Bitcoin #Crypto`;

            // Return in Twitter-ready format
            return {
                type: "TWEET",
                content: tweetText,
                data: {  // Keep raw data for context
                    price: btcData.data.price,
                    change24h: btcData.data.percent_change_24h,
                    galaxyScore: btcData.data.galaxy_score
                }
            };

        } catch (error) {
            elizaLogger.error("Error generating market tweet:", error);
            throw error;
        }
    }
};