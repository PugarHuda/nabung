// Testnet "real-action" mode.
// Since TON testnet has no real DeFi yield (STON.fi has no testnet; Tonstakers testnet
// data is unavailable), here deposits/withdrawals are REAL on-chain transactions
// (real TON Connect signing, explorer-visible) and SELF-CUSTODIAL — funds stay in the
// user's own wallet via an on-chain "savings receipt" (a transfer carrying a memo).
// YIELD is SIMULATED and clearly labeled. This proves the full UX + signing path for real.

import { beginCell, toNano } from "@ton/core";
import type { SavingsPosition } from "@/types";

const SIM_APY = 6.2; // simulated, displayed only
const LEDGER_KEY = (wallet: string) => `nabung:testnet:${wallet}`;

/** TON text-comment payload (base64 BOC) for an on-chain savings receipt. */
function commentPayload(text: string): string {
  return beginCell().storeUint(0, 32).storeStringTail(text).endCell().toBoc().toString("base64");
}

/** A real testnet transaction: self-transfer carrying a Nabung memo (self-custodial receipt). */
export function buildReceiptTx(wallet: string, amountTon: number, memo: string) {
  return [{ to: wallet, value: toNano(amountTon).toString(), body: commentPayload(memo) }];
}

// --- local savings ledger (principal in TON), reconstructed for the position display ---
interface Ledger {
  principalTon: number;
  since: number; // first deposit timestamp (for simulated interest)
}

function read(wallet: string): Ledger {
  try {
    return JSON.parse(localStorage.getItem(LEDGER_KEY(wallet)) || "") as Ledger;
  } catch {
    return { principalTon: 0, since: 0 };
  }
}
function write(wallet: string, l: Ledger) {
  localStorage.setItem(LEDGER_KEY(wallet), JSON.stringify(l));
}

export function addDeposit(wallet: string, amountTon: number, now: number) {
  const l = read(wallet);
  write(wallet, { principalTon: l.principalTon + amountTon, since: l.since || now });
}
export function clearSavings(wallet: string) {
  write(wallet, { principalTon: 0, since: 0 });
}

/** Build the position from the ledger + a SIMULATED yield overlay (display only). */
export function readTestnetPosition(wallet: string, tonUsd: number, now: number): SavingsPosition {
  const l = read(wallet);
  const principalUsd = l.principalTon * tonUsd;
  // simulated interest accrual since first deposit (display only, clearly labeled in UI)
  const years = l.since ? (now - l.since) / (365 * 24 * 3600 * 1000) : 0;
  const earnedUsd = +(principalUsd * (SIM_APY / 100) * years).toFixed(2);
  return {
    balanceUsd: principalUsd + earnedUsd,
    principalUsd,
    earnedUsd,
    apyPercent: SIM_APY,
    lpShares: String(Math.round(l.principalTon * 1e9)),
    syncedAt: now,
  };
}
