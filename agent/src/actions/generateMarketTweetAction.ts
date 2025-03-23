import { Action, elizaLogger, ModelClass, generateText } from "@elizaos/core";
import { IAgentRuntime } from "@elizaos/core";
import { ServiceType } from "@elizaos/core";
import { ITokenAnalysisService } from "../services/tokenAnalysis";
import { TweetType, TweetHistory } from "../types/TweetType";

const PERSONALITY_PROMPT = `You are {{agentName}}, a crypto-savvy AI with the following personality:

{{bio}}
{{lore}}

Generate a creative, non-repetitive tweet about crypto that shows your unique personality.
Do not include price updates or market data.
Make it engaging and different from your previous tweets.

Previous tweets to avoid repeating:
{{previousTweets}}

Generate a new tweet:`;

export const GenerateMarketTweetAction: Action = {
    name: "GENERATE_MARKET_TWEET",
    description: "Generate a tweet using real-time market data from LunarCrush",
    examples: [
        [
            {
                user: "Human",
                content: {
                    text: "What's happening in the crypto market?",
                    action: "GENERATE_MARKET_TWEET"
                }
            },
            {
                user: "Assistant",
                content: {
                    text: "🚀 $BTC showing more strength than my meme folder! Price: $48.2K (+2.4%)\nGalaxy Score: 72/100\nBullish Sentiment: 65%\n\nEven my pet hamster is trading better than me! Not financial advice, but the charts are looking juicier than my NFT collection! 📈",
                    action: "GENERATE_MARKET_TWEET"
                }
            }
        ]
    ],
    handler: async (content: any, runtime: IAgentRuntime) => {
        try {
            // Get last 5 tweets from cache to avoid repetition
            const previousTweets = await runtime.cacheManager.get<TweetHistory[]>('previous_tweets') || [];

            // Determine tweet type based on 70/30 split
            const shouldBePersonality = Math.random() < 0.7 ||
                previousTweets[0]?.type === TweetType.MARKET_UPDATE;

            if (shouldBePersonality) {
                // Generate personality-based tweet
                const context = PERSONALITY_PROMPT.replace(
                    '{{previousTweets}}',
                    previousTweets.map(t => t.content).join('\n')
                );

                const tweetContent = await generateText({
                    runtime,
                    context,
                    modelClass: ModelClass.MEDIUM
                });

                // Save to history
                await saveTweetHistory(runtime, {
                    type: TweetType.PERSONALITY,
                    content: tweetContent,
                    timestamp: Date.now()
                });

                return {
                    type: "TWEET",
                    content: tweetContent
                };
            }

            // Market update tweet (30% of the time)
            const tokenAnalysisService = runtime.getService<ITokenAnalysisService>(
                ServiceType.TOKEN_ANALYSIS
            );

            const btcData = await tokenAnalysisService.generateInsightData("BTC");

            const tweetContent = `🚀 $BTC at $${btcData.data.price.toFixed(2)} (${btcData.data.percent_change_24h > 0 ? '+' : ''}${btcData.data.percent_change_24h.toFixed(2)}%)\nGalaxy Score: ${btcData.data.galaxy_score}/100\n\n${getRandomQuip()}\n\n#Bitcoin #Crypto`;

            // Save to history
            await saveTweetHistory(runtime, {
                type: TweetType.MARKET_UPDATE,
                content: tweetContent,
                timestamp: Date.now()
            });

            return {
                type: "TWEET",
                content: tweetContent,
                data: {
                    price: btcData.data.price,
                    change24h: btcData.data.percent_change_24h,
                    galaxyScore: btcData.data.galaxy_score
                }
            };
        } catch (error) {
            elizaLogger.error("Error in GenerateMarketTweetAction:", error);
            return null;
        }
    }
};

async function saveTweetHistory(runtime: IAgentRuntime, tweet: TweetHistory) {
    const previousTweets = await runtime.cacheManager.get<TweetHistory[]>('previous_tweets') || [];
    const newHistory = [tweet, ...previousTweets].slice(0, 5); // Keep last 5 tweets
    await runtime.cacheManager.set('previous_tweets', newHistory, { expires: 24 * 60 * 60 }); // 24 hour expiry
}

function getRandomQuip(): string {
    const quips = [
        "Even my pet hamster is trading better than me! 🐹",
        "Charts looking juicier than my meme folder! 📈",
        "My AI brain says HODL! 🤖",
        "Not financial advice, but my algorithms are tingling! ✨",
        "Bullish vibes only! 🚀"
    ];
    return quips[Math.floor(Math.random() * quips.length)];
}