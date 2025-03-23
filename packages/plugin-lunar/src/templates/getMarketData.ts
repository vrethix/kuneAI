export const getMarketDataTemplate = `Given the most recent message only, extract information needed to fetch market-wide data from LunarCrush.

Extract these fields:
- quote: currency to quote in ("USD" or "BTC", default "USD")
- metrics: array of requested metrics (e.g., ["market_cap", "volume", "dominance", "social"])
- include_social: boolean (whether to include social metrics)
- include_defi: boolean (whether to include DeFi metrics)

Example responses:
For "Show me current market overview with social metrics":
\`\`\`json
{
  "quote": "USD",
  "metrics": ["market_cap", "volume", "social"],
  "include_social": true,
  "include_defi": false
}
\`\`\`

{{recentMessages}}
Extract the market data request parameters from the LAST message only and respond with a SINGLE JSON object.`;