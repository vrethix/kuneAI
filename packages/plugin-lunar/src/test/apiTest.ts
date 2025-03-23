import { makeApiRequest } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';

async function testLunarAPI() {
    try {
        const config = {
            LUNAR_API_KEY: process.env.LUNAR_API_KEY!,
            LUNAR_API_VERSION: '',
            LUNAR_BASE_URL: 'https://lunarcrush.com/api4/public'
        };

        // Test Topics List
        console.log('\nTesting Topics List endpoint...');
        console.log(`Full URL: ${config.LUNAR_BASE_URL}${API_ENDPOINTS.TOPICS.LIST}`);

        const topicsData = await makeApiRequest({
            endpoint: API_ENDPOINTS.TOPICS.LIST,
            config,
            headers: {
                'Authorization': `Bearer ${config.LUNAR_API_KEY}`
            }
        });
        console.log('✅ Topics List:', topicsData);

        // Test Specific Topic Details
        const testTopic = 'bitcoin';  // example topic
        console.log('\nTesting Topic Details endpoint...');
        console.log(`Full URL: ${config.LUNAR_BASE_URL}${API_ENDPOINTS.TOPICS.DETAILS(testTopic)}`);

        const topicDetails = await makeApiRequest({
            endpoint: API_ENDPOINTS.TOPICS.DETAILS(testTopic),
            config,
            headers: {
                'Authorization': `Bearer ${config.LUNAR_API_KEY}`
            }
        });
        console.log('✅ Topic Details:', topicDetails);

    } catch (error) {
        console.error('❌ API Test Failed:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
    }
}

// Run the test with more detailed API key check
const apiKey = process.env.LUNAR_API_KEY;
console.log('API Key:', apiKey ? `✅ Present (${apiKey.length} characters)` : '❌ Missing');
testLunarAPI();