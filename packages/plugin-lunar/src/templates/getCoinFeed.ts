export const getCoinFeedTemplate = `Given the most recent message only, extract information needed to fetch social feed data from LunarCrush.

Extract these fields:
- symbol: the cryptocurrency symbol (e.g., BTC, ETH)
- sources: array of sources to include (["twitter", "reddit", "news"])
- sentiment: filter by sentiment ("positive", "negative", "neutral", "all")
- timeRange: {
    hours?: number (1-24),
    days?: number (1-7)
  }
- limit: number of feed items to return (default 20, max 100)

Example responses:
For "Show me positive Bitcoin mentions from the last 12 hours":
\`\`\`json
{
  "symbol": "BTC",
  "sources": ["twitter", "reddit"],
  "sentiment": "positive",
  "timeRange": { "hours": 12 },
  "limit": 20
}
\`\`\`

{{recentMessages}}
Extract the social feed request parameters from the LAST message only and respond with a SINGLE JSON object.`;