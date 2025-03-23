export const baseUrls = {
    lunar: 'https://lunarcrush.com/api4'
};

export const LUNAR_API_KEY = process.env.LUNAR_API_KEY;

export const API_ENDPOINTS = {
    TOPICS: {
        LIST: '/public/topics/list/v1',
        DETAILS: (topic: string) => `/public/topic/${topic}/v1`,
    },
    CATEGORY: {
        DETAILS: (category: string) => `/public/category/${category}/v1`,
    },
    POSTS: {
        DETAILS: (postType: string, postId: string) => `/public/posts/${postType}/${postId}/v1`
    },
    COINS: {
        LIST: '/public/coins/list/v2',
        DETAILS: (coin: string) => `/public/coins/${coin}/v1`,
        NEWS: (coin: string) => `/public/coins/${coin}/news/v1`
    }
} as const;

export const TIME_FRAMES = {
    HOUR: '1h',
    DAY: '1d',
    WEEK: '1w',
} as const;

export const DEFAULT_LIMITS = {
    FEED_ITEMS: 20,
    INFLUENCERS: 10,
    TIME_SERIES: 50,
    COINS_LIST: 10
} as const;

export const SORT_OPTIONS = {
    MARKET_CAP_RANK: 'market_cap_rank',
    PRICE: 'price',
    VOLUME_24H: 'volume_24h',
    PERCENT_CHANGE_24H: 'percent_change_24h',
    MARKET_CAP: 'market_cap',
    INTERACTIONS_24H: 'interactions_24h',
    SOCIAL_VOLUME_24H: 'social_volume_24h',
    SOCIAL_DOMINANCE: 'social_dominance',
    MARKET_DOMINANCE: 'market_dominance',
    GALAXY_SCORE: 'galaxy_score',
    ALT_RANK: 'alt_rank',
    SENTIMENT: 'sentiment'
} as const;

export const lunarHeaders = {
    headers: {
        'Authorization': `Bearer ${process.env.LUNAR_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
};