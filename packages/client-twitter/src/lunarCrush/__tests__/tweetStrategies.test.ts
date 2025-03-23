import { TokenAnalysisService } from '@elizaos/core';
import { TWEET_STRATEGIES } from '../tweetStrategies';
import { elizaLogger } from '@elizaos/core';
const testEndpoints = async () => {
    console.log("\n🔍 Testing LunarCrush API Endpoints\n");

    const tokenService = new TokenAnalysisService({
        apiKey: process.env.LUNAR_CRUSH_API_KEY || ''
    });

    // Test Topics
    console.log("Testing /public/topics/list/v1");
    const topicsList = await tokenService.fetch('/public/topics/list/v1');
    console.log("Sample Topic:", JSON.stringify(topicsList.data[0], null, 2));

    // Test Topic Details
    console.log("\nTesting /public/topic/bitcoin/v1");
    const bitcoinTopic = await tokenService.fetch('/public/topic/bitcoin/v1');
    console.log("Bitcoin Topic Data:", JSON.stringify(bitcoinTopic.data, null, 2));

    // Test Topic Posts
    console.log("\nTesting /public/topic/bitcoin/posts/v1");
    const bitcoinPosts = await tokenService.fetch('/public/topic/bitcoin/posts/v1');
    console.log("Sample Post:", JSON.stringify(bitcoinPosts.data[0], null, 2));

    // Test Categories
    console.log("\nTesting /public/categories/list/v1");
    const categories = await tokenService.fetch('/public/categories/list/v1');
    console.log("Sample Category:", JSON.stringify(categories.data[0], null, 2));

    // Test Coins
    console.log("\nTesting /public/coins/list/v2");
    const coins = await tokenService.fetch('/public/coins/list/v2');
    console.log("Sample Coin:", JSON.stringify(coins.data[0], null, 2));

    // Test constructing a tweet from the data
    console.log("\n📝 Testing Tweet Construction");
    const sampleData = {
        coins: coins.data.slice(0, 3),
        topics: topicsList.data.slice(0, 3)
    };

    console.log("\nAvailable Data for Tweet:", JSON.stringify(sampleData, null, 2));
    console.log("\nWe can create tweets about:");
    console.log("1. Market Data:", sampleData.coins.map(c => `${c.name}: $${c.price}`).join(', '));
    console.log("2. Trending Topics:", sampleData.topics.map(t => t.title).join(', '));
};

// Run tests
console.log("Starting LunarCrush API Tests...");
testEndpoints().catch(error => {
    console.error("Error running tests:", error);
    process.exit(1);
});