export const getTopicDataTemplate = `Given the most recent message only, extract information needed to fetch topic data from LunarCrush.

Extract these fields:
- topic: the topic name/identifier
- type: what to fetch ("details" or "posts")
- limit: number of items to return (for posts)

Example responses:
For "Show me posts about Bitcoin":
\`\`\`json
{
  "topic": "bitcoin",
  "type": "posts",
  "limit": 10
}
\`\`\`

{{recentMessages}}
Extract the topic request parameters from the LAST message only and respond with a SINGLE JSON object.`;