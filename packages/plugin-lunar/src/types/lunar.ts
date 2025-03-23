// Common types
export interface TimeRange {
    hours?: number;
    days?: number;
    weeks?: number;
}

export interface Pagination {
    limit?: number;
    offset?: number;
}

// Asset Metrics Types
export interface AssetMetrics {
    id: number;
    symbol: string;
    name: string;
    price: number;
    price_btc: number;
    market_cap: number;
    percent_change_24h: number;
    volume_24h: number;
    alt_rank: number;
    galaxy_score: number;
    volatility: number;
    social_volume: number;
    social_score: number;
    social_impact_score: number;
    correlation_rank: number;
    galaxy_score_rank: number;
}

// Social Metrics Types
export interface SocialMetrics {
    symbol: string;
    name: string;
    total_social_volume: number;
    average_sentiment: number;
    social_score: number;
    social_contributors: number;
    social_engagement: number;
    social_mentions: number;
    twitter_followers: number;
    twitter_following: number;
    reddit_subscribers: number;
    reddit_active_users: number;
    social_dominance: number;
}

// Influence Metrics Types
export interface Influencer {
    id: string;
    name: string;
    handle: string;
    platform: string;
    followers: number;
    engagement_rate: number;
    influence_score: number;
}

export interface AssetInfluence {
    symbol: string;
    influencers: Influencer[];
    total_influencers: number;
    average_influence_score: number;
    total_reach: number;
}

// Market Data Types
export interface MarketData {
    total_market_cap: number;
    total_volume_24h: number;
    btc_dominance: number;
    defi_volume_24h: number;
    stable_volume_24h: number;
    total_social_volume: number;
    average_sentiment: number;
    fear_and_greed_value: number;
    fear_and_greed_description: string;
}

// API Request Types
export interface AssetMetricsParams extends Pagination {
    symbol: string;
    interval?: '1h' | '1d' | '1w';
    quote?: 'USD' | 'BTC';
}

export interface SocialMetricsParams extends Pagination {
    symbol: string;
    time_range?: TimeRange;
}

export interface InfluenceParams extends Pagination {
    symbol: string;
    platform?: 'twitter' | 'reddit' | 'youtube' | 'all';
}

// API Response Types
export interface LunarResponse<T> {
    data: T;
    config: {
        max_requests: number;
        used_requests: number;
        requested_at: string;
    };
}

export interface AssetPriceData {
    symbol: string;
    price: number;
    price_btc: number;
    volume_24h: number;
    market_cap: number;
    percent_change_24h: number;
    last_updated: string;
}

// Template Content Types
export interface AssetMetricsContent {
    symbol: string;
    interval?: string;
}

export interface SocialMetricsContent {
    symbol: string;
    timeRange?: TimeRange;
}

export interface InfluenceContent {
    symbol: string;
    platform?: string;
}

export interface MarketDataContent {
    quote?: 'USD' | 'BTC';
}

export interface TopicData {
    title: string;
    interactions_1h: number;
    description?: string;
}

export interface TopicsResponse {
    data: TopicData[];
    status?: number;
}