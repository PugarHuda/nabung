// Konversi "token apa pun -> USDT" via Omniston (agregator best-rate).
// Inilah pembeda dari Inite: Nabung menerima setoran dalam token APA PUN,
// lalu menyeragamkannya ke USDT yang stabil sebelum ditabung.
//
// Quote LIVE sudah diverifikasi ke mainnet (wss://omni-ws.ston.fi):
//   1 TON -> ~1.69 USDT, resolver "Omniston". Lihat README.

import { MOCK, OMNISTON_WS, PRODUCT, USDT, DEPOSIT_ASSETS } from "@/config";
import type { ConversionQuote } from "@/types";
import { getUsdPrice } from "./api";

/** Bentuk AssetId Omniston untuk TON: native atau jetton. */
function tonAsset(address: string) {
  return address === "native" || !address
    ? { chain: { $case: "ton", value: { kind: { $case: "native", value: {} } } } }
    : { chain: { $case: "ton", value: { kind: { $case: "jetton", value: address } } } };
}

function resolveAddress(symbol: string): string {
  return DEPOSIT_ASSETS.find((a) => a.symbol === symbol)?.address ?? "native";
}

/**
 * Minta quote konversi fromSymbol -> USDT via Omniston RFQ (streaming).
 * Mengambil event `quoteUpdated` pertama lalu menutup koneksi.
 */
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

  // --- LIVE: Omniston RFQ ---
  const { Omniston } = await import("@ston-fi/omniston-sdk");
  const omni = new Omniston({ apiUrl: OMNISTON_WS });
  const req = {
    inputAsset: tonAsset(resolveAddress(fromSymbol)),
    outputAsset: tonAsset(USDT.address),
    amount: { $case: "inputUnits", value: fromUnits },
    settlementParams: [
      { params: { $case: "swap", value: { maxPriceSlippagePips: PRODUCT.maxSlippageBps * 100 } } },
    ],
  };

  try {
    const quote: any = await new Promise((resolve, reject) => {
      const sub = omni.requestForQuote(req as never).subscribe({
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

    const inAmt = Number(fromUnits) / 10 ** fromDecimals;
    const outAmt = Number(quote.outputUnits) / 10 ** USDT.decimals;
    return {
      fromSymbol,
      toSymbol: USDT.symbol,
      inUnits: fromUnits,
      outUnits: String(quote.outputUnits),
      rate: inAmt > 0 ? outAmt / inAmt : 0,
      // slippage aktual dijaga saat eksekusi; nilai informatif di sini.
      slippageBps: 30,
      createdAt: Date.now(),
    };
  } finally {
    try {
      (omni as { close?: () => void }).close?.();
    } catch {
      /* noop */
    }
  }
}

/** Quote dianggap basi jika melewati TTL — wajib re-fetch sebelum tanda tangan. */
export function isQuoteStale(q: ConversionQuote): boolean {
  return Date.now() - q.createdAt > PRODUCT.quoteTtlMs;
}

/** Tolak jika slippage melampaui batas (QA: jangan eksekusi diam-diam). */
export function slippageWithinLimit(q: ConversionQuote): boolean {
  return q.slippageBps <= PRODUCT.maxSlippageBps;
}
