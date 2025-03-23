import { elizaLogger } from "@elizaos/core";
import TokenAnalysisService from "../tokenAnalysis";

async function testFullFlow() {
    try {
        // Just test the TokenAnalysisService directly
        const service = new TokenAnalysisService();
        await service.initialize();

        elizaLogger.info("Getting market data...");
        const btcData = await service.generateInsightData("BTC");
        const topCoins = await service.generateTopicInsight();

        elizaLogger.info("\nBTC Data:", btcData);
        elizaLogger.info("\nTop Coins:", topCoins);

    } catch (error) {
        elizaLogger.error("Test failed:", {
            message: error.message,
            stack: error.stack
        });
    }
}

testFullFlow();