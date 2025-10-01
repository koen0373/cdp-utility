import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { ids, vs_currencies = 'usd', include_24hr_change = 'true' } = request.query;

  if (!ids || typeof ids !== 'string') {
    return response.status(400).json({ error: 'Missing or invalid ids parameter' });
  }

  try {
    // Construct CoinGecko API URL
    const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${vs_currencies}&include_24hr_change=${include_24hr_change}`;
    
    console.log('Fetching from CoinGecko:', coingeckoUrl);

    // Make server-side request to CoinGecko
    const coingeckoResponse = await fetch(coingeckoUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoPriceProxy/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!coingeckoResponse.ok) {
      throw new Error(`CoinGecko API error: ${coingeckoResponse.status} ${coingeckoResponse.statusText}`);
    }

    const data = await coingeckoResponse.json();
    
    // Return the data as-is from CoinGecko
    return response.status(200).json({
      success: true,
      data: data,
      source: 'CoinGecko',
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Crypto price proxy error:', error);
    return response.status(500).json({ 
      success: false,
      error: 'Failed to fetch crypto prices', 
      details: error.message,
      timestamp: Date.now()
    });
  }
}
