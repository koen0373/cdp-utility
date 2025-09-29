// src/CDPUtilityApp.tsx - Updated Layout v2
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "./data/assets";
import COINDEPO_LOGO from "./assets/COINDEPO.webp"; // zet je logo hier neer

type Asset = { symbol: string; name: string; coingeckoId?: string; isCDP?: boolean };
type Row = { asset: Asset; qty: number; priceUSD: number; interestRate?: string; payoutDate?: string };

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function toNum(v: any): number {
  if (typeof v === "string") v = v.replace(",", ".");
  const n = parseFloat(v as any);
  return Number.isFinite(n) ? n : 0;
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
function iconCandidates(asset?: Asset): string[] {
  if (!asset) return [];
  const ticker = asset.symbol.toLowerCase().split("-")[0];
  const geckoId = asset.coingeckoId;
  
  const candidates = [
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${ticker}.png`,
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/icon/${ticker}.png`,
  ];
  
  // Add CoinGecko API as fallback for newer tokens
  if (geckoId) {
    candidates.push(`https://api.coingecko.com/api/v3/coins/${geckoId}/image`);
  }
  
  // Add additional fallback sources for missing icons
  candidates.push(
    `https://assets.coingecko.com/coins/images/1/large/${ticker}.png`,
    `https://cryptoicons.org/api/icon/${ticker}/200`
  );
  
  return candidates;
}

const TokenIcon: React.FC<{ asset: Asset; size?: number }> = ({ asset, size = 32 }) => {
  if (asset.isCDP) {
    return (
      <img
        src={COINDEPO_LOGO}
        width={size}
        height={size}
        className="rounded"
        alt="COINDEPO"
      />
    );
  }
  const [idx, setIdx] = useState(0);
  const urls = iconCandidates(asset);
  const initials =
    asset.name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() ?? "?";

  if (!urls.length || idx >= urls.length) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-slate-100 grid place-items-center text-[10px] font-semibold text-slate-700"
      >
        {initials}
      </div>
    );
  }
  // eslint-disable-next-line jsx-a11y/alt-text
  return (
    <img
      src={urls[idx]}
      width={size}
      height={size}
      className="rounded-full bg-white"
      onError={() => setIdx(idx + 1)}
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
  try {
    console.log(`Fetching price for ${id} from /coingecko/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const res = await fetch(
      `/coingecko/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`
    );
    console.log(`Response status: ${res.status}`);
    if (!res.ok) {
      console.log(`API call failed with status ${res.status}`);
      return hit ? hit.price : null;
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
    return hit ? hit.price : null;
  } catch (error) {
    console.error(`Error fetching price for ${id}:`, error);
    return hit ? hit.price : null;
  }
}

/* -------------------- LocalStorage -------------------- */
const LS_VERSION = "v6";
const LS_KEYS = {
  rows: `cdp.utility.rows.${LS_VERSION}`,
  cdpQty: `cdp.utility.cdpQty.${LS_VERSION}`,
  cdpPrice: `cdp.utility.cdpPrice.${LS_VERSION}`,
};

function saveLS<T>(k: string, v: T) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
function loadLS<T>(k: string, fb: T): T {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return fb;
    return JSON.parse(raw) as T;
  } catch {
    return fb;
  }
}

/* ==================== AssetRow Component ==================== */
const AssetRow: React.FC<{
  row: Row;
  index: number;
  value: number;
  onUpdate: (qty: number) => void;
  onRemove: () => void;
}> = ({ row, value, onUpdate, onRemove }) => {
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
              <div className="font-medium text-slate-800">{row.asset.name}</div>
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
              backgroundColor: '#4ade80', 
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
        <div className="col-span-2 text-right font-semibold">
          {fmtUSD(value)}
        </div>
        <div className="col-span-1 flex items-center justify-end gap-2">
          {!isEditing ? (
            <>
              <button
                style={{ color: '#94a3b8', background: "transparent", border: "none", padding: 0, lineHeight: 1 }}
                onClick={() => setIsEditing(true)}
                aria-label="Edit"
                title="Edit"
              >
                <Pencil />
              </button>
              <button
                style={{ color: '#94a3b8', background: "transparent", border: "none", padding: 0, lineHeight: 1 }}
                onClick={onRemove}
                aria-label="Remove"
                title="Remove"
              >
                <Trash />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded-lg"
                style={{ background: "#ecfdf5", color: "#047857" }}
                onClick={save}
              >
                ✓ Save
              </button>
              <button
                className="px-2 py-1 rounded-lg"
                style={{ background: "#f8fafc", color: "#334155" }}
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
  const [cdpInputPrice, setCdpInputPrice] = useState("");
  const [cdpInputAPR, setCdpInputAPR] = useState(""); // New state for input APR
  const [cdpInputPayoutDate, setCdpInputPayoutDate] = useState(""); // New state for COINDEPO payout date
  const [showCoindepoInput, setShowCoindepoInput] = useState(false); // New state for showing input fields

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
            priceUSD: h.priceUSD || 0.11,
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

  // Save data - Simple localStorage saving
  useEffect(() => {
    if (rows.length > 0) {
      const dataToSave = rows.map((r) => ({
        symbol: r.asset.symbol,
        qty: r.qty,
        priceUSD: r.priceUSD,
        interestRate: r.interestRate,
        payoutDate: r.payoutDate
      }));
      localStorage.setItem('portfolio-rows', JSON.stringify(dataToSave));
      console.log('Saved rows to localStorage:', dataToSave);
    } else {
      localStorage.removeItem('portfolio-rows');
      console.log('Removed empty rows from localStorage');
    }
  }, [rows]);

  // Save COINDEPO holdings data
  useEffect(() => {
    if (coindepoHoldings.length > 0) {
      const dataToSave = coindepoHoldings.map((h) => ({
        qty: h.qty,
        priceUSD: h.priceUSD,
        interestRate: h.interestRate,
        payoutDate: h.payoutDate
      }));
      localStorage.setItem('coindepo-holdings', JSON.stringify(dataToSave));
      console.log('Saved COINDEPO holdings to localStorage:', dataToSave);
    } else {
      localStorage.removeItem('coindepo-holdings');
      console.log('Removed empty COINDEPO holdings from localStorage');
    }
  }, [coindepoHoldings]);

  // Save loans data
  useEffect(() => {
    if (loans.length > 0) {
      const dataToSave = loans.map((l) => ({
        symbol: l.asset.symbol,
        qty: l.qty,
        priceUSD: l.priceUSD,
        interestRate: l.interestRate,
        payoutDate: l.payoutDate
      }));
      localStorage.setItem('portfolio-loans', JSON.stringify(dataToSave));
      console.log('Saved loans to localStorage:', dataToSave);
    } else {
      localStorage.removeItem('portfolio-loans');
      console.log('Removed empty loans from localStorage');
    }
  }, [loans]);

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

  // Tiers
  type TierDef = { label: string; pct: number; bonusApr: number };
  const TIERS: TierDef[] = [
    { label: "Tier 1 (≥1%)", pct: 0.01, bonusApr: 0.0 },
    { label: "Tier 2 (≥5%)", pct: 0.05, bonusApr: 0.01 },
    { label: "Tier 3 (≥10%)", pct: 0.10, bonusApr: 0.02 },
    { label: "Tier 4 (≥15%)", pct: 0.15, bonusApr: 0.03 },
  ];
  const cdpShare = holdingsTotal > 0 ? (cdpValueUSD / holdingsTotal) * 100 : 0;
  let tierLabel = "None";
  let tierBonusApr = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (cdpShare >= TIERS[i].pct * 100) {
      tierLabel = TIERS[i].label.split(" ")[0] + " " + TIERS[i].label.split(" ")[1];
      tierBonusApr = TIERS[i].bonusApr;
      break;
    }
  }

  const utilityUSD = otherValueUSD * tierBonusApr;
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
      priceUSD: 0.11, 
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
      setCdpInputPrice("");
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

  return (
    <div className="bg-brand-gray">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Under Construction Notice */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>COINDEPO Portfolio Manager is under construction.</strong> Some features may not work as expected. We're working hard to improve your experience!
              </p>
            </div>
          </div>
        </div>

        {/* ======= PORTFOLIO SECTION ======= */}
        <section className="card mb-6">
          <header className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-brand-blue">Your Portfolio</h1>
            <button
              onClick={handleResetPortfolio}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors"
              title="Reset entire portfolio"
            >
              Reset Portfolio
            </button>
          </header>
          
          <h2 className="text-xs uppercase tracking-wide text-slate-400" style={{ marginBottom: '24px' }}>YOUR ASSETS</h2>

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
            <div className="flex items-center justify-between">
              {/* Left side - Input fields */}
              <div className="flex items-center" style={{ gap: '24px' }}>
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
                    className="btn-primary px-4 py-2 text-sm font-medium"
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
            <h2 className="text-xs uppercase tracking-wide text-slate-400" style={{ marginBottom: '24px' }}>YOUR COINDEPO HOLDINGS</h2>


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
                      <div key={`coindepo-${i}`} className="py-5">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3 flex items-center" style={{ gap: '24px' }}>
                            <TokenIcon asset={coindepoAsset} />
                            <div>
                              <div className="font-medium text-slate-800">COINDEPO Token</div>
                              {holding.payoutDate && (
                                <div className="text-xs text-slate-500">
                                  Interest payout date: {new Date(holding.payoutDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2 text-right text-slate-800">
                            {holding.qty.toLocaleString()}
                          </div>
                          <div className="col-span-2 text-right text-slate-500">
                            ${holding.priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
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
                          <div className="col-span-2 text-right font-semibold">
                            {fmtUSD(value)}
                          </div>
                          <div className="col-span-1 flex items-center justify-end gap-2">
                            <button
                              style={{ color: '#94a3b8', background: "transparent", border: "none", padding: 0, lineHeight: 1 }}
                              onClick={() => setCoindepoHoldings(coindepoHoldings.filter((_, idx) => idx !== i))}
                              aria-label="Remove"
                              title="Remove"
                            >
                              <Trash />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* COINDEPO Input Row - Step by Step Flow */}
            <div style={{ marginTop: '32px', padding: '16px 0' }}>
              <div className="flex items-center justify-between">
                {/* Left side - Input fields */}
                <div className="flex items-center" style={{ gap: '24px' }}>
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
                        $0.11
                      </div>
                    </>
                  )}
                </div>
                
                {/* Right side - ADD Button */}
                {showCoindepoInput && (
                  <div style={{ marginLeft: '32px' }}>
                    <button
                      className="btn-primary px-4 py-2 text-sm font-medium"
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
            <h2 className="text-xs uppercase tracking-wide text-slate-400" style={{ marginBottom: '24px' }}>YOUR LOANS</h2>

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
                        {fmtUSD((addLoanQty || 0) * selectedLoanPrice)}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Right side - ADD Button */}
                {addLoanSymbol && (
                  <div style={{ marginLeft: '32px' }}>
                    <button
                      className="btn-primary px-4 py-2 text-sm font-medium"
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
                  <span className="font-semibold">{fmtUSD(otherValueUSD)}</span>
                </div>
                <div className="mb-2">
                  <span className="text-slate-600">COINDEPO: </span>
                  <span className="font-semibold">{fmtUSD(cdpValueUSD)}</span>
                </div>
                <div className="mb-3 pb-2 border-b border-slate-200">
                  <span className="text-slate-600">Holdings Total (for tiers): </span>
                  <span className="text-lg font-semibold text-blue-600">{fmtUSD(holdingsTotal)}</span>
                </div>
                {loansValueUSD > 0 && (
                  <div className="mb-2">
                    <span className="text-slate-600">Loans: </span>
                    <span className="font-semibold text-red-600">-{fmtUSD(loansValueUSD)}</span>
                  </div>
                )}
                <div className="text-lg font-semibold text-slate-800">
                  Net Holdings: {fmtUSD(netHoldings)}
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ======= Onderste blokken strak in cards ======= */}
        <div className="grid grid-cols-12 gap-4">
          <section className="card col-span-12 md:col-span-6">
            <h2 className="text-xl font-semibold mb-6 text-blue-600">Token Advantage Program</h2>
            
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
                  <span className="font-semibold text-red-600">-{fmtUSD(loansValueUSD)}</span>
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
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Deposit bonus:</span>
                  <span className="font-semibold">+{(tierBonusApr * 100).toFixed(0)}%</span>
                </div>
                
                {loansValueUSD > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Loan rate bonus:</span>
                    <span className="font-semibold">-{(tierBonusApr * 100).toFixed(0)}% ({fmtUSD(loansValueUSD * tierBonusApr)})</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Token payout bonus:</span>
                  <span className="font-semibold">+{(tierBonusApr * 2 * 100).toFixed(0)}% ✓ Enable</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Normal APR income per year:</span>
                <span className="font-semibold">{fmtUSD(utilityUSD / tierBonusApr || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Extra APR from COINDEPO tier:</span>
                <span className="font-semibold">{fmtUSD(utilityUSD)}</span>
              </div>
              
              {loansValueUSD > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Loan interest savings per year:</span>
                  <span className="font-semibold text-green-600">{fmtUSD(loansValueUSD * tierBonusApr)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-blue-600">Total passive income per year:</span>
                <span className="text-lg font-semibold text-blue-600">{fmtUSD((utilityUSD / tierBonusApr || 0) + utilityUSD)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-green-600">Total benefits per year:</span>
                <span className="text-lg font-semibold text-green-600">{fmtUSD((utilityUSD / tierBonusApr || 0) + utilityUSD + (loansValueUSD * tierBonusApr))}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Utility yield:</span>
                <span>{utilityYield.toFixed(2)}%</span>
              </div>
            </div>
          </section>

          <section className="card col-span-12 md:col-span-6">
            <h2 className="text-xl font-semibold mb-3">Required for tiers</h2>
            {otherValueUSD <= 0 ? (
              <p className="text-slate-500">Add assets to see required COINDEPO.</p>
            ) : (
              [
                { label: "Tier 1 (≥1%)", pct: 0.01 },
                { label: "Tier 2 (≥5%)", pct: 0.05 },
                { label: "Tier 3 (≥10%)", pct: 0.10 },
                { label: "Tier 4 (≥15%)", pct: 0.15 },
              ].map(({ label, pct }) => {
                const needUSD = needForPctUSD(pct);
                const achieved = needUSD <= 0.0001;
                const needTokens =
                  0.11 > 0 ? Math.ceil(needUSD / 0.11) : null;

                return (
                  <p key={label} className={achieved ? "text-green-600 font-semibold" : ""}>
                    For {label}:{" "}
                    {achieved ? (
                      <>✔️ achieved</>
                    ) : needTokens === null ? (
                      <>— <span className="text-slate-500">(set COINDEPO price)</span></>
                    ) : (
                      <>
                        {needTokens.toLocaleString()} COINDEPO{" "}
                        <span className="text-slate-500">({fmtUSD(needUSD)})</span>
                      </>
                    )}
                  </p>
                );
              })
            )}
          </section>
        </div>
      </div>
    </div>
  );
}// Force refresh Sun Sep 28 20:43:34 CEST 2025
