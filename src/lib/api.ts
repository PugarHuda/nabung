// Pembungkus @ston-fi/api: harga USD, APY pool, pemilihan pool tabungan.
// Field DIVERIFIKASI dari API live: aset -> `dexPriceUsd`; pool -> `apy30D/apy7D` + `lpTotalSupplyUsd`.
// Dipakai untuk menampilkan DATA PASAR NYATA dari STON.fi (peg USDT, APY) di UI.

import { MOCK, USDT } from "@/config";

// Pool USDT ber-TVL tinggi (untuk menampilkan APY nyata). Bisa diganti pool stable
// spesifik untuk produksi. Single call getPool() — ringan (bukan getPools 45k).
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

/** Harga USD token (estimasi setoran). Mock untuk token input agar cepat & stabil. */
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

/** Harga USDT NYATA dari STON.fi (untuk menampilkan peg). Selalu coba live + fallback. */
export async function getUsdtPriceLive(): Promise<number> {
  try {
    const c = await client();
    const a = await c.getAsset(USDT.address);
    return Number(a.dexPriceUsd) || 1;
  } catch {
    return 1;
  }
}

/** APY NYATA dari pool USDT STON.fi (apy30D). Selalu coba live + fallback ke 6.2%. */
export async function getSavingsApyLive(): Promise<number> {
  try {
    const c = await client();
    const p = await c.getPool(DISPLAY_POOL);
    const raw = Number(p.apy30D ?? p.apy7D ?? p.apy1D ?? 0);
    if (!raw) return 6.2;
    // apy bisa berupa fraksi (0.06) atau persen (6.0) — normalkan ke persen.
    return raw < 1 ? raw * 100 : raw;
  } catch {
    return 6.2;
  }
}

/** Pilih pool tabungan (alamat + APY nyata). */
export async function resolveSavingsPool(): Promise<PoolInfo> {
  if (MOCK) return { address: DISPLAY_POOL, apyPercent: await getSavingsApyLive(), tvlUsd: 6_400_000, isStable: true };
  const apy = await getSavingsApyLive();
  return { address: DISPLAY_POOL, apyPercent: apy, tvlUsd: 0, isStable: true };
}
