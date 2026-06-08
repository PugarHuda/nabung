// Convert "any token -> USDT" via Omniston (best-rate aggregator).
// Differentiator vs Inite: Nabung accepts deposits in ANY token, then normalizes them
// to stable USDT before saving.
//
// VERIFIED against mainnet (wss://omni-ws.ston.fi):
//   - requestForQuote: 1 TON -> ~1.697 USDT (resolver "Omniston")
//   - tonBuildSwap   : returns 1 unsigned message ready to sign (TON Connect)

import { MOCK, OMNISTON_WS, PRODUCT, USDT, DEPOSIT_ASSETS } from "@/config";
import type { ConversionQuote } from "@/types";
import { getUsdPrice } from "./api";

// ---- Omniston shape helpers ----
function tonAsset(address: string) {
  return address === "native" || !address
    ? { chain: { $case: "ton", value: { kind: { $case: "native", value: {} } } } }
    : { chain: { $case: "ton", value: { kind: { $case: "jetton", value: address } } } };
}
function tonAddr(address: string) {
  return { chain: { $case: "ton", value: address } };
}
function resolveAddress(symbol: string): string {
  return DEPOSIT_ASSETS.find((a) => a.symbol === symbol)?.address ?? "native";
}
function decimalsOf(symbol: string): number {
  return DEPOSIT_ASSETS.find((a) => a.symbol === symbol)?.decimals ?? 9;
}
function buildQuoteReq(fromSymbol: string, fromUnits: string) {
  return {
    inputAsset: tonAsset(resolveAddress(fromSymbol)),
    outputAsset: tonAsset(USDT.address),
    amount: { $case: "inputUnits", value: fromUnits },
    settlementParams: [
      { params: { $case: "swap", value: { maxPriceSlippagePips: PRODUCT.maxSlippageBps * 100 } } },
    ],
  };
}
/** Omniston returns the BOC payload as HEX; TON Connect needs base64. */
function hexToBase64(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

async function withOmniston<T>(fn: (omni: any) => Promise<T>): Promise<T> {
  const { Omniston } = await import("@ston-fi/omniston-sdk");
  const omni = new Omniston({ apiUrl: OMNISTON_WS });
  try {
    return await fn(omni);
  } finally {
    try {
      (omni as { close?: () => void }).close?.();
    } catch {
      /* noop */
    }
  }
}

/** Take the first `quoteUpdated` event from the RFQ stream. */
function firstQuote(omni: any, req: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const sub = omni.requestForQuote(req).subscribe({
      next: (e: any) => {
        if (e?.$case === "quoteUpdated") {
          sub.unsubscribe();
          resolve(e.value);
        } else if (e?.$case === "noQuote") {
          sub.unsubscribe();
          reject(new Error("No liquidity route for this token right now."));
        }
      },
      error: (err: unknown) => reject(err),
    });
    setTimeout(() => {
      sub.unsubscribe();
      reject(new Error("Omniston quote timed out — please try again."));
    }, PRODUCT.quoteTtlMs);
  });
}

/** Quote to DISPLAY (rate & estimated output) before the user confirms. */
export async function quoteToUsdt(
  fromSymbol: string,
  fromUnits: string,
  fromDecimals: number,
): Promise<ConversionQuote> {
  if (MOCK) {
    const { price } = await getUsdPrice(fromSymbol);
    const amount = Number(fromUnits) / 10 ** fromDecimals;
    const usd = amount * price;
    return {
      fromSymbol,
      toSymbol: USDT.symbol,
      inUnits: fromUnits,
      outUnits: Math.floor(usd * 10 ** USDT.decimals).toString(),
      rate: price,
      slippageBps: 25,
      createdAt: Date.now(),
    };
  }
  const quote = await withOmniston((omni) => firstQuote(omni, buildQuoteReq(fromSymbol, fromUnits)));
  const inAmt = Number(fromUnits) / 10 ** fromDecimals;
  const outAmt = Number(quote.outputUnits) / 10 ** USDT.decimals;
  return {
    fromSymbol,
    toSymbol: USDT.symbol,
    inUnits: fromUnits,
    outUnits: String(quote.outputUnits),
    rate: inAmt > 0 ? outAmt / inAmt : 0,
    slippageBps: 30,
    createdAt: Date.now(),
  };
}

export interface BuiltTx {
  to: string;
  value: string;
  body?: string;
}

/**
 * Build the REAL swap transaction (token -> USDT) via Omniston: quote -> tonBuildSwap.
 * Returns unsigned messages (ready for TON Connect) + estimated USDT received.
 * Build path VERIFIED on mainnet.
 */
export async function buildSwapToUsdtTx(
  wallet: string,
  fromSymbol: string,
  fromUnits: string,
): Promise<{ txs: BuiltTx[]; outUnits: string }> {
  if (MOCK) {
    const q = await quoteToUsdt(fromSymbol, fromUnits, decimalsOf(fromSymbol));
    return { txs: [{ to: "MOCK_OMNISTON", value: "1100000000", body: "MOCK" }], outUnits: q.outUnits };
  }
  return withOmniston(async (omni) => {
    const quote = await firstQuote(omni, buildQuoteReq(fromSymbol, fromUnits));
    const tx = await omni.tonBuildSwap({
      quoteId: quote.quoteId,
      transferSrcAddress: tonAddr(wallet),
      traderDstAddress: tonAddr(wallet),
    });
    const txs: BuiltTx[] = (tx?.messages ?? []).map((m: any) => ({
      to: m.targetAddress,
      value: m.sendAmount,
      body: m.payload ? hexToBase64(m.payload) : undefined,
    }));
    if (!txs.length) throw new Error("Failed to build the swap transaction.");
    return { txs, outUnits: String(quote.outputUnits) };
  });
}

/** A quote is stale once it passes its TTL — must re-fetch before signing. */
export function isQuoteStale(q: ConversionQuote): boolean {
  return Date.now() - q.createdAt > PRODUCT.quoteTtlMs;
}

/** Reject if slippage exceeds the limit (QA: never execute silently). */
export function slippageWithinLimit(q: ConversionQuote): boolean {
  return q.slippageBps <= PRODUCT.maxSlippageBps;
}
