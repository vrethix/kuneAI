import { Plugin } from '@ai16z/eliza';
import getTopicData from './actions/getTopicData';
import { lunarProvider } from './providers/lunarProvider';

export const lunarPlugin: Plugin = {
    name: "lunar",
    description: "LunarCrush integration for crypto trends and analytics",
    actions: [
        getTopicData,
    ],
    providers: [
        lunarProvider
    ]
};

export * from "./types/lunar";
export * from "./environment";