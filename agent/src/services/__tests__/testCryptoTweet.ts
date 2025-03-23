import { elizaLogger } from "@elizaos/core";
import { cryptoTweet } from "../../actions/cryptoTweet";

async function testCryptoTweet() {
    try {
        elizaLogger.info("Testing crypto tweet generation...");

        // Test the action handler
        const result = await cryptoTweet.handler();

        elizaLogger.info("Generated tweet data:", JSON.stringify(result, null, 2));

    } catch (error) {
        elizaLogger.error("Test failed:", {
            message: error.message,
            stack: error.stack
        });
    }
}

testCryptoTweet();