import { LunarProvider } from '../providers/lunarProvider';

async function testLunarProvider() {
    const provider = new LunarProvider();

    console.log("🌙 Testing LunarProvider...");

    try {
        // Test 1: Initial fetch
        console.log("Test 1: Fetching data...");
        const data = await provider.fetchTopics();
        console.log("✅ Data received:", data);

        // Test 2: Cache test
        console.log("\nTest 2: Testing cache...");
        const cachedData = await provider.fetchTopics();
        console.log("✅ Cached data:", cachedData);

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

testLunarProvider();