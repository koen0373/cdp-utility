// src/CDPUtilityApp.tsx - Updated Layout v2
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "./data/assets";
import COINDEPO_LOGO from "./assets/COINDEPO.webp";

// Local crypto icon imports
import BTC_ICON from "./assets/crypto-icons/btc.png";
import ETH_ICON from "./assets/crypto-icons/eth.png";
import USDC_ICON from "./assets/crypto-icons/usdc.png";
import USDT_ICON from "./assets/crypto-icons/usdt.png";
import XRP_ICON from "./assets/crypto-icons/xrp.png";
import ADA_ICON from "./assets/crypto-icons/ada.png";
import SOL_ICON from "./assets/crypto-icons/sol.png";
import DOT_ICON from "./assets/crypto-icons/dot.png";
import MATIC_ICON from "./assets/crypto-icons/matic.png";
import AVAX_ICON from "./assets/crypto-icons/avax.png";
import LINK_ICON from "./assets/crypto-icons/link.png";
import UNI_ICON from "./assets/crypto-icons/uni.png";
import LTC_ICON from "./assets/crypto-icons/ltc.png";
import BCH_ICON from "./assets/crypto-icons/bch.png";
import DOGE_ICON from "./assets/crypto-icons/doge.png";
import BNB_ICON from "./assets/crypto-icons/bnb.png"; // zet je logo hier neer

type Asset = { symbol: string; name: string; coingeckoId?: string; isCDP?: boolean };
type Row = { asset: Asset; qty: number; priceUSD: number; interestRate?: string; payoutDate?: string; isEditing?: boolean };

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// Currency symbols and labels
const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', label: 'Swiss Franc' }
];

function toNum(v: any): number {
  if (typeof v === "string") v = v.replace(",", ".");
  const n = parseFloat(v as any);
  return Number.isFinite(n) ? n : 0;
}

// Global currency formatter function
function formatCurrency(value: number, selectedCurrency: string, exchangeRates: Record<string, number>) {
  const currency = CURRENCIES.find(c => c.code === selectedCurrency);
  const convertedValue = value * (exchangeRates[selectedCurrency] || 1);
  
  if (selectedCurrency === 'JPY') {
    return `${currency?.symbol}${Math.round(convertedValue).toLocaleString()}`;
  } else {
    return `${currency?.symbol}${convertedValue.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
}

/* -------------------- APR Helper Functions -------------------- */
function isStablecoin(symbol: string): boolean {
  const stablecoins = ['USDT', 'USDT-ERC20', 'USDT-TRC20', 'USDT-BEP20', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'USDD'];
  return stablecoins.includes(symbol.toUpperCase());
}

function getAPROptions(assetSymbol: string) {
  // COINDEPO specific APRs - Updated with new rates
  if (assetSymbol === "COINDEPO") {
    return [
      { value: "coindepo-18.5", label: "WEEKLY: 18.5% APR" },
      { value: "coindepo-20", label: "MONTHLY: 20% APR" },
      { value: "coindepo-21", label: "QUARTERLY: 21% APR" },
      { value: "coindepo-22", label: "SEMI-ANNUAL: 22% APR" },
      { value: "coindepo-24", label: "ANNUAL: 24% APR" }
    ];
  }
  
  // Stablecoin APRs - Use COINDEPO rates for stablecoins
  if (isStablecoin(assetSymbol)) {
    return [
      { value: "stablecoin-18.5", label: "WEEKLY: 18.5% APR" },
      { value: "stablecoin-20", label: "MONTHLY: 20% APR" },
      { value: "stablecoin-21", label: "QUARTERLY: 21% APR" },
      { value: "stablecoin-22", label: "SEMI-ANNUAL: 22% APR" },
      { value: "stablecoin-24", label: "ANNUAL: 24% APR" }
    ];
  } 
  
  // Crypto APRs - Updated with new rates from screenshot
  return [
    { value: "crypto-12.5", label: "WEEKLY: 12.5% APR" },
    { value: "crypto-14", label: "MONTHLY: 14% APR" },
    { value: "crypto-15", label: "QUARTERLY: 15% APR" },
    { value: "crypto-16", label: "SEMI-ANNUAL: 16% APR" },
    { value: "crypto-18", label: "ANNUAL: 18% APR" }
  ];
}

  function getAPRValue(interestRate?: string): number {
    if (!interestRate) return 0;
    // Extract number from formats like "stablecoin-18.5" or "coindepo-20"
    const match = interestRate.match(/-(\d+\.?\d*)$/);
    if (match) return parseFloat(match[1]);
    
    // Fallback for old format
    const fallback = interestRate.match(/(\d+\.?\d*)/);
    return fallback ? parseFloat(fallback[1]) : 0;
  }

  function getLoanAPROptions() {
    return [
      { value: "loan-10", label: "Up to 20%" },
      { value: "loan-27.5", label: "20% - 35%" },
      { value: "loan-42.5", label: "35% - 50%" }
    ];
}

/* -------------------- Icons -------------------- */
// Local icon mapping for common cryptocurrencies
const LOCAL_ICON_MAP: Record<string, string> = {
  'btc': BTC_ICON,
  'eth': ETH_ICON,
  'usdc': USDC_ICON,
  'usdt': USDT_ICON,
  'xrp': XRP_ICON,
  'ada': ADA_ICON,
  'sol': SOL_ICON,
  'dot': DOT_ICON,
  'matic': MATIC_ICON,
  'avax': AVAX_ICON,
  'link': LINK_ICON,
  'uni': UNI_ICON,
  'ltc': LTC_ICON,
  'bch': BCH_ICON,
  'doge': DOGE_ICON,
  'bnb': BNB_ICON,
  // Add more as needed
};

function getLocalIcon(asset?: Asset): string | null {
  if (!asset) return null;
  const ticker = asset.symbol.toLowerCase().split("-")[0];
  return LOCAL_ICON_MAP[ticker] || null;
}

function iconCandidates(asset?: Asset): string[] {
  if (!asset) return [];
  const ticker = asset.symbol.toLowerCase().split("-")[0];
  const geckoId = asset.coingeckoId;
  
  const candidates = [
    // Primary sources - most reliable
    `https://assets.coingecko.com/coins/images/1/large/${ticker}.png`,
    `https://cryptoicons.org/api/icon/${ticker}/200`,
    `https://cryptoicons.org/api/color/${ticker}/200`,
    
    // CoinGecko API (if available)
    ...(geckoId ? [`https://api.coingecko.com/api/v3/coins/${geckoId}/image`] : []),
    
    // SpotHQ icons (backup)
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${ticker}.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/icon/${ticker}.png`,
    
    // Additional fallbacks
    `https://coin-images.coingecko.com/coins/images/1/large/${ticker}.png`,
    `https://s2.coinmarketcap.com/static/img/coins/64x64/${ticker}.png`,
    `https://s2.coinmarketcap.com/static/img/coins/32x32/${ticker}.png`,
    
    // Generic crypto icon services
    `https://cryptologos.cc/logos/${ticker}-${ticker}-logo.png`,
    `https://cryptofonts.com/img/icons/${ticker}.svg`,
    
    // Last resort - use a generic crypto icon
    `https://cryptoicons.org/api/icon/btc/200`
  ];
  
  return candidates;
}

const TokenIcon: React.FC<{ asset: Asset; size?: number }> = ({ asset, size = 32 }) => {
  if (asset.isCDP) {
    return (
      <img
        src={COINDEPO_LOGO}
        width={size}
        height={size}
        className="rounded-full"
        style={{ border: 'none', outline: 'none' }}
        alt="COINDEPO"
      />
    );
  }
  
  // Try local icon first
  const localIcon = getLocalIcon(asset);
  if (localIcon) {
    return (
      <img
        src={localIcon}
        width={size}
        height={size}
        className="rounded-full"
        style={{ border: 'none', outline: 'none' }}
        alt={`${asset.name} icon`}
      />
    );
  }
  
  // Fallback to external sources if no local icon
  const [idx, setIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const urls = iconCandidates(asset);
  
  const initials =
    asset.name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() ?? "?";

  const handleImageError = () => {
    if (idx + 1 < urls.length) {
      setIdx(idx + 1);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Show loading state
  if (isLoading && !hasError && urls.length > 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-slate-200 grid place-items-center"
      >
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show fallback with initials
  if (hasError || !urls.length || idx >= urls.length) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gradient-to-br from-blue-100 to-purple-100 grid place-items-center text-[10px] font-semibold text-slate-700"
      >
        {initials}
      </div>
    );
  }

  // Show external image
  return (
    <img
      src={urls[idx]}
      width={size}
      height={size}
      className="rounded-full"
      style={{ display: isLoading ? 'none' : 'block', border: 'none', outline: 'none' }}
      onError={handleImageError}
      onLoad={handleImageLoad}
      alt={`${asset.name} icon`}
    />
  );
};

/* -------------------- CoinGecko prijzen -------------------- */
const priceCache = new Map<string, { price: number; ts: number }>();
const CACHE_TTL_MS = 60_000;

async function fetchCoinGeckoPrices(coingeckoIds: string[]): Promise<Record<string, number>> {
  if (!coingeckoIds.length) return {};
  const now = Date.now();
  const uniq = Array.from(new Set(coingeckoIds));

  const result: Record<string, number> = {};
  const need: string[] = [];
  for (const id of uniq) {
    const hit = priceCache.get(id);
    if (hit && now - hit.ts < CACHE_TTL_MS) result[id] = hit.price;
    else need.push(id);
  }
  if (!need.length) return result;

  const url = `/coingecko/api/v3/simple/price?ids=${encodeURIComponent(
    need.join(",")
  )}&vs_currencies=usd`;

  try {
    const res = await fetch(url);
    if (!res.ok) return result;
    const data = await res.json();
    for (const id of need) {
      const p = data?.[id]?.usd;
      if (typeof p === "number") {
        priceCache.set(id, { price: p, ts: Date.now() });
        result[id] = p;
      }
    }
    return result;
  } catch {
    return result;
  }
}

async function fetchSinglePrice(id: string): Promise<number | null> {
  const now = Date.now();
  const hit = priceCache.get(id);
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.price;
  
  // Use proxy in development, direct API in production
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const urls = isDevelopment 
    ? [
        `/coingecko/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`,
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
      ]
    : [
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
      ];
  
  for (const url of urls) {
    try {
      console.log(`Fetching price for ${id} from ${url}`);
      const res = await fetch(url);
      console.log(`Response status: ${res.status}`);
      
      if (!res.ok) {
        console.log(`API call failed with status ${res.status}`);
        continue; // Try next URL
      }
      
    const data = await res.json();
      console.log(`API response:`, data);
    const p = data?.[id]?.usd;
      
    if (typeof p === "number") {
      priceCache.set(id, { price: p, ts: now });
        console.log(`Price cached: ${p}`);
      return p;
    }
      
      console.log(`No valid price found in response`);
    } catch (error) {
      console.error(`Error fetching price for ${id} from ${url}:`, error);
      continue; // Try next URL
    }
  }
  
  console.log(`All price fetch attempts failed for ${id}`);
  return hit ? hit.price : null;
}

/* -------------------- LocalStorage -------------------- */

/* ==================== CoindepoRow Component ==================== */
const CoindepoRow: React.FC<{
  holding: Row;
  index: number;
  value: number;
  onUpdate: (qty: number) => void;
  onRemove: () => void;
  coindepoAsset: Asset;
  selectedCurrency: string;
  exchangeRates: Record<string, number>;
}> = ({ holding, value, onUpdate, onRemove, coindepoAsset, selectedCurrency, exchangeRates }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState<number>(holding.qty);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const save = () => {
    onUpdate(editQty);
    setIsEditing(false);
  };

  return (
    <div className="py-5">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3 flex items-center" style={{ gap: '24px' }}>
          <TokenIcon asset={coindepoAsset} />
          <div>
            <div className="cd-asset-name">COINDEPO Token</div>
            {holding.payoutDate && (
              <div className="text-xs text-slate-500">
                Interest payout date: {new Date(holding.payoutDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <div className="col-span-2 text-right text-slate-800">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={editQty}
              onChange={(e) => setEditQty(toNum(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-20 h-10 px-3 border border-slate-300 rounded-lg text-right text-sm"
            />
          ) : (
            holding.qty.toLocaleString()
          )}
        </div>
        <div className="col-span-2 text-right text-slate-500">
          {formatCurrency(holding.priceUSD, selectedCurrency, exchangeRates)}
          <div className="text-xs text-orange-500 italic">
            ~est.
          </div>
        </div>
        <div className="col-span-2 text-right">
          <span 
            className="inline-block font-bold text-base"
            style={{ 
              backgroundColor: '#4ade80', 
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700'
            }}
          >
            {getAPRValue(holding.interestRate).toFixed(1)}%
          </span>
        </div>
        <div className="col-span-2 text-right cd-value-primary">
          {formatCurrency(value, selectedCurrency, exchangeRates)}
        </div>
        <div className="col-span-1 flex items-center justify-end gap-2">
          {!isEditing ? (
            <>
              <button
                className="p-1 hover:opacity-70 transition-opacity"
                style={{ color: '#9ca3af', background: "transparent", border: "none" }}
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                className="p-1 hover:opacity-70 transition-opacity"
                style={{ color: '#9ca3af', background: "transparent", border: "none" }}
                onClick={onRemove}
                aria-label="Remove"
                title="Remove"
              >
                <Trash className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="btn-accent px-4 py-2 text-sm font-medium"
                onClick={save}
              >
                ✓ Save
              </button>
              <button
                className="btn-primary px-4 py-2 text-sm font-medium"
                onClick={() => {
                  setEditQty(holding.qty);
                  setIsEditing(false);
                }}
              >
                ✕ Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ==================== AssetRow Component ==================== */
const AssetRow: React.FC<{
  row: Row;
  index: number;
  value: number;
  onUpdate: (qty: number) => void;
  onRemove: () => void;
  isLoan?: boolean;
  selectedCurrency: string;
  exchangeRates: Record<string, number>;
}> = ({ row, value, onUpdate, onRemove, isLoan = false, selectedCurrency, exchangeRates }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState<number>(row.qty);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const save = () => {
    onUpdate(editQty);
    setIsEditing(false);
  };


  return (
    <div className="py-5">
      <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-3 flex items-center" style={{ gap: '24px' }}>
            <TokenIcon asset={row.asset} />
            <div>
              <div className="cd-asset-name">{row.asset.name}</div>
              {row.payoutDate && (
                <div className="text-xs text-slate-500">
                  Interest payout date: {new Date(row.payoutDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        <div className="col-span-2 text-right text-slate-800">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={editQty}
              onChange={(e) => setEditQty(toNum(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-20 h-10 px-3 border border-slate-300 rounded-lg text-right text-sm"
            />
          ) : (
            row.qty.toLocaleString()
          )}
        </div>
        <div className="col-span-2 text-right text-slate-500">
          {row.priceUSD ? `$${row.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
        </div>
        <div className="col-span-2 text-right">
          <span 
            className="inline-block font-bold text-base"
            style={{ 
              backgroundColor: isLoan ? '#ef4444' : '#4ade80', 
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700'
            }}
          >
            {getAPRValue(row.interestRate).toFixed(1)}%
          </span>
        </div>
        <div 
          className={`col-span-2 text-right ${isLoan ? 'cd-loan-value' : 'cd-value-primary'}`}
          style={isLoan ? { color: '#dc2626 !important', fontWeight: '600' } : {}}
        >
                      {isLoan ? `-${formatCurrency(value, selectedCurrency, exchangeRates)}` : formatCurrency(value, selectedCurrency, exchangeRates)}
        </div>
        <div className="col-span-1 flex items-center justify-end gap-2">
          {!isEditing ? (
            <>
              <button
                className="p-1 hover:opacity-70 transition-opacity"
                style={{ color: '#9ca3af', background: "transparent", border: "none" }}
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                className="p-1 hover:opacity-70 transition-opacity"
                style={{ color: '#9ca3af', background: "transparent", border: "none" }}
                onClick={onRemove}
                aria-label="Remove"
                title="Remove"
              >
                <Trash className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="btn-accent px-4 py-2 text-sm font-medium"
                onClick={save}
              >
                ✓ Save
              </button>
              <button
                className="btn-primary px-4 py-2 text-sm font-medium"
                onClick={() => {
                  setEditQty(row.qty);
                  setIsEditing(false);
                }}
              >
                ✕ Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ==================== Icons ==================== */
const Pencil = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="m14.06 6.19 3.75 3.75 1.5-1.5a2.65 2.65 0 0 0 0-3.75 2.65 2.65 0 0 0-3.75 0l-1.5 1.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const Trash = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 6h18M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m1 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h10Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/* ==================== Component ==================== */
export default function CDPUtilityApp() {
  const allAssets = useMemo(() => ASSETS.map(asset => ({
    ...asset,
    coingeckoId: asset.geckoId
  })) as Asset[], []);
  const selectableAssets = useMemo(() => allAssets.filter((a) => !a.isCDP), [allAssets]);
  const coindepoAsset = useMemo(() => allAssets.find((a) => a.isCDP)!, [allAssets]);

  // overige holdings (excl. COINDEPO)
  const [rows, setRows] = useState<Row[]>([]);
  const [addAssetSymbol, setAddAssetSymbol] = useState("");
  const [addQty, setAddQty] = useState<number>(0);
  const [addAssetInterestRate, setAddAssetInterestRate] = useState("");
  const [addAssetPayoutDate, setAddAssetPayoutDate] = useState(""); // New state for payout date
  const [selectedAssetPrice, setSelectedAssetPrice] = useState<number>(0);

  // COINDEPO holdings (nu als array voor meerdere holdings)
  const [coindepoHoldings, setCoindepoHoldings] = useState<Row[]>([]);
  const [cdpInputQty, setCdpInputQty] = useState("");
  const [cdpInputAPR, setCdpInputAPR] = useState(""); // New state for input APR
  const [cdpInputPayoutDate, setCdpInputPayoutDate] = useState(""); // New state for COINDEPO payout date
  const [showCoindepoInput, setShowCoindepoInput] = useState(false); // New state for showing input fields
  
  // Token Advantage Program - 2% extra payout option
  const [extraPayoutEnabled, setExtraPayoutEnabled] = useState(true);
  
  // Currency selector state
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110,
    CAD: 1.25,
    AUD: 1.35,
    CHF: 0.92
  });

  // COINDEPO price state - fixed at $0.10
  const [coindepoPrice] = useState<number>(0.10);

  // Currency symbols and labels
  const CURRENCIES = [
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'GBP', symbol: '£', label: 'British Pound' },
    { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
    { code: 'CHF', symbol: 'Fr', label: 'Swiss Franc' }
  ];

  // Function to fetch exchange rates
  const fetchExchangeRates = async () => {
    try {
      // Using a free exchange rate API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      if (data && data.rates) {
        setExchangeRates({
          USD: 1,
          EUR: data.rates.EUR || 0.85,
          GBP: data.rates.GBP || 0.73,
          JPY: data.rates.JPY || 110,
          CAD: data.rates.CAD || 1.25,
          AUD: data.rates.AUD || 1.35,
          CHF: data.rates.CHF || 0.92
        });
      }
    } catch (error) {
      console.log('Failed to fetch exchange rates, using fallback rates');
    }
  };

  // Fixed COINDEPO price - no API calls needed

  // Function to format currency values
  const formatCurrency = (value: number) => {
    const currency = CURRENCIES.find(c => c.code === selectedCurrency);
    const convertedValue = value * exchangeRates[selectedCurrency];
    
    if (selectedCurrency === 'JPY') {
      return `${currency?.symbol}${Math.round(convertedValue).toLocaleString()}`;
    } else {
      return `${currency?.symbol}${convertedValue.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
  };

  // Loans state
  const [loans, setLoans] = useState<Row[]>([]);
  const [addLoanSymbol, setAddLoanSymbol] = useState("");
  const [addLoanQty, setAddLoanQty] = useState<number>(0);
  const [addLoanAPR, setAddLoanAPR] = useState("");
  const [selectedLoanPrice, setSelectedLoanPrice] = useState<number>(0);

  // INIT - Simple localStorage loading
  useEffect(() => {
    console.log('Loading data on startup...');
    
    try {
      // Load rows
      const savedRows = localStorage.getItem('portfolio-rows');
      if (savedRows) {
        const parsedRows = JSON.parse(savedRows);
        console.log('Found saved rows:', parsedRows);
        
        const validRows = parsedRows
          .map((r: any) => {
            const asset = selectableAssets.find((a) => a.symbol === r.symbol);
          if (!asset) return null;
            return { 
              asset, 
              qty: r.qty || 0, 
              priceUSD: r.priceUSD || 0, 
              interestRate: r.interestRate || '',
              payoutDate: r.payoutDate || ''
            };
          })
          .filter((r: any) => r !== null);
        
        setRows(validRows);
      }
      
      // Load COINDEPO holdings
      const savedCoindepoHoldings = localStorage.getItem('coindepo-holdings');
      if (savedCoindepoHoldings) {
        const parsedHoldings = JSON.parse(savedCoindepoHoldings);
        console.log('Found saved COINDEPO holdings:', parsedHoldings);
        
        const validHoldings = parsedHoldings
          .map((h: any) => ({
            asset: coindepoAsset,
            qty: h.qty || 0,
            priceUSD: 0.10,
            interestRate: h.interestRate || '',
            payoutDate: h.payoutDate || ''
          }))
          .filter((h: any) => h.qty > 0);
        
        setCoindepoHoldings(validHoldings);
      }

      // Load loans
      const savedLoans = localStorage.getItem('portfolio-loans');
      if (savedLoans) {
        const parsedLoans = JSON.parse(savedLoans);
        console.log('Found saved loans:', parsedLoans);
        
        const validLoans = parsedLoans
          .map((l: any) => {
            const asset = selectableAssets.find((a) => a.symbol === l.symbol);
            if (!asset) return null;
            return { 
              asset, 
              qty: l.qty || 0, 
              priceUSD: l.priceUSD || 0, 
              interestRate: l.interestRate || '',
              payoutDate: l.payoutDate || ''
            };
          })
          .filter((l: any) => l !== null);
        
        setLoans(validLoans);
      }
      
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, [selectableAssets]);

  // Save data - Simple localStorage saving with automatic backup
  useEffect(() => {
    if (rows.length > 0) {
      const dataToSave = rows.map((r) => ({
        symbol: r.asset.symbol,
        qty: r.qty,
        priceUSD: r.priceUSD,
        interestRate: r.interestRate,
        payoutDate: r.payoutDate
      }));
      
      // Create automatic backup before saving new data
      const existingData = localStorage.getItem('portfolio-rows');
      if (existingData) {
        const timestamp = new Date().toISOString();
        localStorage.setItem(`portfolio-rows-backup-${timestamp}`, existingData);
        console.log('Created automatic backup:', `portfolio-rows-backup-${timestamp}`);
      }
      
      localStorage.setItem('portfolio-rows', JSON.stringify(dataToSave));
      console.log('Saved rows to localStorage:', dataToSave);
    } else {
      localStorage.removeItem('portfolio-rows');
      console.log('Removed empty rows from localStorage');
    }
  }, [rows]);

  // Save COINDEPO holdings data with automatic backup
  useEffect(() => {
    if (coindepoHoldings.length > 0) {
      const dataToSave = coindepoHoldings.map((h) => ({
        qty: h.qty,
        priceUSD: h.priceUSD,
        interestRate: h.interestRate,
        payoutDate: h.payoutDate
      }));
      
      // Create automatic backup before saving new data
      const existingData = localStorage.getItem('coindepo-holdings');
      if (existingData) {
        const timestamp = new Date().toISOString();
        localStorage.setItem(`coindepo-holdings-backup-${timestamp}`, existingData);
        console.log('Created COINDEPO backup:', `coindepo-holdings-backup-${timestamp}`);
      }
      
      localStorage.setItem('coindepo-holdings', JSON.stringify(dataToSave));
      console.log('Saved COINDEPO holdings to localStorage:', dataToSave);
    } else {
      localStorage.removeItem('coindepo-holdings');
      console.log('Removed empty COINDEPO holdings from localStorage');
    }
  }, [coindepoHoldings]);

  // Save loans data with automatic backup
  useEffect(() => {
    if (loans.length > 0) {
      const dataToSave = loans.map((l) => ({
        symbol: l.asset.symbol,
        qty: l.qty,
        priceUSD: l.priceUSD,
        interestRate: l.interestRate,
        payoutDate: l.payoutDate
      }));
      
      // Create automatic backup before saving new data
      const existingData = localStorage.getItem('portfolio-loans');
      if (existingData) {
        const timestamp = new Date().toISOString();
        localStorage.setItem(`portfolio-loans-backup-${timestamp}`, existingData);
        console.log('Created loans backup:', `portfolio-loans-backup-${timestamp}`);
      }
      
      localStorage.setItem('portfolio-loans', JSON.stringify(dataToSave));
      console.log('Saved loans to localStorage:', dataToSave);
    } else {
      localStorage.removeItem('portfolio-loans');
      console.log('Removed empty loans from localStorage');
    }
  }, [loans]);

  // Automatic backup system - every 15 minutes
  useEffect(() => {
    const createPeriodicBackup = () => {
      const timestamp = new Date().toISOString();
      console.log('Creating periodic backup:', timestamp);
      
      // Backup all portfolio data
      const portfolioData = localStorage.getItem('portfolio-rows');
      const coindepoData = localStorage.getItem('coindepo-holdings');
      const loansData = localStorage.getItem('portfolio-loans');
      
      if (portfolioData) {
        localStorage.setItem(`periodic-backup-portfolio-${timestamp}`, portfolioData);
      }
      if (coindepoData) {
        localStorage.setItem(`periodic-backup-coindepo-${timestamp}`, coindepoData);
      }
      if (loansData) {
        localStorage.setItem(`periodic-backup-loans-${timestamp}`, loansData);
      }
      
      // Clean up old periodic backups (keep only last 24 hours = 96 backups)
      const allKeys = Object.keys(localStorage);
      const periodicBackups = allKeys
        .filter(key => key.startsWith('periodic-backup-'))
        .sort()
        .reverse();
      
      if (periodicBackups.length > 96) {
        periodicBackups.slice(96).forEach(key => {
          localStorage.removeItem(key);
          console.log('Removed old periodic backup:', key);
        });
      }
      
      console.log('Periodic backup completed. Total backups:', periodicBackups.length);
    };

    // Create initial backup
    createPeriodicBackup();
    
    // Set up interval for every 15 minutes (900000 ms)
    const backupInterval = setInterval(createPeriodicBackup, 15 * 60 * 1000);
    
    return () => clearInterval(backupInterval);
  }, []); // Empty dependency array - run once on mount

  // Auto prijs voor rows en selectableAssets
  async function refreshPrices() {
    const rowIds = rows.map((r) => r.asset.coingeckoId).filter(Boolean) as string[];
    const allIds = selectableAssets.map((a) => a.coingeckoId).filter(Boolean) as string[];
    const uniqueIds = Array.from(new Set([...rowIds, ...allIds]));
    console.log('Refreshing prices for:', uniqueIds);
    const map = await fetchCoinGeckoPrices(uniqueIds);
    console.log('Price map received:', map);
    
    // Only update rows if there are existing rows
    if (rows.length > 0) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        priceUSD: r.asset.coingeckoId ? map[r.asset.coingeckoId] ?? r.priceUSD : r.priceUSD,
      }))
    );
    }
    
    // Update selectableAssets with prices
    selectableAssets.forEach(asset => {
      if (asset.coingeckoId && map[asset.coingeckoId]) {
        (asset as any).priceUSD = map[asset.coingeckoId];
      }
    });
  }
  useEffect(() => {
    refreshPrices();
    const t = setInterval(refreshPrices, 120_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  // Fetch exchange rates on startup and hourly updates
  useEffect(() => {
    fetchExchangeRates();
    // Update rates every hour
    const interval = setInterval(fetchExchangeRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Update existing COINDEPO holdings with fixed price
  useEffect(() => {
    if (coindepoHoldings.length > 0) {
      setCoindepoHoldings(prevHoldings => 
        prevHoldings.map(holding => ({
          ...holding,
          priceUSD: coindepoPrice
        }))
      );
    }
  }, [coindepoPrice]);

  // Fetch price when asset is selected - Enhanced
  useEffect(() => {
    console.log('Asset selection changed:', addAssetSymbol);
    
    if (addAssetSymbol) {
      const asset = selectableAssets.find(a => a.symbol === addAssetSymbol);
      console.log('Found asset:', asset);
      
      if (asset?.coingeckoId) {
        console.log(`Fetching price for selected asset: ${asset.symbol} (${asset.coingeckoId})`);
        setSelectedAssetPrice(0); // Reset to show loading
        
        fetchSinglePrice(asset.coingeckoId).then(price => {
          console.log(`Price response for ${asset.symbol}:`, price);
          if (price && price > 0) {
            setSelectedAssetPrice(price);
            console.log(`Price set for ${asset.symbol}: $${price}`);
          } else {
            console.log(`No valid price for ${asset.symbol}, setting to 0`);
            setSelectedAssetPrice(0);
          }
        }).catch(error => {
          console.error(`Error fetching price for ${asset.symbol}:`, error);
          setSelectedAssetPrice(0);
        });
      } else {
        console.log(`No coingeckoId for ${asset?.symbol || 'unknown asset'}`);
        setSelectedAssetPrice(0);
      }
    } else {
      setSelectedAssetPrice(0);
    }
  }, [addAssetSymbol, selectableAssets]);

  // Fetch price when loan asset is selected
  useEffect(() => {
    console.log('Loan asset selection changed:', addLoanSymbol);
    
    if (addLoanSymbol) {
      const asset = selectableAssets.find(a => a.symbol === addLoanSymbol);
      console.log('Found loan asset:', asset);
      
      if (asset?.coingeckoId) {
        console.log(`Fetching price for selected loan asset: ${asset.symbol} (${asset.coingeckoId})`);
        setSelectedLoanPrice(0); // Reset to show loading
        
        fetchSinglePrice(asset.coingeckoId).then(price => {
          console.log(`Loan price response for ${asset.symbol}:`, price);
          if (price && price > 0) {
            setSelectedLoanPrice(price);
            console.log(`Loan price set for ${asset.symbol}: $${price}`);
          } else {
            console.log(`No valid loan price for ${asset.symbol}, setting to 0`);
            setSelectedLoanPrice(0);
          }
        }).catch(error => {
          console.error(`Error fetching loan price for ${asset.symbol}:`, error);
          setSelectedLoanPrice(0);
        });
      } else {
        console.log(`No coingeckoId for loan ${asset?.symbol || 'unknown asset'}`);
        setSelectedLoanPrice(0);
      }
    } else {
      setSelectedLoanPrice(0);
    }
  }, [addLoanSymbol, selectableAssets]);

  // Totals
  const otherValueUSD = rows.reduce((s, r) => s + (r.qty * r.priceUSD || 0), 0);
  const cdpValueUSD = coindepoHoldings.reduce((s, h) => s + (h.qty * h.priceUSD || 0), 0);
  const loansValueUSD = loans.reduce((s, l) => s + (l.qty * l.priceUSD || 0), 0);
  const holdingsTotal = otherValueUSD + cdpValueUSD; // Total holdings (belangrijk voor Token Tier)
  const netHoldings = holdingsTotal - loansValueUSD; // Net holdings na aftrek loans

  // Token Advantage Program Tiers (Official COINDEPO)
  type TierDef = { label: string; pct: number; depositBonus: number; loanBonus: number; tokenPayout: number };
  const TIERS: TierDef[] = [
    { label: "Tier 1 (0-4.99%)", pct: 0.00, depositBonus: 0.00, loanBonus: 0.00, tokenPayout: 0.02 },
    { label: "Tier 2 (5-9.99%)", pct: 0.05, depositBonus: 0.01, loanBonus: 0.01, tokenPayout: 0.02 },
    { label: "Tier 3 (10-14.99%)", pct: 0.10, depositBonus: 0.02, loanBonus: 0.02, tokenPayout: 0.02 },
    { label: "Tier 4 (15%+)", pct: 0.15, depositBonus: 0.03, loanBonus: 0.03, tokenPayout: 0.02 },
  ];
  const cdpShare = holdingsTotal > 0 ? (cdpValueUSD / holdingsTotal) * 100 : 0;
  let tierLabel = "None";
  let currentTier = TIERS[0]; // Default to Tier 1
  
  // Find the correct tier based on COINDEPO percentage
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (cdpShare >= TIERS[i].pct * 100) {
      tierLabel = TIERS[i].label.split(" ")[0] + " " + TIERS[i].label.split(" ")[1];
      currentTier = TIERS[i];
      break;
    }
  }

  // Extract individual bonuses
  const depositBonus = currentTier.depositBonus;
  const loanBonus = currentTier.loanBonus;
  const tokenPayoutBonus = extraPayoutEnabled ? currentTier.tokenPayout : 0;

  // Token Advantage Program calculations (Official COINDEPO)
  const depositBonusUSD = otherValueUSD * depositBonus; // Extra APR on deposits
  const loanSavingsUSD = loansValueUSD * loanBonus; // Savings on loan interest
  const tokenPayoutUSD = tokenPayoutBonus * cdpValueUSD; // Extra payout in tokens (if enabled) - based on COINDEPO holdings
  
  // Total utility from Token Advantage Program
  const utilityUSD = depositBonusUSD + loanSavingsUSD + tokenPayoutUSD;
  const utilityYield = cdpValueUSD > 0 ? (utilityUSD / cdpValueUSD) * 100 : 0;

  function needForPctUSD(p: number) {
    if (p <= 0) return 0;
    const numer = p * otherValueUSD - (1 - p) * cdpValueUSD;
    const denom = 1 - p;
    const delta = numer / denom;
    return Math.max(0, delta);
  }

  // Add holding (géén prijsveld; CoinGecko levert prijs)
  async function handleAddHolding() {
    const asset = selectableAssets.find((a) => a.symbol === addAssetSymbol);
    if (!asset || addQty <= 0 || !addAssetInterestRate) return;

    let price = selectedAssetPrice;
    if (price === 0 && asset.coingeckoId) {
      console.log(`Fetching price for ${asset.symbol} (${asset.coingeckoId})`);
      const p = await fetchSinglePrice(asset.coingeckoId);
      price = typeof p === "number" ? p : 0;
      console.log(`Price fetched: ${price}`);
    }
    const newRow = { asset, qty: addQty, priceUSD: price, interestRate: addAssetInterestRate, payoutDate: addAssetPayoutDate };
    console.log('Adding new asset to rows:', newRow);
    setRows((prev) => {
      const updated = [...prev, newRow];
      console.log('Updated rows:', updated);
      return updated;
    });
    
    // Reset all input fields
    setAddAssetSymbol("");
    setAddQty(0);
    setAddAssetInterestRate("");
    setAddAssetPayoutDate("");
    setSelectedAssetPrice(0);
  }

  // Add COINDEPO holding
  function handleAddCoindepoHolding() {
    const q = toNum(cdpInputQty);
    if (q <= 0 || !cdpInputAPR) return;

    const newHolding = { 
      asset: coindepoAsset, 
      qty: q, 
      priceUSD: 0.10, 
      interestRate: cdpInputAPR,
      payoutDate: cdpInputPayoutDate
    };
    console.log('Adding new COINDEPO holding:', newHolding);
    setCoindepoHoldings((prev) => {
      const updated = [...prev, newHolding];
      console.log('Updated COINDEPO holdings:', updated);
      return updated;
    });
    
    // Reset all input fields
    setCdpInputQty("");
    setCdpInputAPR("");
    setCdpInputPayoutDate("");
    setShowCoindepoInput(false);
  }

  // Add loan
  async function handleAddLoan() {
    const asset = selectableAssets.find((a) => a.symbol === addLoanSymbol);
    if (!asset || addLoanQty <= 0 || !addLoanAPR) return;

    let price = selectedLoanPrice;
    if (price === 0 && asset.coingeckoId) {
      console.log(`Fetching price for loan ${asset.symbol} (${asset.coingeckoId})`);
      const p = await fetchSinglePrice(asset.coingeckoId);
      price = typeof p === "number" ? p : 0;
      console.log(`Loan price fetched: ${price}`);
    }
    const newLoan = { asset, qty: addLoanQty, priceUSD: price, interestRate: addLoanAPR };
    console.log('Adding new loan:', newLoan);
    setLoans((prev) => {
      const updated = [...prev, newLoan];
      console.log('Updated loans:', updated);
      return updated;
    });
    
    // Reset all input fields
    setAddLoanSymbol("");
    setAddLoanQty(0);
    setAddLoanAPR("");
    setSelectedLoanPrice(0);
  }

  // Reset portfolio function
  function handleResetPortfolio() {
    if (confirm("Are you sure you want to reset your entire portfolio? This action cannot be undone.")) {
      setRows([]);
      setLoans([]);
      setCoindepoHoldings([]);
      setCdpInputQty("");
      setCdpInputAPR("");
      setCdpInputPayoutDate("");
      setShowCoindepoInput(false);
      setAddAssetSymbol("");
      setAddQty(0);
      setAddAssetInterestRate("");
      setAddAssetPayoutDate("");
      setSelectedAssetPrice(0);
      setAddLoanSymbol("");
      setAddLoanQty(0);
      setAddLoanAPR("");
      setSelectedLoanPrice(0);
      
      // Clear localStorage
      localStorage.removeItem('portfolio-rows');
      localStorage.removeItem('portfolio-loans');
      localStorage.removeItem('coindepo-holdings');
      
      console.log('Portfolio reset successfully');
    }
  }

  function handleRestoreFromBackup() {
    // Get all backup keys
    const backupKeys = Object.keys(localStorage).filter(key => 
      key.includes('-backup-') && (
        key.startsWith('portfolio-rows-backup-') || 
        key.startsWith('coindepo-holdings-backup-') || 
        key.startsWith('portfolio-loans-backup-')
      )
    ).sort().reverse(); // Most recent first

    if (backupKeys.length === 0) {
      alert('No backups found.');
      return;
    }

    const backupList = backupKeys.slice(0, 10).map((key, index) => {
      const timestamp = key.split('-backup-')[1];
      const type = key.split('-backup-')[0];
      return `${index + 1}. ${type} - ${new Date(timestamp).toLocaleString()}`;
    }).join('\n');

    const choice = prompt(`Available backups (showing last 10):\n\n${backupList}\n\nEnter backup number to restore (1-${Math.min(10, backupKeys.length)}):`);
    
    if (choice && !isNaN(parseInt(choice))) {
      const selectedIndex = parseInt(choice) - 1;
      if (selectedIndex >= 0 && selectedIndex < backupKeys.length) {
        const selectedKey = backupKeys[selectedIndex];
        const backupData = localStorage.getItem(selectedKey);
        
        if (backupData && confirm(`Restore backup from ${new Date(selectedKey.split('-backup-')[1]).toLocaleString()}?\n\nThis will overwrite your current data.`)) {
          try {
            if (selectedKey.startsWith('portfolio-rows-backup-')) {
              localStorage.setItem('portfolio-rows', backupData);
            } else if (selectedKey.startsWith('coindepo-holdings-backup-')) {
              localStorage.setItem('coindepo-holdings', backupData);
            } else if (selectedKey.startsWith('portfolio-loans-backup-')) {
              localStorage.setItem('portfolio-loans', backupData);
            }
            
            // Reload the page to apply the restored data
            window.location.reload();
          } catch (error) {
            console.error('Error restoring backup:', error);
            alert('Error restoring backup. Please try again.');
          }
        }
      }
    }
  }

  return (
    <div className="bg-brand-gray">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
            <h1 className="cd-balance-large">
              <span className="font-bold uppercase">COINDEPO</span> <span className="font-normal">Portfolio Manager</span>
            </h1>
          </div>
          
          <p className="text-xl text-slate-600 mb-4 max-w-3xl mx-auto">
            Maximize your crypto returns with up to 27% APR and unlock exclusive Token Advantage Program benefits
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-2xl mx-auto">
            <p className="text-sm text-blue-700">
              <strong>🚧 Under Development:</strong> This portfolio manager is still being refined. Some features may not work as expected.
            </p>
          </div>
        </div>

        {/* ======= PORTFOLIO SECTION ======= */}
        <section className="card mb-6">
          <header className="mb-6 flex justify-between items-center">
            <h1 className="cd-balance-large text-brand-blue">Your Portfolio</h1>
            <div className="flex gap-2 items-center">
              {/* Currency Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Currency:</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
              </div>
              
                {/* Only show Restore Backup in development */}
                {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                  <button
                    onClick={handleRestoreFromBackup}
                    className="btn-primary px-4 py-2 text-sm font-medium"
                    title="Restore from automatic backup"
                  >
                    Restore Backup
                  </button>
                )}
              <button
                onClick={handleResetPortfolio}
                className="btn-primary px-4 py-2 text-sm font-medium text-red-600"
                title="Reset entire portfolio"
              >
                Reset Portfolio
              </button>
            </div>
          </header>
          
          <h2 className="cd-label" style={{ marginBottom: '24px' }}>YOUR ASSETS</h2>

          {/* Assets List Header */}
          {rows.length > 0 && (
          <div className="grid grid-cols-12 gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-slate-400">
            <div className="col-span-3"></div>
            <div className="col-span-2 text-right">QTY</div>
            <div className="col-span-2 text-right">PRICE</div>
            <div className="col-span-2 text-right">AVG APY</div>
            <div className="col-span-2 text-right">VALUE</div>
            <div className="col-span-1"></div>
          </div>
          )}

          {/* Assets List */}
          {rows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {rows.map((r, i) => {
                const value = (r.qty || 0) * (r.priceUSD || 0);

                return (
                  <AssetRow
                    key={`${r.asset.symbol}-${i}`}
                    row={r}
                    index={i}
                    value={value}
                    selectedCurrency={selectedCurrency}
                    exchangeRates={exchangeRates}
                    onUpdate={(newQty) => {
                      const next = [...rows];
                      next[i].qty = newQty;
                      setRows(next);
                    }}
                    onRemove={() => setRows(rows.filter((_, idx) => idx !== i))}
                  />
                );
              })}
            </div>
          )}

          {/* Add Asset Input Row - With Better Padding */}
          <div style={{ marginTop: '32px', padding: '16px 0' }}>
            <div className="flex items-end justify-between">
              {/* Left side - Input fields */}
              <div className="flex items-end" style={{ gap: '24px' }}>
                {/* Asset Selection - Always Visible */}
                <div style={{ width: '256px' }}>
              <select
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm"
                value={addAssetSymbol}
                onChange={(e) => setAddAssetSymbol(e.target.value)}
              >
                    <option value="">Add asset...</option>
                {selectableAssets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
                
                {/* QTY Input - Only show after asset selection */}
                {addAssetSymbol && (
                  <div style={{ width: '80px' }}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">QTY</label>
              <input
                      type="number"
                placeholder="Qty"
                value={addQty || ""}
                onChange={(e) => setAddQty(toNum(e.target.value))}
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg text-right text-sm"
              />
            </div>
                )}
                
                {/* APR Selection - Only show after asset selection */}
                {addAssetSymbol && (
                  <div style={{ width: '176px' }}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Interest Account Type</label>
                    <select
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm"
                      value={addAssetInterestRate}
                      onChange={(e) => setAddAssetInterestRate(e.target.value)}
                    >
                      <option value="">Select APR...</option>
                      {getAPROptions(addAssetSymbol).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Interest Payout Date - Only show after asset selection */}
                {addAssetSymbol && (
                  <div style={{ width: '140px' }}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Interest Payout Date</label>
                    <input
                      type="date"
                      placeholder="Payout Date"
                      value={addAssetPayoutDate}
                      onChange={(e) => setAddAssetPayoutDate(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Right side - ADD Button */}
              {addAssetSymbol && (
                <div style={{ marginLeft: '32px' }}>
              <button
                      className="btn-accent px-4 py-2 text-sm font-medium"
                onClick={handleAddHolding}
                      disabled={!addAssetSymbol || addQty <= 0 || !addAssetInterestRate}
              >
                ADD
              </button>
            </div>
              )}
            </div>
          </div>

          {/* ======= YOUR COINDEPO HOLDINGS SECTION ======= */}
          <div className="mt-8 pt-6">
            <div style={{ marginBottom: '24px' }}>
              <h2 className="cd-label">YOUR COINDEPO HOLDINGS</h2>
              <p className="text-xs text-orange-600 italic mt-1">
                * Prices are estimated until live API becomes available
              </p>
          </div>


            {/* Display added COINDEPO holdings */}
            {coindepoHoldings.length > 0 && (
              <div>
                {/* COINDEPO List Header */}
                <div className="grid grid-cols-12 gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-slate-400">
                  <div className="col-span-3"></div>
                  <div className="col-span-2 text-right">QTY</div>
                  <div className="col-span-2 text-right">PRICE</div>
                  <div className="col-span-2 text-right">AVG APY</div>
                  <div className="col-span-2 text-right">VALUE</div>
                  <div className="col-span-1"></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {coindepoHoldings.map((holding, i) => {
                    const value = (holding.qty || 0) * (holding.priceUSD || 0);

              return (
                      <CoindepoRow
                        key={`coindepo-${i}`}
                        holding={holding}
                        index={i}
                        value={value}
                        coindepoAsset={coindepoAsset}
                        selectedCurrency={selectedCurrency}
                        exchangeRates={exchangeRates}
                        onUpdate={(newQty) => {
                          const next = [...coindepoHoldings];
                          next[i].qty = newQty;
                          setCoindepoHoldings(next);
                        }}
                        onRemove={() => setCoindepoHoldings(coindepoHoldings.filter((_, idx) => idx !== i))}
                      />
                    );
                  })}
                    </div>
              </div>
            )}

            {/* COINDEPO Input Row - Step by Step Flow */}
            <div style={{ marginTop: '32px', padding: '16px 0' }}>
              <div className="flex items-end justify-between">
                {/* Left side - Input fields */}
                <div className="flex items-end" style={{ gap: '24px' }}>
                  {/* COINDEPO Selection - Always Visible */}
                  <div style={{ width: '256px' }}>
                    <select
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm"
                      value={showCoindepoInput ? "COINDEPO" : ""}
                      onChange={(e) => setShowCoindepoInput(e.target.value === "COINDEPO")}
                    >
                      <option value="">Add COINDEPO...</option>
                      <option value="COINDEPO">COINDEPO Token</option>
                    </select>
                  </div>
                  
                  {/* QTY Input - Only show after COINDEPO selection */}
                  {showCoindepoInput && (
                    <div style={{ width: '80px' }}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">QTY</label>
                        <input
                        type="number"
                        placeholder="Qty"
                        value={cdpInputQty || ""}
                        onChange={(e) => setCdpInputQty(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-right text-sm"
                      />
                    </div>
                  )}
                  
                  {/* APR Selection - Only show after COINDEPO selection */}
                  {showCoindepoInput && (
                    <div style={{ width: '176px' }}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interest Account Type</label>
                      <select 
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm"
                        value={cdpInputAPR}
                        onChange={(e) => setCdpInputAPR(e.target.value)}
                      >
                        <option value="">Select APR...</option>
                        <option value="coindepo-21.5">WEEKLY: 21.5% APR</option>
                        <option value="coindepo-23">MONTHLY: 23% APR</option>
                        <option value="coindepo-24">QUARTERLY: 24% APR</option>
                        <option value="coindepo-25">SEMI-ANNUAL: 25% APR</option>
                        <option value="coindepo-27">ANNUAL: 27% APR</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Interest Payout Date - Only show after COINDEPO selection */}
                  {showCoindepoInput && (
                    <div style={{ width: '140px' }}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interest Payout Date</label>
                      <input
                        type="date"
                        placeholder="Payout Date"
                        value={cdpInputPayoutDate}
                        onChange={(e) => setCdpInputPayoutDate(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  )}
                  
                  {/* Price Display - Only show after QTY and APR are filled */}
                  {showCoindepoInput && cdpInputQty && cdpInputAPR && (
                    <>
                      <div className="w-20 text-right text-slate-500 text-sm">
                        PRICE
                      </div>
                      <div className="w-24 text-right text-slate-500 text-sm">
                        {formatCurrency(0.10)}
                        <div className="text-xs text-orange-500 italic">
                          ~estimated
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Right side - ADD Button */}
                {showCoindepoInput && (
                  <div style={{ marginLeft: '32px' }}>
                          <button
                      className="btn-accent px-4 py-2 text-sm font-medium"
                      onClick={handleAddCoindepoHolding}
                      disabled={!cdpInputQty || toNum(cdpInputQty) <= 0 || !cdpInputAPR}
                    >
                      ADD
                          </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======= YOUR LOANS SECTION ======= */}
          <div className="mt-8 pt-6">
              <h2 className="cd-label" style={{ marginBottom: '24px' }}>YOUR LOANS</h2>

            {/* Loans List Header */}
            {loans.length > 0 && (
              <div className="grid grid-cols-12 gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-slate-400">
                <div className="col-span-3"></div>
                <div className="col-span-2 text-right">QTY</div>
                <div className="col-span-2 text-right">PRICE</div>
                <div className="col-span-2 text-right">AVG APY</div>
                <div className="col-span-2 text-right">VALUE</div>
                <div className="col-span-1"></div>
              </div>
            )}

            {/* Loans List */}
            {loans.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {loans.map((loan, i) => {
                  const value = (loan.qty || 0) * (loan.priceUSD || 0);

                  return (
                    <AssetRow
                      key={`${loan.asset.symbol}-${i}`}
                      row={loan}
                      index={i}
                      value={value}
                      isLoan={true}
                      selectedCurrency={selectedCurrency}
                      exchangeRates={exchangeRates}
                      onUpdate={(newQty) => {
                        const next = [...loans];
                        next[i].qty = newQty;
                        setLoans(next);
                      }}
                      onRemove={() => setLoans(loans.filter((_, idx) => idx !== i))}
                    />
                  );
                })}
              </div>
            )}

            {/* Add Loan Input Row - Step by Step Flow */}
            <div style={{ marginTop: '32px', padding: '16px 0' }}>
              <div className="flex items-center justify-between">
                {/* Left side - Input fields */}
                <div className="flex items-center" style={{ gap: '24px' }}>
                  {/* Asset Selection - Always Visible */}
                  <div style={{ width: '256px' }}>
                    <select
                      className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm"
                      value={addLoanSymbol}
                      onChange={(e) => setAddLoanSymbol(e.target.value)}
                    >
                      <option value="">Add loan...</option>
                      {selectableAssets.map((a) => (
                        <option key={a.symbol} value={a.symbol}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* QTY Input - Only show after asset selection */}
                  {addLoanSymbol && (
                    <div style={{ width: '80px' }}>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={addLoanQty || ""}
                        onChange={(e) => setAddLoanQty(toNum(e.target.value))}
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg text-right text-sm"
                      />
                    </div>
                  )}
                  
                  {/* APR Selection - Only show after asset selection */}
                  {addLoanSymbol && (
                    <div style={{ width: '176px' }}>
                      <select
                        className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm"
                        value={addLoanAPR}
                        onChange={(e) => setAddLoanAPR(e.target.value)}
                      >
                        <option value="">Select APY...</option>
                        {getLoanAPROptions().map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Price Display - Only show after QTY and APR are filled */}
                  {addLoanSymbol && addLoanQty > 0 && addLoanAPR && (
                    <>
                      <div className="w-20 text-right text-slate-500 text-sm">
                        PRICE
                      </div>
                      <div className="w-24 text-right text-slate-500 text-sm">
                        {selectedLoanPrice > 0 
                          ? `$${selectedLoanPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                          : "Loading..."
                        }
                      </div>
                      <div className="w-20 text-right text-slate-500 text-sm">
                        VALUE
                      </div>
                      <div className="w-24 text-right text-slate-500 text-sm">
                        {formatCurrency((addLoanQty || 0) * selectedLoanPrice)}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Right side - ADD Button */}
                {addLoanSymbol && (
                  <div style={{ marginLeft: '32px' }}>
                          <button
                      className="btn-accent px-4 py-2 text-sm font-medium"
                      onClick={handleAddLoan}
                      disabled={!addLoanSymbol || addLoanQty <= 0 || !addLoanAPR}
                    >
                      ADD
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

          {/* ======= PORTFOLIO TOTALS ======= */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex justify-end">
              <div className="text-right space-y-2">
                <div className="mb-2">
                  <span className="text-slate-600">Assets: </span>
                  <span className="font-semibold">{formatCurrency(otherValueUSD)}</span>
                </div>
                <div className="mb-2">
                  <span className="text-slate-600">COINDEPO: </span>
                  <span className="font-semibold">{formatCurrency(cdpValueUSD)}</span>
          </div>
                <div className="mb-3 pb-2 border-b border-slate-200">
                  <span className="text-slate-600">Holdings Total (for tiers): </span>
                  <span className="text-lg font-semibold text-blue-600">{formatCurrency(holdingsTotal)}</span>
                </div>
                {loansValueUSD > 0 && (
                  <div className="mb-2">
                    <span className="text-slate-600">Loans: </span>
                    <span className="font-semibold cd-loan-value" style={{color: '#dc2626 !important'}}>-{formatCurrency(loansValueUSD)}</span>
                  </div>
                )}
                
            </div>
          </div>

            {/* Extra witregel en groene totaal */}
            <div className="mt-8 pt-4 flex justify-end">
              <div className="text-right">
                <div className="cd-total-green">
                  Net Holdings: {formatCurrency(netHoldings)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======= INTEREST CONTRIBUTIONS SECTION ======= */}
        <section className="card mb-6">
          <header className="mb-6 flex justify-between items-center">
            <h1 className="cd-balance-large text-brand-blue">Interest Contributions</h1>
          </header>
          
          {/* Calculate total portfolio value for percentages */}
          {(() => {
            const totalPortfolioValue = holdingsTotal;
            const allHoldings = [
              ...rows.map(row => ({
                asset: row.asset,
                qty: row.qty,
                value: row.qty * row.priceUSD,
                apr: getAPRValue(row.interestRate),
                annualInterest: (row.qty * row.priceUSD) * (getAPRValue(row.interestRate) / 100)
              })),
              ...coindepoHoldings.map(holding => ({
                asset: holding.asset,
                qty: holding.qty,
                value: holding.qty * holding.priceUSD,
                apr: getAPRValue(holding.interestRate),
                annualInterest: (holding.qty * holding.priceUSD) * (getAPRValue(holding.interestRate) / 100)
              }))
            ];

            const totalAnnualInterest = allHoldings.reduce((sum, holding) => sum + holding.annualInterest, 0);
            const netAnnualInterest = totalAnnualInterest - (loansValueUSD * 0.275); // Average loan APR

            return (
              <>
                {allHoldings.length > 0 ? (
                  <>
                    {/* Interest List Header */}
            <div className="grid grid-cols-12 gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-slate-400">
                      <div className="col-span-3"></div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right">PORTFOLIO %</div>
                      <div className="col-span-2 text-right">APR</div>
                      <div className="col-span-2 text-right">ANNUAL INTEREST</div>
                      <div className="col-span-1"></div>
            </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {allHoldings.map((holding, i) => {
                        const portfolioPercentage = totalPortfolioValue > 0 ? (holding.value / totalPortfolioValue) * 100 : 0;
                        
                        return (
                          <div key={`interest-${i}`} className="py-5">
              <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-3 flex items-center" style={{ gap: '24px' }}>
                                <TokenIcon asset={holding.asset} />
                                <div>
                                  <div className="cd-asset-name">
                                    {holding.qty.toLocaleString()} {holding.asset.name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {formatCurrency(holding.value)}
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-2"></div>
                              <div className="col-span-2 text-right text-slate-800">
                                {portfolioPercentage.toFixed(1)}%
                              </div>
                <div className="col-span-2 text-right">
                                <span 
                                  className="inline-block font-bold text-base"
                                  style={{ 
                                    backgroundColor: '#4ade80', 
                                    color: '#ffffff',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}
                                >
                                  {holding.apr.toFixed(1)}%
                                </span>
                        </div>
                              <div className="col-span-2 text-right cd-value-primary">
                                {formatCurrency(holding.annualInterest)}/year
                    </div>
                              <div className="col-span-1"></div>
                  </div>
                </div>
              );
            })}
                      
                      {/* Show individual loan interest deductions */}
                      {loans.map((loan, i) => {
                        const loanValue = loan.qty * loan.priceUSD;
                        const annualInterest = loanValue * (getAPRValue(loan.interestRate) / 100);
                        const interestInAsset = annualInterest / loan.priceUSD;
                        
                        return (
                          <div key={`loan-interest-${i}`} className="py-5">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-3 flex items-center" style={{ gap: '24px' }}>
                                <TokenIcon asset={loan.asset} />
                                <div>
                                  <div className="cd-asset-name text-red-600">
                                    {interestInAsset.toLocaleString()} {loan.asset.name} Interest
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {formatCurrency(annualInterest)}
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-2"></div>
                              <div className="col-span-2 text-right text-slate-800">
                                -
                              </div>
                              <div className="col-span-2 text-right">
                                <span 
                                  className="inline-block font-bold text-base"
                                  style={{ 
                                    backgroundColor: '#ef4444', 
                                    color: '#ffffff',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}
                                >
                                  {getAPRValue(loan.interestRate).toFixed(1)}%
                                </span>
                              </div>
                              <div className="col-span-2 text-right cd-loan-value" style={{color: '#dc2626 !important'}}>
                                -{formatCurrency(annualInterest)}/year
                              </div>
                              <div className="col-span-1"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                        {/* Net Interest Income Total */}
                        <div className="mt-12 pt-8 border-t border-slate-200">
                          <div className="flex justify-end">
                            <div className="text-right">
                              <div className="text-xs text-slate-500 mb-4">Total from all assets</div>
              </div>
              </div>
                          
                          {/* Extra witregel en groene totaal */}
                          <div className="mt-8 pt-4 flex justify-end">
                            <div className="text-right">
                              <div className="cd-total-green">
                                Net Interest Income: {fmtUSD(netAnnualInterest)}/year
            </div>
          </div>
                          </div>
                        </div>
                  </>
                ) : (
                  <p className="text-slate-500">Add assets to see interest contributions.</p>
                )}
              </>
            );
          })()}
        </section>

        {/* Upcoming Interest Payouts Section */}
        <section className="card mb-6">
          <header className="mb-6 flex justify-between items-center">
            <h1 className="cd-balance-large text-brand-blue">Upcoming Interest Payouts</h1>
          </header>
          
          {(() => {
            // Get all holdings with payout dates
            const upcomingPayouts = [
              ...rows.filter(row => row.payoutDate).map(row => ({
                asset: row.asset,
                qty: row.qty,
                payoutDate: row.payoutDate!,
                apr: getAPRValue(row.interestRate),
                interestPeriod: getInterestPeriod(row.interestRate),
                isLoan: false
              })),
              ...coindepoHoldings.filter(holding => holding.payoutDate).map(holding => ({
                asset: coindepoAsset,
                qty: holding.qty,
                payoutDate: holding.payoutDate!,
                apr: getAPRValue(holding.interestRate),
                interestPeriod: getInterestPeriod(holding.interestRate),
                isLoan: false
              })),
              ...loans.filter(loan => loan.payoutDate).map(loan => ({
                asset: loan.asset,
                qty: loan.qty,
                payoutDate: loan.payoutDate!,
                apr: getAPRValue(loan.interestRate),
                interestPeriod: getInterestPeriod(loan.interestRate),
                isLoan: true
              }))
            ];

            // Sort by payout date (earliest first)
            upcomingPayouts.sort((a, b) => new Date(a.payoutDate).getTime() - new Date(b.payoutDate).getTime());

            // Function to calculate compound interest for each holding (using 30 days per month)
            function calculateCompoundInterest(qty: number, apr: number, periodDays: number, payoutDate: string, priceUSD: number) {
              const now = new Date();
              const payout = new Date(payoutDate);
              
              // Calculate interest start date by working backward from payout date
              const interestStart = new Date(payout);
              interestStart.setDate(interestStart.getDate() - periodDays);
              
              // Days elapsed since interest started accruing
              const daysElapsed = Math.max(0, Math.floor((now.getTime() - interestStart.getTime()) / (1000 * 60 * 60 * 24)));
              
              // Calculate compound interest using daily compounding formula
              // A = P(1 + r/n)^(nt) where n = 360 (daily compounding based on 30 days per month)
              const principal = qty * priceUSD;
              const dailyRate = apr / 100 / 360; // Using 360 days per year (30 days * 12 months)
              const compoundFactor = Math.pow(1 + dailyRate, daysElapsed);
              const accruedValue = principal * compoundFactor;
              const accruedInterest = accruedValue - principal;
              
              return {
                principal,
                accruedInterest: Math.max(0, accruedInterest),
                accruedValue,
                interestStart,
                daysElapsed
              };
            }

            // Function to get interest period in days from interestRate (using 30 days per month)
            function getInterestPeriod(interestRate?: string): number {
              if (!interestRate) return 360; // 12 months * 30 days
              if (interestRate.includes('18.5') || interestRate.includes('12.5')) return 7; // WEEKLY
              if (interestRate.includes('20') || interestRate.includes('23') || interestRate.includes('14')) return 30; // MONTHLY
              if (interestRate.includes('21') || interestRate.includes('24') || interestRate.includes('15')) return 90; // QUARTERLY (3 months * 30 days)
              if (interestRate.includes('22') || interestRate.includes('25') || interestRate.includes('16')) return 180; // SEMI-ANNUAL (6 months * 30 days)
              if (interestRate.includes('24') || interestRate.includes('27') || interestRate.includes('18')) return 360; // ANNUAL (12 months * 30 days)
              return 360; // Default to annual
            }

            return upcomingPayouts.length > 0 ? (
              <>
                {/* Payouts List Header */}
                <div className="grid grid-cols-11 gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-slate-400">
                  <div className="col-span-3"></div>
                  <div className="col-span-3 text-right">INTEREST STARTED</div>
                  <div className="col-span-3 text-right">ACCRUED INTEREST</div>
                  <div className="col-span-2 text-right">PAYOUT</div>
            </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {upcomingPayouts.map((payout, i) => {
                    const assetPrice = payout.asset.symbol === 'COINDEPO' ? 0.10 : 
                      (rows.find(r => r.asset.symbol === payout.asset.symbol)?.priceUSD || 
                       loans.find(l => l.asset.symbol === payout.asset.symbol)?.priceUSD || 0);
                    
                    const calculation = calculateCompoundInterest(
                      payout.qty, 
                      payout.apr, 
                      payout.interestPeriod, 
                      payout.payoutDate,
                      assetPrice
                    );

                    return (
                      <div key={`payout-${i}`} className="py-5">
                        <div className="grid grid-cols-11 gap-2 items-center">
                          <div className="col-span-3 flex items-center" style={{ gap: '24px' }}>
                            <TokenIcon asset={payout.asset} />
                            <div>
                              <div className={`cd-asset-name ${payout.isLoan ? 'text-red-600' : ''}`}>
                                {payout.qty.toLocaleString()} {payout.asset.name}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-3 text-right text-slate-500">
                            {calculation.interestStart.toLocaleDateString()}
                          </div>
                          <div className="col-span-3 text-right">
                            <div className={`${payout.isLoan ? 'text-red-600' : 'text-green-600'} font-semibold`}>
                              {payout.isLoan ? '-' : '+'}{(calculation.accruedInterest / (payout.asset.symbol === 'COINDEPO' ? 0.10 : 
                                (rows.find(r => r.asset.symbol === payout.asset.symbol)?.priceUSD || 
                                 loans.find(l => l.asset.symbol === payout.asset.symbol)?.priceUSD || 1))).toLocaleString()} {payout.asset.symbol}
                            </div>
                            <div className={`text-xs ${payout.isLoan ? 'cd-loan-value' : 'text-slate-500'}`} 
                                 style={payout.isLoan ? {color: '#dc2626 !important'} : {}}>
                              {payout.isLoan ? '-' : '+'}{fmtUSD(calculation.accruedInterest)}
                            </div>
                          </div>
                          <div className="col-span-2 text-right text-slate-500">
                            {new Date(payout.payoutDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

                {/* Total Upcoming Interest */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-4">
                        Interest calculated with compounding • Auto-renewal after payout
                      </div>
            </div>
          </div>

                  {/* Extra witregel en groene totaal */}
                  <div className="mt-8 pt-4 flex justify-end">
                    <div className="text-right">
                      {(() => {
                        const totalAccruedInterest = upcomingPayouts.reduce((sum, payout) => {
                          const assetPrice = payout.asset.symbol === 'COINDEPO' ? coindepoPrice : 
                            (rows.find(r => r.asset.symbol === payout.asset.symbol)?.priceUSD || 
                             loans.find(l => l.asset.symbol === payout.asset.symbol)?.priceUSD || 0);
                          
                          const calculation = calculateCompoundInterest(
                            payout.qty, 
                            payout.apr, 
                            payout.interestPeriod, 
                            payout.payoutDate,
                            assetPrice
                          );
                          
                          return sum + (payout.isLoan ? -calculation.accruedInterest : calculation.accruedInterest);
                        }, 0);

                        return (
                          <div className="cd-total-green">
                            Total Accrued Interest: {totalAccruedInterest >= 0 ? '+' : ''}{fmtUSD(totalAccruedInterest)}
            </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-500">Add assets with interest payout dates to see upcoming payouts.</p>
            );
          })()}
        </section>

        {/* ======= Onderste blokken strak in cards ======= */}
        <div className="flex flex-row gap-6 mt-6">
          <section className="card flex-1">
            <h2 className="cd-balance-medium text-blue-600 mb-6">Your Earnings</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Portfolio total:</span>
                <span className="font-semibold">{fmtUSD(holdingsTotal)}</span>
                </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-700">COINDEPO holdings:</span>
                <span className="font-semibold">{fmtUSD(cdpValueUSD)}</span>
                </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-700">Other crypto holdings:</span>
                <span className="font-semibold">{fmtUSD(otherValueUSD)}</span>
            </div>

              {loansValueUSD > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Loans (debt):</span>
                  <span className="font-semibold cd-loan-value" style={{color: '#dc2626 !important'}}>-{fmtUSD(loansValueUSD)}</span>
              </div>
              )}
              </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">COINDEPO percentage:</span>
                <span className="font-semibold text-blue-600">{cdpShare.toFixed(2)}%</span>
            </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Current tier:</span>
                <span className="font-semibold">{tierLabel}</span>
          </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-slate-800">Your Tier Benefits:</h3>
              <div className="space-y-2">
                
                {loansValueUSD > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Loan rate bonus:</span>
                    <span className="font-semibold cd-loan-value" style={{color: '#dc2626 !important'}}>-{(loanBonus * 100).toFixed(0)}% (-{fmtUSD(loanSavingsUSD)})</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="cd-token-payout-bonus">Token payout bonus:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold cd-token-payout-bonus">+{(currentTier.tokenPayout * 100).toFixed(0)}%</span>
                    <div className="flex items-center gap-1">
                  <input
                        type="checkbox"
                        id="tokenPayoutBonus"
                        checked={extraPayoutEnabled}
                        onChange={(e) => setExtraPayoutEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="tokenPayoutBonus" className="text-sm font-medium text-slate-700">
                        Enable
                      </label>
                    </div>
                  </div>
                </div>
              </div>
                </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Portfolio interest per year:</span>
                <span className="font-semibold">{fmtUSD(otherValueUSD * 0.24)}</span>
                </div>
              
              
              {extraPayoutEnabled && (
                <div className="flex justify-between items-center">
                  <span className="cd-token-payout-bonus">Token payout bonus per year:</span>
                  <span className="font-semibold cd-token-payout-amount">{fmtUSD(tokenPayoutUSD)}</span>
              </div>
              )}
              
              {loansValueUSD > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Loan interest savings per year:</span>
                  <span className="font-semibold text-green-600">{fmtUSD(loanSavingsUSD)}</span>
              </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-blue-600">Total passive income per year:</span>
                <span className="text-lg font-semibold text-blue-600">{fmtUSD(otherValueUSD * 0.24 + utilityUSD)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Token utility yield:</span>
                <span>{utilityYield.toFixed(2)}%</span>
              </div>
            </div>
            
            {/* Extra witregel en groene totaal */}
            <div className="mt-8 pt-4 flex justify-between items-center">
              <span className="cd-total-green-sm">Total benefits per year:</span>
              <span className="cd-total-green-sm">{fmtUSD(otherValueUSD * 0.24 + utilityUSD)}</span>
          </div>
        </section>

          <section className="card flex-1">
            <h2 className="cd-balance-medium mb-6 text-blue-600">Required for tiers</h2>
            {otherValueUSD <= 0 ? (
              <p className="text-slate-500">Add assets to see required COINDEPO.</p>
            ) : (
              <>
                {[
                  { label: "Tier 1 (0-4.99%)", pct: 0.00, depositBonus: "0%", loanBonus: "0%", tokenBonus: "+2%", status: extraPayoutEnabled ? "(enabled)" : "(disabled)" },
                  { label: "Tier 2 (5-9.99%)", pct: 0.05, depositBonus: "+1%", loanBonus: "-1%", tokenBonus: "+2%", status: extraPayoutEnabled ? "(enabled)" : "(disabled)" },
                  { label: "Tier 3 (10-14.99%)", pct: 0.10, depositBonus: "+2%", loanBonus: "-2%", tokenBonus: "+2%", status: extraPayoutEnabled ? "(enabled)" : "(disabled)" },
                  { label: "Tier 4 (15%+)", pct: 0.15, depositBonus: "+3%", loanBonus: "-3%", tokenBonus: "+2%", status: extraPayoutEnabled ? "(enabled)" : "(disabled)" },
                ].map(({ label, pct, depositBonus, loanBonus, tokenBonus, status }) => {
                const needUSD = needForPctUSD(pct);
                const achieved = needUSD <= 0.0001;
                const needTokens = needUSD > 0 ? Math.ceil(needUSD / 0.10) : 0; // COINDEPO price is $0.10

                return (
                    <div key={label} className="mb-4">
                      <div className="flex justify-between items-start mb-1">
                        <div className={`text-lg font-semibold ${achieved ? "cd-tier-achieved" : "text-slate-800"}`}>
                          {label}:
                        </div>
                        {achieved && (
                          <div className="cd-tier-achieved-checkmark text-xl">✓</div>
                        )}
                      </div>
                      <div className={`ml-4 ${achieved ? "cd-tier-achieved" : "text-slate-600"}`}>
                        Deposit: {depositBonus}, Loan: {loanBonus}, Token: {tokenBonus} {status}
                      </div>
                      {!achieved && needTokens > 0 && (
                        <div className="text-blue-600 ml-4 mt-1 text-sm">
                          Need {needTokens.toLocaleString()} COINDEPO tokens ({formatCurrency(needUSD)})
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Exchange Links */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="text-slate-600 mb-4">
                    Get your extra tokens at:
                  </div>
                  
                  {/* BingX */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">🚀 BINGX</span>
                    </div>
                    <a 
                      href="https://bingx.com/en/spot/COINDEPOUSDT" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors break-all text-sm"
                    >
                      https://bingx.com/en/spot/COINDEPOUSDT
                    </a>
                  </div>
                  
                  {/* WEEX */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">⚡ WEEX</span>
                    </div>
                    <a 
                      href="https://www.weex.com/spot/COINDEPO-USDT" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors break-all text-sm"
                    >
                      https://www.weex.com/spot/COINDEPO-USDT
                    </a>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>


        {/* Support Section */}
        <section className="card mt-8">
          <header className="mb-6">
            <h2 className="cd-balance-medium text-brand-blue">Support</h2>
          </header>
          
          <div className="space-y-6">
            <div>
              <p className="text-slate-600 mb-4">
                If you appreciate this COINDEPO utility tool and want to contribute to its development, please consider a donation:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-semibold text-slate-800">USDC</span>
                      <div className="text-sm font-mono text-slate-600 break-all">
                        0xD875FaaC1881926dAd6760F46a2B533BD85B25fB
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('0xD875FaaC1881926dAd6760F46a2B533BD85B25fB')}
                      className="ml-2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-semibold text-slate-800">ETH</span>
                      <div className="text-sm font-mono text-slate-600 break-all">
                        0x4da52892A7e8F410525CAda105681F31BD5d6F10
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('0x4da52892A7e8F410525CAda105681F31BD5d6F10')}
                      className="ml-2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-semibold text-slate-800">BTC</span>
                      <div className="text-sm font-mono text-slate-600 break-all">
                        3FonkNJBAAhkLakLGZm9FhepzB1GgMFAJa
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('3FonkNJBAAhkLakLGZm9FhepzB1GgMFAJa')}
                      className="ml-2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-semibold text-slate-800">COINDEPO</span>
                      <div className="text-sm font-mono text-slate-600 break-all">
                        0x9f04613fE8cA16Ed48279F461336784401A5BAEb
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('0x9f04613fE8cA16Ed48279F461336784401A5BAEb')}
                      className="ml-2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-200 pt-6">
              <p className="font-semibold text-slate-800 mb-2">NOT A COINDEPO MEMBER?</p>
              <p className="text-slate-600 mb-2">Use my partnerlink to open a free account:</p>
              <a 
                href="https://app.coindepo.com/auth/sign-up?ref=A-ounkNJhY" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800 transition-colors break-all"
              >
                https://app.coindepo.com/auth/sign-up?ref=A-ounkNJhY
              </a>
            </div>
            
            <div className="border-t border-slate-200 pt-6">
              <p className="mb-2">
                <span className="font-semibold text-slate-800">COINDEPO COMMUNITY LINK</span> @coindepo_community
              </p>
              <p className="mb-2">
                <span className="font-semibold text-slate-800">Contact me on Telegram for feedback:</span> @koen0373
              </p>
              <p className="font-semibold text-lg text-slate-800">THANK YOU!</p>
            </div>
            
            <div className="border-t border-slate-200 pt-6 text-xs text-slate-500">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ IMPORTANT DISCLAIMER</h4>
                <ul className="space-y-1 text-yellow-700">
                  <li>• This Portfolio Manager is <strong>NOT</strong> a COINDEPO endorsed or official product</li>
                  <li>• All calculations, projections, and data are <strong>ESTIMATES ONLY</strong></li>
                  <li>• This tool is for <strong>EDUCATIONAL PURPOSES</strong> and community use only</li>
                  <li>• <strong>NO RIGHTS</strong> can be derived from using this Portfolio Manager</li>
                  <li>• This is <strong>NOT FINANCIAL ADVICE</strong> - always do your own research</li>
                  <li>• Users are <strong>SOLELY RESPONSIBLE</strong> for their investment decisions</li>
                  <li>• The developers accept <strong>NO LIABILITY</strong> for any losses or damages</li>
                </ul>
              </div>
              <p className="text-slate-600">
                <strong>Technical Note:</strong> COINDEPO prices are currently estimated at $0.10 as live APIs are temporarily unavailable.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}// Force refresh Sun Sep 28 20:43:34 CEST 2025
