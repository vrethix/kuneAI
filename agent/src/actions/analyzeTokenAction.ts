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
- Mention specific cryptocurrency tickers or names (e.g., BTC, ETH, SOL), or any words that combine analysis with an all caps word like DOGE
- Contain words related to analysis, price, market data,token, coin, or investment

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
- Token symbol`;

const ANALYZE_TOKEN_ACTION = "ANALYZE_TOKEN";

export const AnalyzeTokenAction: Action = {
    name: ANALYZE_TOKEN_ACTION,
    similes: [
        "STUDY_TOKEN",
        "ANALYZE_COIN",
        "ANALYZE_TOKEN",
        "ANALYZE_CRYPTO",
        "MARKET_ANALYSIS_TOKEN",
    ],
    description: "Analyzes a crypto token and provides insights and data",
    validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const context = shouldProcessTemplate(message.content.text);
        const shouldProcess = await generateTrueOrFalse({
            runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });
        return shouldProcess;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options,
        callback: HandlerCallback
    ) => {
        const tokenContext = tokenTickerTemplate(message.content.text);

        const content = await generateObjectDeprecated({
            runtime,
            context: tokenContext,
            modelClass: ModelClass.LARGE,
        });

        if (!content.tokenSymbol) {
            elizaLogger.error("No token symbol found");
            return;
        }

        const { tokenSymbol } = content;

        try {
            const tokenAnalysisService =
                runtime.getService<ITokenAnalysisService>(
                    ServiceType.TOKEN_ANALYSIS
                );

            const analysis = await tokenAnalysisService.generateInsightData(
                tokenSymbol
            );

            if (typeof analysis === "string") {
                elizaLogger.error(analysis);
                return;
            }

            const context = composeContext({
                state: {
                    ...state,
                    insightDataSchema:
                        tokenAnalysisService.getInsightDataSchema(),
                    analysisData: JSON.stringify(analysis),
                },
                template: cryptoAnalystTemplate,
            });

            const response = await generateText({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            callback({
                ...message,
                text: response,
                action: ANALYZE_TOKEN_ACTION,
            });
        } catch (error) {
            elizaLogger.error("Error in analyzeTokenAction", error);
            return;
        }

        // placeholder
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you analyze BTC for me?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Fetching analysis for BTC...",
                    action: "ANALYZE_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the latest data on ETH?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Retrieving analysis for ETH...",
                    action: "ANALYZE_TOKEN",
                },
            },
        ],
    ],
};
