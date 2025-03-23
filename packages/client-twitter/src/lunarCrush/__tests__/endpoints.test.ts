import { TokenAnalysisService } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

describe('LunarCrush API Endpoints', () => {
    let tokenService: TokenAnalysisService;

    beforeAll(() => {
        tokenService = new TokenAnalysisService({
            apiKey: process.env.LUNAR_CRUSH_API_KEY
        });
    });

    describe('Topics Endpoints', () => {
        test('Get Topics List', async () => {
            const response = await tokenService.fetch('/public/topics/list/v1');
            elizaLogger.info('Topics List:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Topic Summary', async () => {
            const response = await tokenService.fetch('/public/topic/bitcoin/v1');
            elizaLogger.info('Bitcoin Topic Summary:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Topic Posts', async () => {
            const response = await tokenService.fetch('/public/topic/bitcoin/posts/v1');
            elizaLogger.info('Bitcoin Posts:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Topic News', async () => {
            const response = await tokenService.fetch('/public/topic/bitcoin/news/v1');
            elizaLogger.info('Bitcoin News:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Topic Creators', async () => {
            const response = await tokenService.fetch('/public/topic/bitcoin/creators/v1');
            elizaLogger.info('Bitcoin Creators:', response);
            expect(response.data).toBeDefined();
        });
    });

    describe('Category Endpoints', () => {
        test('Get Categories List', async () => {
            const response = await tokenService.fetch('/public/categories/list/v1');
            elizaLogger.info('Categories List:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Category Summary', async () => {
            const response = await tokenService.fetch('/public/category/defi/v1');
            elizaLogger.info('DeFi Category Summary:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Category Topics', async () => {
            const response = await tokenService.fetch('/public/category/defi/topics/v1');
            elizaLogger.info('DeFi Topics:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Category Posts', async () => {
            const response = await tokenService.fetch('/public/category/defi/posts/v1');
            elizaLogger.info('DeFi Posts:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Category News', async () => {
            const response = await tokenService.fetch('/public/category/defi/news/v1');
            elizaLogger.info('DeFi News:', response);
            expect(response.data).toBeDefined();
        });
    });

    describe('Coins Endpoints', () => {
        test('Get Coins List v2', async () => {
            const response = await tokenService.fetch('/public/coins/list/v2');
            elizaLogger.info('Coins List v2:', response);
            expect(response.data).toBeDefined();
        });

        test('Get Coins List v1', async () => {
            const response = await tokenService.fetch('/public/coins/list/v1');
            elizaLogger.info('Coins List v1:', response);
            expect(response.data).toBeDefined();
        });
    });

    describe('Post Time Series', () => {
        test('Get Post Time Series', async () => {
            // Using a sample post ID - we'll need to replace with a real one
            const response = await tokenService.fetch('/public/posts/twitter/12345/time-series/v1');
            elizaLogger.info('Post Time Series:', response);
            expect(response).toBeDefined();
        });
    });

    describe('Data Structure Analysis', () => {
        test('Analyze Topics Data Structure', async () => {
            const response = await tokenService.fetch('/public/topics/list/v1');
            const sampleTopic = response.data[0];
            elizaLogger.info('Sample Topic Structure:', {
                keys: Object.keys(sampleTopic),
                dataTypes: Object.entries(sampleTopic).map(([key, value]) =>
                    `${key}: ${typeof value}`)
            });
        });

        test('Analyze Category Data Structure', async () => {
            const response = await tokenService.fetch('/public/category/defi/v1');
            const data = response.data;
            elizaLogger.info('Category Data Structure:', {
                keys: Object.keys(data),
                dataTypes: Object.entries(data).map(([key, value]) =>
                    `${key}: ${typeof value}`)
            });
        });

        test('Analyze Coins Data Structure', async () => {
            const response = await tokenService.fetch('/public/coins/list/v2');
            const sampleCoin = response.data[0];
            elizaLogger.info('Sample Coin Structure:', {
                keys: Object.keys(sampleCoin),
                dataTypes: Object.entries(sampleCoin).map(([key, value]) =>
                    `${key}: ${typeof value}`)
            });
        });
    });
});