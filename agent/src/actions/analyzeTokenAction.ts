import {
    Action,
    IAgentRuntime,
    State,
    Memory,
    HandlerCallback,
    booleanFooter,
    generateTrueOrFalse,
    ModelClass,
    generateObjectDeprecated,
    elizaLogger,
    ServiceType,
    composeContext,
    generateText,
} from "@elizaos/core";
import { ITokenAnalysisService } from "../services/tokenAnalysis";
import { cryptoAnalystTemplate } from "./cryptoAnalystPrompt";

// Define the template for shouldProcess
const shouldProcessTemplate = (message: string) => `
# Task: Determine if the user is asking for an analysis of a cryptocurrency.

Look for messages that:
- Mention specific cryptocurrency tickers or names (e.g., BTC, ETH, SOL)
- Ask about market sentiment, social trends, or crypto analytics
- Request information about token performance or social metrics

${message}

Should we analyze a cryptocurrency? ${booleanFooter} Absolutely no other text or explanation.`;

const tokenTickerTemplate = (message: string) => `
Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenSymbol": "BTC"
}
\`\`\`

${message}

Given this message, extract the following information about the requested token:
- Token symbol (in uppercase)`;

const ANALYZE_TOKEN_ACTION = "ANALYZE_TOKEN";

export const AnalyzeTokenAction: Action = {
    name: ANALYZE_TOKEN_ACTION,
    similes: [
        "STUDY_TOKEN",
        "ANALYZE_COIN",
        "ANALYZE_CRYPTO",
        "CHECK_CRYPTO_SENTIMENT",
        "VIEW_TOKEN_METRICS",
    ],
    description: "Analyzes a crypto token's market and social metrics using Lunar Crush data",
    validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const context = shouldProcessTemplate(message.content.text);
        const shouldProcess = await generateTrueOrFalse({
            runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });
        return shouldProcess;
    },
    handler: async (content: any, runtime: IAgentRuntime) => {
        const { tokenSymbol } = content;

        try {
            const tokenAnalysisService = runtime.getService<ITokenAnalysisService>(
                ServiceType.TOKEN_ANALYSIS
            );

            const analysis = await tokenAnalysisService.generateInsightData(tokenSymbol);

            if (typeof analysis === "string") {
                elizaLogger.error(analysis);
                return;
            }

            // Format the data for the agent to use
            const { price, priceChange24h, marketCap } = analysis.metrics.market;
            const { sentiment, galaxyScore } = analysis.metrics.social;

            // Return the data for the agent to use in its response
            return {
                token: tokenSymbol,
                price,
                priceChange24h,
                marketCap,
                sentiment,
                galaxyScore
            };

        } catch (error) {
            elizaLogger.error("Error in AnalyzeTokenAction:", error);
            return null;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the social sentiment for BTC right now?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Analyzing BTC's market and social metrics...",
                    action: "ANALYZE_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How is ETH trending on social media?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Let me check ETH's social metrics and market data...",
                    action: "ANALYZE_TOKEN",
                },
            },
        ],
    ],
};
