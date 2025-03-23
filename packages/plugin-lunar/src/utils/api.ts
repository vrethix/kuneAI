import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { elizaLogger } from '@ai16z/eliza';
import { LunarConfig } from '../environment';
import { LUNAR_API_BASE_URL, LUNAR_API_VERSION } from './constants';

interface ApiRequestConfig {
    endpoint: string;
    params?: Record<string, any>;
    config?: LunarConfig;
    method?: 'GET' | 'POST';
}

export class LunarApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public code?: string
    ) {
        super(message);
        this.name = 'LunarApiError';
    }
}

export const makeApiRequest = async ({ endpoint, config, headers = {} }) => {
    const response = await fetch(endpoint, {
        headers: {
            'Authorization': `Bearer ${config.LUNAR_API_KEY}`,
            ...headers
        }
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
};

export function formatTimeRange(timeRange?: { hours?: number; days?: number }): string {
    if (!timeRange) return '24h';
    if (timeRange.hours) return `${timeRange.hours}h`;
    if (timeRange.days) return `${timeRange.days}d`;
    return '24h';
}

export function formatLargeNumber(num: number): string {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toString();
}

export function calculateTimeSeriesLimit(
    timeRange: { hours?: number; days?: number },
    interval: string
): number {
    const hours = timeRange.hours || timeRange.days ? timeRange.days! * 24 : 24;
    switch (interval) {
        case '1h': return hours;
        case '1d': return Math.ceil(hours / 24);
        case '1w': return Math.ceil(hours / (24 * 7));
        default: return hours;
    }
}