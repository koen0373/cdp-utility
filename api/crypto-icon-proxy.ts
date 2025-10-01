import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { symbol } = request.query;

  if (!symbol || typeof symbol !== 'string') {
    return response.status(400).json({ error: 'Missing or invalid symbol parameter' });
  }

  try {
    // Try multiple reliable crypto icon sources (updated and tested)
    const iconUrls = [
      // SpotHQ icons (most reliable, good CORS support)
      `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${symbol.toLowerCase()}.png`,
      // CoinMarketCap (reliable, good coverage)
      `https://s2.coinmarketcap.com/static/img/coins/64x64/${symbol.toLowerCase()}.png`,
      // CoinGecko (reliable but limited coverage)
      `https://assets.coingecko.com/coins/images/1/large/${symbol.toLowerCase()}.png`,
      // Alternative CoinGecko format
      `https://assets.coingecko.com/coins/images/1/small/${symbol.toLowerCase()}.png`,
      // CoinCap API (backup)
      `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`,
    ];

    // Try each URL until one works
    for (const url of iconUrls) {
      try {
        const iconResponse = await fetch(url, {
          method: 'HEAD', // Just check if the resource exists
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CryptoIconProxy/1.0)',
          },
        });

        if (iconResponse.ok) {
          // Return the working URL
          return response.status(200).json({ 
            success: true, 
            iconUrl: url,
            source: getSourceName(url)
          });
        }
      } catch (error) {
        // Continue to next URL
        continue;
      }
    }

    // If no URL worked, return error
    return response.status(404).json({ 
      error: 'No icon found for symbol', 
      symbol,
      triedUrls: iconUrls 
    });

  } catch (error: any) {
    console.error('Crypto icon proxy error:', error);
    return response.status(500).json({ 
      error: 'Failed to fetch crypto icon', 
      details: error.message 
    });
  }
}

function getSourceName(url: string): string {
  if (url.includes('spothq')) return 'SpotHQ';
  if (url.includes('coinmarketcap.com')) return 'CoinMarketCap';
  if (url.includes('coingecko.com')) return 'CoinGecko';
  if (url.includes('coincap.io')) return 'CoinCap';
  return 'Unknown';
}
