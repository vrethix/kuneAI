import { IAgentRuntime } from "@elizaos/core";
import { ServiceType } from "@elizaos/core";
import { TokenAnalysisService } from "../services/tokenAnalysis";

export const GenerateTweetAction = {
    name: "GENERATE_TWEET",
    description: "Generate a tweet with RavenAI's personality",
    execute: async (runtime: IAgentRuntime) => {
        const tokenService = runtime.getService(ServiceType.TOKEN_ANALYSIS) as TokenAnalysisService;
        if (!tokenService) {
            throw new Error("TokenAnalysisService not found");
        }
        const result = await tokenService.generateTweetContent();
        return result.content;
    }
};