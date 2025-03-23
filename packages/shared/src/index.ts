export interface ITokenAnalysisService {
    generateTopicInsight(): Promise<any>;
    generateInsightData(token: string): Promise<any>;
    fetchLunarCrush(endpoint: string): Promise<any>;
    generateCoinsList(): Promise<any>;
    generateNewsInsight(): Promise<any>;
}
