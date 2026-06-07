// Konversi "token apa pun -> USDT" via Omniston (agregator best-rate).
// Inilah pembeda dari Inite: Nabung menerima setoran dalam token APA PUN,
// lalu menyeragamkannya ke USDT yang stabil sebelum ditabung.

import { MOCK, OMNISTON_WS, PRODUCT, USDT } from "@/config";
import type { ConversionQuote } from "@/types";
import { getUsdPrice } from "./api";

/**
 * Minta quote konversi fromSymbol -> USDT.
 * Di dunia nyata: pakai Omniston RFQ (useRfq / requestForQuote streaming).
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

  // --- Integrasi nyata (ringkas) ---
  // const { Omniston } = await import("@ston-fi/omniston-sdk-react");
  // const omni = new Omniston({ apiUrl: OMNISTON_WS });
  // const event = await firstQuote(omni.requestForQuote({ offerToken: fromAddr, askToken: USDT.address, amount: fromUnits }));
  // ... map event.value -> ConversionQuote
  void OMNISTON_WS;
  throw new Error("Omniston live belum di-wire — jalankan dengan VITE_MOCK (default).");
}

/** Quote dianggap basi jika melewati TTL — wajib re-fetch sebelum tanda tangan. */
export function isQuoteStale(q: ConversionQuote): boolean {
  return Date.now() - q.createdAt > PRODUCT.quoteTtlMs;
}

/** Tolak jika slippage melampaui batas (QA: jangan eksekusi diam-diam). */
export function slippageWithinLimit(q: ConversionQuote): boolean {
  return q.slippageBps <= PRODUCT.maxSlippageBps;
}
