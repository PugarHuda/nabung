// Konversi "token apa pun -> USDT" via Omniston (agregator best-rate).
// Pembeda dari Inite: Nabung menerima setoran token APA PUN, lalu menyeragamkannya
// ke USDT yang stabil sebelum ditabung.
//
// DIVERIFIKASI ke mainnet (wss://omni-ws.ston.fi):
//   - requestForQuote: 1 TON -> ~1.697 USDT (resolver "Omniston")
//   - tonBuildSwap   : menghasilkan 1 unsigned message siap tanda tangan (TON Connect)

import { MOCK, OMNISTON_WS, PRODUCT, USDT, DEPOSIT_ASSETS } from "@/config";
import type { ConversionQuote } from "@/types";
import { getUsdPrice } from "./api";

// ---- helper bentuk Omniston ----
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
/** Omniston mengirim payload BOC dalam HEX; TON Connect butuh base64. */
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

/** Ambil event `quoteUpdated` pertama dari stream RFQ. */
function firstQuote(omni: any, req: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const sub = omni.requestForQuote(req).subscribe({
      next: (e: any) => {
        if (e?.$case === "quoteUpdated") {
          sub.unsubscribe();
          resolve(e.value);
        } else if (e?.$case === "noQuote") {
          sub.unsubscribe();
          reject(new Error("Tidak ada rute likuiditas untuk token ini saat ini."));
        }
      },
      error: (err: unknown) => reject(err),
    });
    setTimeout(() => {
      sub.unsubscribe();
      reject(new Error("Quote Omniston timeout — coba lagi."));
    }, PRODUCT.quoteTtlMs);
  });
}

/** Quote untuk DITAMPILKAN (rate & estimasi hasil) sebelum user konfirmasi. */
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
 * Bangun transaksi swap NYATA (token -> USDT) via Omniston: quote -> tonBuildSwap.
 * Mengembalikan unsigned messages (siap TON Connect) + estimasi USDT diterima.
 * DIVERIFIKASI build-nya di mainnet.
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
    if (!txs.length) throw new Error("Gagal membangun transaksi swap.");
    return { txs, outUnits: String(quote.outputUnits) };
  });
}

/** Quote dianggap basi jika melewati TTL — wajib re-fetch sebelum tanda tangan. */
export function isQuoteStale(q: ConversionQuote): boolean {
  return Date.now() - q.createdAt > PRODUCT.quoteTtlMs;
}

/** Tolak jika slippage melampaui batas (QA: jangan eksekusi diam-diam). */
export function slippageWithinLimit(q: ConversionQuote): boolean {
  return q.slippageBps <= PRODUCT.maxSlippageBps;
}
