import { elizaLogger } from "@elizaos/core";
import TokenAnalysisService from "../tokenAnalysis";

async function runTest() {
    try {
        elizaLogger.log("\n=== Testing Topics ===");
        const service = new TokenAnalysisService();

        // Test topics first
        const topics = await service.generateTopicInsight();
        elizaLogger.log("Topics Data:", topics);

        // Test coin analysis with proper error handling
        elizaLogger.log("\n=== Testing Coin Analysis ===");
        elizaLogger.log("\nAnalyzing BTC:");

        const btcData = await service.generateInsightData("BTC");
        if (typeof btcData === "string") {
            throw new Error(`API Error: ${btcData}`);
        }
        elizaLogger.log("BTC Data:", btcData);

    } catch (error) {
        elizaLogger.error("Test failed:", {
            error: error.message,
            stack: error.stack
        });
    }
}

runTest();