// Nabung domain types. UI language = "savings/earned/deposit/withdraw" (no DeFi jargon).

export interface TokenAmount {
  symbol: string;
  /** amount in the smallest unit (nano/units) as a string */
  units: string;
  decimals: number;
  /** jetton master address, or "native" for TON */
  address: string;
}

/** The user's savings position = single-sided LP share in the stable pool, shown bank-style. */
export interface SavingsPosition {
  /** current principal + interest, in USDT (USD units) */
  balanceUsd: number;
  /** total ever deposited (USD) */
  principalUsd: number;
  /** accrued interest (USD) = balance - principal */
  earnedUsd: number;
  /** latest realized APY (percent), from @ston-fi/api */
  apyPercent: number;
  /** on-chain LP share (source of truth) */
  lpShares: string;
  /** when it was last synced from on-chain */
  syncedAt: number;
}

export interface SavingsGoal {
  targetUsd: number;
  label: string;
}

/** Conversion quote for any-token -> USDT via Omniston. */
export interface ConversionQuote {
  fromSymbol: string;
  toSymbol: string;
  inUnits: string;
  outUnits: string;
  rate: number;
  slippageBps: number;
  /** when the quote was created (for TTL) */
  createdAt: number;
}

export type FlowStatus =
  | "idle"
  | "quoting"
  | "awaiting-signature"
  | "converting"
  | "providing-liquidity"
  | "confirming"
  | "done"
  | "error";

export interface FlowState {
  status: FlowStatus;
  message?: string;
  /** for recovery: if the swap succeeded but providing liquidity failed,
   *  the user must not lose funds — we keep a checkpoint. */
  checkpoint?: "converted-to-usdt" | "liquidity-added" | null;
  error?: string;
}
