// =============================================================================
// Nabung — konfigurasi terpusat
// =============================================================================
// Semua alamat & endpoint dikumpulkan di sini supaya mudah diverifikasi.
// CATATAN: verifikasi alamat di mainnet sebelum produksi (jangan hardcode buta —
// pola yang disarankan STON.fi: pilih router via API). Lihat lib/api.ts.

// Jalankan dengan data palsu agar UI demoable tanpa wallet/SDK live.
// Set VITE_MOCK=false (atau hapus) untuk memakai integrasi sungguhan.
export const MOCK = import.meta.env.VITE_MOCK !== "false";

// Jaringan: "mainnet" | "testnet".
// CATATAN PENTING: api.ston.fi HANYA mainnet, dan likuiditas stable pool/Omniston
// praktis tidak ada di testnet. Jadi testnet hanya cocok untuk menguji TON Connect +
// tanda tangan transaksi, BUKAN untuk mendemokan yield. Demo yield -> MOCK atau mainnet
// (nominal kecil). Lihat README bagian "Testnet vs Mainnet".
export const NETWORK: "mainnet" | "testnet" =
  (import.meta.env.VITE_NETWORK as "mainnet" | "testnet") ?? "mainnet";
export const IS_TESTNET = NETWORK === "testnet";

// Endpoint Omniston (agregator best-rate STON.fi) — mainnet.
export const OMNISTON_WS = "wss://omni-ws.ston.fi";

// Router STON.fi v2.
export const STON_ROUTER = {
  // Alamat router; di testnet WAJIB hardcode (api.ston.fi tak melayani testnet).
  mainnet: "", // di-resolve via @ston-fi/api saat runtime
  testnet: "EQBsGx9ArADUrREB34W-ghgsCgBShvfUr4Jvlu-0KGc33Rbt",
};

// TON RPC (untuk @ton/ton TonClient). Ganti dengan API key milikmu.
export const TON_RPC =
  import.meta.env.VITE_TON_RPC ?? "https://toncenter.com/api/v2/jsonRPC";
export const TON_API_KEY = import.meta.env.VITE_TON_API_KEY ?? "";

// -----------------------------------------------------------------------------
// Aset & pool
// -----------------------------------------------------------------------------
// USD₮ (Tether) di TON — aset settlement "tabungan" kita (stabil).
export const USDT = {
  symbol: "USDT",
  decimals: 6,
  // USD₮ jetton master (mainnet). VERIFIKASI sebelum produksi.
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
  // Notcoin jetton master (mainnet). VERIFIKASI sebelum produksi.
  address: "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT",
};

// Token yang bisa disetor (semua diseragamkan ke USDT via Omniston).
export const DEPOSIT_ASSETS = [TON, USDT, NOT];

// SUMBER YIELD = STABLE POOL (StableSwap). Kurva datar dekat peg => IL minimal.
// Inilah inti klaim "tabungan aman": kita TIDAK pakai pool volatil sebagai default.
// Isi alamat pool stable USDT/<stable> dari @ston-fi/api saat runtime (lib/api.ts).
export const SAVINGS_POOL = {
  // Contoh pasangan stable; alamat sebenarnya diambil dari API.
  label: "USDT stable pool",
  // tokenB = stablecoin lain (jUSD / USDC-equivalent) untuk minim IL.
  // Diisi otomatis oleh resolveSavingsPool() di lib/api.ts.
  address: import.meta.env.VITE_SAVINGS_POOL ?? "",
};

// -----------------------------------------------------------------------------
// Parameter produk (jujur & konservatif)
// -----------------------------------------------------------------------------
export const PRODUCT = {
  // Minimum setor supaya gas tidak menggerus hasil (lihat QA: ekonomi nominal kecil).
  minDepositUsd: 5,
  // Batas slippage konversi; di atas ini minta konfirmasi ulang.
  maxSlippageBps: 100, // 1.00%
  // Reserve TON untuk gas (jangan habiskan saldo native).
  gasReserveTon: 0.3,
  // Berapa lama quote dianggap valid sebelum wajib re-fetch.
  quoteTtlMs: 20_000,
  // Ambang feed harga dianggap basi.
  priceStaleMs: 60_000,
};

// Tingkat risiko. Default KONSERVATIF (stable, single-sided) demi kejujuran produk.
export type RiskTier = "konservatif" | "seimbang";
export const DEFAULT_RISK: RiskTier = "konservatif";
