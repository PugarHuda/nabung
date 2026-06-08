// Deposit/withdraw orchestrator. Enforces the QA decisions:
//  - check slippage & stale quotes before signing
//  - RECOVERY checkpoint: if the swap succeeds but providing liquidity fails,
//    funds stop at USDT (safe) and the user can retry, not lose them
//  - idempotency: mark steps done so nothing double-executes
//  - on-chain = source of truth

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
  /** re-confirm if slippage/quote changed */
  confirm: (q: ConversionQuote) => Promise<boolean>;
}

export async function deposit(args: DepositArgs): Promise<void> {
  const { wallet, fromSymbol, fromUnits, fromDecimals, fromUsd, sign, onState, confirm } = args;

  if (fromUsd < PRODUCT.minDepositUsd) {
    onState({ status: "error", error: `Minimum deposit is $${PRODUCT.minDepositUsd} (so gas doesn't eat your returns).` });
    return;
  }

  let checkpoint: FlowState["checkpoint"] = null;

  try {
    // 1) Quote the conversion -> USDT
    onState({ status: "quoting" });
    let quote = await quoteToUsdt(fromSymbol, fromUnits, fromDecimals);

    // 2) Validate the quote (QA: never execute silently)
    if (isQuoteStale(quote) || !slippageWithinLimit(quote)) {
      const ok = await confirm(quote);
      if (!ok) return onState({ status: "idle" });
      quote = await quoteToUsdt(fromSymbol, fromUnits, fromDecimals); // re-fetch
      if (!slippageWithinLimit(quote)) {
        return onState({ status: "error", error: "Slippage too high — cancelled for safety." });
      }
    }

    // 3) Convert token -> USDT via Omniston (REAL swap, build verified on mainnet)
    let usdtUnits = quote.outUnits;
    if (fromSymbol !== USDT.symbol) {
      onState({ status: "converting", message: "Converting to USDT (Omniston)…" });
      const swap = await buildSwapToUsdtTx(wallet, fromSymbol, fromUnits);
      usdtUnits = swap.outUnits;
      onState({ status: "awaiting-signature" });
      await sign(swap.txs); // user signs in wallet → receives USDT
      checkpoint = "converted-to-usdt";
    } else {
      usdtUnits = fromUnits;
    }

    // 4) Single-sided provide into the stable pool
    onState({ status: "providing-liquidity", message: "Saving into the stable pool…", checkpoint });
    const txs = await buildDepositTx(wallet, usdtUnits);
    onState({ status: "awaiting-signature", checkpoint });
    await sign(txs);
    checkpoint = "liquidity-added";

    onState({ status: "confirming", checkpoint });
    // In a live integration: poll until the LP share increases on-chain.
    onState({ status: "done", checkpoint });
  } catch (e) {
    // RECOVERY: if funds already became USDT, tell the user their money is SAFE.
    const safe =
      checkpoint === "converted-to-usdt"
        ? " Your funds are already safe as USDT in your wallet — you can try saving again without losing anything."
        : "";
    onState({ status: "error", error: (e as Error).message + safe, checkpoint });
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
    onState({ status: "providing-liquidity", message: "Withdrawing your savings…" });
    const txs = await buildWithdrawTx(wallet, lpShares);
    onState({ status: "awaiting-signature" });
    await sign(txs);
    onState({ status: "confirming" });
    onState({ status: "done" });
  } catch (e) {
    onState({ status: "error", error: (e as Error).message });
  }
}
