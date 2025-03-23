import {
    Action,
    elizaLogger,
    IAgentRuntime,
    Memory,
} from "@ai16z/eliza";
import { LunarProvider } from "../providers/lunarProvider";

export default {
    name: "GET_TOPIC_DATA",
    similes: [
        "FETCH_TOPIC_INFO",
        "SHOW_TOPIC_DETAILS",
        "GET_TOPIC_POSTS",
        "VIEW_TOPIC_DATA",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description: "Get trending crypto topics and post as tweet",
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("Starting GET_TOPIC_DATA action");

        try {
            const provider = new LunarProvider(runtime);
            const trends = await provider.getTopTrending(3);

            if (!trends?.length) {
                return {
                    text: "No trending topics found",
                    shouldTweet: false
                };
            }

            const tweetText = `🔥 Crypto Trends Alert\n\n${
                trends.map((topic, i) => {
                    const interactions = topic.interactions_1h || 0;
                    return `${i + 1}. ${topic.title}\n` +
                           `   ${interactions.toLocaleString()} interactions/hr`;
                }).join('\n\n')
            }\n\n#Crypto #CryptoNews`;

            return {
                text: tweetText,
                shouldTweet: true,
                tweetContent: {
                    text: tweetText
                }
            };

        } catch (error) {
            elizaLogger.error("Error in GET_TOPIC_DATA:", error);
            return {
                text: `Error fetching trends: ${error.message}`,
                shouldTweet: false
            };
        }
    }
} as Action;