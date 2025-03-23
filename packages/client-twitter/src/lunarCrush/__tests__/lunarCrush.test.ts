import { elizaLogger } from '@elizaos/core';
import { config } from 'dotenv';

// Load .env file explicitly
config();

// Helper function to wait between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to format numbers
const formatNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
};

// Helper to truncate text
const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

const isRecentNews = (timestamp: number): boolean => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return timestamp * 1000 > oneWeekAgo;
};

const shortenUrl = (url: string): string => {
    // Remove common prefixes and trailing slashes
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
};

// Tweet constructor functions
const constructTweets = (data: any) => {
    const tweets = [];

    // Market Overview Tweet - More compact
    if (data.topCoins) {
        const btc = data.topCoins[0];
        const eth = data.topCoins[1];
        const xrp = data.topCoins[2];
        const bnb = data.topCoins[4];

        tweets.push(
            `📊 Crypto Markets\n\n` +
            `BTC: $${formatNumber(btc.price)} ${btc.change24h > 0 ? '📈' : '📉'}${btc.change24h.toFixed(1)}%\n` +
            `ETH: $${formatNumber(eth.price)} ${eth.change24h > 0 ? '📈' : '📉'}${eth.change24h.toFixed(1)}%\n` +
            `XRP: $${formatNumber(xrp.price)} ${xrp.change24h > 0 ? '📈' : '📉'}${xrp.change24h.toFixed(1)}%\n` +
            `BNB: $${formatNumber(bnb.price)} ${bnb.change24h > 0 ? '📈' : '📉'}${bnb.change24h.toFixed(1)}%\n\n` +
            `🚀 Top Gainer: $${data.marketSummary.topGainerSymbol} +${data.marketSummary.topGainerChange.toFixed(1)}%`
        );

        // Volume & Sentiment - More focused
        tweets.push(
            `📊 #Bitcoin Stats\n\n` +
            `24h Vol: $${formatNumber(btc.volume24h)}\n` +
            `Social Vol: ${formatNumber(btc.socialVolume)}\n` +
            `Dominance: ${data.marketSummary.btcDominance.toFixed(1)}%\n` +
            `Sentiment: ${btc.sentiment}% 📈\n` +
            `Galaxy Score: ${btc.galaxyScore}/100 ⭐`
        );
    }

    // Top News Tweets - Filter recent news and format better
    if (data.topNews) {
        const recentNews = data.topNews
            .filter(news => isRecentNews(news.created))
            .filter(news => !news.url.includes('bloomberg.com')) // Skip paywalled content
            .slice(0, 2);

        recentNews.forEach(news => {
            const title = truncateText(news.title, 100);
            const shortUrl = shortenUrl(news.url);

            const tweet =
                `📰 Crypto News\n\n` +
                `${title}\n\n` +
                `💬 ${formatNumber(news.interactions)} interactions\n` +
                `🔗 ${shortUrl}\n\n` +
                `#Crypto #Bitcoin`;

            // Only add if within character limit
            if (tweet.length <= 280) {
                tweets.push(tweet);
            }
        });
    }

    // Trending Topics Tweet
    if (data.trendingTopics?.length > 0) {
        const topics = data.trendingTopics.slice(0, 3);
        const tweet =
            `🔥 Trending in Crypto\n\n` +
            topics.map(topic =>
                `${topic.title}\n` +
                `💬 ${formatNumber(topic.interactions24h)} interactions\n` +
                `${topic.sentiment ? `📊 ${topic.sentiment}% sentiment\n` : ''}` +
                `👥 ${formatNumber(topic.contributors)} contributors`
            ).join('\n\n') +
            '\n\n#Crypto #Trending';

        if (tweet.length <= 280) {
            tweets.push(tweet);
        }
    }

    return tweets;
};

const testLunarCrush = async () => {
    const apiKey = process.env.LUNAR_API_KEY;
    if (!apiKey) {
        console.error('❌ No API key found!');
        process.exit(1);
    }

    const baseUrl = 'https://lunarcrush.com/api4';

    const endpoints = [
        {
            url: '/public/coins/list/v1',
            description: 'Top 5 Cryptocurrencies',
            dataExtractor: (data: any) => ({
                topCoins: data.data.slice(0, 5).map(coin => ({
                    name: coin.name,
                    symbol: coin.symbol,
                    price: coin.price,
                    change24h: coin.percent_change_24h,
                    marketCap: coin.market_cap,
                    volume24h: coin.volume_24h,
                    socialVolume: coin.social_volume_24h,
                    sentiment: coin.sentiment,
                    galaxyScore: coin.galaxy_score
                })),
                marketSummary: {
                    totalCoins: data.data.length,
                    btcDominance: data.data[0].market_dominance,
                    topGainerSymbol: data.data
                        .slice(0, 20)
                        .reduce((a, b) => a.percent_change_24h > b.percent_change_24h ? a : b).symbol,
                    topGainerChange: data.data
                        .slice(0, 20)
                        .reduce((a, b) => a.percent_change_24h > b.percent_change_24h ? a : b).percent_change_24h
                }
            })
        },
        {
            url: '/public/category/cryptocurrencies/news/v1',
            description: 'Top Crypto News',
            dataExtractor: (data: any) => ({
                topNews: data.data.slice(0, 5).map(news => ({
                    title: news.post_title,
                    url: news.post_link,
                    source: news.creator_display_name || news.creator_name || 'Crypto News',
                    interactions: news.interactions_24h,
                    sentiment: news.post_sentiment,
                    created: news.post_created
                }))
            })
        },
        {
            url: '/public/topics/list/v1',
            description: 'Trending Topics',
            dataExtractor: (data: any) => ({
                trendingTopics: data.data.map(topic => ({
                    title: topic.title,
                    topic_rank: topic.topic_rank,
                    interactions24h: topic.interactions_24h,
                    contributors: topic.num_contributors
                })).slice(0, 5)
            })
        }
    ];

    console.log("\nTesting LunarCrush Data & Tweet Generation\n");

    let allData = {};

    for (const endpoint of endpoints) {
        console.log(`\n📊 ${endpoint.description}`);
        try {
            const response = await fetch(`${baseUrl}${endpoint.url}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Error: ${response.status} ${response.statusText}`);
                continue;
            }

            const data = await response.json();
            const extractedData = endpoint.dataExtractor(data);
            allData = { ...allData, ...extractedData };

            console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));

            await delay(2000);

        } catch (error) {
            console.error(`Failed testing ${endpoint.url}:`, error);
        }
    }

    // Generate sample tweets
    console.log('\n📝 Generated Tweet Examples:');
    const tweets = constructTweets(allData);
    tweets.forEach((tweet, index) => {
        console.log(`\nTweet ${index + 1}:`);
        console.log('='.repeat(50));
        console.log(tweet);
        console.log('='.repeat(50));
        console.log(`Character count: ${tweet.length}/280`);
    });
};

// Run the test
testLunarCrush().catch(console.error);