import { elizaLogger } from "@elizaos/core";
import { generateMarketTweet } from "../../actions/generateMarketTweet";

async function testMarketTweet() {
    try {
        elizaLogger.info("Testing market tweet generation...");

        // Test the action handler
        const result = await generateMarketTweet.handler({});

        elizaLogger.info("Generated tweet context:", JSON.stringify(result, null, 2));

    } catch (error) {
        elizaLogger.error("Test failed:", {
            message: error.message,
            stack: error.stack
        });
    }
}

testMarketTweet();