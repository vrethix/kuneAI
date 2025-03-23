import { Service, ServiceType, TokenInsightResponse } from "@elizaos/core";

// Core Data Interfaces
export interface CoinData {
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume24h: number;
    socialVolume: number;
    sentiment: number;
    galaxyScore: number;
}

export interface NewsData {
    title: string;
    url: string;
    source: string;
    interactions: number;
    sentiment: number;
    created: number;
}

export interface TopicData {
    title: string;
    topic_rank: number;
    interactions24h: number;
    contributors: number;
    galaxy_score?: number;
    sentiment?: number;
    social_score?: number;
    social_impact?: number;
    percent_change_24h?: number;
}

export interface MarketSummary {
    totalCoins: number;
    btcDominance: number;
    topGainerSymbol: string;
    topGainerChange: number;
}

// Strategy Interfaces
export interface TweetStrategy {
    name: string;
    weight: number;
    description: string;
    getData: (tokenService: TokenService) => Promise<TweetData>;
    generatePrompt: (data: TweetData) => string;
}

export interface TweetData {
    topCoins?: CoinData[];
    marketSummary?: MarketSummary;
    topNews?: NewsData[];
    trendingTopics?: TopicData[];
}

// Service Interfaces
export interface TokenService {
    fetchLunarCrush: (endpoint: string) => Promise<any>;
}

export type TweetType = 'personality' | 'news' | 'market' | 'topic';

export interface TweetResult {
    content: string;
    type: TweetType;
}

export interface ITokenAnalysisService extends Service {
    readonly serviceType: ServiceType;
    readonly openai: any;
    readonly supabase?: any;
    readonly lunarApiKey: string;
    readonly lastTweetType?: string;

    initialize(runtime: any): Promise<void>;
    fetch(endpoint: string): Promise<any>;
    getLunarCrushData(): Promise<LunarCrushData>;
    generateInsightData(symbol: string): Promise<TokenInsightResponse>;
    generateCoinsList(): Promise<string[]>;
    generateTopicInsight(): Promise<any>;
    generateNewsInsight(): Promise<any>;
    generateCategoryData(category: string): Promise<any>;
    validateTweet(tweet: string): Promise<boolean>;
    generateTweetContent(): Promise<TweetResult>;
}

// LunarCrush API Response Interfaces
export interface LunarCrushData {
    topCoins: any[];
    topNews: any[];
    trendingTopics: any[];
    marketSummary: {
        btcDominance: number;
        topGainerSymbol: string;
        topGainerChange: number;
    };
    btcSentiment: number;
    btcSocial: number;
    btc: { social: number; impact: number };
    eth: { social: number; impact: number };
}

export interface LunarCoinResponse {
    name: string;
    symbol: string;
    price: number;
    percent_change_24h: number;
    market_cap: number;
    volume_24h: number;
    social_volume_24h: number;
    sentiment: number;
    galaxy_score: number;
}

export interface LunarNewsResponse {
    post_title: string;
    post_link: string;
    creator_display_name: string;
    creator_name: string;
    interactions_24h: number;
    post_sentiment: number;
    post_created: number;
}

export interface LunarTopicResponse {
    title: string;
    topic_rank: number;
    interactions_24h: number;
    num_contributors: number;
}