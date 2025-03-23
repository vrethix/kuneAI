import { Action, elizaLogger } from "@elizaos/core";
import { IAgentRuntime } from "@elizaos/core";
import { ServiceType } from "@elizaos/core";
import { ITokenAnalysisService } from "../services/tokenAnalysis";

export const GetTrendingTopicsAction: Action = {
    handler: async (_: any, runtime: IAgentRuntime) => {
        try {
            const tokenAnalysisService = runtime.getService<ITokenAnalysisService>(
                ServiceType.TOKEN_ANALYSIS
            );

            const topicsData = await tokenAnalysisService.generateTopicInsight();
            if (typeof topicsData === "string") {
                elizaLogger.error(topicsData);
                return null;
            }

            return topicsData;

        } catch (error) {
            elizaLogger.error("Error in GetTrendingTopicsAction:", error);
            return null;
        }
    }
};