// Single-sided liquidity provision on STON.fi v2 (Nabung's yield source).
// Uses router.getSingleSideProvideLiquidityJettonTxParams (provisionType "Arbitrary",
// one amount = "0"). Saving = single-sided USDT into a STABLE pool (minimal IL).

import { MOCK, TON_API_KEY, TON_RPC, USDT } from "@/config";
import type { SavingsPosition } from "@/types";
import { resolveSavingsPool, getUsdPrice } from "./api";

async function tonClient() {
  const { TonClient } = await import("@ton/ton");
  return new TonClient({ endpoint: TON_RPC, apiKey: TON_API_KEY || undefined });
}

/** Transaction params (ready to send via TonConnect sendTransaction). */
export interface TxParams {
  to: string;
  value: string;
  body?: string; // base64 BOC
}

/**
 * Build a single-sided provide-liquidity transaction: deposit `usdtUnits` USDT
 * into the stable pool. Returns TxParams for the wallet to sign.
 */
export async function buildDepositTx(walletAddress: string, usdtUnits: string): Promise<TxParams[]> {
  if (MOCK) {
    return [{ to: "MOCK_ROUTER", value: "150000000", body: "MOCK_DEPOSIT_BODY" }];
  }

  const pool = await resolveSavingsPool();
  const { DEX } = await import("@ston-fi/sdk");
  const client = await tonClient();
  // Router is resolved via the API/registry in production; v2 example here.
  const router = client.open((DEX as any).v2.Router.create(pool.address));

  // Single-sided: fill the USDT amount, set the other side to "0", provisionType "Arbitrary".
  const params = await router.getSingleSideProvideLiquidityJettonTxParams({
    userWalletAddress: walletAddress,
    sendTokenAddress: USDT.address,
    sendAmount: usdtUnits,
    otherTokenAddress: pool.address, // the pool's second (stable) token
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

/** Build a withdrawal transaction: remove `lpShares` of liquidity. */
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
 * Read the savings position from ON-CHAIN (source of truth), then present it bank-style.
 * Mira memory is only a UX cache — official numbers always come from here.
 */
export async function readPosition(walletAddress: string): Promise<SavingsPosition> {
  if (MOCK) {
    const principalUsd = 100;
    const balanceUsd = 103.2; // includes simulated interest
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
  // Query the user's LP jetton balance in the pool, convert share -> USD value.
  const { price } = await getUsdPrice(USDT.symbol);
  void [walletAddress, pool, price];
  // TODO: compute from the LP balance & pool reserves.
  throw new Error("Live readPosition not wired yet — run with VITE_MOCK (default).");
}
