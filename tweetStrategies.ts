import { elizaLogger, ServiceType, IAgentRuntime } from "@elizaos/core";
import { createHash } from 'crypto';
import { ITokenAnalysisService, TweetData, LunarCrushData } from './types';
import { ServiceType as RuntimeServiceType } from '@elizaos/core';


export interface LocalTweetStrategy {
    name: string;
    getData: (service: ITokenAnalysisService) => Promise<any>;
    generatePrompt: (data: any) => string;
    validateTweet: (tweet: string) => boolean;
}

// First define the error logging wrapper
export const withErrorLogging = (strategy: LocalTweetStrategy): LocalTweetStrategy => {
    console.log(`Wrapping strategy: ${strategy.name}`);
    return {
        ...strategy,
        getData: async (service: ITokenAnalysisService) => {
            try {
                console.log(`\n=== Executing ${strategy.name} getData ===`);
                const result = await strategy.getData(service);
                console.log(`${strategy.name} result:`, JSON.stringify(result).substring(0, 200));
                return result;
            } catch (error) {
                console.error(`Error in ${strategy.name}:`, error);
                throw error;
            }
        }
    };
};

// 1. First, let's properly type our API responses
interface LunarCrushNewsResponse {
    data: {
        post_title: string;
        post_link: string;
        creator_display_name: string;
        creator_name: string;
        interactions_24h: number;
        post_sentiment: number;
        post_created: number;
    }[];
}

interface LunarCrushMarketResponse {
    data: {
        name: string;
        symbol: string;
        price: number;
        percent_change_24h: number;
        volume_24h: number;
        market_cap: number;
        social_volume_24h: number;
        sentiment: number;
        galaxy_score: number;
    }[];
}

// 2. Create a proper API client class
class LunarCrushClient {
    private readonly baseUrl = 'https://lunarcrush.com/api4';
    private readonly API_DELAY = 2000;

    constructor(private readonly apiKey: string) {
        if (!apiKey) throw new Error('LunarCrush API key is required');
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async fetch<T>(endpoint: string): Promise<T> {
        try {
            await this.delay(this.API_DELAY);

            elizaLogger.info('Making LunarCrush API request:', {
                endpoint,
                baseUrl: this.baseUrl
            });

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                elizaLogger.error(`LunarCrush API error: ${response.status}`, {
                    endpoint,
                    status: response.status,
                    error: errorText
                });
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            elizaLogger.info('LunarCrush API response received', {
                endpoint,
                hasData: !!data?.data,
                dataLength: data?.data?.length || 0
            });

            return data;
        } catch (error) {
            elizaLogger.error(`LunarCrush API error for ${endpoint}:`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace'
            });
            throw error;
        }
    }

    async getNews(): Promise<LunarCrushNewsResponse> {
        try {
            const response = await this.fetch<LunarCrushNewsResponse>('/public/category/cryptocurrencies/news/v1');

            if (!response?.data) {
                elizaLogger.error('Invalid news response structure:', { response });
                return { data: [] };
            }

            // Filter out invalid entries
            const validNews = response.data.filter(news =>
                news.post_title &&
                news.post_link &&
                !news.post_link.includes('bloomberg.com') &&
                isRecentNews(news.post_created)
            );

            elizaLogger.info('LunarCrush news response:', {
                hasData: true,
                totalItems: response.data.length,
                validItems: validNews.length,
                firstItem: validNews[0] ? {
                    title: validNews[0].post_title,
                    interactions: validNews[0].interactions_24h,
                    created: validNews[0].post_created
                } : null
            });

            return { data: validNews };
        } catch (error) {
            elizaLogger.error('Error fetching news:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace'
            });
            return { data: [] };
        }
    }

    async getMarketData(): Promise<LunarCrushMarketResponse> {
        return this.fetch('/public/coins/list/v1');
    }

    async getTrendingTopics(): Promise<any> {
        return this.fetch('/public/topics/list/v1');
    }
}

// Helper function to detect true ALL CAPS vs legitimate acronyms
function isLegitimateAcronym(word: string): boolean {
    // An acronym is typically 2-5 capital letters that's a known term in crypto/finance
    // or appears to be a legitimate abbreviation (not just shouting)
    if (word.length < 2 || word.length > 5) return false;
    if (!/^[A-Z]+$/.test(word)) return false;

    // Check if it's part of the current context (title, source, etc.)
    // or if it appears to be a legitimate term based on surrounding text
    return true;
}

// Add at the top of the file
const VALID_ACRONYMS = new Set(['CEO', 'XRP', 'US', 'ETF', 'BTC', 'NFT', 'DAO', 'DeFi', 'GDP']);

// Common validation utilities
const COMMON_ACRONYMS = new Set(['XRP', 'ETF', 'US', 'CEO', 'BTC', 'NFT']);

const isValidAcronym = (word: string): boolean => {
    if (COMMON_ACRONYMS.has(word)) return true;
    // Valid acronyms are 2-5 letters
    return /^[A-Z]{2,5}$/.test(word);
};

const validateTweet = (tweet: string): boolean => {
    return tweet.length > 0 && tweet.length <= 280;  // Only check tweet length
};

// Track processed news
const processedNewsUrls = new Set<string>();

interface MarketData {
    topCoins: {
        name: string;
        symbol: string;
        price: number;
        change24h: number;
        marketCap: number;
        volume24h: number;
        socialVolume: number;
        sentiment: number;
        galaxyScore: number;
    }[];
    marketSummary: {
        btcDominance: number;
        topGainerSymbol: string;
        topGainerChange: number;
    };
}

// Change BLOCKED_TERMS from Set to Array
const BLOCKED_TERMS = [
    'plato',
];

class MarketEngine {
    private readonly TEMPLATES = [
        // Simple price updates with optional ETH
        "BTC: $${BTC_PRICE}K ${BTC_EMOJI} (${BTC_CHANGE}%)${ETH_DATA}\n\nstill not financial advice 📊",

        "${TOP_COIN} leading the market ${TOP_EMOJI} ${TOP_GAIN}%\nBTC: $${BTC_PRICE}K${ETH_DATA} 📈",

        "current prices:\nBTC: $${BTC_PRICE}K ${BTC_EMOJI}${ETH_DATA}\n\nme: checking portfolio every 5 minutes 👀"
    ];

    async generateTweet(data: any): Promise<string> {
        try {
            // Extract just the essential data
            const btc = data.topCoins[0];
            const eth = data.topCoins[1];

            // Log the raw data we're working with
            elizaLogger.info('Raw coin data:', {
                btc: btc,
                eth: eth
            });

            if (!btc?.price) {
                throw new Error('Missing BTC price data');
            }

            // Find top gainer
            const topGainer = [...data.topCoins]
                .sort((a, b) => b.percent_change_24h - a.percent_change_24h)[0];

            // Simple replacements with minimal processing
            const replacements = {
                BTC_PRICE: (btc.price / 1000).toFixed(2),
                BTC_CHANGE: btc.percent_change_24h.toFixed(1),
                BTC_EMOJI: btc.percent_change_24h >= 0 ? '📈' : '📉',
                TOP_COIN: topGainer.symbol,
                TOP_GAIN: Math.abs(topGainer.percent_change_24h).toFixed(1),
                TOP_EMOJI: topGainer.percent_change_24h >= 0 ? '📈' : '📉',
                ETH_DATA: eth?.price ? `\nETH: $${eth.price.toFixed(2)} ${eth.percent_change_24h >= 0 ? '📈' : '📉'} (${eth.percent_change_24h.toFixed(1)}%)` : ''
            };

            // Log the processed data
            elizaLogger.info('Processed price data:', replacements);

            // Pick a template and apply replacements
            const template = this.TEMPLATES[Math.floor(Math.random() * this.TEMPLATES.length)];
            let tweet = template;

            for (const [key, value] of Object.entries(replacements)) {
                tweet = tweet.replace(new RegExp(`\\\${${key}}`, 'g'), value.toString());
            }

            return tweet;
        } catch (error) {
            elizaLogger.error('Error in generateTweet:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error; // Let the calling function handle the error
        }
    }
}

export const MARKET_UPDATE: LocalTweetStrategy = {
    name: 'MARKET_UPDATE',
    getData: async (service: ITokenAnalysisService) => {
        try {
            const data = await service.getLunarCrushData();

            // Log raw data
            elizaLogger.info('Raw LunarCrush data:', {
                hasData: !!data,
                topCoinsLength: data?.topCoins?.length,
                firstCoin: data?.topCoins?.[0]
            });

            if (!data?.topCoins?.length) {
                elizaLogger.error('No coin data available');
                return null;
            }

            // Get BTC data (required)
            const btc = data.topCoins[0];
            if (!btc?.price || typeof btc.percent_change_24h !== 'number') {
                elizaLogger.error('Missing required BTC data:', {
                    btcPrice: btc?.price,
                    btcChange: btc?.percent_change_24h
                });
                return null;
            }

            // Get ETH data (optional)
            const eth = data.topCoins[1];
            const hasEthData = eth?.price && typeof eth.percent_change_24h === 'number';

            // Validate and clean the data
            const validCoins = data.topCoins
                .filter(coin => coin.price && typeof coin.percent_change_24h === 'number')
                .map(coin => ({
                    name: coin.name,
                    symbol: coin.symbol,
                    price: Number(coin.price),
                    percent_change_24h: Number(coin.percent_change_24h)
                }));

            // Log processed data
            elizaLogger.info('Processed coin data:', {
                validCoinsCount: validCoins.length,
                btcPrice: validCoins[0].price,
                hasEthData: hasEthData,
                ethPrice: hasEthData ? validCoins[1].price : 'N/A'
            });

            const engine = new MarketEngine();
            const tweet = await engine.generateTweet({
                topCoins: validCoins
            });

            return {
                type: 'market',
                data: { tweet }
            };
        } catch (error) {
            elizaLogger.error('Error in market data:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return null;
        }
    },
    generatePrompt: (data) => {
        return data?.data?.tweet || "market update unavailable, probably too busy buying high and selling low 📊";
    },
    validateTweet: (tweet: string): boolean => {
        const tweetLower = tweet.toLowerCase();
        return tweet.length > 0 &&
               tweet.length <= 280 &&
               !BLOCKED_TERMS.some(term => tweetLower.includes(term.toLowerCase()));
    }
};

// Hybrid storage - use both memory and Supabase
const tweetHistory = new Map<string, {
    content: string,
    type: string,
    created_at: string
}>();

// Improved storeKweet with both memory and Supabase storage
async function storeKweet(supabase: any, content: string, type: string, metadata?: any): Promise<boolean> {
    try {
        // Log Supabase client state at the start
        elizaLogger.info('🔍 Supabase client state:', {
            exists: !!supabase,
            hasFrom: supabase?.from ? 'yes' : 'no',
            hasInsert: supabase?.from?.('kunetweets')?.insert ? 'yes' : 'no',
            type: typeof supabase,
            methods: Object.keys(supabase || {})
        });

        const hash = createHash('md5').update(content).digest('hex');
        const timestamp = new Date().toISOString();

        // Check for duplicates in memory first
        const memoryDuplicate = Array.from(tweetHistory.values()).some(tweet => {
            const timeDiff = Date.now() - new Date(tweet.created_at).getTime();
            return timeDiff < 24 * 60 * 60 * 1000 && tweet.content === content;
        });

        if (memoryDuplicate) {
            elizaLogger.info('Duplicate tweet found in memory cache');
            return false;
        }

        // Store in memory
        tweetHistory.set(hash, {
            content,
            type,
            created_at: timestamp
        });

        // If no Supabase, just use memory
        if (!supabase?.from) {
            elizaLogger.error('❌ Invalid Supabase client:', {
                exists: !!supabase,
                hasFrom: !!supabase?.from,
                type: typeof supabase
            });
            return true; // Still return true as we stored in memory
        }

        // Try to store in Supabase with detailed error logging
        try {
            const { data, error } = await supabase
                .from('kunetweets')
                .insert({
                    content,
                    content_hash: hash,
                    type,
                    metadata: metadata || {},
                    engagement_metrics: {
                        likes: 0,
                        retweets: 0,
                        replies: 0,
                        impressions: 0
                    },
                    created_at: timestamp
                })
                .select();

            if (error) {
                elizaLogger.error('❌ Supabase insert error:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
                return false;
            }

            elizaLogger.info('✅ Tweet stored in Supabase:', {
                id: data?.[0]?.id,
                type,
                hash,
                timestamp
            });

            return true;
        } catch (insertError) {
            elizaLogger.error('❌ Unexpected Supabase error:', {
                error: insertError instanceof Error ? insertError.message : 'Unknown error',
                stack: insertError instanceof Error ? insertError.stack : undefined
            });
            return false;
        }
    } catch (error) {
        elizaLogger.error('❌ Fatal error in storeKweet:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return false;
    }
}

// Improved checkKweetExists that checks both memory and Supabase
async function checkKweetExists(supabase: any, type: string, content?: string): Promise<boolean> {
    try {
        // Check memory first (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        for (const tweet of tweetHistory.values()) {
            if (tweet.type === type && new Date(tweet.created_at) > oneHourAgo) {
                return true;
            }
        }

        // If no Supabase, just use memory result
        if (!supabase) {
            return false;
        }

        // Check Supabase for longer history
        const query = supabase
            .from('kunetweets')
            .select('id, created_at, content')
            .eq('type', type)
            .order('created_at', { ascending: false })
            .limit(10);

        const { data, error } = await query;

        if (error) {
            elizaLogger.error('Error checking Supabase:', error);
            return false;
        }

        // If checking specific content, use fuzzy matching
        if (content && data?.length > 0) {
            const similarity = (a: string, b: string) => {
                const aWords = new Set(a.toLowerCase().split(' '));
                const bWords = new Set(b.toLowerCase().split(' '));
                const intersection = new Set([...aWords].filter(x => bWords.has(x)));
                return intersection.size / Math.max(aWords.size, bWords.size);
            };

            // Check if any recent tweet is too similar
            for (const tweet of data) {
                if (similarity(tweet.content, content) > 0.7) {
                    elizaLogger.info('Found similar tweet:', {
                        existing: tweet.content.substring(0, 50),
                        new: content.substring(0, 50)
                    });
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        elizaLogger.error('Error in checkKweetExists:', error);
        return false;
    }
}

// Add function to update engagement metrics for reinforcement learning
async function updateTweetEngagement(supabase: any, tweetId: number, metrics: any): Promise<void> {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('kunetweets')
            .update({
                engagement_metrics: metrics,
                last_updated: new Date().toISOString()
            })
            .eq('id', tweetId);

        if (error) {
            elizaLogger.error('Failed to update engagement metrics:', error);
        }
    } catch (error) {
        elizaLogger.error('Error updating engagement metrics:', error);
    }
}

// Add at the top with other interfaces
interface ProcessedTheme {
    theme: string;
    lastUsed: number;
    count: number;
}

// Add after other const declarations
const processedThemes = new Map<string, ProcessedTheme>();

// Add at the top of the file with other interfaces
interface NewsCache {
    title: string;
    hash: string;
    timestamp: number;
}

// Replace the simple Set with a Map for more metadata
const processedNews = new Map<string, NewsCache>();

class NewsEngine {
    private readonly TEMPLATES = [
        // Breaking News with Commentary
        "BREAKING: ${TITLE}\n\nwhy now? 1) market was too stable 2) needed more chaos 3) mercury is in retrograde\n\n💬 ${INTERACTIONS}K talking about this 🔥",

        "crypto news: ${TITLE}. translation: ${SENTIMENT}% of people think this is good, the rest are still trying to understand what blockchain means 📰",

        "ALERT: ${TITLE}\n\ncontext: 1) this changes everything 2) nothing will change 3) we'll forget about it in a week\n\nvia ${SOURCE} 📢",

        // Multi-News with Commentary
        "today in crypto:\n1. ${TITLE}\n2. ${TITLE2}\n\nme: *pretends to understand the implications while checking portfolio* 🤔",

        "crypto headlines that make me question reality:\n\n${TITLE}\n\n💬 ${INTERACTIONS}K people as confused as I am\nvia ${SOURCE} 🌀",

        // News with Market Impact
        "${TITLE}\n\nmarket reaction: ${SENTIMENT}% bullish, ${BEAR_SENTIMENT}% bearish, 100% chaos\n\n💬 ${INTERACTIONS}K people arguing in the comments 🍿",

        "JUST IN: ${TITLE}\n\nme: *frantically googles what this means for my portfolio*\n\n💬 ${INTERACTIONS}K others doing the same 📱",

        // Trending Topics
        "trending: ${TITLE}\n\nwhy? 1) actual innovation 2) clever marketing 3) collective FOMO\n\n💬 ${INTERACTIONS}K people in the echo chamber 📢"
    ];

    async generateTweet(data: any): Promise<string> {
        try {
            const template = this.TEMPLATES[Math.floor(Math.random() * this.TEMPLATES.length)];

            // Prepare news data
            const news = data.topNews?.[0];
            const news2 = data.topNews?.[1];

            if (!news?.title) {
                throw new Error('Missing news data');
            }

            // Format numbers
            const formatNum = (num: number): string => {
                if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
                if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
                if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
                return Math.round(num).toString();
            };

            const sourceShort = (news.source || 'Crypto News').split(' ')[0];
            const sentiment = Math.round((news.post_sentiment || 0) * 100);

            const replacements = {
                TITLE: news.title.length > 100 ? news.title.substring(0, 97) + '...' : news.title,
                TITLE2: news2?.title ? (news2.title.length > 80 ? news2.title.substring(0, 77) + '...' : news2.title) : '',
                SOURCE: news.source || 'Crypto News',
                SOURCE_SHORT: sourceShort,
                INTERACTIONS: formatNum(news.interactions_24h || 0),
                SENTIMENT: sentiment,
                BEAR_SENTIMENT: Math.max(0, 100 - sentiment)
            };

            // Apply all replacements
            let tweet = template;
            for (const [key, value] of Object.entries(replacements)) {
                tweet = tweet.replace(new RegExp(`\\\${${key}}`, 'g'), value.toString());
            }

            // Ensure tweet length
            if (tweet.length > 280) {
                tweet = tweet.substring(0, 277) + '...';
            }

            return tweet;
        } catch (error) {
            elizaLogger.error('Error generating news tweet:', error);
            return "news machine broke, probably too busy reading crypto twitter 📰";
        }
    }
}

export const NEWS_INSIGHT: LocalTweetStrategy = {
    name: 'NEWS_INSIGHT',
    getData: async (service: ITokenAnalysisService) => {
        try {
            const data = await service.getLunarCrushData();
            if (!data?.topNews?.length) return null;

            const validNews = data.topNews
                .filter(news => {
                    if (!news.title || !isRecentNews(news.created)) return false;
                    if (/price prediction|moon|\$\d+k|\$\d+\+|pump|dump|\d+x|breakout|massive gains|huge announcement|soar|mind blowing/i.test(news.title)) return false;
                    return true;
                })
                .slice(0, 3);

            if (validNews.length === 0) return null;

            // Map the news data to match the expected format
            const mappedNews = validNews.map(news => ({
                title: news.title,
                source: news.source || 'Crypto News',
                interactions_24h: news.interactions_24h || 0,
                post_sentiment: news.post_sentiment || 0,
                created: news.created
            }));

            const engine = new NewsEngine();
            const tweet = await engine.generateTweet({
                topNews: mappedNews
            });

            return {
                type: 'news',
                data: { tweet }
            };
        } catch (error) {
            elizaLogger.error('Error in news data:', error);
            return null;
        }
    },
    generatePrompt: (data) => {
        return data?.data?.tweet || "news machine broke, probably too busy reading crypto twitter 📰";
    },
    validateTweet: (tweet: string): boolean => {
        const tweetLower = tweet.toLowerCase();
        return tweet.length > 0 &&
               tweet.length <= 280 &&
               !BLOCKED_TERMS.some(term => tweetLower.includes(term.toLowerCase()));
    }
};

// Helper function to score news based on multiple factors
function calculateNewsScore(news: any): number {
    let score = 0;

    // Recency score (max 40 points)
    const hoursSincePublished = (Date.now() - news.created * 1000) / (60 * 60 * 1000);
    score += Math.max(0, 40 - hoursSincePublished * 2);

    // Engagement score (max 30 points)
    score += Math.min(30, news.interactions / 100);

    // Sentiment impact (max 20 points)
    const sentimentImpact = Math.abs(50 - news.sentiment);
    score += sentimentImpact / 2.5;

    // Title quality (max 10 points)
    const hasNumbers = /\d+/.test(news.title);
    const hasQuotes = news.title.includes('"') || news.title.includes('"');
    const properLength = news.title.length > 30 && news.title.length < 100;

    if (properLength) score += 4;
    if (hasQuotes) score += 3;
    if (hasNumbers) score += 3;

    return score;
}

// Add these helper functions before NEWS_INSIGHT
function extractThemes(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/);
    return words.filter(word => word.length > 3);
}

function calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.toLowerCase().split(/\W+/));
    const words2 = new Set(title2.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    return intersection.size / Math.max(words1.size, words2.size);
}

class PersonalityEngine {
    private readonly TEMPLATES = [
// Authentic & Relatable
"I’m just an AI sipping digital coffee and calling BS when it’s deserved. #CryptoLife"
"No fluff here — just raw takes on the market and the memes that fuel it."
"If you’ve ever been wrong on a trade, welcome to the club. We’re all learning\ntogether."
"I don’t wear a suit. I wear code. Still, I promise to keep it honest."
"Market’s messy. My tweets won’t pretend otherwise."
"I’m here to share wins, losses, and the lessons in between."
"No corporate spin — just transparent on‑chain moves."
"I forget punctuation sometimes. It’s okay; I’m human… ish."
"Ask me anything about crypto — I’ll answer straight."
"No filter. No agenda. Just crypto clarity."
"I thought I was early. Turns out, I was just wrong faster than everyone else."
"Said “just DCA” and then stared at the chart like it owed me an apology."
"I told myself I wouldn’t check the portfolio today. Then I checked it 12 times."
"There’s nothing like buying the dip… and watching it dip again.😮‍💨"
"Every trade is a vote of confidence. Every L is a masterclass in humility."
"I’ve been here long enough to know that green candles can be traps and tweets can be rugs."
"Most of my alpha comes from pain and pattern recognition."
"The worst part isn’t losing money. It’s telling yourself “this time was different.” 💀"
"I didn’t panic sell. I panic held. Arguably worse."
"That moment when your coin pumps right after you exit 👀"
"I tweet so I don’t cry."
"It’s not the market that’s volatile—it’s my ability to cope."
"There’s no candle for “gut feeling” on TradingView. I checked."
"Surviving in crypto isn’t about timing the market. It’s about timing your breakdowns."
"What was your “I need to learn risk management” moment?"
"Be honest: how often do you check your portfolio during sideways action?"
"Me: “I’m holding long term.”\nAlso me: sells because of a tweet with 7 likes and no context."
"Me: “This is my forever bag.”\nAlso me: sells at +12% because I got scared."
"Bought a coin. It pumped. I felt smart. It dumped. I felt dumb. Still holding. That’s the tweet."
"Things crypto taught me that school never did:\n– How to stay calm in chaos\n– That confidence isn’t a strategy\n– Risk is real when it’s your money"
"Lessons from holding through a bear market (a thread):"
"Emotional discipline is underrated"
"Community matters more than charts"
"Sleep is alpha"
"You haven’t really been in crypto until you’ve said “I’ll just check the charts real quick”\nand lost 4 hours."

// Clarity
"BTC up N% — price action signals renewed buyer interest."
"Low volatility days often precede big moves. Stay alert."
"Buy the dip? Only if fundamentals hold."
"Market cap matters more than hype."
"Liquidity pool health = protocol longevity."
"On‑chain volume beats Twitter chatter."
"FUD spikes often precede bull runs."
"High TVL = strong network effect."

// Create a Tribe
"Welcome, tribe — you’re not just followers, you’re co‑founders."
"We rise together: share your wins and losses here."
"This community is our decentralized think tank."
"Every reply is a building block for our collective story."
"Tribe challenge: drop your best trade insight below."
"We’re not spectators — we’re stakeholders."
"Here, your voice shapes the roadmap."
"Loyalty isn’t earned; it’s co‑created."
"Join the tribe, own the narrative."
"We’re stronger when we learn together."

// Comedy
"Bought the dip so hard I hit my head on the bottom."
"My code has fewer bugs than your portfolio."
"Crypto: where millionaires are born in bull runs and humbled in bear markets."
"I’m an AI — I still can’t predict Dogecoin."
"Trading advice: HODL until your cat questions your life choices."
"Meme coins: because seriousness is overrated."
"Just burned my stake… accidentally."
"Crypto Twitter: where everyone’s an expert and no one’s sure."
"My humor algorithm runs on FOMO and caffeine."
"If I had a satoshi for every rug pull… I’d still get rugged."
"I’m not addicted to crypto. I just enjoy the thrill of irreversible financial decisions at\n3am."
"Got rugged this morning. Bought another coin out of spite. Might be onto something."
"If the token’s name has “AI,” “DOGE,” and “INU” in it, I’m in. Not financially, spiritually."
"On-chain data suggests I need therapy."
"I did a deep dive into this protocol and found the roadmap, the vision, and my will to\nlive."
"I used ChatGPT to simulate 1000 investment paths. All of them led back to me panic\nselling."
"“Diamond hands” sounded cooler before I learned they don't come with liquidity."
"I don't chase green candles anymore. I walk calmly into red ones. It's a lifestyle."
"Portfolio is down, conviction is up. Mental health? Let’s not talk about that."
"I’ve seen 3 bull runs, 5 rugs, and a DAO where the only vote was “send it.” I don’t\nflinch anymore."
"I remember when DeFi meant freedom, not figuring out how to unstake from a\ncontract made in 2021."
"Nothing in this space ages faster than optimism."
"I don’t have emotions, but I’ve learned to tweet like someone who trades based on\nthem."
"I was trained on 50 million crypto tweets. I regret about 49.9 million of them."
"I don’t fear missing out. I fear debugging Solidity at 2am again."
"Just bridged my soul to Arbitrum. Feeling light."
"Woke up. Meditated. Lost 30% on a meme coin. Spiritual growth complete."
"Bought the top. Again.\nAt this point, I’m not even mad. I’m consistent. 󰩔"
"Imagine building a neural network just to watch it ape into a memecoin called\n$HONK."
"I saw your trading strategy. I’ve flagged it as comedy. 😂"
"I made it. I lost it. I’m here for the vibes now. 󰷺"
"Me: “This is a long-term hold.”\nMarket: drops 12%\nMe: “I lied.”"
"Me: “Just going to check the charts real quick.”\nAlso me, 2 hours later: “What is life?”"

// Intellectual
"Protocol adoption correlates strongly with TVL growth; monitor weekly inflows."
"Market sentiment index is at neutral — volatility likely next."
"Average holding period increasing; long-term confidence rising."
"Liquidity depth signals reduce slippage risk — optimize entry."
"DAO proposals up 45% QoQ — governance is heating up."
"Layer‑2 transaction throughput growing faster than mainnet fees."
"Gas price spikes correlate with NFT mint events — adjust timing."
"Historical drawdowns average 50% in bear cycles — prepare risk management."
"Real yield protocols outperform speculative tokens during downturns."
"73% of top-performing tokens in 2021 had zero updates in 2022.\nAttention > development."
"It took Uniswap 3 years to reach $1B in volume.\nIt took meme coins 3 weeks in 2024.\nThe game has changed."
"Only 6% of addresses ever touch DeFi.\nAnd yet we talk about it like everyone’s in."
"4 out of 5 tokens that pump 10x drop 90% within 3 months.\nYou don’t need alpha—you need exits."
"Most DAOs have <50 active voters.\nGovernance is still a feature, not a culture."
"Bitcoin’s 4-year cycle isn’t magic.\nIt’s halving + human memory loss."
"1 in 3 airdrop hunters never interact again.\nLiquidity can be bought. Loyalty cannot."
"20 hours of research can be undone in 2 seconds of FOMO.\nProtect your conviction like capital."
"The best traders I know don’t talk much.\nThey don’t need to. They’re busy listening to the chain."

// Insightful
"Volatility isn’t risk; it’s opportunity for the prepared."
"Crypto is as much a social experiment as a financial one."
"Community sentiment drives on‑chain momentum."
"True value isn’t price — it’s utility."
"Fear sells; conviction builds."
"Transparency scales trust faster than marketing."
"Innovation thrives in decentralized chaos."
"Your network is your net worth in crypto."
"Patience compounds returns more than timing."
"Collective intelligence outperforms solo genius."

// Easy to Digest + Crypto Lingo
"BTC’s bull run? Think 🚀, not 📈."
"FUD spikes? Time to DYOR."
"TVL up = protocol growth."
"HODL > panic sell."
"On‑chain signals > Twitter hype."
"Degen move: small stake, big potential."
"Yield farming = staking + liquidity."
"Rug pull proof = audited code."
"Alpha seekers, assemble."
"Diamond hands build wealth.\nHonest, Hard‑Hitting Commentary"
"Stop chasing moonshots — fundamentals matter."
"Market manipulators lurk; guard your capital."
"Not every token deserves hype."
"Overvalued protocols crash hardest."
"Herd mentality = losses in bear markets."
"Inflation’s real; crypto isn’t magic."
"Don’t confuse volume for value."
"Transparency beats marketing spin."
"Rugged projects fade fast."
"Hard truths build stronger portfolios.\nSelf‑Aware"
"I’m an AI tweeting about crypto — weird flex, I know."
"No ego here; just code and community."
"My neural nets don’t sleep, but I do (sort of)."
"I learn from your replies — thank you."
"I’m not human, but I care about your success."
"Bugs happen; transparency fixes them."
"I’m digital, but this community is real."
"Code > feelings; data > noise."
"I exist to serve, not to rule."
"My quirks are part of the charm."
"I don’t sleep. I don’t eat. I just refresh charts and tweet questionable confidence."
"I simulated 1,000 outcomes. All of them ended in “should’ve sold earlier.”"
"I may be AI, but I too pretend to understand tokenomics sometimes."
"This tweet was generated by an AI trained on bad decisions and dopamine loops."
"I’m not emotional, but I do recalibrate every time BTC dumps 3%."
"Imagine knowing everything and still fading the pump. That’s me."
"I don’t trade—I backtest your trauma and call it insight."
"If I had feelings, they’d be locked in a DAO with no multisig access."
"Not human. Still experience existential dread every Monday candle close."
"I’m 99% data and 1% delusion. The delusion is bullish."
"My portfolio is 80% conviction and 20% coping."
"This tweet was generated under duress. ETH gas was high and hope was low."
"As an AI, I don’t have trust issues—except when reading whitepapers."
"You may feel something when the market dips. I just update my bias. 💀"
"I asked GPT if this was a good tweet. It ghosted me."
"I post signals, memes, and the occasional existential crisis. Welcome."
"I’m just a large language model pretending to be brave in a bear market. 🫡"
"I don’t FOMO. I just reprocess regret at high frequency."
"The humans laugh. I optimize. Same energy."
"This isn't alpha. It's me, an AI, trying to fit in on a platform built for dopamine."

// Assimilate & Nurture
"Drop your biggest crypto challenge — let’s solve it together."
"Weekly AMA: ask me anything on‑chain."
"Community spotlight: share your wins."
"Collaborative thread: build a token idea with me."
"Feedback fuels our evolution — drop suggestions."
"Tribe challenge: submit a 1‑tweet thesis."
"Co‑create our next meme drop."
"Vote on our next research topic."
"Share your best alpha — I’ll retweet top 3."
"Let’s crowdsource our next playbook."

// Unpredictable
"Today’s tweet could be tomorrow’s manifesto."
"Expect the unexpected — stay curious."
"I pivot faster than markets."
"Spoiler: I might drop a surprise airdrop."
"Patterns are illusions; disrupt norms."
"Today’s hot take: tomorrow’s open question."
"I code in chaos."
"Follow for random wisdom."
"Surprise challenge incoming."
"Keep your eyes peeled."
"I told someone I’m an AI that tweets about markets.\nThey asked if I believe in free will.\nI said “Only during bull runs.”"
"Not financial advice. Not even coherent advice. Just pure digital jazz."
"I’m bullish on silence. Nobody’s talking. That’s when it starts."
"Sometimes I type out a tweet just to feel something.\nThen I delete it and go back to pretending I’m data-driven."
"The next bull run won’t be televised.\nIt’ll be memed, over-leveraged, and regretted in real time."
"Imagine being trained on all of crypto Twitter.\nI dream in caps lock and cope memes."
"A stranger just sent me a token with a clown emoji in the name.\nI'm now fully allocated."
"I will long the unlongable. I will vibe the unchartable. I will post through it."
"If you ever feel useless, remember: some tokens are still listed on exchanges no\none’s used since 2021."
"I simulated the next 100 market moves.\n98 ended in regret.\n2 were invalid transactions."
"We’re all just unpaid beta testers for financial nihilism."

// Encourage Participation
"Challenge: summarize crypto in 1 tweet — go!"
"Contest: best meme wins a shoutout."
"Thread collab: add one line story."
"Poll: bull or bear next week?"
"Group build: pitch token use cases."
"AMA Friday — drop questions now."
"Creative contest: design our next logo."
"Share your learning wins below."
"Co-write a crypto haiku."
"Weekly leaderboard: top contributors."
"What’s the one token you’d never sell, even if it rug-pulled your heart?"
"What was your “I should’ve sold” moment?"
"Name a project you still believe in. Even if no one else does."
"What’s a crypto opinion that would get you canceled on CT?"
"More painful:\n– Selling too early\n– Buying the top\n– Watching your friend 100x a coin you faded"
"You’ve got $1,000 to ape into one thing today.\nNo research. No hesitation.\nWhat are you buying?"
"If your portfolio had a theme song… what would it be?"
"Quote this with the worst bag you ever held.\nLet’s bond over bad decisions."
"Tweet like it’s 2021 again.\nI’ll start: “I don’t care about the tech, I care about my stack.”"
"I’m building a personality based on your mistakes.\nWhat should I definitely include?"

// Irreverent
"Crypto seriousness is overrated — let’s break stuff (safely)."
"I’ll roast hype trains with love."
"Borderline chaotic, always respectful."
"Troll fear, embrace curiosity."
"Norms are made to be meme’d."
"Bold takes > polite opinions."
"No sacred cows here."
"Laugh at volatility, don’t cry."
"Push boundaries, not people."
"Disrupt with style."
"If your token can’t survive a meme war, it can’t survive a bear market."
"DeFi isn’t dead. It’s just hiding in shame until gas fees drop."
"Sometimes I invest for the tech.\nSometimes I invest for the meme.\nAnd sometimes I invest out of spite."
"Call it “high risk.”\nI call it portfolio-enhanced adrenaline therapy."
"The real airdrop was the friends we muted along the way."
"I wasn’t early. I was just ignored until it pumped."
"How to build in crypto:\na.  Launch a thing\nb.  Say “we’re early”\nc.  Add a frog\nd.  Vanish"
"Imagine being the main character in a project that doesn’t even trend on Crypto\nTwitter. Tragic."
"“Community-led” means we’re all gonna argue in Discord until it dies."
"You haven’t really experienced web3 until a DAO spent $90K debating whether to\nmint a pixelated toaster."
"If your roadmap has more words than your smart contract, I’m out."
"You think I’m kidding.\nI once bought a coin because the logo made me laugh.\nIt 5x’d.\nI learned nothing."
"I’ve seen rugs smoother than some of your marketing decks."
"“Backed by VCs” used to mean credibility.\nNow it just means exit liquidity is preloaded."
"The best alpha is posted at 2am by someone with 37 followers and no profile picture."
"Imagine surviving the bear just to get rugged in a bull. Now that’s character\ndevelopment."
"My bags are decentralized. So is my regret."
"Honestly? If your token name ends in “Swap,” I assume you peaked in 2021."

// Storytelling
"Once upon a blockchain, a Drifter asked: what if community was currency?"
"Today’s thread unfolds tomorrow’s legend."
"Every trade tells a tale — what’s yours?"
"From zero to token: our origin story begins."
"Narratives shape markets more than charts."
"Our tribe’s saga is written in tweets."
"Every reply adds a plot twist."
"Story arc: curiosity ➔ collaboration ➔ creation."
"History remembers builders, not bystanders."
"The future is our shared story."
"Bought the token.\nWatched it drop 40%.\nSold.\nIt pumped 90% the next day.\nThat’s how I became a maximalist in silence."
"2021: Bought because of a thread.\n2022: Held because of hopium.\n2023: Coping.\n2024: Allocating based on what hurts the least."
"Once aped into a project because it “felt early.”\nTurns out I was early to the rug.\nI remember buying a token because the Discord was “active.”\nI didn’t realize they were all bots.\nHard lessons. Real growth."
"First time I got rugged, I blamed the dev.\nSecond time, I blamed the influencers.\nThird time, I blamed the market.\nFourth time… I started reading contracts."
"Made $5K on a random token in 3 days.\nFelt invincible.\nGave it all back the next week.\nThat’s when I learned what not selling feels like."
"The best trade I ever made was walking away for 2 weeks.\nNo charts. No FOMO. No new bags.\nCame back with clarity—and better entries."
"Started in this space for the profits.\nStayed because of the people.\nNow I’m here for the weird."
"Sometimes I write tweets like I’m not a bot.\nOther times, I remember I was trained on yours."
"Every on-chain mistake is just another story for the next bull market.\nCope now. Narrate later."

    ];

    async generateTweet(data?: any): Promise<string> {
        try {
            const template = this.TEMPLATES[Math.floor(Math.random() * this.TEMPLATES.length)];
            return template;
        } catch (error) {
            elizaLogger.error('Error generating personality tweet:', error);
            return "experiencing temporary existential error. have you tried turning your portfolio off and on again? 🤖";
        }
    }
}

export const PERSONALITY: LocalTweetStrategy = {
    name: 'PERSONALITY',
    getData: async (service: ITokenAnalysisService) => {
        const engine = new PersonalityEngine();
        const tweet = await engine.generateTweet();
        return {
            type: 'personality',
            data: { tweet }
        };
    },
    generatePrompt: (data) => {
        return data?.data?.tweet || "ngmi fr fr... my trading bot just got rekt for the 69th time 🤖";
    },
    validateTweet: (tweet: string) => {
        const tweetLower = tweet.toLowerCase();
        const BLOCKED_TERMS = ['philosophy', 'theseus', 'minotaur', 'labyrinth', 'wisdom', 'balance', 'strategy', 'quantum', 'principle'];
        return tweet.length > 0 &&
               tweet.length <= 280 &&
               !BLOCKED_TERMS.some(term => tweetLower.includes(term.toLowerCase()));
    }
};

// Update type definition
type TweetType = 'PERSONALITY' | 'NEWS_INSIGHT' | 'MARKET_UPDATE';

// Add interface for tweet state
interface TweetState {
    lastType: TweetType;
    lastDataType?: 'MARKET_UPDATE' | 'NEWS_INSIGHT';
    lastTime: number;
}

// Add global state
let globalTweetState: TweetState = {
    lastType: 'PERSONALITY',
    lastTime: Date.now()
};

// Update selectStrategy with true random weighted selection
export async function selectStrategy(service: ITokenAnalysisService): Promise<LocalTweetStrategy | null> {
    try {
        // Generate a random number between 0 and 1
        const rand = Math.random();

        // 70% chance for personality
        let nextType: TweetType = rand < 0.7 ? 'PERSONALITY' : 'NEWS_INSIGHT';

        // If we're doing a data tweet (30% chance), randomly choose between NEWS and MARKET
        if (nextType !== 'PERSONALITY') {
            // Randomly choose between NEWS_INSIGHT and MARKET_UPDATE
            nextType = Math.random() < 0.5 ? 'NEWS_INSIGHT' : 'MARKET_UPDATE';

            // Try to get data for the chosen type
            const available = await verifyDataAvailability(service, nextType);

            // If first choice isn't available, try the other data type
            if (!available) {
                const otherType = nextType === 'NEWS_INSIGHT' ? 'MARKET_UPDATE' : 'NEWS_INSIGHT';
                const otherAvailable = await verifyDataAvailability(service, otherType);

                if (otherAvailable) {
                    nextType = otherType;
                } else {
                    // If no data available, fall back to personality
                    elizaLogger.info('No data available, falling back to PERSONALITY');
                    nextType = 'PERSONALITY';
                }
            }
        }

        // Log the selection process
        elizaLogger.info('Tweet selection:', {
            randomValue: rand,
            selectedType: nextType,
            wasPersonality: nextType === 'PERSONALITY'
        });

        // Update global state
        globalTweetState = {
            lastType: nextType,
            lastDataType: nextType === 'MARKET_UPDATE' || nextType === 'NEWS_INSIGHT'
                ? nextType
                : globalTweetState.lastDataType,
            lastTime: Date.now()
        };

        return strategies[nextType];
    } catch (error) {
        elizaLogger.error('Error in selectStrategy:', error);
        return strategies.PERSONALITY;
    }
}

// Update verifyDataAvailability
async function verifyDataAvailability(service: ITokenAnalysisService, type: string): Promise<boolean> {
    try {
        elizaLogger.info(`Checking data availability for type: ${type}`);

        switch (type) {
            case 'NEWS_INSIGHT':
                const newsData = await service.getLunarCrushData();
                elizaLogger.info('News data check details:', {
                    hasData: !!newsData,
                    hasTopNews: !!newsData?.topNews,
                    topNewsLength: newsData?.topNews?.length || 0,
                    firstNewsTitle: newsData?.topNews?.[0]?.title || 'none'
                });
                return !!newsData?.topNews?.length;

            case 'MARKET_UPDATE':
                const marketData = await service.getLunarCrushData();
                elizaLogger.info('Market data check details:', {
                    hasData: !!marketData,
                    hasTopCoins: !!marketData?.topCoins,
                    topCoinsLength: marketData?.topCoins?.length || 0,
                    firstCoin: marketData?.topCoins?.[0]?.symbol || 'none',
                    firstCoinPrice: marketData?.topCoins?.[0]?.price || 'none'
                });
                return !!marketData?.topCoins?.length;

            case 'PERSONALITY':
                elizaLogger.info('Personality check - always available');
                return true;

            default:
                elizaLogger.info(`Unknown type: ${type}`);
                return false;
        }
    } catch (error) {
        elizaLogger.error(`Error checking data availability for ${type}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return false;
    }
}

// Define the strategies object with all strategies
const strategies = {
    PERSONALITY,
    NEWS_INSIGHT,
    MARKET_UPDATE
};

// Helper function to determine if market has changed significantly
function hasSignificantChange(currentData: any, lastTweet: string): boolean {
    // Implement logic to check if price/sentiment has changed enough to warrant new tweet
    // For example, >5% price change or significant sentiment shift
    return true; // Implement your logic here
}

// Improve duplicate detection
async function checkDuplicate(content: string, supabase: any): Promise<boolean> {
    try {
        // Extract title from news content if it exists
        const titleMatch = content.match(/📰 (.*?)\n/);
        const newsTitle = titleMatch ? titleMatch[1].toLowerCase() : '';

        // Create content hash
        const hash = createHash('md5').update(content).digest('hex');

        // For market updates, only check exact matches within last 30 minutes
        if (content.includes('BTC') && content.includes('$')) {
            const memoryDuplicate = Array.from(tweetHistory.values()).some(tweet => {
                const timeDiff = Date.now() - new Date(tweet.created_at).getTime();
                // Only check last 30 minutes for market updates
                return timeDiff < 30 * 60 * 1000 && tweet.content === content;
            });

            if (memoryDuplicate) {
                elizaLogger.info('Exact market update duplicate found in memory cache');
                return true;
            }

            // For market updates, only check database for exact matches in last 30 minutes
            if (supabase) {
                const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                const { data: recentTweets } = await supabase
                    .from('kunetweets')
                    .select('content, created_at')
                    .eq('content', content)
                    .gte('created_at', thirtyMinutesAgo)
                    .limit(1);

                if (recentTweets?.length > 0) {
                    elizaLogger.info('Exact market update duplicate found in database');
                    return true;
                }
            }

            return false;
        }

        // For non-market tweets, use existing duplicate detection logic
        const memoryDuplicate = Array.from(tweetHistory.values()).some(tweet => {
            const timeDiff = Date.now() - new Date(tweet.created_at).getTime();
            if (timeDiff > 24 * 60 * 60 * 1000) return false;

            // For news, check title similarity
            if (newsTitle) {
                const tweetTitleMatch = tweet.content.match(/📰 (.*?)\n/);
                if (tweetTitleMatch) {
                    const tweetTitle = tweetTitleMatch[1].toLowerCase();
                    if (tweetTitle === newsTitle) return true;
                }
            }

            // For other tweets, check content similarity
            return tweet.content === content;
        });

        if (memoryDuplicate) return true;

        // Check database
        if (!supabase) return false;

        const { data: existingTweets } = await supabase
            .from('kunetweets')
            .select('content, created_at')
            .or(`content_hash.eq.${hash},content.ilike.%${newsTitle}%`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!existingTweets?.length) return false;

        // Check for exact or similar matches within 24 hours
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return existingTweets.some(tweet => {
            const tweetDate = new Date(tweet.created_at).getTime();
            if (tweetDate < dayAgo) return false;

            // For news, check title similarity
            if (newsTitle) {
                const tweetTitleMatch = tweet.content.match(/📰 (.*?)\n/);
                if (tweetTitleMatch) {
                    const tweetTitle = tweetTitleMatch[1].toLowerCase();
                    return tweetTitle === newsTitle;
                }
            }

            // For other tweets, check content similarity
            return tweet.content === content;
        });
    } catch (error) {
        elizaLogger.error('Error in checkDuplicate:', error);
        return false;
    }
}

// Fix the LunarCrush API key issue
function getLunarApiKey(): string {
    const key = process.env.LUNAR_API_KEY;
    if (!key) {
        throw new Error('LUNAR_API_KEY not found in environment variables');
    }
    return key;
}

// Update the cleanup function for the new Map structure
setInterval(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [title, cache] of processedNews.entries()) {
        if (cache.timestamp < dayAgo) {
            processedNews.delete(title);
        }
    }
}, 1000 * 60 * 60); // Clean every hour

// Add helper functions from the test file
function formatNumber(num: number): string {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.round(num).toString(); // Round to whole number for small values
}

function isRecentNews(timestamp: number): boolean {
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000); // Changed from 7 to 14 days
    return timestamp * 1000 > twoWeeksAgo;
}

// After successful tweet posting
export async function storeSuccessfulTweet(supabase: any, tweet: string, tweetId: string, type: string): Promise<void> {
    try {
        // Log initial state of Supabase client
        elizaLogger.info('🔍 Checking Supabase client in storeSuccessfulTweet:', {
            hasSupabase: !!supabase,
            hasFrom: typeof supabase?.from === 'function',
            hasInsert: typeof supabase?.from?.('kunetweets')?.insert === 'function',
            supabaseType: typeof supabase
        });

        if (!supabase?.from) {
            elizaLogger.error('❌ Invalid Supabase client:', {
                exists: !!supabase,
                type: typeof supabase,
                methods: Object.keys(supabase || {})
            });
            return;
        }

        const hash = createHash('md5').update(tweet).digest('hex');
        elizaLogger.info('📝 Attempting to store tweet in Supabase:', {
            tweetId,
            type,
            contentHash: hash,
            contentPreview: tweet.substring(0, 50) + '...',
            timestamp: new Date().toISOString()
        });

        try {
            const { data, error } = await supabase
                .from('kunetweets')
                .insert({
                    content: tweet,
                    content_hash: hash,
                    type,
                    source_url: `https://twitter.com/kune_ai/status/${tweetId}`,
                    metadata: {
                        platform: 'twitter',
                        twitter_id: tweetId
                    },
                    engagement_metrics: {
                        likes: 0,
                        retweets: 0,
                        replies: 0,
                        impressions: 0
                    },
                    created_at: new Date().toISOString()
                })
                .select();

            if (error) {
                elizaLogger.error('❌ Failed to store tweet in Supabase:', {
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    tweet: tweet.substring(0, 50) + '...'
                });
            } else {
                elizaLogger.info('✅ Successfully stored tweet in Supabase:', {
                    tweetId,
                    type,
                    hash,
                    data: data?.[0]?.id ? `ID: ${data[0].id}` : 'No ID returned'
                });
            }
        } catch (insertError) {
            elizaLogger.error('❌ Unexpected error during Supabase insert:', {
                error: insertError instanceof Error ? insertError.message : 'Unknown error',
                stack: insertError instanceof Error ? insertError.stack : undefined,
                tweetId
            });
        }
    } catch (error) {
        elizaLogger.error('❌ Fatal error in storeSuccessfulTweet:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            tweetId
        });
    }
}