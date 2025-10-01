import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { symbols, limit = '100' } = request.query;

  if (!symbols || typeof symbols !== 'string') {
    return response.status(400).json({ error: 'Missing or invalid symbols parameter' });
  }

  try {
    // CoinMarketCap API endpoint (no API key required)
    const cmcUrl = `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=${limit}&sortBy=market_cap&sortType=desc&convert=USD`;
    
    console.log('Fetching from CoinMarketCap:', cmcUrl);

    // Make server-side request to CoinMarketCap
    const cmcResponse = await fetch(cmcUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CoinMarketCapProxy/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!cmcResponse.ok) {
      throw new Error(`CoinMarketCap API error: ${cmcResponse.status} ${cmcResponse.statusText}`);
    }

    const data = await cmcResponse.json();
    
    if (!data.data || !data.data.cryptoCurrencyList) {
      throw new Error('Invalid CoinMarketCap response structure');
    }

    // Parse symbols (comma-separated)
    const symbolList = symbols.toLowerCase().split(',').map(s => s.trim());
    
    // Find matching cryptocurrencies
    const results: Record<string, any> = {};
    
    for (const crypto of data.data.cryptoCurrencyList) {
      const symbol = crypto.symbol.toLowerCase();
      if (symbolList.includes(symbol)) {
        const quote = crypto.quotes?.[0]; // USD quote
        if (quote) {
          results[symbol] = {
            price: quote.price,
            priceChange24h: quote.percentChange24h,
            marketCap: quote.marketCap,
            volume24h: quote.volume24h,
            lastUpdated: quote.lastUpdated
          };
        }
      }
    }
    
    // Return the results
    return response.status(200).json({
      success: true,
      data: results,
      source: 'CoinMarketCap',
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('CoinMarketCap proxy error:', error);
    return response.status(500).json({ 
      success: false,
      error: 'Failed to fetch crypto prices from CoinMarketCap', 
      details: error.message,
      timestamp: Date.now()
    });
  }
}
