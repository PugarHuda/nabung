// Tipe domain Nabung. Bahasa di UI = "tabungan/bunga/setor/tarik" (bukan jargon DeFi).

export interface TokenAmount {
  symbol: string;
  /** jumlah dalam satuan terkecil (nano/units) sebagai string */
  units: string;
  decimals: number;
  /** alamat jetton master, atau "native" untuk TON */
  address: string;
}

/** Posisi tabungan user = share LP single-sided di stable pool, disajikan ala bank. */
export interface SavingsPosition {
  /** nilai pokok + bunga saat ini, dalam USDT (unit USD) */
  balanceUsd: number;
  /** total yang pernah disetor (USD) */
  principalUsd: number;
  /** bunga terakumulasi (USD) = balance - principal */
  earnedUsd: number;
  /** APY realized terkini (persen), dari @ston-fi/api */
  apyPercent: number;
  /** share LP on-chain (sumber kebenaran) */
  lpShares: string;
  /** kapan terakhir disinkron dari on-chain */
  syncedAt: number;
}

export interface SavingsGoal {
  targetUsd: number;
  label: string;
}

/** Quote konversi token-apa-pun -> USDT via Omniston. */
export interface ConversionQuote {
  fromSymbol: string;
  toSymbol: string;
  inUnits: string;
  outUnits: string;
  rate: number;
  slippageBps: number;
  /** kapan quote dibuat (untuk TTL) */
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
  /** untuk recovery: kalau konversi sukses tapi add-liquidity gagal,
   *  user tidak boleh kehilangan dana — kita simpan checkpoint. */
  checkpoint?: "converted-to-usdt" | "liquidity-added" | null;
  error?: string;
}
