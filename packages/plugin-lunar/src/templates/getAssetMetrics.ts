export const getAssetMetricsTemplate = {
    description: "Get detailed metrics including price history and social data for a cryptocurrency",
    examples: [
        {
            input: "Show me Bitcoin metrics for the last 24 hours",
            output: {
                symbol: "BTC",
                interval: "1h",
                hours: 24
            }
        },
        {
            input: "Get ETH metrics for the past week",
            output: {
                symbol: "ETH",
                interval: "1d",
                days: 7
            }
        },
        {
            input: "What are the current metrics for DOGE?",
            output: {
                symbol: "DOGE",
                interval: "1h",
                hours: 24
            }
        }
    ],
    parameters: {
        type: "object",
        required: ["symbol"],
        properties: {
            symbol: {
                type: "string",
                description: "The cryptocurrency symbol (e.g., BTC, ETH)"
            },
            interval: {
                type: "string",
                enum: ["1h", "1d", "1w"],
                description: "Time interval for the data points",
                default: "1h"
            },
            hours: {
                type: "number",
                description: "Number of hours of data to fetch",
                minimum: 1,
                maximum: 168
            },
            days: {
                type: "number",
                description: "Number of days of data to fetch",
                minimum: 1,
                maximum: 30
            }
        }
    }
};

export const getAssetSocialTemplate = {
    description: "Get social metrics and sentiment data for a cryptocurrency",
    examples: [
        {
            input: "Show me Bitcoin's social metrics",
            output: {
                symbol: "BTC",
                timeRange: { hours: 24 }
            }
        },
        {
            input: "Get ETH social sentiment for the past week",
            output: {
                symbol: "ETH",
                timeRange: { days: 7 }
            }
        }
    ],
    parameters: {
        type: "object",
        required: ["symbol"],
        properties: {
            symbol: {
                type: "string",
                description: "The cryptocurrency symbol (e.g., BTC, ETH)"
            },
            timeRange: {
                type: "object",
                properties: {
                    hours: {
                        type: "number",
                        minimum: 1,
                        maximum: 168
                    },
                    days: {
                        type: "number",
                        minimum: 1,
                        maximum: 30
                    }
                }
            }
        }
    }
};