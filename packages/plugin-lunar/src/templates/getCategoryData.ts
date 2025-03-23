export const getCategoryDataTemplate = `Given the most recent message only, extract information needed to fetch category data from LunarCrush.

Extract these fields:
- category: the category name/identifier
- type: what to fetch ("details" or "topics")
- limit: number of topics to return (when fetching topics)

Example responses:
For "Show me topics in the DeFi category":
\`\`\`json
{
  "category": "defi",
  "type": "topics",
  "limit": 10
}
\`\`\`

{{recentMessages}}
Extract the category request parameters from the LAST message only and respond with a SINGLE JSON object.`;