import { LunarProvider } from '../providers/lunarProvider';
import getTopicData from '../actions/getTopicData';

async function testTweetGeneration() {
    console.log("🧪 Testing Tweet Generation...");

    try {
        // Test direct provider data
        console.log("\n1️⃣ Testing Provider Data:");
        const provider = new LunarProvider();
        const trends = await provider.getTopTrending(3);
        console.log("Raw trends data:", JSON.stringify(trends, null, 2));

        // Test action tweet generation
        console.log("\n2️⃣ Testing Tweet Format:");
        const result = await getTopicData.handler(
            {} as any, // Mock runtime
            {} as any, // Mock message
            {} as any  // Mock state
        );
        console.log("Generated tweet:", result?.text);

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

testTweetGeneration();