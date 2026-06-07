// Pembungkus @ston-fi/api: harga USD, daftar pool, APY, dan pemilihan router.
// Dipakai untuk (a) menghitung nilai setoran dalam USD, (b) menampilkan APY JUJUR
// (realized/range, bukan angka karangan), (c) memilih stable pool ber-IL rendah.

import { MOCK, USDT } from "@/config";

// Tipe ringan supaya tidak ketergantungan ketat ke versi SDK.
export interface PoolInfo {
  address: string;
  apyPercent: number;
  tvlUsd: number;
  /** true jika pool bertipe stableswap (IL minimal) */
  isStable: boolean;
}

let _client: unknown = null;

async function client() {
  if (_client) return _client;
  const { StonApiClient } = await import("@ston-fi/api");
  _client = new StonApiClient();
  return _client as { getPools: () => Promise<unknown[]>; getAssets: () => Promise<unknown[]> };
}

/** Harga USD sebuah token. Mengembalikan {price, fetchedAt} agar bisa cek basi. */
export async function getUsdPrice(symbol: string): Promise<{ price: number; fetchedAt: number }> {
  if (MOCK) {
    const table: Record<string, number> = { TON: 5.2, USDT: 1, NOT: 0.008 };
    return { price: table[symbol] ?? 1, fetchedAt: Date.now() };
  }
  const c = await client();
  // @ston-fi/api menyediakan metadata aset termasuk harga; sesuaikan dgn versi SDK.
  const assets = (await (c as { getAssets: () => Promise<Array<Record<string, unknown>>> }).getAssets());
  const found = assets.find((a) => (a.symbol as string) === symbol);
  const price = Number((found?.dexPriceUsd as string) ?? 0);
  return { price, fetchedAt: Date.now() };
}

/**
 * Pilih pool tabungan: stableswap dengan TVL tertinggi yang melibatkan USDT.
 * Mengutamakan IL rendah — ini fondasi klaim "tabungan aman".
 */
export async function resolveSavingsPool(): Promise<PoolInfo> {
  if (MOCK) {
    return { address: "MOCK_STABLE_POOL", apyPercent: 6.2, tvlUsd: 4_200_000, isStable: true };
  }
  const c = await client();
  const pools = (await (c as { getPools: () => Promise<Array<Record<string, unknown>>> }).getPools());
  const stableUsdt = pools
    .filter((p) => (p.type as string)?.toLowerCase?.().includes("stable"))
    .filter((p) => JSON.stringify(p).includes(USDT.address))
    .map((p) => ({
      address: p.address as string,
      apyPercent: Number((p.apy as string) ?? 0),
      tvlUsd: Number((p.tvlUsd as string) ?? 0),
      isStable: true,
    }))
    .sort((a, b) => b.tvlUsd - a.tvlUsd);

  if (!stableUsdt.length) {
    throw new Error("Tidak ada stable pool USDT yang tersedia — tunda setor (jangan masuk pool volatil).");
  }
  return stableUsdt[0];
}
