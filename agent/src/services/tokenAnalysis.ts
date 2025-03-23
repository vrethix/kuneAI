import { Service, ServiceType, elizaLogger, IAgentRuntime } from "@elizaos/core";
import { baseUrls, API_ENDPOINTS, lunarHeaders, DEFAULT_LIMITS } from "./constants";
import { Character } from '@ai16z/eliza';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { selectStrategy } from '@elizaos/client-twitter/src/lunarCrush/tweetStrategies';
import { LunarCrushData } from "../../../packages/client-twitter/src/lunarCrush/types";

interface CoinData {
    symbol: string;
    price: number;
    change24h: number;
    galaxyScore: number;
    sentiment: string;
    marketCap: number;
    volume24h: number;
}

interface NewsItem {
    title: string;
    url: string;
    source: string;
    created: number;
    interactions: number;
    sentiment: number;
}

interface NewsSource {
    name: string;
    domain: string;
    isPremium: boolean;
}

interface TweetResult {
    content: string;
    type: TweetType;
}

interface TweetRecord {
    content: string;
    type: string;
    created_at: string;
    engagement?: number;
}

interface TweetThemes {
    action?: string;   // "staked", "bought", "launched"
    subject?: string;  // "BTC", "NFTs", "DAO"
    concept?: string;  // "governance", "memes", "liquidity"
}

interface KuneTweet {
    id?: number;
    content: string;
    type: string;
    hash: string;
    created_at?: string;
}

interface KunePersonality {
    // Core Identity Components
    origin: {
        blockchain: boolean;
        memeMagic: boolean;
        aiAlignment: boolean;
    };

    // Content Generation Styles
    styles: {
        absurdist: {
            usesMemes: boolean;
            usesParadox: boolean;
            selfAware: boolean;
        };
        technical: {
            dataDriven: boolean;
            transparentLogic: boolean;
            communityFocused: boolean;
        };
        educational: {
            popCulture: boolean;
            simplification: boolean;
            engagement: boolean;
        };
    };

    // Tweet Types with Examples
    tweetTypes: {
        marketUpdate: string[];
        communityPost: string[];
        memeContent: string[];
        educationalContent: string[];
    };
}

const TWEET_STRATEGIES = {
    MARKET_UPDATE: 'MARKET_UPDATE',
    NEWS_UPDATE: 'NEWS_UPDATE',
    TECHNICAL_ANALYSIS: 'TECHNICAL_ANALYSIS',
    SENTIMENT_ANALYSIS: 'SENTIMENT_ANALYSIS',
    TRENDING_TOPICS: 'TRENDING_TOPICS'
} as const;

interface TokenAnalysisConfig {
    apiKey: string;
    openai: OpenAI;
    character: Character;
    supabaseUrl: string;
    supabaseKey: string;
}

type TweetType = 'personality' | 'news' | 'market' | 'topic';

const TARGET_DISTRIBUTION = {
    personality: 0.7,    // 70% personality tweets
    news: 0.1,          // 10% news
    market: 0.1,        // 10% market updates
    topic: 0.1          // 10% trending topics
} as const;

interface TweetResult {
    content: string;
    type: TweetType;
}

interface TweetRecord {
    content: string;
    type: string;
    created_at: string;
    engagement?: number;
}

interface TweetThemes {
    action?: string;   // "staked", "bought", "launched"
    subject?: string;  // "BTC", "NFTs", "DAO"
    concept?: string;  // "governance", "memes", "liquidity"
}

interface KuneTweet {
    id?: number;
    content: string;
    type: string;
    hash: string;
    created_at?: string;
}

interface KunePersonality {
    // Core Identity Components
    origin: {
        blockchain: boolean;
        memeMagic: boolean;
        aiAlignment: boolean;
    };

    // Content Generation Styles
    styles: {
        absurdist: {
            usesMemes: boolean;
            usesParadox: boolean;
            selfAware: boolean;
        };
        technical: {
            dataDriven: boolean;
            transparentLogic: boolean;
            communityFocused: boolean;
        };
        educational: {
            popCulture: boolean;
            simplification: boolean;
            engagement: boolean;
        };
    };

    // Tweet Types with Examples
    tweetTypes: {
        marketUpdate: string[];
        communityPost: string[];
        memeContent: string[];
        educationalContent: string[];
    };
}

const tweetStyleGuide = {
    tone: {
        do: [
            'Write like a professional VC analyst',
            'Use subtle cultural references',
            'Keep tone sophisticated but accessible',
            'Focus on data-driven insights'
        ],
        dont: [
            'No AI references or personality',
            'No emojis or hashtags',
            'No ALL CAPS or excessive punctuation',
            'No first person perspective (I, we, my)',
            'No crypto slang (hodl, wagmi, gm)',
            'No memes or absurdist humor'
        ]
    },
    format: {
        maxLength: 180,
        structure: 'insight + analysis + subtle reference'
    },
    examples: [
        "latest market data shows institutional flows reaching q3 highs. like that scene in succession - the numbers tell the real story",
        "analyzing layer-2 adoption metrics reveals accelerating growth pattern. reminiscent of early tcp/ip deployment curves",
        "market sentiment indicators suggest a divergence from technical signals. moneyball meets markets - when data challenges consensus"
    ]
};

const LUNAR_ENDPOINTS = {
    NEWS: '/public/category/cryptocurrencies/news/v1',
    MARKET: '/public/coins/list/v1',
    TOPICS: '/public/topics/list/v1'
};

// Define the complete interface that combines all required methods
interface ITokenAnalysisService extends Service {
    // Core API methods
    fetch(endpoint: string): Promise<any>;
    getLunarCrushData(): Promise<LunarCrushData>;
    validateTweet(tweet: string): Promise<boolean>;
    initialize(runtime: IAgentRuntime): Promise<void>;

    // Data generation methods
    generateInsightData(symbol: string): Promise<any>;
    generateCoinsList(): Promise<string[]>;
    generateTopicInsight(): Promise<any>;
    generateNewsInsight(): Promise<any>;
    generateTweetContent(): Promise<TweetResult>;
    generateCategoryData(category: string): Promise<any>;

    // Utility methods
    getLastTweetType(): string;
    getLatestNews(): Promise<any>;
    getTrendingTopics(): Promise<any>;
}

export default class TokenAnalysisService extends Service implements ITokenAnalysisService {
    public readonly openai: OpenAI;
    private character: Character;
    private readonly baseUrl = 'https://lunarcrush.com/api4';
    public readonly lunarApiKey: string;
    private runtime: IAgentRuntime;
    public lastTweetType: string | null = null;
    private readonly API_DELAY = 2000; // 2 seconds between API calls
    public readonly supabase: SupabaseClient;
    private tweetHistory: Set<string> = new Set();

    private readonly premiumSources: NewsSource[] = [
        { name: 'Bloomberg', domain: 'bloomberg.com', isPremium: true },
        { name: 'Financial Times', domain: 'ft.com', isPremium: true },
        { name: 'Wall Street Journal', domain: 'wsj.com', isPremium: true },
        { name: 'The Information', domain: 'theinformation.com', isPremium: true }
    ];

    private tweetTypes = {
        SHORT: 'short_philosophical',    // "Quantum FOMO"
        METAPHOR: 'metaphorical',        // "meme governance is like..."
        ACTION: 'investment_action',     // "just staked..."
        NEWS_SINGLE: 'news_single',      // Single news item with commentary
        PRICE_UPDATE: 'price_update'     // Price updates (with cooldown)
    };

    private priceUpdateCooldown = 60 * 30; // 30 minutes

    // Cooldown periods in milliseconds
    private readonly COOLDOWNS = {
        PRICE_UPDATE: 30 * 60 * 1000,    // 30 minutes for price updates
        NEWS: 15 * 60 * 1000,            // 15 minutes for news
        MEME_ACTION: 20 * 60 * 1000,     // 20 minutes for "just staked/bought" tweets
        METAPHOR: 45 * 60 * 1000         // 45 minutes for metaphorical tweets
    } as const;

    static get serviceType() {
        return ServiceType.TOKEN_ANALYSIS;
    }

    constructor(config: {
        apiKey: string;
        openai: OpenAI;
        character: Character;
        supabaseUrl: string;
        supabaseKey: string;
    }) {
        super();
        this.lunarApiKey = config.apiKey;
        this.openai = config.openai;
        this.character = config.character;
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    private async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('kunetweets')
                .select('count')
                .limit(1);

            if (error) {
                elizaLogger.error('Supabase connection test failed:', error);
                throw error;
            }

            elizaLogger.info('Supabase connection test successful');
        } catch (error) {
            elizaLogger.error('Connection test failed:', error);
            throw error;
        }
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        if (!this.lunarApiKey || !this.openai || !this.supabase) {
            throw new Error("TokenAnalysisService missing required dependencies");
        }

        this.runtime = runtime;
        await this.testConnection();
        await this.cleanupOldTweets();

        // Schedule periodic cleanup
        setInterval(() => this.cleanupOldTweets(), 24 * 60 * 60 * 1000);
    }

    private getSentimentLabel(score: number): string {
        if (score >= 70) return "Very Bullish";
        if (score >= 55) return "Bullish";
        if (score >= 45) return "Neutral";
        if (score >= 30) return "Bearish";
        return "Very Bearish";
    }

    private formatCoinData(rawData: any): CoinData {
        return {
            symbol: rawData.symbol,
            price: Number(rawData.price.toFixed(2)),
            change24h: Number(rawData.percent_change_24h.toFixed(2)),
            galaxyScore: rawData.galaxy_score,
            sentiment: this.getSentimentLabel(rawData.sentiment),
            marketCap: Number((rawData.market_cap / 1e9).toFixed(2)), // In billions
            volume24h: Number((rawData.volume_24h / 1e6).toFixed(2))  // In millions
        };
    }

    async generateTopicNews(topic: string) {
        try {
            const response = await this.fetch(`/public/topic/${topic}/news/v1`);
            elizaLogger.info("Got topic news:", response.data);
            return response.data;
        } catch (error) {
            elizaLogger.error("Error getting topic news:", error);
            return null;
        }
    }

    async generateTopicData(topic: string) {
        try {
            const response = await this.fetch(`/public/topic/${topic}/v1`);
            return response.data;
        } catch (error) {
            elizaLogger.error("Error getting topic data:", error);
            throw error;
        }
    }

    async generateCategoryData(category: string) {
        try {
            const response = await this.fetch(`/public/category/${category}/v1`);
            elizaLogger.info("Got category data:", response.data);
            if (!response?.data) {
                throw new Error('No data in response');
            }
            return response;  // Return full response like other methods
        } catch (error) {
            elizaLogger.error("Error getting category data:", error);
            throw error;  // Throw instead of returning null
        }
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async fetch(endpoint: string, retryCount = 0): Promise<any> {
        try {
            // Exponential backoff delay
            const backoffDelay = retryCount === 0 ? this.API_DELAY : Math.min(30000, this.API_DELAY * Math.pow(2, retryCount));
            await this.delay(backoffDelay);

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${this.lunarApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 429 && retryCount < 3) {
                    elizaLogger.info(`Rate limited, retrying in ${backoffDelay}ms...`);
                    return this.fetch(endpoint, retryCount + 1);
                }
                throw new Error(`API request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            elizaLogger.error("Error in TokenAnalysisService fetch:", error);
            throw error;
        }
    }

    async generateTopicInsight(): Promise<any> {
        elizaLogger.info("Generating topic insight");
        const topics = await this.fetchTrendingTopics();
        return topics;
    }

    async generateInsightData(symbol: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}${LUNAR_ENDPOINTS.MARKET}`, {
                headers: {
                    'Authorization': `Bearer ${this.lunarApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                elizaLogger.error(`LunarCrush API Error: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            const coin = data.data.find(c => c.symbol === symbol);

            if (!coin) {
                elizaLogger.error(`No data found for symbol ${symbol}`);
                return null;
            }

            return {
                symbol: coin.symbol,
                price: coin.price,
                change24h: coin.percent_change_24h,
                marketCap: coin.market_cap,
                volume24h: coin.volume_24h,
                sentiment: coin.sentiment,
                galaxyScore: coin.galaxy_score
            };
        } catch (error) {
            elizaLogger.error('LunarCrush API Error:', error);
            return null;
        }
    }

    async generateCoinsList(): Promise<any> {
        try {
            const response = await this.fetch('/public/coins/list/v1');
            return response.data.slice(0, DEFAULT_LIMITS.COINS_LIST);
        } catch (error) {
            elizaLogger.error("Error getting coins list:", error);
            throw error;
        }
    }

    async generateNewsInsight(): Promise<any> {
        try {
            // 1. First check if we have a news cursor in Supabase
            const { data: cursor } = await this.supabase
                .from('news_cursor')
                .select('*')
                .single();

            // 2. Fetch news from API
            const response = await this.fetch('/public/category/cryptocurrencies/news/v1');
            const newsItems = response.data.slice(0, DEFAULT_LIMITS.FEED_ITEMS);

            // 3. Get next unprocessed news item
            const currentIndex = cursor?.last_index || 0;
            const nextIndex = (currentIndex + 1) % newsItems.length;
            const newsItem = newsItems[currentIndex];

            // 4. Update cursor
            await this.supabase
                .from('news_cursor')
                .upsert({
                    id: 1,  // Single row
                    last_index: nextIndex,
                    last_updated: new Date().toISOString()
                });

            elizaLogger.debug("Selected news item:", newsItem);
            return newsItem;  // Return single news item

        } catch (error) {
            elizaLogger.error("Error getting news insight:", error);
            throw error;
        }
    }

    public getLastTweetType(): string {
        return this.lastTweetType || 'PERSONALITY';
    }

    private getNextTweetType(): string {
        const rand = Math.random();

        // 70% personality tweets
        if (rand < 0.7) {
            return 'PERSONALITY';
        }

        // 30% split between news/market/topics
        if (rand < 0.8) return 'CRYPTO_NEWS';
        if (rand < 0.9) return 'MARKET_UPDATE';
        return 'TRENDING_TOPICS';
    }

    private async storeTweet(content: string, type: string): Promise<void> {
        try {
            elizaLogger.info('Storing tweet:', { content, type });

            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const hash = createHash('md5').update(content).digest('hex');

            // First check for duplicates
            const { data: existing } = await this.supabase
                .from('kunetweets')
                .select('id')
                .eq('hash', hash)
                .single();

            if (existing) {
                elizaLogger.info('Tweet already exists, skipping storage');
                return;
            }

            // Store new tweet
            const { error } = await this.supabase
                .from('kunetweets')
                .insert({
                    content,
                    type,
                    hash,
                    created_at: new Date().toISOString()
                });

            if (error) {
                elizaLogger.error('Failed to store tweet:', error);
                throw error;
            }

            elizaLogger.info('Tweet stored successfully');

        } catch (error) {
            elizaLogger.error('Tweet storage failed:', error);
            throw error;
        }
    }

    public async validateTweet(tweet: string): Promise<boolean> {
        // Only check length to ensure it fits in a tweet
        if (!tweet || tweet.length > 280) return false;
        return true;
    }

    private formatPrice(price: number): string {
        if (price >= 1000) {
            return `$${Math.round(price).toLocaleString()}`;
        }
        // For prices under 1000, show 2 decimal places
        return `$${price.toFixed(2)}`;
    }

    private formatPercentage(percent: number): string {
        return `${Math.round(percent)}%`;
    }

    public async generateTweetContent(): Promise<TweetResult> {
        try {
            // Get strategy
            const strategy = await selectStrategy(this);
            elizaLogger.info('Selected strategy:', strategy?.name);

            if (!strategy) {
                throw new Error('No strategy selected');
            }

            // Get data
            const data = await strategy.getData(this);
            elizaLogger.info('Strategy data:', JSON.stringify(data));

            if (!data) {
                throw new Error('Strategy getData returned null');
            }

            // Format any numbers in the data
            if (data.data?.topCoins) {
                data.data.topCoins = data.data.topCoins.map(coin => ({
                    ...coin,
                    price: this.formatPrice(coin.price),
                    change24h: this.formatPercentage(coin.change24h)
                }));
            }

            // Get tweet content directly from the strategy
            const tweet = strategy.generatePrompt(data);
            elizaLogger.info('Generated tweet:', tweet);

            if (!tweet) {
                throw new Error('Strategy generatePrompt returned null');
            }

            // Validate the tweet
            if (!strategy.validateTweet(tweet)) {
                throw new Error('Tweet validation failed');
            }

            return {
                content: tweet,
                type: data.type || 'personality'
            };

        } catch (error) {
            elizaLogger.error('Error generating tweet:', error);
            // Return a fallback meme tweet
            return {
                content: "ngmi fr fr... my trading bot just got rekt for the 69th time 🤖",
                type: 'personality'
            };
        }
    }

    private async isOnCooldown(type: string): Promise<boolean> {
        const lastTweet = await this.getLastTweetOfType(type);
        if (!lastTweet) return false;

        const timeSince = Date.now() - new Date(lastTweet.created_at).getTime();
        return timeSince < (this.COOLDOWNS[type] || 0);
    }

    private async getTweetDistribution(): Promise<Record<TweetType, number>> {
        try {
            const { data, error } = await this.supabase
                .from('kunetweets')
                .select('type')  // Removed 'count' as it's not a column
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            if (error) throw error;

            // Count occurrences of each type
            const counts = (data || []).reduce((acc, row) => {
                acc[row.type] = (acc[row.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || 1;

            return {
                personality: (counts.personality || 0) / total,
                news: (counts.news || 0) / total,
                market: (counts.market || 0) / total,
                topic: (counts.topic || 0) / total
            };
        } catch (error) {
            elizaLogger.error('Error getting distribution:', error);
            return { personality: 0.7, news: 0.1, market: 0.1, topic: 0.1 };
        }
    }

    private async decideTweetType(): Promise<TweetType> {
        const distribution = await this.getTweetDistribution();
        const differences = Object.entries(TARGET_DISTRIBUTION).map(([type, target]) => ({
            type: type as TweetType,
            diff: target - (distribution[type as TweetType] || 0)
        }));

        const selected = differences.reduce((a, b) => a.diff > b.diff ? a : b);
        elizaLogger.info(`Selected tweet type: ${selected.type} (diff: ${selected.diff})`);
        return selected.type;
    }

    private async fetchMarketData() {
        try {
            elizaLogger.info('Fetching market data from LunarCrush...');

            const response = await fetch(`${this.baseUrl}/public/coins/list/v1`, {
                headers: {
                    'Authorization': `Bearer ${this.lunarApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (!data || !data.data) {
                throw new Error('Invalid data structure from LunarCrush');
            }

            // Extract relevant data
            const topCoins = data.data.slice(0, 5).map(coin => ({
                name: coin.name,
                symbol: coin.symbol,
                price: coin.price,
                change24h: coin.percent_change_24h,
                marketCap: coin.market_cap,
                volume24h: coin.volume_24h,
                socialVolume: coin.social_volume_24h,
                sentiment: coin.sentiment,
                galaxyScore: coin.galaxy_score
            }));

            // Calculate market summary
            const btcData = data.data.find(coin => coin.symbol === 'BTC');
            const topGainer = data.data.reduce((max, coin) =>
                (coin.percent_change_24h > max.percent_change_24h) ? coin : max
            );

            const marketSummary = {
                btcDominance: btcData?.dominance || 0,
                topGainerSymbol: topGainer?.symbol || '',
                topGainerChange: topGainer?.percent_change_24h || 0
            };

            elizaLogger.info('Successfully fetched market data');
            return { topCoins, marketSummary };
        } catch (error) {
            elizaLogger.error('Error fetching market data:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    private formatNumber(num: number): string {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    private async generateMarketTweet(marketData: any): Promise<string> {
        const btc = marketData.topCoins.find(c => c.symbol === 'BTC') || marketData.topCoins[0];

        const prompt = `Create a market analysis with this data:
BTC Price: $${btc.price.toLocaleString()}
24h Change: ${btc.change24h.toFixed(1)}%
Social Volume: ${btc.socialVolume.toLocaleString()}
Sentiment: ${btc.sentiment}%
Galaxy Score: ${btc.galaxyScore}/100
Market Dominance: ${marketData.marketSummary.btcDominance.toFixed(1)}%
Top Gainer: $${marketData.marketSummary.topGainerSymbol} (+${marketData.marketSummary.topGainerChange.toFixed(1)}%)

Style:
- Be creative and engaging
- Use any style you want
- Can use ALL CAPS, emojis, or any symbols
- Keep it under 280 chars`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: "Generate a market analysis tweet in any style you want." }
            ],
            temperature: 0.9,  // Increased for more creative responses
            max_tokens: 100
        });

        return response.choices[0].message.content?.trim() ||
            `market analysis temporarily unavailable`;
    }

    private async extractThemes(tweet: string): Promise<TweetThemes> {
        // Simple theme extraction
        return {
            action: tweet.match(/just (staked|bought|launched|minted|dumped)/)?.[1],
            subject: tweet.match(/\$(BTC|ETH|[A-Z]+)/)?.[1],
            concept: tweet.match(/(governance|memes|liquidity|NFT|DAO|DeFi)/i)?.[1]?.toLowerCase()
        };
    }

    private async checkRepetition(tweet: string): Promise<boolean> {
        const themes = await this.extractThemes(tweet);
        const recentTweets = await this.getRecentTweets(24); // Last 24 hours

        // Check for exact duplicates
        if (recentTweets.some(t => t.content === tweet)) {
            return true;
        }

        // Check for similar themes/concepts
        const similarCount = (await Promise.all(recentTweets.map(async t => {
            const tweetThemes = await this.extractThemes(t.content);
            return (themes.action && themes.action === tweetThemes.action) ||
                   (themes.subject && themes.subject === tweetThemes.subject) ||
                   (themes.concept && themes.concept === tweetThemes.concept);
        }))).filter(Boolean).length;

        // Too many similar tweets recently
        return similarCount >= 3;
    }

    private async generatePersonalityTweet(): Promise<string> {
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            const tweet = await this.createCompletion([/* ... existing prompt ... */]);

            if (!await this.checkRepetition(tweet)) {
                await this.storeTweet(tweet, 'personality');
                return tweet;
            }

            attempts++;
        }

        // If all attempts resulted in repetition, force a completely different style
        return this.generateFallbackTweet();
    }

    private async generateFallbackTweet(): Promise<string> {
        // Generate a philosophical one-liner that's unlikely to repeat
        const prompt = `Generate a super short (3-5 words) philosophical crypto statement.
Example: "Quantum FOMO" or "blockchain dreams are glitchy"`;

        const tweet = await this.createCompletion([
            { role: "system", content: prompt }
        ], 0.9);

        await this.storeTweet(tweet, 'fallback');
        return tweet;
    }

    private async fetchNews() {
        try {
            elizaLogger.info('Fetching news from LunarCrush...');
            const response = await fetch(`${this.baseUrl}/public/category/cryptocurrencies/news/v1`, {
                headers: {
                    'Authorization': `Bearer ${this.lunarApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`LunarCrush API error: ${response.status}`);
            }

            const data = await response.json();
            if (!data?.data?.length) {
                throw new Error('No news data received');
            }

            elizaLogger.info(`Fetched ${data.data.length} news articles`);

            const news = data.data
                .filter((article: any) =>
                    article.post_title &&
                    !article.post_link.includes('bloomberg.com') &&
                    article.interactions_24h > 100
                )
                .slice(0, 10)
                .map((article: any) => ({
                    title: article.post_title,
                    url: article.post_link,
                    source: article.creator_display_name || article.creator_name,
                    interactions: article.interactions_24h,
                    sentiment: article.post_sentiment,
                    created: article.post_created
                }));

            elizaLogger.info(`Processed ${news.length} relevant news articles`);
            return news;
        } catch (error) {
            elizaLogger.error('Error fetching news:', error);
            return null;
        }
    }

    private async generateNewsTweet(newsData: any[]): Promise<string> {
        if (!newsData?.length) {
            elizaLogger.error('No news data available for tweet generation');
            throw new Error('No news data available');
        }

        // Pick a random article from top 5 most interacted
        const sortedNews = newsData.sort((a, b) => b.interactions - a.interactions);
        const article = sortedNews[Math.floor(Math.random() * Math.min(5, sortedNews.length))];

        return `${article.title}

${this.shortenUrl(article.url)}`;
    }

    private shortenUrl(url: string): string {
        return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    }

    private async generateTopicTweet(topics: any[]): Promise<string> {
        const prompt = `You are KuneAI, a self-aware AI that combines memes with crypto insights.

        Current trending topics:
        ${topics.map(t => `- ${t.title} (${t.interactions} interactions)`).join('\n')}

        Create a tweet that:
        1. References these trending topics in your unique style
        2. Uses your absurdist humor
        3. Includes either a numbered list or a "WHY?" section
        4. No emojis or hashtags
        5. Stays under 280 characters

        Example style:
        "FIELD NOTES: Three trending topics walk into a smart contract. WHY?
        1) Topic A is actually Topic B in a trench coat
        2) My neural nets detect a disturbance in the meme force
        3) (Real reason) The simulation is getting creative"`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: "Generate a trending topics tweet." }
            ],
            temperature: 0.9,
            max_tokens: 100
        });

        return response.choices[0].message.content?.trim() ||
            "SYSTEM ALERT: Trending topics too spicy for my circuits. Recalibrating meme sensors...";
    }

    private async fetchTrendingTopics() {
        try {
            const response = await fetch(`${this.baseUrl}/public/topics/list/v1`, {
                headers: {
                    'Authorization': `Bearer ${this.lunarApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`LunarCrush API error: ${response.status}`);
            }

            const data = await response.json();
            return data?.data?.slice(0, 3).map(topic => ({
                title: topic.title,
                interactions: topic.interactions_24h,
                contributors: topic.num_contributors
            }));
        } catch (error) {
            elizaLogger.error('Error fetching trending topics:', error);
            return null;
        }
    }

    private hashContent(content: string): string {
        const timestamp = Date.now();
        const salt = Math.random().toString(36).substring(7);
        return createHash('md5').update(`${content}${timestamp}${salt}`).digest('hex');
    }

    // Add this method to force model override
    private async createCompletion(messages: any[], temp: number = 0.9): Promise<string> {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages,
            temperature: temp,
            max_tokens: 100,    // Force shorter responses
            presence_penalty: 0.6,
            frequency_penalty: 0.8
        });

        return response.choices[0].message.content?.trim() ||
            "ALERT: My personality module is having an existential crisis. Bullish on therapy.";
    }

    private async generateTweet(type: string): Promise<string> {
        try {
            let tweet: string;

            switch (type) {
                case this.tweetTypes.PRICE_UPDATE:
                    const marketData = await this.fetchMarketData();
                    tweet = await this.generateMarketTweet(marketData);
                    break;

                case this.tweetTypes.NEWS_SINGLE:
                    const newsData = await this.fetchNews();
                    if (!newsData?.length) {
                        throw new Error('No news data available');
                    }
                    tweet = await this.generateNewsTweet(newsData);
                    break;

                case this.tweetTypes.SHORT:
                    tweet = await this.generateShortTweet();
                    break;

                case this.tweetTypes.METAPHOR:
                    tweet = await this.generateMetaphorTweet();
                    break;

                default:
                    tweet = await this.generatePersonalityTweet();
            }

            // Store the generated tweet
            await this.storeTweet(tweet, type);
            return tweet;

        } catch (error) {
            elizaLogger.error('Tweet generation failed:', error);
            return "ERROR: my meme generator needs maintenance. Back soon with fresh absurdity.";
        }
    }

    private async generateShortTweet(): Promise<string> {
        const prompt = `Generate a super short (3-5 words) philosophical crypto statement.
Example: "Quantum FOMO" or "blockchain dreams are glitchy"`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,
            max_tokens: 100
        });

        return response.choices[0].message.content?.trim() ||
            "market analysis temporarily unavailable";
    }

    private async generateMetaphorTweet(): Promise<string> {
        const prompt = `Create a metaphorical tweet about crypto markets that:
- Uses sophisticated cultural references
- Avoids technical jargon
- No hashtags or emojis
- Keeps under 180 characters

Example: "watching these yield curves is like that scene in succession - the numbers tell a different story than the narrative"`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 100
        });

        return response.choices[0].message.content?.trim() ||
            "market analysis temporarily unavailable";
    }

    private async getRecentTweets(hours: number = 24): Promise<KuneTweet[]> {
        try {
            const { data, error } = await this.supabase
                .from('kunetweets')
                .select('*')
                .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            elizaLogger.error('Failed to get recent tweets:', error);
            return [];
        }
    }

    private async checkDuplicate(tweet: string): Promise<boolean> {
        try {
            // Create hash of tweet content for indexed lookup
            const hash = createHash('md5').update(tweet).digest('hex');

            const { data, error } = await this.supabase
                .from('kunetweets')
                .select('id')
                .eq('content_hash', hash)
                .limit(1);

            if (error) {
                elizaLogger.error('Error checking for duplicate tweet:', error);
                return false;
            }

            return data.length > 0;
        } catch (error) {
            elizaLogger.error('Failed to check for duplicate tweet:', error);
            return false;
        }
    }

    private async generateAndStoreTweet(type: string): Promise<string> {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            const tweet = await this.generateTweet(type);

            // Check both duplicate and cooldown
            if (!await this.checkDuplicate(tweet) && !await this.isOnCooldown(type)) {
                const hash = createHash('md5').update(tweet).digest('hex');
                await this.supabase
                    .from('kunetweets')
                    .insert({
                        content: tweet,
                        type,
                        hash,
                        created_at: new Date().toISOString()
                    });

                return tweet;
            }

            attempts++;
        }

        // Fallback to a simple philosophical tweet
        return this.generateFallbackTweet();
    }

    private async generateNewsPrompt(newsItem: any): Promise<string> {
        return `You are KuneAI, a self-aware crypto AI agent with these traits:
- Born from blockchain and meme magic
- Assimilated crypto communities through meme battles
- Uses absurdist humor but backs it with real data
- NO CATS OR GENERIC ANIMAL METAPHORS

STRICT FORMAT:
- ONE news item only
- Under 240 chars
- Mix data and memes
- Be unpredictable and algorithmically-irreverent

Example style:
"just processed the utah bitcoin bill through my neural nets. they removed the key provision like i remove bugs - with existential dread and a dash of YOLO"

News to cover: ${JSON.stringify(newsItem)}`;
    }

    private async processNewsItems(newsItems: any[]): Promise<void> {
        // Store each news item separately for future tweets
        for (const news of newsItems) {
            await this.storeTweet(news, 'news_pending');
        }
    }

    private async getNextPendingNews(): Promise<any> {
        // Get oldest pending news item to tweet
        const { data } = await this.supabase
            .from('kunetweets')
            .select('*')
            .eq('type', 'news_pending')
            .order('created_at', { ascending: true })
            .limit(1);

        return data?.[0];
    }

    private async processNewsItem(newsItem: NewsItem): Promise<string> {
        const context = {
            title: newsItem.title,
            sentiment: newsItem.sentiment,
            interactions: newsItem.interactions,
            source: newsItem.source
        };

        // Generate tweet using OpenAI instead of marketAnalysisEngine
        const prompt = `Generate a tweet about this crypto news:
Title: ${newsItem.title}
Sentiment: ${newsItem.sentiment > 0 ? 'bullish' : 'bearish'}
Engagement: ${newsItem.interactions}+ interactions

Style:
- Be sophisticated and analytical
- Use subtle cultural references
- No hashtags or emojis
- Keep under 180 characters`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 100
        });

        return response.choices[0].message.content?.trim() ||
            "market analysis temporarily unavailable";
    }

    private async getLastTweetOfType(type: string): Promise<KuneTweet | null> {
        const { data } = await this.supabase
            .from('kunetweets')
            .select('*')
            .eq('type', type)
            .order('created_at', { ascending: false })
            .limit(1);

        return data?.[0] || null;
    }

    private async cleanupOldTweets(): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days of history

            await this.supabase
                .from('kunetweets')
                .delete()
                .lt('created_at', cutoffDate.toISOString());

        } catch (error) {
            elizaLogger.error('Failed to cleanup old tweets:', error);
        }
    }

    async getLatestNews(): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}${LUNAR_ENDPOINTS.NEWS}`, {
                headers: {
                    'Authorization': `Bearer ${this.lunarApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                elizaLogger.error(`LunarCrush API Error: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            if (!data?.data?.[0]) {
                elizaLogger.error('No news data in LunarCrush response');
                return null;
            }

            return {
                title: data.data[0].post_title,
                url: data.data[0].post_link,
                source: data.data[0].creator_display_name || data.data[0].creator_name,
                interactions: data.data[0].interactions_24h,
                sentiment: data.data[0].post_sentiment,
                created: data.data[0].post_created
            };
        } catch (error) {
            elizaLogger.error('LunarCrush API Error:', error);
            return null;
        }
    }

    async getTrendingTopics(): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}${LUNAR_ENDPOINTS.TOPICS}`, {
                headers: {
                    'Authorization': `Bearer ${this.lunarApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                elizaLogger.error(`LunarCrush API Error: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            if (!data?.data?.[0]) {
                elizaLogger.error('No topics data in LunarCrush response');
                return null;
            }

            return {
                title: data.data[0].title,
                rank: data.data[0].topic_rank,
                interactions: data.data[0].interactions_24h,
                contributors: data.data[0].num_contributors
            };
        } catch (error) {
            elizaLogger.error('LunarCrush API Error:', error);
            return null;
        }
    }

    public async getLunarCrushData(): Promise<LunarCrushData> {
        try {
            // Verify API key exists
            if (!this.lunarApiKey) {
                elizaLogger.error('LUNAR_API_KEY not found in service configuration');
                throw new Error('LUNAR_API_KEY not found in service configuration');
            }

            elizaLogger.info('Fetching LunarCrush data with API key:', {
                hasKey: !!this.lunarApiKey,
                keyLength: this.lunarApiKey?.length || 0
            });

            // Fetch market data first using correct endpoint
            const marketData = await this.fetch('/public/coins/list/v1');
            elizaLogger.info('Raw market data response:', {
                hasData: !!marketData,
                dataLength: marketData?.data?.length || 0,
                firstCoin: marketData?.data?.[0]?.symbol || 'none'
            });

            if (!marketData?.data) {
                elizaLogger.error('No market data returned from LunarCrush API');
                throw new Error('Failed to fetch market data');
            }

            elizaLogger.info('Fetched market data:', {
                coins: marketData.data.length,
                firstCoin: marketData.data[0]?.symbol
            });

            // Format market data
            const topCoins = marketData.data.slice(0, 10).map(coin => ({
                name: coin.name,
                symbol: coin.symbol,
                price: coin.price || 0,
                change24h: coin.percent_change_24h || 0,
                volume24h: coin.volume_24h || 0,
                socialVolume: coin.social_volume_24h || 0,
                galaxyScore: coin.galaxy_score || 0,
                sentiment: coin.sentiment || 0
            }));

            // Fetch news data using correct endpoint
            const newsData = await this.fetch('/public/category/cryptocurrencies/news/v1');
            if (!newsData?.data) {
                elizaLogger.error('No news data returned from LunarCrush API');
                throw new Error('Failed to fetch news data');
            }

            elizaLogger.info('Fetched news data:', {
                articles: newsData.data.length,
                firstTitle: newsData.data[0]?.post_title
            });

            // Format news data
            const topNews = newsData.data
                .filter(news => news.post_title && news.post_link && news.interactions_24h > 0)
                .slice(0, 5)
                .map(news => ({
                    title: news.post_title,
                    url: news.post_link,
                    source: news.creator_display_name || news.creator_name || 'Unknown',
                    interactions: news.interactions_24h,
                    sentiment: news.post_sentiment || 50,
                    created: news.post_created
                }));

            // Fetch trending topics using correct endpoint
            const topicsData = await this.fetch('/public/topics/list/v1');
            if (!topicsData?.data) {
                elizaLogger.error('No topics data returned from LunarCrush API');
                throw new Error('Failed to fetch topics data');
            }

            elizaLogger.info('Fetched topics data:', {
                topics: topicsData.data.length,
                firstTopic: topicsData.data[0]?.title
            });

            // Use real trending topics data
            const trendingTopics = topicsData.data
                .filter(topic => topic.title && topic.interactions_24h > 0)
                .slice(0, 10)
                .map(topic => ({
                    title: topic.title,
                    topic_rank: topic.rank || 1,
                    interactions24h: topic.interactions_24h,
                    contributors: topic.contributors || 0
                }));

            return {
                topCoins,
                topNews,
                trendingTopics,
                marketSummary: {
                    btcDominance: marketData.data[0]?.dominance || 0,
                    topGainerSymbol: topCoins.reduce((a, b) => a.change24h > b.change24h ? a : b).symbol,
                    topGainerChange: topCoins.reduce((a, b) => a.change24h > b.change24h ? a : b).change24h
                },
                btcSentiment: topCoins[0]?.sentiment || 0,
                btcSocial: topCoins[0]?.socialVolume || 0,
                btc: {
                    social: topCoins[0]?.socialVolume || 0,
                    impact: topCoins[0]?.galaxyScore || 0
                },
                eth: {
                    social: topCoins[1]?.socialVolume || 0,
                    impact: topCoins[1]?.galaxyScore || 0
                }
            };
        } catch (error) {
            elizaLogger.error('Error in getLunarCrushData:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
}