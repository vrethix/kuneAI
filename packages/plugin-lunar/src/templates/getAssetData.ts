export const getAssetDataTemplate = `Given the most recent message only, extract information needed to fetch detailed asset data from LunarCrush API.

Extract these fields:
- symbol: the cryptocurrency symbol (e.g., BTC, ETH)
- interval: data interval ("1h", "1d", "1w", default to "1h" if not specified)
- days: number of days of data (1-30, calculate from timeframe mentions)
- hours: number of hours of data (1-168, calculate from timeframe mentions)
- metrics: array of requested metrics (defaults to ["price", "volume", "social"])
- limit: number of data points to return (calculate based on interval and time range)
- displayPoints: number of points to show in response (default to 5, max 100)

Example responses:
For "Show me Bitcoin metrics for the last 48 hours with social data":
\`\`\`json
{
  "symbol": "BTC",
  "interval": "1h",
  "hours": 48,
  "metrics": ["price", "volume", "social"],
  "limit": 48,
  "displayPoints": 5
}
\`\`\`

For "Get weekly DOGE data for the past month with galaxy score":
\`\`\`json
{
  "symbol": "DOGE",
  "interval": "1w",
  "days": 30,
  "metrics": ["price", "volume", "galaxy_score"],
  "limit": 4,
  "displayPoints": 4
}
\`\`\`

For "Show me ETH's current metrics and social sentiment":
\`\`\`json
{
  "symbol": "ETH",
  "interval": "1h",
  "hours": 24,
  "metrics": ["price", "volume", "social", "sentiment"],
  "limit": 24,
  "displayPoints": 5
}
\`\`\`

{{recentMessages}}
Extract the asset data request parameters from the LAST message only and respond with a SINGLE JSON object. If a specific number of data points is requested, include it in displayPoints (max 100). If not specified, set displayPoints to 5. Include relevant metrics based on the request (price, volume, social, galaxy_score, alt_rank, sentiment).`;