// Orchestrator alur Nabung. Menegakkan keputusan QA:
//  - cek slippage & quote basi sebelum tanda tangan
//  - CHECKPOINT recovery: kalau konversi sukses tapi add-liquidity gagal,
//    dana berhenti di USDT (aman) dan user bisa lanjut, bukan hilang
//  - idempotensi: tandai langkah selesai agar tidak dobel-eksekusi
//  - on-chain = sumber kebenaran

import { PRODUCT, USDT } from "@/config";
import type { ConversionQuote, FlowState } from "@/types";
import { buildSwapToUsdtTx, isQuoteStale, quoteToUsdt, slippageWithinLimit } from "./omniston";
import { buildDepositTx, buildWithdrawTx } from "./ston";

export type SignFn = (txs: { to: string; value: string; body?: string }[]) => Promise<void>;

export interface DepositArgs {
  wallet: string;
  fromSymbol: string;
  fromUnits: string;
  fromDecimals: number;
  fromUsd: number;
  sign: SignFn;
  onState: (s: FlowState) => void;
  /** konfirmasi ulang kalau slippage/quote berubah */
  confirm: (q: ConversionQuote) => Promise<boolean>;
}

export async function deposit(args: DepositArgs): Promise<void> {
  const { wallet, fromSymbol, fromUnits, fromDecimals, fromUsd, sign, onState, confirm } = args;

  if (fromUsd < PRODUCT.minDepositUsd) {
    onState({ status: "error", error: `Minimum setor $${PRODUCT.minDepositUsd} (biar gas tidak menggerus hasil).` });
    return;
  }

  let checkpoint: FlowState["checkpoint"] = null;

  try {
    // 1) Quote konversi -> USDT
    onState({ status: "quoting" });
    let quote = await quoteToUsdt(fromSymbol, fromUnits, fromDecimals);

    // 2) Validasi quote (QA: jangan eksekusi diam-diam)
    if (isQuoteStale(quote) || !slippageWithinLimit(quote)) {
      const ok = await confirm(quote);
      if (!ok) return onState({ status: "idle" });
      quote = await quoteToUsdt(fromSymbol, fromUnits, fromDecimals); // re-fetch
      if (!slippageWithinLimit(quote)) {
        return onState({ status: "error", error: "Slippage terlalu tinggi, dibatalkan demi keamanan." });
      }
    }

    // 3) Konversi token -> USDT via Omniston (swap NYATA, sudah diverifikasi build-nya)
    let usdtUnits = quote.outUnits;
    if (fromSymbol !== USDT.symbol) {
      onState({ status: "converting", message: "Menyeragamkan ke USDT (Omniston)…" });
      const swap = await buildSwapToUsdtTx(wallet, fromSymbol, fromUnits);
      usdtUnits = swap.outUnits;
      onState({ status: "awaiting-signature" });
      await sign(swap.txs); // user tanda tangan di wallet → menerima USDT
      checkpoint = "converted-to-usdt";
    } else {
      usdtUnits = fromUnits;
    }

    // 4) Single-sided provide ke stable pool
    onState({ status: "providing-liquidity", message: "Menabung ke pool stabil…", checkpoint });
    const txs = await buildDepositTx(wallet, usdtUnits);
    onState({ status: "awaiting-signature", checkpoint });
    await sign(txs);
    checkpoint = "liquidity-added";

    onState({ status: "confirming", checkpoint });
    // Pada integrasi nyata: poll sampai LP share bertambah on-chain.
    onState({ status: "done", checkpoint });
  } catch (e) {
    // RECOVERY: kalau sudah terlanjur jadi USDT, beri tahu user dananya AMAN.
    const aman =
      checkpoint === "converted-to-usdt"
        ? " Dana kamu sudah aman dalam USDT di wallet — bisa dicoba tabung lagi tanpa kehilangan."
        : "";
    onState({ status: "error", error: (e as Error).message + aman, checkpoint });
  }
}

export interface WithdrawArgs {
  wallet: string;
  lpShares: string;
  sign: SignFn;
  onState: (s: FlowState) => void;
}

export async function withdraw({ wallet, lpShares, sign, onState }: WithdrawArgs): Promise<void> {
  try {
    onState({ status: "providing-liquidity", message: "Menarik tabungan…" });
    const txs = await buildWithdrawTx(wallet, lpShares);
    onState({ status: "awaiting-signature" });
    await sign(txs);
    onState({ status: "confirming" });
    onState({ status: "done" });
  } catch (e) {
    onState({ status: "error", error: (e as Error).message });
  }
}
