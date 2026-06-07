/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK?: string;
  readonly VITE_NETWORK?: "mainnet" | "testnet";
  readonly VITE_TON_RPC?: string;
  readonly VITE_TON_API_KEY?: string;
  readonly VITE_MANIFEST_URL?: string;
  readonly VITE_SAVINGS_POOL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
