import { elizaLogger } from "@elizaos/core";
import TokenAnalysisService from "../tokenAnalysis";

async function testTweetGeneration() {
    try {
        const service = new TokenAnalysisService();
        await service.initialize();

        // Get top coins data
        elizaLogger.info("Fetching top coins data...");
        const topCoins = await service.generateTopicInsight();
        elizaLogger.info("Top coins data:", topCoins);

        // Get specific BTC data
        elizaLogger.info("\nFetching BTC specific data...");
        const btcData = await service.generateInsightData("BTC");
        elizaLogger.info("BTC data:", btcData);

        // This data will be used by the agent to generate tweets
        elizaLogger.info("\nData ready for tweet generation!");

    } catch (error) {
        elizaLogger.error("Test failed:", error);
    }
}

testTweetGeneration();