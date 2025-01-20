import {
    Action,
    IAgentRuntime,
    State,
    Memory,
    HandlerCallback,
} from "@elizaos/core";

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
