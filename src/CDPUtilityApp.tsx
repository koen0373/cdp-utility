// src/CDPUtilityApp.tsx - Updated Layout v2
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { ASSETS } from "./data/assets";
import COINDEPO_LOGO from "./assets/COINDEPO.webp";
import COINDEPO_FULL_LOGO from "./assets/Manager logo.png";
import { storageService } from "./storageService";
import { LogoutButton } from "./components/LogoutButton";
import { usePortfolioSync } from "./hooks/usePortfolioSync";
import { PortfolioAllocationChart } from "./components/PortfolioAllocationChart";
// Using reliable external crypto icon APIs

// Styled components for robust positioning
const TopRightButtons = styled.div`
  position: fixed !important;
  top: 10px !important;
  right: 10px !important;
  z-index: 99999 !important;
  display: flex !important;
  gap: 8px !important;
  background-color: #ffffff !important;
  padding: 8px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid #e5e7eb !important;
`;

const TopButton = styled.button<{ variant: 'red' | 'blue' }>`
  background-color: ${props => props.variant === 'red' ? '#ef4444' : '#3b82f6'} !important;
  color: #ffffff !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  border: none !important;
  cursor: pointer !important;
  transition: background-color 0.2s !important;
  
  &:hover {
    background-color: ${props => props.variant === 'red' ? '#dc2626' : '#2563eb'} !important;
  }
`;

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

// COINDEPO-specific formatter with 3 decimal places
function formatCoindepoPrice(value: number, selectedCurrency: string, exchangeRates: Record<string, number>) {
  const currency = CURRENCIES.find(c => c.code === selectedCurrency);
  const convertedValue = value * (exchangeRates[selectedCurrency] || 1);
  
  if (selectedCurrency === 'JPY') {
    return `${currency?.symbol}${Math.round(convertedValue).toLocaleString()}`;
  } else {
    return `${currency?.symbol}${convertedValue.toLocaleString(undefined, { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3 
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
// Using reliable external crypto icon APIs

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
  
  // Get the symbol (lowercase, remove network suffixes)
  const symbol = asset.symbol.toLowerCase().split('-')[0].split('_')[0];
  
  // Generate initials for fallback
  const initials = asset.name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() ?? "?";

  // State for icon loading
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Fetch icon URL from our proxy
  useEffect(() => {
    const fetchIconUrl = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        const response = await fetch(`/api/crypto-icon-proxy?symbol=${encodeURIComponent(symbol)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.iconUrl) {
            setIconUrl(data.iconUrl);
          } else {
            setHasError(true);
          }
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Failed to fetch crypto icon:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIconUrl();
  }, [symbol]);

  const handleImageError = () => {
    setHasError(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Show loading state
  if (isLoading) {
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
  if (hasError || !iconUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gradient-to-br from-blue-100 to-purple-100 grid place-items-center text-[10px] font-semibold text-slate-700"
      >
        {initials}
      </div>
    );
  }

  // Show crypto icon
  return (
    <img
      src={iconUrl}
      width={size}
      height={size}
      className="rounded-full"
      style={{ border: 'none', outline: 'none' }}
      onError={handleImageError}
      onLoad={handleImageLoad}
      alt={`${asset.name} icon`}
    />
  );
};

/* -------------------- CoinGecko prijzen -------------------- */
const priceCache = new Map<string, { price: number; priceChange24h?: number; ts: number }>();
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

  try {
    const ids = need.join(',');
    const response = await fetch(`/api/crypto-price-proxy?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`);
    
    if (!response.ok) {
      console.error('Crypto price proxy error:', response.status);
      return result;
    }
    
    const proxyData = await response.json();
    
    if (!proxyData.success || !proxyData.data) {
      console.error('Invalid proxy response:', proxyData);
      return result;
    }
    
    const data = proxyData.data;
    
    for (const id of need) {
      const p = data?.[id]?.usd;
      const change24h = data?.[id]?.usd_24h_change || null;
      if (typeof p === "number") {
        priceCache.set(id, { price: p, priceChange24h: change24h, ts: Date.now() });
        result[id] = p;
      }
    }
    return result;
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    return result;
  }
}

async function fetchSinglePrice(id: string): Promise<{ price: number | null; priceChange24h: number | null }> {
  const now = Date.now();
  const hit = priceCache.get(id);
  if (hit && now - hit.ts < CACHE_TTL_MS) return { price: hit.price, priceChange24h: hit.priceChange24h || null };
  
  try {
    console.log(`Fetching price for ${id} via proxy`);
    const response = await fetch(`/api/crypto-price-proxy?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`);
    console.log(`Proxy response status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`Proxy call failed with status ${response.status}`);
      return { price: null, priceChange24h: null };
    }
    
    const proxyData = await response.json();
    console.log(`Proxy response:`, proxyData);
    
    if (!proxyData.success || !proxyData.data) {
      console.log(`Invalid proxy response:`, proxyData);
      return { price: null, priceChange24h: null };
    }
    
    const data = proxyData.data;
    const p = data?.[id]?.usd;
    const change24h = data?.[id]?.usd_24h_change || null;
      
    if (typeof p === "number") {
        priceCache.set(id, { price: p, priceChange24h: change24h, ts: now });
        console.log(`Price cached: ${p}, 24h change: ${change24h}%`);
        return { price: p, priceChange24h: change24h };
      }
      
      console.log(`No valid price found in response`);
      return { price: null, priceChange24h: null };
  } catch (error) {
    console.error(`Error fetching price for ${id} via proxy:`, error);
    return { price: null, priceChange24h: null };
  }
}

/* -------------------- LocalStorage -------------------- */

/* ==================== Toggle Component ==================== */
const Toggle: React.FC<{
  isOn: boolean;
  onToggle: () => void;
}> = ({ isOn, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        isOn ? 'bg-blue-600' : 'bg-slate-300'
      }`}
      role="switch"
      aria-checked={isOn}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isOn ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

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
  coindepoPriceStatus: 'loading' | 'live' | 'estimated';
  priceChange24h?: number;
}> = ({ holding, value, onUpdate, onRemove, coindepoAsset, selectedCurrency, exchangeRates, coindepoPriceStatus, priceChange24h }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState<number>(holding.qty);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      // Pre-fill current value when entering edit mode
      setEditQty(holding.qty);
      inputRef.current?.focus();
    }
  }, [isEditing, holding.qty]);

  const save = () => {
    onUpdate(editQty);
    setIsEditing(false);
  };

  const cancel = () => {
    setEditQty(holding.qty);
    setIsEditing(false);
  };

  return (
    <div className="py-8 rounded-lg bg-white ">
      {/* COINDEPO Header Row */}
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex items-center" style={{ gap: '20px' }}>
          <TokenIcon asset={coindepoAsset} />
          <div>
            <div className="cd-asset-name text-lg font-bold">COINDEPO</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                className="p-1"
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="w-4 h-4 text-slate-500" />
              </button>
              <button
                className="p-1"
                onClick={onRemove}
                aria-label="Remove"
                title="Remove"
              >
                <Trash className="w-4 h-4 text-slate-500" />
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-500">
              Editing...
            </div>
          )}
        </div>
      </div>

      {/* COINDEPO Details Grid - Two rows with 20px gap between rows, 50px gap between assets */}
      <div className="px-8 pb-8">
        <div className="flex flex-col gap-5" style={{ gap: '20px' }}>
          {/* First row: Quantity and Price */}
          <div className="flex gap-12" style={{ gap: '50px' }}>
            {/* Quantity */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quantity</div>
              <div className="text-base font-semibold text-slate-800">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={editQty}
                    onChange={(e) => setEditQty(toNum(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && save()}
                    className="w-24 h-8 px-2 bg-slate-50 rounded text-center text-base font-semibold"
                  />
                ) : (
                  holding.qty.toLocaleString()
                )}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Price</div>
              <div className="text-base font-semibold text-slate-600">
                {formatCoindepoPrice(holding.priceUSD, selectedCurrency, exchangeRates)}
                <div className="flex items-center gap-2 mt-1">
                  <div className={`text-xs italic ${coindepoPriceStatus === 'live' ? 'text-green-600' : 'text-orange-500'}`}>
                    {coindepoPriceStatus === 'live' ? '✓ live' : '~est.'}
                  </div>
                  {coindepoPriceStatus === 'live' && priceChange24h !== undefined && (
                    <div className={`text-xs font-semibold ${priceChange24h >= 0 ? 'cd-price-change-positive' : 'cd-price-change-negative'}`}>
                      {priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(priceChange24h).toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Second row: APR and Value */}
          <div className="flex gap-12" style={{ gap: '50px' }}>
            {/* APR */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">APR</div>
              <div className="flex items-center gap-3">
                <span className="cd-apr-box cd-apr-box-green">
                  {getAPRValue(holding.interestRate).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Value */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Value</div>
              <div className="text-base font-semibold cd-value-primary">
                {formatCoindepoPrice(value, selectedCurrency, exchangeRates)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Edit Controls - Only show when editing */}
        {isEditing && (
          <div className="mt-4">
            <div className="flex justify-end gap-3">
              <button
                className="btn-primary px-4 py-2 text-sm font-medium"
                onClick={cancel}
              >
                ✕ Cancel
              </button>
              <button
                className="btn-accent px-4 py-2 text-sm font-medium"
                onClick={save}
              >
                ✓ Save
              </button>
            </div>
          </div>
        )}
        
        {/* Interest Payout Date Row */}
        {holding.payoutDate && (
          <div className="mt-4">
            <div className="text-xs text-slate-400">
              Interest payout date: <span className="font-medium text-slate-500">{new Date(holding.payoutDate).toLocaleDateString()}</span>
            </div>
          </div>
        )}
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
  depositBonus?: number;
  priceChange24h?: number | null;
}> = ({ row, value, onUpdate, onRemove, isLoan = false, selectedCurrency, exchangeRates, depositBonus = 0, priceChange24h }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState<number>(row.qty);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      // Pre-fill current value when entering edit mode
      setEditQty(row.qty);
      inputRef.current?.focus();
    }
  }, [isEditing, row.qty]);

  const save = () => {
    onUpdate(editQty);
    setIsEditing(false);
  };

  const cancel = () => {
    setEditQty(row.qty);
    setIsEditing(false);
  };


  return (
    <div className="py-8 rounded-lg bg-white ">
      {/* Asset Header Row */}
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex items-center" style={{ gap: '20px' }}>
          <TokenIcon asset={row.asset} />
          <div>
            <div className="cd-asset-name text-lg font-bold">{row.asset.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                className="p-1"
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="w-4 h-4 text-slate-500" />
              </button>
              <button
                className="p-1"
                onClick={onRemove}
                aria-label="Remove"
                title="Remove"
              >
                <Trash className="w-4 h-4 text-slate-500" />
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-500">
              Editing...
            </div>
          )}
        </div>
      </div>

      {/* Asset Details Grid - Two rows with 20px gap between rows, 50px gap between assets */}
      <div className="px-8 pb-8">
        <div className="flex flex-col gap-5" style={{ gap: '20px' }}>
          {/* First row: Quantity and Price */}
          <div className="flex gap-12" style={{ gap: '50px' }}>
            {/* Quantity */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quantity</div>
              <div className="text-base font-semibold text-slate-800">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={editQty}
                    onChange={(e) => setEditQty(toNum(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && save()}
                    className="w-24 h-8 px-2 bg-slate-50 rounded text-center text-base font-semibold"
                  />
                ) : (
                  row.qty.toLocaleString()
                )}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Price</div>
              <div className="text-base font-semibold text-slate-600">
                {row.priceUSD ? `$${row.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
                {row.priceUSD && priceChange24h !== null && priceChange24h !== undefined && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-xs italic text-green-600">✓ live</div>
                    <div className={`text-xs font-semibold ${priceChange24h >= 0 ? 'cd-price-change-positive' : 'cd-price-change-negative'}`}>
                      {priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(priceChange24h).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Second row: APR and Value */}
          <div className="flex gap-12" style={{ gap: '50px' }}>
            {/* APR */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">APR</div>
              <div className="flex items-center gap-3">
                <span className={`cd-apr-box ${isLoan ? 'cd-apr-box-red' : 'cd-apr-box-green'}`}>
                  {isLoan 
                    ? (getAPRValue(row.interestRate) - (depositBonus * 100)).toFixed(1)
                    : (getAPRValue(row.interestRate) + (depositBonus * 100)).toFixed(1)
                  }%
                </span>
                {depositBonus > 0 && (
                  <span className="text-xs font-medium" style={{ color: '#16a34a' }}>
                    {isLoan ? `-${(depositBonus * 100).toFixed(1)}%` : `+${(depositBonus * 100).toFixed(1)}%`}
                  </span>
                )}
              </div>
            </div>

            {/* Value */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Value</div>
              <div 
                className={`text-base font-semibold ${isLoan ? 'cd-loan-value' : 'cd-value-primary'}`}
                style={isLoan ? { color: '#dc2626 !important', fontWeight: '600' } : {}}
              >
                {isLoan ? `-${formatCurrency(value, selectedCurrency, exchangeRates)}` : formatCurrency(value, selectedCurrency, exchangeRates)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Edit Controls - Only show when editing */}
        {isEditing && (
          <div className="mt-4">
            <div className="flex justify-end gap-3">
              <button
                className="btn-primary px-4 py-2 text-sm font-medium"
                onClick={cancel}
              >
                ✕ Cancel
              </button>
              <button
                className="btn-accent px-4 py-2 text-sm font-medium"
                onClick={save}
              >
                ✓ Save
              </button>
            </div>
          </div>
        )}
        
        {/* Interest Payout Date Row */}
        {row.payoutDate && (
          <div className="mt-4">
            <div className="text-xs text-slate-400">
              Interest payout date: <span className="font-medium text-slate-500">{new Date(row.payoutDate).toLocaleDateString()}</span>
            </div>
          </div>
        )}
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
interface CDPUtilityAppProps {
  guestMode?: boolean;
}

export default function CDPUtilityApp({ guestMode = false }: CDPUtilityAppProps) {
  // Portfolio sync hook for authenticated users
  const { user, loadFromSupabase, saveToSupabase, migrateFromLocalStorage } = usePortfolioSync();
  const isAuthenticated = !guestMode && user;
  
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
  const [selectedAssetPriceChange, setSelectedAssetPriceChange] = useState<number | null>(null);

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
  const [localStorageStatus, setLocalStorageStatus] = useState<'available' | 'unavailable' | 'checking'>('checking');

  // COINDEPO price state - fetched from CoinGecko API
  const [coindepoPrice, setCoindepoPrice] = useState<number>(0.10);
  const [coindepoPriceStatus, setCoindepoPriceStatus] = useState<'loading' | 'live' | 'estimated'>('estimated');
  const [coindepoPriceChange, setCoindepoPriceChange] = useState<number>(0);

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
  const [selectedLoanPriceChange, setSelectedLoanPriceChange] = useState<number | null>(null);

  // Price changes for existing assets and loans
  const [assetPriceChanges, setAssetPriceChanges] = useState<Record<string, number | null>>({});
  const [loanPriceChanges, setLoanPriceChanges] = useState<Record<string, number | null>>({});

  // Portfolio section visibility toggle
  const [portfolioVisible, setPortfolioVisible] = useState(true);

  // Card visibility toggles
  const [cardVisibility, setCardVisibility] = useState({
    portfolio: true,
    allocation: true,
    contributions: true,
    payouts: true,
    earnings: true,
    advantages: true,
    support: true
  });

  // INIT - Hybrid storage loading with IndexedDB and localStorage fallback
  useEffect(() => {
    console.log('Loading data on startup...');
    
    const loadData = async () => {
      try {
        // Check storage status
        const status = storageService.getStorageStatus();
        setLocalStorageStatus(status.indexedDB ? 'available' : (status.localStorage ? 'available' : 'unavailable'));

        // For authenticated users, load from Supabase
        if (isAuthenticated && user) {
          console.log('👤 Authenticated user detected, loading from Supabase...');
          
          // Try to migrate localStorage data first (only runs once)
          const migrated = await migrateFromLocalStorage();
          if (migrated) {
            console.log('✅ Successfully migrated localStorage data to Supabase');
          }
          
          // Load portfolio from Supabase
          const portfolioData = await loadFromSupabase();
          
          if (portfolioData) {
            // Load assets
            if (portfolioData.assets && portfolioData.assets.length > 0) {
              const validRows: Row[] = portfolioData.assets
                .map((r: any) => {
                  const asset = selectableAssets.find((a) => a.symbol === r.symbol);
          if (!asset) return null;
                  return { 
                    asset, 
                    qty: r.qty || 0, 
                    priceUSD: r.priceUSD || 0, 
                    interestRate: r.interestRate || '',
                    payoutDate: r.payoutDate || ''
                  } as Row;
                })
                .filter((r): r is Row => r !== null);
              setRows(validRows);
            }
            
            // Load COINDEPO holdings
            if (portfolioData.coindepo_holdings && portfolioData.coindepo_holdings.length > 0) {
              const validHoldings = portfolioData.coindepo_holdings
                .map((h: any) => ({
                  asset: coindepoAsset,
                  qty: h.qty || 0,
                  priceUSD: coindepoPrice,
                  interestRate: h.interestRate || '',
                  payoutDate: h.payoutDate || ''
                }))
                .filter((h: any) => h.qty > 0);
              setCoindepoHoldings(validHoldings);
            }
            
            // Load loans
            if (portfolioData.loans && portfolioData.loans.length > 0) {
              const validLoans: Row[] = portfolioData.loans
                .map((l: any) => {
                  const asset = selectableAssets.find((a) => a.symbol === l.symbol);
                  if (!asset) return null;
                  return { 
                    asset, 
                    qty: l.qty || 0, 
                    priceUSD: l.priceUSD || 0, 
                    interestRate: l.interestRate || '',
                    payoutDate: l.payoutDate || ''
                  } as Row;
                })
                .filter((l): l is Row => l !== null);
              setLoans(validLoans);
            }
            
            // Load settings
            if (portfolioData.settings) {
              setSelectedCurrency(portfolioData.settings.selected_currency || 'USD');
              setExtraPayoutEnabled(portfolioData.settings.extra_payout_enabled || false);
            }
            
            console.log('✅ Portfolio loaded from Supabase');
            return;
          }
        }

        // For guest mode or if Supabase load failed, use localStorage
        console.log('💾 Loading from localStorage...');
        await storageService.migrateFromLocalStorage();

        // Load rows
        const savedRows = await storageService.load('portfolio-rows');
        if (savedRows) {
          console.log('Found saved rows:', savedRows);
          
          const validRows = savedRows
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
        const savedCoindepoHoldings = await storageService.load('coindepo-holdings');
        if (savedCoindepoHoldings) {
          console.log('Found saved COINDEPO holdings:', savedCoindepoHoldings);
          
          const validHoldings = savedCoindepoHoldings
            .map((h: any) => ({
              asset: coindepoAsset,
              qty: h.qty || 0,
              priceUSD: coindepoPrice,
              interestRate: h.interestRate || '',
              payoutDate: h.payoutDate || ''
            }))
            .filter((h: any) => h.qty > 0);
          
          setCoindepoHoldings(validHoldings);
        }

        // Load loans
        const savedLoans = await storageService.load('portfolio-loans');
        if (savedLoans) {
          console.log('Found saved loans:', savedLoans);
          
          const validLoans = savedLoans
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
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [selectableAssets, isAuthenticated, user]);

  // Save data - Auto-save to Supabase for authenticated users, localStorage for guests
  useEffect(() => {
    const saveData = async () => {
      if (isAuthenticated && user) {
        // Save to Supabase for authenticated users
        try {
          const portfolioData = {
            assets: rows.map((r) => ({
              symbol: r.asset.symbol,
              qty: r.qty,
              priceUSD: r.priceUSD,
              interestRate: r.interestRate,
              payoutDate: r.payoutDate
            })),
            coindepo_holdings: coindepoHoldings.map((h) => ({
              qty: h.qty,
              priceUSD: h.priceUSD,
              interestRate: h.interestRate,
              payoutDate: h.payoutDate
            })),
            loans: loans.map((l) => ({
              symbol: l.asset.symbol,
              qty: l.qty,
              priceUSD: l.priceUSD,
              interestRate: l.interestRate,
              payoutDate: l.payoutDate
            })),
            settings: {
              selected_currency: selectedCurrency,
              extra_payout_enabled: extraPayoutEnabled
            }
          };
          
          await saveToSupabase(portfolioData);
          console.log('💾 Auto-saved portfolio to Supabase');
        } catch (error) {
          console.error('❌ Error saving to Supabase:', error);
        }
      } else {
        // Save to localStorage for guest users
        if (rows.length > 0) {
          const dataToSave = rows.map((r) => ({
            symbol: r.asset.symbol,
            qty: r.qty,
            priceUSD: r.priceUSD,
            interestRate: r.interestRate,
            payoutDate: r.payoutDate
          }));
          
          try {
            await storageService.save('portfolio-rows', dataToSave);
            console.log('💾 Saved rows to localStorage');
          } catch (error) {
            console.error('Error saving rows:', error);
          }
        } else {
          try {
            await storageService.remove('portfolio-rows');
          } catch (error) {
            console.error('Error removing rows:', error);
          }
        }
      }
    };

    // Debounce auto-save to avoid too many requests
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [rows, coindepoHoldings, loans, selectedCurrency, extraPayoutEnabled, isAuthenticated, user]);

  // Note: COINDEPO and Loans are now saved together with assets in the unified save above

  // Automatic backup system - every 15 minutes with hybrid storage
  useEffect(() => {
    const createPeriodicBackup = async () => {
      const timestamp = new Date().toISOString();
      console.log('Creating periodic backup:', timestamp);
      
      try {
        // Backup all portfolio data
        const portfolioData = await storageService.load('portfolio-rows');
        const coindepoData = await storageService.load('coindepo-holdings');
        const loansData = await storageService.load('portfolio-loans');
        
        if (portfolioData) {
          await storageService.save(`periodic-backup-portfolio-${timestamp}`, portfolioData);
        }
        if (coindepoData) {
          await storageService.save(`periodic-backup-coindepo-${timestamp}`, coindepoData);
        }
        if (loansData) {
          await storageService.save(`periodic-backup-loans-${timestamp}`, loansData);
        }
        
        console.log('Periodic backup completed');
      } catch (error) {
        console.error('Error during periodic backup:', error);
      }
    };

    // Create initial backup
    createPeriodicBackup();
    
    // Set up interval for every 15 minutes (900000 ms)
    const backupInterval = setInterval(createPeriodicBackup, 15 * 60 * 1000);
    
    return () => clearInterval(backupInterval);
  }, []); // Empty dependency array - run once on mount

  // Fetch price changes for existing assets and loans
  async function fetchAssetPriceChanges() {
    const allAssets = [...rows, ...loans];
    const uniqueCoingeckoIds = [...new Set(allAssets.map(r => r.asset.coingeckoId).filter(Boolean))];
    
    for (const coingeckoId of uniqueCoingeckoIds) {
      if (!coingeckoId) continue;
      
      try {
        const result = await fetchSinglePrice(coingeckoId);
        if (result.priceChange24h !== null) {
          // Update both asset and loan price changes
          setAssetPriceChanges(prev => ({ ...prev, [coingeckoId]: result.priceChange24h }));
          setLoanPriceChanges(prev => ({ ...prev, [coingeckoId]: result.priceChange24h }));
        }
      } catch (error) {
        console.error(`Error fetching price change for ${coingeckoId}:`, error);
      }
    }
  }

  // Fetch COINDEPO price from CoinGecko via proxy
  async function fetchCoindepoPrice() {
    try {
      setCoindepoPriceStatus('loading');
      console.log('Fetching COINDEPO price via proxy...');
      
      const response = await fetch('/api/crypto-price-proxy?ids=coindepo&vs_currencies=usd&include_24hr_change=true');
      
      if (!response.ok) {
        throw new Error(`Crypto price proxy error: ${response.status}`);
      }
      
      const proxyData = await response.json();
      
      if (!proxyData.success || !proxyData.data) {
        throw new Error('Invalid proxy response');
      }
      
      const data = proxyData.data;
      
      if (data.coindepo && data.coindepo.usd) {
        const price = data.coindepo.usd;
        const priceChange = data.coindepo.usd_24h_change || 0;
        
        setCoindepoPrice(price);
        setCoindepoPriceChange(priceChange);
        setCoindepoPriceStatus('live');
        console.log('COINDEPO price updated:', price, 'Change 24h:', priceChange.toFixed(2) + '%');
        
        // Update existing COINDEPO holdings with new price
        if (coindepoHoldings.length > 0) {
          setCoindepoHoldings((prev) =>
            prev.map((h) => ({
              ...h,
              priceUSD: price,
            }))
          );
        }
      } else {
        throw new Error('COINDEPO price not found in API response');
      }
    } catch (error) {
      console.error('Error fetching COINDEPO price:', error);
      setCoindepoPriceStatus('estimated');
      // Keep the current price (fallback to $0.10 if not set)
    }
  }

  // Auto prijs voor rows en selectableAssets
  async function refreshPrices() {
    const rowIds = rows.map((r) => r.asset.coingeckoId).filter(Boolean) as string[];
    const allIds = selectableAssets.map((a) => a.coingeckoId).filter(Boolean) as string[];
    const uniqueIds = Array.from(new Set([...rowIds, ...allIds]));
    console.log('Refreshing prices for:', uniqueIds);
    const map = await fetchCoinGeckoPrices(uniqueIds);
    console.log('Price map received:', map);
    
    // Also refresh COINDEPO price
    await fetchCoindepoPrice();
    
    // Refresh price changes for existing assets
    await fetchAssetPriceChanges();
    
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
  // Fetch prices on initial load and periodically
  useEffect(() => {
    refreshPrices();
    // Refresh every 2 minutes (120 seconds)
    const t = setInterval(refreshPrices, 120_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  // Fetch COINDEPO price and asset price changes on initial load
  useEffect(() => {
    fetchCoindepoPrice();
    fetchAssetPriceChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        
        fetchSinglePrice(asset.coingeckoId).then(result => {
          console.log(`Price response for ${asset.symbol}:`, result);
          if (result.price && result.price > 0) {
            setSelectedAssetPrice(result.price);
            setSelectedAssetPriceChange(result.priceChange24h);
            console.log(`Price set for ${asset.symbol}: $${result.price}, 24h change: ${result.priceChange24h}%`);
          } else {
            console.log(`No valid price for ${asset.symbol}, setting to 0`);
            setSelectedAssetPrice(0);
            setSelectedAssetPriceChange(null);
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
        
        fetchSinglePrice(asset.coingeckoId).then(result => {
          console.log(`Loan price response for ${asset.symbol}:`, result);
          if (result.price && result.price > 0) {
            setSelectedLoanPrice(result.price);
            setSelectedLoanPriceChange(result.priceChange24h);
            console.log(`Loan price set for ${asset.symbol}: $${result.price}, 24h change: ${result.priceChange24h}%`);
          } else {
            console.log(`No valid loan price for ${asset.symbol}, setting to 0`);
            setSelectedLoanPrice(0);
            setSelectedLoanPriceChange(null);
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
  let currentTierIndex = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (cdpShare >= TIERS[i].pct * 100) {
      tierLabel = TIERS[i].label.split(" ")[0] + " " + TIERS[i].label.split(" ")[1];
      currentTier = TIERS[i];
      currentTierIndex = i;
      break;
    }
  }

  // Token Advantage Program activation date
  const TIER_ACTIVATION_DATE = new Date('2025-10-10T00:00:00');
  const isTierProgramActive = new Date() >= TIER_ACTIVATION_DATE;
  
  // Format activation date for display
  const activationDateString = TIER_ACTIVATION_DATE.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Extract individual bonuses (only active after October 10, 2025)
  const depositBonus = isTierProgramActive ? currentTier.depositBonus : 0;
  const loanBonus = isTierProgramActive ? currentTier.loanBonus : 0;
  const tokenPayoutBonus = (isTierProgramActive && extraPayoutEnabled) ? currentTier.tokenPayout : 0;

  // Token Advantage Program calculations (Official COINDEPO)
  const depositBonusUSD = otherValueUSD * depositBonus; // Extra APR on deposits
  const loanSavingsUSD = loansValueUSD * loanBonus; // Savings on loan interest
  const tokenPayoutUSD = tokenPayoutBonus * cdpValueUSD; // Extra payout in tokens (if enabled) - based on COINDEPO holdings
  
  // Calculate loan interest to pay (27.5% APR with tier discount)
  const loanInterestUSD = loansValueUSD * 0.275 * (1 - loanBonus); // Interest to pay on loans
  
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
      const result = await fetchSinglePrice(asset.coingeckoId);
      price = typeof result.price === "number" ? result.price : 0;
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
      priceUSD: coindepoPrice, 
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
      const result = await fetchSinglePrice(asset.coingeckoId);
      price = typeof result.price === "number" ? result.price : 0;
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
  async function handleResetPortfolio() {
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
      
      // Clear storage with error handling
      try {
        await storageService.remove('portfolio-rows');
        await storageService.remove('portfolio-loans');
        await storageService.remove('coindepo-holdings');
        console.log('Portfolio reset successfully');
      } catch (error) {
        console.error('Error clearing storage during reset:', error);
      }
    }
  }

  async function handleRestoreFromBackup() {
    try {
      // For now, we'll use a simplified approach since we don't have a way to list all keys in IndexedDB
      // This is a limitation we can address in a future version
      alert('Backup restore functionality is being updated for the new storage system. Please use the Reset Portfolio button to clear data and start fresh.');
    } catch (error) {
      console.error('Error accessing backups:', error);
      alert('Error accessing backups. Please try again.');
    }
  }

  return (
    <div className="bg-brand-gray min-h-screen relative">
      {/* Top Right Buttons - Using styled-components for robust positioning */}
      <TopRightButtons>
        <TopButton
          variant="red"
          onClick={handleResetPortfolio}
          title="Reset entire portfolio"
        >
          Reset Portfolio
        </TopButton>
        {!guestMode && (
          <TopButton
            variant="blue"
            onClick={() => {
              // Logout functionality
              if (typeof window !== 'undefined') {
                localStorage.removeItem('cdp-portfolio-data');
                localStorage.removeItem('cdp-coindepo-holdings');
                localStorage.removeItem('cdp-loans');
                window.location.reload();
              }
            }}
            title="Logout"
          >
            Logout
          </TopButton>
        )}
      </TopRightButtons>
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col items-center justify-center mb-4">
            <img 
              src={COINDEPO_FULL_LOGO} 
              alt="COINDEPO Portfolio Manager" 
              className="h-20 sm:h-24 w-auto max-w-full"
              style={{ maxHeight: '96px' }}
            />
          </div>
          
          <p className="text-base text-slate-600 mb-4 max-w-3xl mx-auto px-4">
            Maximize your crypto returns with up to 27% APR and unlock exclusive Token Advantage Program benefits
          </p>
          
          <div className="bg-blue-50 rounded-lg p-3 max-w-2xl mx-auto mx-4">
            <p className="text-xs sm:text-sm text-blue-700">
              <strong>Under Development:</strong> This portfolio manager is still being refined. Some features may not work as expected.
            </p>
            {localStorageStatus === 'unavailable' && (
              <p className="text-xs sm:text-sm text-orange-600 mt-2">
                <strong>Note:</strong> Local storage is not available. Your portfolio data will not be saved between sessions.
              </p>
            )}
          </div>
        </div>

        {/* ======= PORTFOLIO SECTION ======= */}
        <section className="cd-card mb-4 sm:mb-6">
          <header className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ paddingBottom: '20px' }}>
            <div className="w-full sm:w-auto">
              <div className="flex items-center justify-between">
                <h1 className="cd-balance-large text-brand-blue text-2xl">Your Portfolio</h1>
                <Toggle
                  isOn={portfolioVisible}
                  onToggle={() => setPortfolioVisible(!portfolioVisible)}
                />
              </div>
              {isTierProgramActive && depositBonus > 0 && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-green-100 cd-tier-badge">
                    <span className="hidden sm:inline">{tierLabel} Active • +{(depositBonus * 100).toFixed(1)}% Deposit Bonus • -{(loanBonus * 100).toFixed(1)}% Loan Discount</span>
                    <span className="sm:hidden">{tierLabel} Active</span>
                  </span>
                </div>
              )}
              {!isTierProgramActive && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    <span className="hidden sm:inline">Token Advantage Program starts {activationDateString}</span>
                    <span className="sm:hidden">Tier Program: Coming Soon</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
              {/* Currency Selector */}
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <label className="text-xs sm:text-sm font-medium text-slate-600 whitespace-nowrap">Currency:</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
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
                    className="btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium w-full sm:w-auto"
                    title="Restore from automatic backup"
                  >
                    Restore Backup
                  </button>
                )}
            </div>
        </header>

          <h2 className="cd-label text-lg" style={{ marginBottom: '16px' }}>YOUR ASSETS</h2>

          {/* Assets List Header */}
          {rows.length > 0 && (
          <div className="hidden sm:grid grid-cols-12 gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-slate-400">
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
            <div className="flex flex-col gap-12 sm:gap-16">
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
                    depositBonus={depositBonus}
                    priceChange24h={assetPriceChanges[r.asset.coingeckoId || '']}
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
          {portfolioVisible && (
            <div className="mt-12 sm:mt-16 p-6 sm:p-0">
            <div className="flex flex-col gap-6">
              {/* Input fields in two rows with 20px padding */}
              <div className="flex flex-col gap-5" style={{ padding: '20px' }}>
                {/* First row: Asset Selection and QTY */}
                <div className="flex flex-col sm:flex-row items-end gap-6">
                  {/* Asset Selection - Always Visible */}
                  <div style={{ width: '256px' }}>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 rounded-lg bg-white text-slate-700 text-sm"
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
                    <div className="w-full sm:w-20">
                      <label className="block text-xs font-medium text-slate-600 mb-1">QTY</label>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={addQty || ""}
                        onChange={(e) => setAddQty(toNum(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg text-right text-sm"
                      />
                    </div>
                  )}
                </div>
                
                {/* Second row: APR Selection and Interest Payout Date */}
                {addAssetSymbol && (
                  <div className="flex flex-col sm:flex-row items-end gap-6">
                    {/* APR Selection */}
                    <div className="w-full sm:w-44">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interest Account Type</label>
                      <select
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg bg-white text-slate-700 text-sm"
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
                    
                    {/* Interest Payout Date */}
                    <div className="w-full sm:w-36">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interest Payout Date</label>
                      <input
                        type="date"
                        placeholder="Payout Date"
                        value={addAssetPayoutDate}
                        onChange={(e) => setAddAssetPayoutDate(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* ADD Button */}
              {addAssetSymbol && (
                <div className="flex justify-end" style={{ padding: '0 20px' }}>
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
          )}

          {/* ======= YOUR COINDEPO HOLDINGS SECTION ======= */}
          {portfolioVisible && (
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="cd-label text-lg">YOUR COINDEPO HOLDINGS</h2>
              <p className={`text-xs italic mt-1 ${coindepoPriceStatus === 'live' ? 'text-green-600' : 'text-orange-600'}`}>
                {coindepoPriceStatus === 'live' 
                  ? '✓ Live prices from CoinGecko' 
                  : '* Prices are estimated - fetching live data...'}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
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
                        coindepoPriceStatus={coindepoPriceStatus}
                        priceChange24h={coindepoPriceChange}
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

            {/* Add COINDEPO Input Row - Based on Assets section */}
            <div className="mt-12 sm:mt-16 p-6 sm:p-0">
              <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
                {/* Left side - Input fields */}
                <div className="flex flex-col sm:flex-row items-end gap-6 w-full sm:w-auto">
                  {/* COINDEPO Selection - Always Visible */}
                  <div style={{ width: '256px' }}>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 rounded-lg bg-white text-slate-700 text-sm"
                      value={showCoindepoInput ? "COINDEPO" : ""}
                      onChange={(e) => setShowCoindepoInput(e.target.value === "COINDEPO")}
                    >
                      <option value="">Add COINDEPO...</option>
                      <option value="COINDEPO">COINDEPO</option>
                    </select>
                  </div>
                  
                  {/* QTY Input - Only show after COINDEPO selection */}
                  {showCoindepoInput && (
                    <div className="w-full sm:w-20">
                      <label className="block text-xs font-medium text-slate-600 mb-1">QTY</label>
                        <input
                        type="number"
                        placeholder="Qty"
                        value={cdpInputQty || ""}
                        onChange={(e) => setCdpInputQty(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg text-right text-sm"
                      />
                    </div>
                  )}
                  
                  {/* APR Selection - Only show after COINDEPO selection */}
                  {showCoindepoInput && (
                    <div className="w-full sm:w-44">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interest Account Type</label>
                      <select
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg bg-white text-slate-700 text-sm"
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
                    <div className="w-full sm:w-36">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interest Payout Date</label>
                      <input
                        type="date"
                        value={cdpInputPayoutDate}
                        onChange={(e) => setCdpInputPayoutDate(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>
                
                {/* Right side - ADD Button */}
                {showCoindepoInput && (
                  <div className="w-full sm:w-auto sm:ml-8">
                          <button
                      className="btn-accent px-4 py-2 text-sm font-medium w-full sm:w-auto"
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
          )}

          {/* ======= YOUR LOANS SECTION ======= */}
          {portfolioVisible && (
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6">
              <h2 className="cd-label text-lg mb-4 sm:mb-6">YOUR LOANS</h2>

            {/* Loans List Header */}
            {loans.length > 0 && (
              <div className="hidden sm:grid grid-cols-12 gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-slate-400">
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
              <div className="flex flex-col gap-12 sm:gap-16">
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
                      depositBonus={loanBonus}
                      priceChange24h={loanPriceChanges[loan.asset.coingeckoId || '']}
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

            {/* Add Loan Input Row - Based on Assets section */}
            <div className="mt-12 sm:mt-16 p-6 sm:p-0">
              <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
                {/* Left side - Input fields */}
                <div className="flex flex-col sm:flex-row items-end gap-6 w-full sm:w-auto">
                  {/* Asset Selection - Always Visible */}
                  <div style={{ width: '256px' }}>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 rounded-lg bg-white text-slate-700 text-sm"
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
                    <div className="w-full sm:w-20">
                      <label className="block text-xs font-medium text-slate-600 mb-1">QTY</label>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={addLoanQty || ""}
                        onChange={(e) => setAddLoanQty(toNum(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg text-right text-sm"
                      />
                    </div>
                  )}
                  
                  {/* APR Selection - Only show after asset selection */}
                  {addLoanSymbol && (
                    <div className="w-full sm:w-44">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interest Account Type</label>
                      <select
                        className="w-full h-10 px-3 bg-slate-50 rounded-lg bg-white text-slate-700 text-sm"
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
                </div>
                
                {/* Right side - ADD Button */}
                {addLoanSymbol && (
                  <div className="w-full sm:w-auto sm:ml-8">
                          <button
                      className="btn-accent px-4 py-2 text-sm font-medium w-full sm:w-auto"
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
            )}

          {/* ======= PORTFOLIO TOTALS ======= */}
          {portfolioVisible && (
            <div className="mt-8 pt-6 " style={{ paddingTop: '20px', paddingBottom: '20px' }}>
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
                <div className="mb-3 pb-2 ">
                  <span className="text-slate-600">Holdings Total (for tiers): </span>
                  <span className="text-base font-semibold text-blue-600">{formatCurrency(holdingsTotal)}</span>
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
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <div className="cd-total-green">
                  Net Holdings: {formatCurrency(netHoldings)}
                </div>
              </div>
            </div>
            </div>
          )}
        </section>

        {/* ======= PORTFOLIO ALLOCATION SECTION ======= */}
        <section className="cd-card mb-8 sm:mb-12">
          <header className="mb-8 sm:mb-12 flex items-center justify-between" style={{ paddingBottom: '20px' }}>
            <h1 className="cd-balance-large text-brand-blue text-2xl">Portfolio Allocation</h1>
            <Toggle
              isOn={cardVisibility.allocation}
              onToggle={() => setCardVisibility(prev => ({ ...prev, allocation: !prev.allocation }))}
            />
          </header>
          
          {cardVisibility.allocation && (
            <PortfolioAllocationChart
            assets={rows.map(row => ({
              name: row.asset.name,
              value: row.qty * row.priceUSD
            }))}
            coindepoValue={cdpValueUSD}
            loansValue={loansValueUSD}
            formatCurrency={(value: number) => {
              const convertedValue = value * (exchangeRates[selectedCurrency] || 1);
              
              if (selectedCurrency === 'JPY') {
                return new Intl.NumberFormat("en-US", { 
                  style: "currency", 
                  currency: selectedCurrency,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(convertedValue);
              }
              
              return new Intl.NumberFormat("en-US", { 
                style: "currency", 
                currency: selectedCurrency 
              }).format(convertedValue);
            }}
          />
          )}
        </section>

        {/* ======= INTEREST CONTRIBUTIONS SECTION ======= */}
        <section className="cd-card mb-8 sm:mb-12">
          <header className="mb-8 sm:mb-12 flex justify-between items-center" style={{ paddingBottom: '20px' }}>
            <h1 className="cd-balance-large text-brand-blue text-2xl">Interest Contributions</h1>
            <Toggle
              isOn={cardVisibility.contributions}
              onToggle={() => setCardVisibility(prev => ({ ...prev, contributions: !prev.contributions }))}
            />
          </header>
          
          {cardVisibility.contributions && (
            <>
              {/* Calculate interest contributions */}
          {(() => {
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
                      <div className="col-span-8"></div>
                      <div className="col-span-4 text-right">ANNUAL INTEREST</div>
            </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {allHoldings.map((holding, i) => {
                        return (
                          <div key={`interest-${i}`} className="py-5">
              <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-8 flex items-center" style={{ gap: '20px' }}>
                                <TokenIcon asset={holding.asset} />
                                <div>
                                  <div className="cd-asset-name text-lg font-bold">
                                    {holding.qty.toLocaleString()} {holding.asset.name}
                </div>
                                  <div className="text-xs text-slate-500">
                                    {formatCurrency(holding.value)}
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-4 text-right cd-value-primary">
                                <div>{formatCurrency(holding.annualInterest)}/year</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {holding.apr.toFixed(1)}% APR{depositBonus > 0 ? (
                                    <span className="cd-tier-bonus"> + {(depositBonus * 100).toFixed(1)}% tier</span>
                                  ) : ''} • Compounded
                                </div>
                              </div>
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
                              <div className="col-span-8 flex items-center" style={{ gap: '20px' }}>
                                <TokenIcon asset={loan.asset} />
                                <div>
                                  <div className="cd-asset-name text-red-600 text-lg font-bold">
                                    {interestInAsset.toLocaleString()} {loan.asset.name} Interest
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {formatCurrency(annualInterest)}
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-4 text-right cd-loan-value" style={{color: '#dc2626 !important'}}>
                                <div>-{formatCurrency(annualInterest)}/year</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {getAPRValue(loan.interestRate).toFixed(1)}% APR{loanBonus > 0 ? (
                                    <span className="cd-tier-bonus"> - {(loanBonus * 100).toFixed(1)}% tier</span>
                                  ) : ''} • Compounded
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                </div>

                        {/* Net Interest Income Total */}
                        <div className="mt-12 pt-8 " style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                          <div className="flex justify-end">
                            <div className="text-right">
                              <div className="text-xs text-slate-500 mb-4">Total from all assets</div>
              </div>
                </div>

                          {/* Extra witregel en groene totaal */}
                          <div className="mt-4 flex justify-end">
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
            </>
          )}
        </section>

        {/* Upcoming Interest Payouts Section */}
        <section className="cd-card mb-8 sm:mb-12">
          <header className="mb-8 sm:mb-12 flex justify-between items-center" style={{ paddingBottom: '20px' }}>
            <h1 className="cd-balance-large text-brand-blue text-2xl">Upcoming Interest Payouts</h1>
            <Toggle
              isOn={cardVisibility.payouts}
              onToggle={() => setCardVisibility(prev => ({ ...prev, payouts: !prev.payouts }))}
            />
          </header>
          
          {cardVisibility.payouts && (
            <>
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
                {/* Payouts List */}
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
                      <div key={`payout-${i}`} className="bg-slate-50 rounded-lg p-4">
                        {/* Asset Header */}
                        <div className="flex items-center pb-4" style={{ gap: '20px' }}>
                          <TokenIcon asset={payout.asset} />
                          <div className={`cd-asset-name text-lg font-bold ${payout.isLoan ? 'text-red-600' : ''}`}>
                            {payout.asset.name}
              </div>
                </div>

                        {/* Details Grid - Match Your Earnings layout */}
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-8 space-y-2">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quantity</div>
                            <div className="text-base font-semibold">{payout.qty.toLocaleString()}</div>
                          </div>
                          
                          <div className="col-span-4 text-right space-y-2">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Accrued Interest</div>
                            <div className={`text-base font-semibold ${payout.isLoan ? 'text-red-600' : 'text-green-600'}`}>
                              {payout.isLoan ? '-' : '+'}{(calculation.accruedInterest / assetPrice).toLocaleString()} {payout.asset.symbol}
                              <div className="text-xs text-slate-500 mt-1">
                                {payout.isLoan ? '-' : '+'}{fmtUSD(calculation.accruedInterest)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payout Date */}
                        <div className="mt-4">
                          <div className="text-xs text-slate-400">
                            Interest payout date: <span className="font-medium text-slate-500">{new Date(payout.payoutDate).toLocaleDateString()}</span>
              </div>
              </div>
            </div>
                    );
                  })}
          </div>

                {/* Total Upcoming Interest */}
                <div className="mt-8 pt-6 " style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-4">
                        Interest calculated with compounding • Auto-renewal after payout
                      </div>
            </div>
          </div>

                  {/* Extra witregel en groene totaal */}
                  <div className="mt-4 flex justify-end">
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
            </>
          )}
        </section>

        {/* ======= Onderste blokken strak in cards ======= */}
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 mt-8 sm:mt-12">
          <section className="cd-card flex-1">
            <header className="mb-8 sm:mb-12 flex justify-between items-center" style={{ paddingBottom: '20px' }}>
              <h2 className="cd-balance-large text-blue-600 text-2xl">Your Earnings</h2>
              <Toggle
                isOn={cardVisibility.earnings}
                onToggle={() => setCardVisibility(prev => ({ ...prev, earnings: !prev.earnings }))}
              />
            </header>
            
            {cardVisibility.earnings && (
              <>
                {!isTierProgramActive && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Token Advantage Program starts {activationDateString}</strong>
                  <br />
                  Tier bonuses will be calculated from this date onwards.
                </p>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8 text-slate-700">Portfolio total:</div>
                <div className="col-span-4 text-right font-semibold">{fmtUSD(holdingsTotal)}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8 text-slate-700">COINDEPO holdings:</div>
                <div className="col-span-4 text-right font-semibold">{fmtUSD(cdpValueUSD)}</div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8 text-slate-700">Other crypto holdings:</div>
                <div className="col-span-4 text-right font-semibold">{fmtUSD(otherValueUSD)}</div>
              </div>

              {loansValueUSD > 0 && (
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 text-slate-700">Loans (debt):</div>
                  <div className="col-span-4 text-right font-semibold cd-loan-value" style={{color: '#dc2626 !important'}}>-{fmtUSD(loansValueUSD)}</div>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8 text-slate-700">COINDEPO percentage:</div>
                <div className="col-span-4 text-right font-semibold text-blue-600">{cdpShare.toFixed(2)}%</div>
              </div>
              
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8 text-slate-700">Current tier:</div>
                <div className="col-span-4 text-right font-semibold">{tierLabel}</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-base font-semibold mb-3 text-slate-800">Your Tier Benefits:</h3>
              <div className="space-y-2">
                
                {loansValueUSD > 0 && (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-8 text-slate-700">Loan rate bonus:</div>
                    <div className="col-span-4 text-right font-semibold cd-loan-value" style={{color: '#dc2626 !important'}}>-{(loanBonus * 100).toFixed(0)}% (-{fmtUSD(loanSavingsUSD)})</div>
                  </div>
                )}
                
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 text-slate-700">Token payout bonus:</div>
                  <div className="col-span-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-slate-700">+{(currentTier.tokenPayout * 100).toFixed(0)}%</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          id="tokenPayoutBonus"
                          checked={extraPayoutEnabled}
                          onChange={(e) => setExtraPayoutEnabled(e.target.checked)}
                          disabled={!isTierProgramActive}
                          className="w-4 h-4 text-blue-600 bg-gray-100  rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="tokenPayoutBonus" className="text-sm font-medium text-slate-700">
                          Enable
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </div>

            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8 text-slate-700">Portfolio interest per year:</div>
                <div className="col-span-4 text-right font-semibold text-green-600">+{fmtUSD(otherValueUSD * 0.24)}</div>
              </div>
              
              {depositBonus > 0 && (
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 text-slate-700">Tier {currentTierIndex + 1} interest bonus per year:</div>
                  <div className="col-span-4 text-right font-semibold text-green-600">+{fmtUSD(depositBonusUSD)}</div>
                </div>
              )}
              
              {extraPayoutEnabled && (
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 text-slate-700">Token payout bonus per year:</div>
                  <div className="col-span-4 text-right font-semibold text-green-600">+{fmtUSD(tokenPayoutUSD)}</div>
                </div>
              )}
              
              {loansValueUSD > 0 && (
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 text-slate-700">Loan interest savings per year:</div>
                  <div className="col-span-4 text-right font-semibold text-green-600">+{fmtUSD(loanSavingsUSD)}</div>
                </div>
              )}
              
              {loansValueUSD > 0 && (
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 text-slate-700">Loan interest to pay per year:</div>
                  <div className="col-span-4 text-right font-semibold text-red-600">-{fmtUSD(loanInterestUSD)}</div>
                </div>
              )}
            </div>

            <div className="pt-4  space-y-2" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8 text-base font-semibold text-blue-600">Total passive income per year:</div>
                <div className="col-span-4 text-right text-base font-semibold text-blue-600">{fmtUSD(otherValueUSD * 0.24 + utilityUSD - loanInterestUSD)}</div>
              </div>
              
              <div className="grid grid-cols-12 gap-2 items-center text-sm text-slate-600">
                <div className="col-span-8">Token utility yield:</div>
                <div className="col-span-4 text-right">{utilityYield.toFixed(2)}%</div>
              </div>
            </div>
            
            {/* Extra witregel en groene totaal */}
            <div className="mt-4 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-8 cd-total-green-sm">Total benefits per year:</div>
              <div className="col-span-4 text-right cd-total-green-sm">{fmtUSD(otherValueUSD * 0.24 + utilityUSD)}</div>
            </div>
              </>
            )}
          </section>

          <section className="cd-card flex-1">
            <header className="mb-8 sm:mb-12 flex justify-between items-center" style={{ paddingBottom: '20px' }}>
              <h2 className="cd-balance-large text-blue-600 text-2xl">COINDEPO Holdings Advantages</h2>
              <Toggle
                isOn={cardVisibility.advantages}
                onToggle={() => setCardVisibility(prev => ({ ...prev, advantages: !prev.advantages }))}
              />
            </header>
            
            {cardVisibility.advantages && (
              <>
                {!isTierProgramActive && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Coming Soon: {activationDateString}</strong>
                  <br />
                  The Token Advantage Program with tier benefits launches on this date.
                </p>
              </div>
            )}
            
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
                      <div className="grid grid-cols-12 gap-2 items-start mb-1">
                        <div className={`col-span-11 text-base font-semibold ${achieved ? "cd-tier-achieved" : "text-slate-800"}`}>
                          {label}:
                        </div>
                        {achieved && (
                          <div className="col-span-1 text-right cd-tier-achieved-checkmark text-xl">✓</div>
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
                <div className="mt-8 pt-6 " style={{ paddingTop: '20px', paddingBottom: '20px' }}>
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
              </>
            )}
          </section>
        </div>


        {/* Support Section */}
        <section className="cd-card mt-12">
          <header className="mb-8 sm:mb-12 flex justify-between items-center" style={{ paddingBottom: '20px' }}>
            <h2 className="cd-balance-large text-brand-blue text-2xl">Support</h2>
            <Toggle
              isOn={cardVisibility.support}
              onToggle={() => setCardVisibility(prev => ({ ...prev, support: !prev.support }))}
            />
          </header>
          
          {cardVisibility.support && (
            <div className="space-y-6 sm:space-y-8">
            <div>
              <p className="text-slate-600 mb-6 text-sm sm:text-base">
                If you appreciate this COINDEPO utility tool and want to contribute to its development, please consider a donation:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <span className="font-semibold text-slate-800">USDC</span>
                    <div className="text-xs sm:text-sm font-mono text-slate-600 break-all mt-1">
                      0xD875FaaC1881926dAd6760F46a2B533BD85B25fB
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <span className="font-semibold text-slate-800">ETH</span>
                    <div className="text-xs sm:text-sm font-mono text-slate-600 break-all mt-1">
                      0x4da52892A7e8F410525CAda105681F31BD5d6F10
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <span className="font-semibold text-slate-800">BTC</span>
                    <div className="text-xs sm:text-sm font-mono text-slate-600 break-all mt-1">
                      3FonkNJBAAhkLakLGZm9FhepzB1GgMFAJa
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <span className="font-semibold text-slate-800">COINDEPO</span>
                    <div className="text-xs sm:text-sm font-mono text-slate-600 break-all mt-1">
                      0x9f04613fE8cA16Ed48279F461336784401A5BAEb
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className=" pt-6 sm:pt-8" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
              <p className="font-semibold text-slate-800 mb-3 text-sm sm:text-base">NOT A COINDEPO MEMBER?</p>
              <p className="text-slate-600 mb-3 text-sm sm:text-base">Use my partnerlink to open a free account:</p>
              <a 
                href="https://app.coindepo.com/auth/sign-up?ref=A-ounkNJhY" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800 transition-colors break-all text-xs sm:text-sm"
              >
                https://app.coindepo.com/auth/sign-up?ref=A-ounkNJhY
              </a>
            </div>
            
            <div className=" pt-6 sm:pt-8" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
              <p className="mb-3 text-sm sm:text-base">
                <span className="font-semibold text-slate-800">COINDEPO COMMUNITY LINK</span> @coindepo_community
              </p>
              <p className="mb-3 text-sm sm:text-base">
                <span className="font-semibold text-slate-800">Contact me on Telegram for feedback:</span> @koen0373
              </p>
              <p className="font-semibold text-base sm:text-lg text-slate-800">THANK YOU!</p>
            </div>
            
            <div className=" pt-6 sm:pt-8 text-xs text-slate-500">
              <div className="bg-yellow-50  rounded-lg p-3 sm:p-4 mb-4">
                <h4 className="font-semibold text-yellow-800 mb-2 text-sm sm:text-base">⚠️ IMPORTANT DISCLAIMER</h4>
                <ul className="space-y-1 text-yellow-700 text-xs sm:text-sm">
                  <li>• This Portfolio Manager is <strong>NOT</strong> a COINDEPO endorsed or official product</li>
                  <li>• All calculations, projections, and data are <strong>ESTIMATES ONLY</strong></li>
                  <li>• This tool is for <strong>EDUCATIONAL PURPOSES</strong> and community use only</li>
                  <li>• <strong>NO RIGHTS</strong> can be derived from using this Portfolio Manager</li>
                  <li>• This is <strong>NOT FINANCIAL ADVICE</strong> - always do your own research</li>
                  <li>• Users are <strong>SOLELY RESPONSIBLE</strong> for their investment decisions</li>
                  <li>• The developers accept <strong>NO LIABILITY</strong> for any losses or damages</li>
                </ul>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm">
                <strong>Technical Note:</strong> COINDEPO prices are currently estimated at $0.10 as live APIs are temporarily unavailable.
              </p>
            </div>
          </div>
          )}
        </section>
      </div>
    </div>
  );
}// Force refresh Sun Sep 28 20:43:34 CEST 2025

