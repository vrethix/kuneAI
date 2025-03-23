export const LUNAR_API_BASE_URL = 'https://lunarcrush.com/api4/public';
export const LUNAR_API_VERSION = 'v2';

export const API_ENDPOINTS = {
    MARKET: {
        GLOBAL: '/markets/global/v1'
    },
    TOPICS: {
        LIST: 'https://lunarcrush.com/api4/public/topics/list/v1',
        DETAILS: (topic: string) => `/topics/${topic}/v1`,
        POSTS: (topic: string) => `/topics/${topic}/posts/v1`
    },
    CATEGORIES: {
        DETAILS: (category: string) => `/category/${category}/v1`,
        TOPICS: (category: string) => `/category/${category}/topics/v1`
    },
    COINS: {
        LIST: '/coins/list/v1',
        FEED: (coin: string) => `/coins/${coin}/feed/v1`,
        METRICS: (coin: string) => `/coins/${coin}/metrics/v1`
    },
    SOCIAL: {
        INFLUENCES: '/influences/v1',
        FEED: '/feeds/v1',
        SENTIMENT: '/sentiment/v1'
    },
    ASSETS: {
        METRICS: '/assets/v1',
        TIME_SERIES: '/assets/time-series/v1'
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
} as const;