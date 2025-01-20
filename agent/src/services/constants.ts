export const baseUrls = {
    coingecko: "https://api.coingecko.com/api/v3/",
    goldrush: "https://api.covalenthq.com/v1",
};

export const GOLD_RUSH_API_KEY = process.env.GOLD_RUSH_API_KEY;
export const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
export const coingGeckoHeaders = {
    headers: {
        "x-cg-demo-api-key": COINGECKO_API_KEY,
        accept: "*/*",
    },
};
