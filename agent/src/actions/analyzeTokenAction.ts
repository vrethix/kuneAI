import {
    Action,
    IAgentRuntime,
    State,
    Memory,
    HandlerCallback,
    booleanFooter,
} from "@elizaos/core";

// Define the template for shouldProcess
const shouldProcessTemplate = (message: string) => `
# Task: Determine if the user is asking for an analysis of a cryptocurrency.

Look for messages that:
- Mention specific cryptocurrency tickers or names (e.g., BTC, ETH, SOL), or any words that combine analysis with an all caps word like DOGE
- Contain words related to analysis, price, market data,token, coin, or investment

${message}

Should we analyze a cryptocurrency? ${booleanFooter} Absolutely no other text or explanation.`;

export const AnalyzeTokenAction: Action = {
    name: "ANALYZE_TOKEN",
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
        // placeholder
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options,
        callback: HandlerCallback
    ) => {
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
