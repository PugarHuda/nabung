// Single-sided liquidity provision di STON.fi v2 (sumber yield Nabung).
// Memakai router.getSingleSideProvideLiquidityJettonTxParams (provisionType "Arbitrary",
// salah satu amount = "0"). Menabung = masuk single-sided USDT ke STABLE pool (IL minimal).

import { MOCK, TON_API_KEY, TON_RPC, USDT } from "@/config";
import type { SavingsPosition } from "@/types";
import { resolveSavingsPool, getUsdPrice } from "./api";

async function tonClient() {
  const { TonClient } = await import("@ton/ton");
  return new TonClient({ endpoint: TON_RPC, apiKey: TON_API_KEY || undefined });
}

/** Parameter transaksi (siap dikirim via TonConnect sendTransaction). */
export interface TxParams {
  to: string;
  value: string;
  body?: string; // base64 BOC
}

/**
 * Bangun transaksi single-sided provide liquidity: setor `usdtUnits` USDT
 * ke stable pool. Mengembalikan TxParams untuk ditandatangani wallet.
 */
export async function buildDepositTx(walletAddress: string, usdtUnits: string): Promise<TxParams[]> {
  if (MOCK) {
    return [{ to: "MOCK_ROUTER", value: "150000000", body: "MOCK_DEPOSIT_BODY" }];
  }

  const pool = await resolveSavingsPool();
  const { DEX } = await import("@ston-fi/sdk");
  const client = await tonClient();
  // Router dipilih via API/registry pada produksi; di sini contoh v2.
  const router = client.open((DEX as any).v2.Router.create(pool.address));

  // Single-sided: amount USDT diisi, sisi lain "0", provisionType "Arbitrary".
  const params = await router.getSingleSideProvideLiquidityJettonTxParams({
    userWalletAddress: walletAddress,
    sendTokenAddress: USDT.address,
    sendAmount: usdtUnits,
    otherTokenAddress: pool.address, // token kedua pool (stable)
    minLpOut: "1",
    provisionType: "Arbitrary",
  } as any);

  const arr = Array.isArray(params) ? params : [params];
  return arr.map((p: any) => ({
    to: p.to.toString(),
    value: p.value.toString(),
    body: p.body?.toBoc?.().toString("base64"),
  }));
}

/** Bangun transaksi penarikan: remove liquidity sebesar `lpShares`. */
export async function buildWithdrawTx(walletAddress: string, lpShares: string): Promise<TxParams[]> {
  if (MOCK) {
    return [{ to: "MOCK_ROUTER", value: "150000000", body: "MOCK_WITHDRAW_BODY" }];
  }
  const pool = await resolveSavingsPool();
  const { DEX } = await import("@ston-fi/sdk");
  const client = await tonClient();
  const router = client.open((DEX as any).v2.Router.create(pool.address));
  const params = await router.getBurnLiquidityTxParams({
    userWalletAddress: walletAddress,
    amount: lpShares,
  } as any);
  const arr = Array.isArray(params) ? params : [params];
  return arr.map((p: any) => ({
    to: p.to.toString(),
    value: p.value.toString(),
    body: p.body?.toBoc?.().toString("base64"),
  }));
}

/**
 * Baca posisi tabungan dari ON-CHAIN (sumber kebenaran), lalu sajikan ala bank.
 * Mira memory hanya cache UX — angka resmi selalu dari sini.
 */
export async function readPosition(walletAddress: string): Promise<SavingsPosition> {
  if (MOCK) {
    const principalUsd = 100;
    const balanceUsd = 103.2; // sudah termasuk bunga simulasi
    return {
      balanceUsd,
      principalUsd,
      earnedUsd: +(balanceUsd - principalUsd).toFixed(2),
      apyPercent: 6.2,
      lpShares: "1000000",
      syncedAt: Date.now(),
    };
  }
  const pool = await resolveSavingsPool();
  // Query LP jetton balance user di pool, konversi share -> nilai USD.
  const { price } = await getUsdPrice(USDT.symbol);
  void [walletAddress, pool, price];
  // TODO: hitung dari LP balance & reserves pool.
  throw new Error("readPosition live belum di-wire — jalankan dengan VITE_MOCK (default).");
}
