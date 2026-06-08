// Wrapper around @ston-fi/api: USD price, pool APY, savings-pool selection.
// Fields VERIFIED from the live API: asset -> `dexPriceUsd`; pool -> `apy30D/apy7D` + `lpTotalSupplyUsd`.
// Used to show REAL market data from STON.fi (USDT peg, APY) in the UI.

import { MOCK, USDT } from "@/config";

// High-TVL USDT pool (to display a real APY). Swap for a specific stable pool in
// production. Single getPool() call — lightweight (not getPools' 45k list).
const DISPLAY_POOL = "EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4";

export interface PoolInfo {
  address: string;
  apyPercent: number;
  tvlUsd: number;
  isStable: boolean;
}

type Api = {
  getAsset: (a: string) => Promise<Record<string, unknown>>;
  getPool: (a: string) => Promise<Record<string, unknown>>;
};
let _client: Api | null = null;
async function client(): Promise<Api> {
  if (_client) return _client;
  const { StonApiClient } = await import("@ston-fi/api");
  _client = new StonApiClient() as unknown as Api;
  return _client;
}

/** USD price of a token (deposit estimate). Mock for input tokens so it's fast & stable. */
export async function getUsdPrice(symbol: string): Promise<{ price: number; fetchedAt: number }> {
  if (MOCK) {
    const table: Record<string, number> = { TON: 5.2, USDT: 1, NOT: 0.008 };
    return { price: table[symbol] ?? 1, fetchedAt: Date.now() };
  }
  try {
    const c = await client();
    const a = await c.getAsset(symbol === USDT.symbol ? USDT.address : symbol);
    return { price: Number(a.dexPriceUsd) || 0, fetchedAt: Date.now() };
  } catch {
    return { price: 0, fetchedAt: Date.now() };
  }
}

/** REAL USDT price from STON.fi (to display the peg). Always try live + fallback. */
export async function getUsdtPriceLive(): Promise<number> {
  try {
    const c = await client();
    const a = await c.getAsset(USDT.address);
    return Number(a.dexPriceUsd) || 1;
  } catch {
    return 1;
  }
}

/** REAL APY from a STON.fi USDT pool (apy30D). Always try live + fallback to 6.2%. */
export async function getSavingsApyLive(): Promise<number> {
  try {
    const c = await client();
    const p = await c.getPool(DISPLAY_POOL);
    const raw = Number(p.apy30D ?? p.apy7D ?? p.apy1D ?? 0);
    if (!raw) return 6.2;
    // apy may be a fraction (0.06) or a percent (6.0) — normalize to percent.
    return raw < 1 ? raw * 100 : raw;
  } catch {
    return 6.2;
  }
}

/** Select the savings pool (address + real APY). */
export async function resolveSavingsPool(): Promise<PoolInfo> {
  if (MOCK) return { address: DISPLAY_POOL, apyPercent: await getSavingsApyLive(), tvlUsd: 6_400_000, isStable: true };
  const apy = await getSavingsApyLive();
  return { address: DISPLAY_POOL, apyPercent: apy, tvlUsd: 0, isStable: true };
}
