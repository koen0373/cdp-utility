// src/data/assets.ts
export type AssetDef = {
  symbol: string; // korte code
  name: string;   // volledige naam
  geckoId?: string; // CoinGecko id (niet voor COINDEPO)
};

export const ASSETS: AssetDef[] = [
  { symbol: "USDT-ERC20", name: "Tether (ERC20)", geckoId: "tether" },
  { symbol: "USDT-TRC20", name: "Tether (TRC20)", geckoId: "tether" },
  { symbol: "USDT-BEP20", name: "Tether (BEP20)", geckoId: "tether" },
  { symbol: "USDC", name: "USD Coin", geckoId: "usd-coin" },
  { symbol: "DAI", name: "Dai", geckoId: "dai" },
  { symbol: "BTC", name: "Bitcoin", geckoId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", geckoId: "ethereum" },
  { symbol: "XRP", name: "XRP Ripple", geckoId: "ripple" },
  { symbol: "BNB", name: "BNB", geckoId: "binancecoin" },
  { symbol: "SOL", name: "Solana", geckoId: "solana" },
  { symbol: "DOGE", name: "Dogecoin", geckoId: "dogecoin" },
  { symbol: "TRX", name: "Tron", geckoId: "tron" },
  { symbol: "ADA", name: "Cardano", geckoId: "cardano" },
  { symbol: "XLM", name: "Stellar", geckoId: "stellar" },
  { symbol: "LINK", name: "Chainlink", geckoId: "chainlink" },
  { symbol: "BCH", name: "Bitcoin Cash", geckoId: "bitcoin-cash" },
  { symbol: "AVAX", name: "Avalanche", geckoId: "avalanche-2" },
  { symbol: "LTC", name: "Litecoin", geckoId: "litecoin" },
  { symbol: "TON", name: "Toncoin", geckoId: "the-open-network" },
  { symbol: "SHIB", name: "Shiba Inu", geckoId: "shiba-inu" },
  { symbol: "PEPE", name: "Pepe", geckoId: "pepe" },
  { symbol: "AAVE", name: "Aave", geckoId: "aave" },
  { symbol: "ETC", name: "Ethereum Classic", geckoId: "ethereum-classic" },
  { symbol: "NEAR", name: "NEAR Protocol", geckoId: "near" },
  { symbol: "ONDO", name: "Ondo", geckoId: "ondo-finance" },
  { symbol: "MATIC", name: "Polygon", geckoId: "polygon" },
  { symbol: "ALGO", name: "Algorand", geckoId: "algorand" },
  { symbol: "ATOM", name: "Cosmos", geckoId: "cosmos" },
  { symbol: "FIL", name: "Filecoin", geckoId: "filecoin" },
  { symbol: "PAXG", name: "PAX Gold", geckoId: "pax-gold" },
  { symbol: "XAUT", name: "Tether Gold", geckoId: "tether-gold" },
  { symbol: "COINDEPO", name: "COINDEPO Token", isCDP: true }

];

export const isCoinDepo = (symbol: string) => symbol.toUpperCase() === "COINDEPO";