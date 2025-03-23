export const getInfluencerMetricsTemplate = `Given the most recent message only, extract information needed to fetch influencer metrics from LunarCrush.

Extract these fields:
- symbol: the cryptocurrency symbol (e.g., BTC, ETH)
- platform: social platform to filter by ("twitter", "reddit", "youtube", "all")
- timeRange: {
    hours?: number (1-168),
    days?: number (1-30)
  }
- limit: number of influencers to return (default 10, max 100)
- minFollowers: minimum follower count to filter by

Example responses:
For "Show me top Bitcoin influencers on Twitter":
\`\`\`json
{
  "symbol": "BTC",
  "platform": "twitter",
  "timeRange": { "days": 7 },
  "limit": 10
}
\`\`\`

{{recentMessages}}
Extract the influencer metrics request parameters from the LAST message only and respond with a SINGLE JSON object.`;