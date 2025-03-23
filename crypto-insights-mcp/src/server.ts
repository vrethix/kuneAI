import dotenv from 'dotenv';
import path from 'path';

// Use absolute path to the root .env file
dotenv.config({
  path: path.join('/Users/riteshverma/Downloads/kuneLunar copy 2/eliza-aixbt-tutorial', '.env')
});

console.log('ENV vars:', {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY
});

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

interface LunarCoin {
  symbol: string;
  name: string;
  price: number;
  percent_change_24h: number;
  market_cap: number;
  volume_24h: number;
  social_volume_24h: number;
  sentiment: number;
  galaxy_score: number;
}

interface LunarNews {
  post_title: string;
  post_link: string;
  creator_display_name?: string;
  creator_name?: string;
  interactions_24h: number;
  post_sentiment: number;
  post_created: number;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Update LunarCrush API base URL to v4
const LUNAR_API_KEY = process.env.LUNAR_API_KEY!; // Note: env var name changed
const LUNARCRUSH_BASE_URL = 'https://lunarcrush.com/api4/public';

// Create MCP server
const server = new McpServer({
  name: "Crypto-Insights",
  version: "1.0.0"
});

// Helper function for LunarCrush API calls
async function fetchLunarCrushData(endpoint: string, params?: Record<string, any>) {
  const url = new URL(`${LUNARCRUSH_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${LUNAR_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`LunarCrush API error: ${response.statusText}`);
  }
  const result = await response.json();
  return result;
}

// Resources
server.resource(
  "crypto-assets",
  "crypto://assets",
  async (uri) => {
    const response = await fetchLunarCrushData('/coins/list/v1');
    const data = response.data as LunarCoin[];
    const filteredData = data.slice(0, 20).filter((coin: LunarCoin) =>
      ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'].includes(coin.symbol)
    );

    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(filteredData, null, 2)
      }]
    };
  }
);

server.resource(
  "sentiment",
  new ResourceTemplate("sentiment://{symbol}", { list: undefined }),
  async (uri, { symbol }) => {
    const response = await fetchLunarCrushData('/coins/list/v1');
    const data = response.data as LunarCoin[];
    const coinData = data.find((coin: LunarCoin) =>
      coin.symbol === symbol
    );

    if (!coinData) {
      throw new Error(`Coin not found: ${symbol}`);
    }

    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({
          symbol: coinData.symbol,
          sentiment: coinData.sentiment,
          socialVolume: coinData.social_volume_24h,
          galaxyScore: coinData.galaxy_score
        }, null, 2)
      }]
    };
  }
);

// Add news resource
server.resource(
  "news",
  "crypto://news",
  async (uri) => {
    const response = await fetchLunarCrushData('/category/cryptocurrencies/news/v1');
    const data = response.data as LunarNews[];
    const recentNews = data
      .filter((news: LunarNews) => !news.post_link.includes('bloomberg.com'))
      .slice(0, 5)
      .map((news: LunarNews) => ({
        title: news.post_title,
        url: news.post_link,
        source: news.creator_display_name || news.creator_name || 'Crypto News',
        interactions: news.interactions_24h,
        sentiment: news.post_sentiment,
        created: news.post_created
      }));

    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(recentNews, null, 2)
      }]
    };
  }
);

// Tools
server.tool(
  "analyze-asset",
  {
    symbol: z.string(),
    timeframe: z.enum(["24h", "7d", "30d"])
  },
  async ({ symbol, timeframe }) => {
    try {
      const lunarData = await fetchLunarCrushData('/coins/list/v1', {
        interval: timeframe,
        data: 'full'
      });

      // Store analysis in Supabase
      const { error } = await supabase
        .from('asset_analyses')
        .insert({
          symbol: symbol,
          timeframe,
          lunar_data: lunarData,
          analyzed_at: new Date().toISOString()
        });

      if (error) throw error;

      return {
        content: [{
          type: "text",
          text: JSON.stringify(lunarData, null, 2)
        }]
      };
    } catch (err: any) {
      return {
        content: [{
          type: "text",
          text: `Error analyzing asset: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// Prompts
server.prompt(
  "market-analysis",
  {
    symbol: z.string(),
    timeframe: z.enum(["24h", "7d", "30d"])
  },
  ({ symbol, timeframe }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please analyze the market data for ${symbol} over the last ${timeframe}. Consider:
1. Price movement and volume trends
2. Social sentiment indicators
3. Key market events and news impact
4. Technical indicators
5. Potential risks and opportunities`
      }
    }]
  })
);

// Error handling and logging
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Initialize transport and connect
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
