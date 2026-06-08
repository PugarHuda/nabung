// =============================================================================
// Nabung — central configuration
// =============================================================================
// All addresses & endpoints live here for easy verification.
// NOTE: verify mainnet addresses before production (don't hardcode blindly — STON.fi's
// recommended pattern is to resolve the router via the API). See lib/api.ts.

// Mode can be switched at RUNTIME via URL params (so one deploy serves both demo and
// testnet real-action on the same domain → TON Connect manifest still matches):
//   ?mode=testnet            → real-action testnet (MOCK=false, NETWORK=testnet)
//   ?mock=false&network=...  → fine-grained override
// Falls back to build-time env (VITE_MOCK / VITE_NETWORK), default = MOCK demo on mainnet.
const _qp = (() => {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
})();
// Mode resolution: URL ?mode= wins, else a persisted choice (localStorage) — so an
// in-app toggle works even when Telegram opens a cached URL without the query string.
function persistedMode(): string | null {
  try {
    return localStorage.getItem("nabung:mode");
  } catch {
    return null;
  }
}
// A persisted in-app choice WINS over the URL param, so the toggle isn't overridden
// when Telegram reopens the bot's ?mode=testnet menu-button URL.
const _mode = persistedMode() ?? _qp.get("mode");
const _mockQ = _qp.get("mock");
const _netQ = _qp.get("network");

/** In-app mode toggle: persist choice, strip ?mode from the URL, then reload. */
export function setAppMode(mode: "demo" | "testnet"): void {
  try {
    localStorage.setItem("nabung:mode", mode);
    // remove ?mode= so it can't override the persisted choice on reload (keep the hash)
    const u = new URL(window.location.href);
    u.searchParams.delete("mode");
    window.history.replaceState(null, "", u.toString());
  } catch {
    /* ignore */
  }
  location.reload();
}

// Run with fake data so the UI is demoable without a wallet/SDK.
export const MOCK = (() => {
  if (_mode === "testnet") return false;
  if (_mode === "demo") return true;
  if (_mockQ === "false") return false;
  if (_mockQ === "true") return true;
  return import.meta.env.VITE_MOCK !== "false";
})();

// Network: "mainnet" | "testnet".
// IMPORTANT: api.ston.fi is mainnet-only, and stable-pool/Omniston liquidity is
// effectively absent on testnet. So testnet is only good for testing TON Connect +
// transaction signing, NOT for demoing yield. For a yield demo use MOCK or mainnet
// (small amounts). See the README "Testnet vs Mainnet" section.
export const NETWORK: "mainnet" | "testnet" =
  _mode === "testnet" || _netQ === "testnet" || import.meta.env.VITE_NETWORK === "testnet"
    ? "testnet"
    : "mainnet";
export const IS_TESTNET = NETWORK === "testnet";

// Omniston endpoint (STON.fi best-rate aggregator) — mainnet.
export const OMNISTON_WS = "wss://omni-ws.ston.fi";

// STON.fi v2 router.
export const STON_ROUTER = {
  // Router address; on testnet this MUST be hardcoded (api.ston.fi doesn't serve testnet).
  mainnet: "", // resolved via @ston-fi/api at runtime
  testnet: "EQBsGx9ArADUrREB34W-ghgsCgBShvfUr4Jvlu-0KGc33Rbt",
};

// TON RPC (for @ton/ton TonClient). Replace with your own API key.
export const TON_RPC =
  import.meta.env.VITE_TON_RPC ?? "https://toncenter.com/api/v2/jsonRPC";
export const TON_API_KEY = import.meta.env.VITE_TON_API_KEY ?? "";

// -----------------------------------------------------------------------------
// Assets & pools
// -----------------------------------------------------------------------------
// USD₮ (Tether) on TON — our "savings" settlement asset (stable).
export const USDT = {
  symbol: "USDT",
  decimals: 6,
  // USD₮ jetton master (mainnet). VERIFY before production.
  address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
};

export const TON = {
  symbol: "TON",
  decimals: 9,
  address: "native",
};

export const NOT = {
  symbol: "NOT",
  decimals: 9,
  // Notcoin jetton master (mainnet). VERIFY before production.
  address: "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT",
};

// Tokens that can be deposited (all normalized to USDT via Omniston).
export const DEPOSIT_ASSETS = [TON, USDT, NOT];

// YIELD SOURCE = STABLE POOL (StableSwap). Flat curve near peg => minimal IL.
// This is the core of the "safe savings" claim: we do NOT use a volatile pool by default.
// Fill the stable USDT/<stable> pool address from @ston-fi/api at runtime (lib/api.ts).
export const SAVINGS_POOL = {
  label: "USDT stable pool",
  // tokenB = another stablecoin (jUSD / USDC-equivalent) to minimize IL.
  // Filled automatically by resolveSavingsPool() in lib/api.ts.
  address: import.meta.env.VITE_SAVINGS_POOL ?? "",
};

// -----------------------------------------------------------------------------
// Product parameters (honest & conservative)
// -----------------------------------------------------------------------------
export const PRODUCT = {
  // Minimum deposit so gas doesn't eat returns (see QA: small-amount economics).
  minDepositUsd: 5,
  // Conversion slippage limit; above this, ask the user to re-confirm.
  maxSlippageBps: 100, // 1.00%
  // TON reserve for gas (never spend the whole native balance).
  gasReserveTon: 0.3,
  // How long a quote is considered valid before a mandatory re-fetch.
  quoteTtlMs: 20_000,
  // Threshold after which the price feed is considered stale.
  priceStaleMs: 60_000,
};

// Risk tier. Defaults to CONSERVATIVE (stable, single-sided) for product honesty.
export type RiskTier = "conservative" | "balanced";
export const DEFAULT_RISK: RiskTier = "conservative";
