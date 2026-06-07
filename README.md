# 🐷 Nabung — Tabungan Kripto di Telegram

> Setor token apa pun → kami seragamkan jadi USDT → ditabung otomatis ke tempat ber-yield
> risiko-rendah di STON.fi → Mira jadi asisten proaktif yang melapor & mengingatkan.
> **DeFi yield yang terasa seperti aplikasi tabungan.**

Dibuat untuk **STON.fi Vibe Coding Hackathon – Wave 2** · Track: **STON.fi + Mira**.

---

## Kenapa ini BUKAN "Inite" (pemenang lalu)
Inite (Wave 1 Silver) = *dashboard DeFi* dengan chat untuk staking/LP/swap. Nabung sengaja
dibedakan tajam pada 4 titik — kalau ini tidak menonjol, produk akan terasa seperti Inite:

| Pembeda | Inite | **Nabung** |
|---|---|---|
| (a) Abstraksi | Dashboard DeFi (user lihat pool/LP) | **Rekening tabungan** — jargon DeFi disembunyikan total |
| (b) Setoran | Token tertentu | **Token APA PUN masuk** → diseragamkan ke USDT via Omniston |
| (c) Peran AI | Chat reaktif (kamu tanya) | **Asisten proaktif** — laporan video, trigger, nudge |
| (d) Yield | LP umum (ada IL) | **Single-sided stable pool** → IL minimal, diposisikan "aman" + jujur soal risiko |

---

## Arsitektur singkat
```
Token apa pun ─(Omniston best-rate)→ USDT ─(single-sided)→ STABLE POOL STON.fi → yield
        ▲                                                              │
   TON Connect (tanda tangan)                                  on-chain = sumber kebenaran
        │                                                              ▼
   Mini App (React/Vite) ◄─ deep-link payload ─ Mira (skill, memory, trigger, Seedance)
```

## Tumpukan integrasi
**STON.fi/TON:** `@ston-fi/sdk` (single-sided LP v2), `@ston-fi/omniston-sdk-react` (konversi),
`@ston-fi/api` (APY/harga/pool), `@tonconnect/ui-react`, `@ton/core`/`@ton/ton`.
**Mira:** deep-link `startapp`, custom skill (`/nabung`, `/saldo`), trigger proaktif,
laporan Seedance. Lihat `mira-skills/nabung.md`.

## Menjalankan
```bash
cd nabung
npm install
cp .env.example .env.local   # default VITE_MOCK=true → UI demoable tanpa wallet
npm run dev
```
- **Mode DEMO (default):** semua data simulasi → bisa langsung pamer UI & alur.
- **Mode LIVE:** set `VITE_MOCK=false` + isi RPC/API key + jalankan lewat HTTPS tunnel
  (ngrok/cloudflared) agar Telegram Mini App & TON Connect berfungsi. Update `url` di
  `public/tonconnect-manifest.json` & `VITE_MANIFEST_URL`.

## Status implementasi
- [x] UI tabungan (saldo, bunga, target, asisten proaktif, risk note jujur) — **jalan di MODE DEMO**
- [x] Alur setor/tarik dengan **recovery checkpoint** & cek slippage/quote basi (`src/lib/savings.ts`)
- [x] Pemilihan **stable pool** (IL rendah) via API (`src/lib/api.ts`)
- [x] Template **single-sided provide liquidity** v2 (`src/lib/ston.ts`)
- [x] Bridge **deep-link Mira** + parsing payload (`src/telegram.ts`)
- [x] Template **custom skill + trigger + Seedance** (`mira-skills/nabung.md`)
- [x] `OmnistonProvider` ter-wire di `main.tsx` (mode LIVE) — build & typecheck lolos
- [ ] Wiring Omniston RFQ live + query LP balance on-chain (titik bertanda di `lib/`)

### Peta wiring LIVE (API asli — sudah diverifikasi dari type defs paket)
Sisa pekerjaan live (butuh wallet + mainnet untuk verifikasi end-to-end):
1. **Quote** — `useRfq({ inputAsset, outputAsset, amount: { $case: "inputUnits", value }, settlementParams: [{ settlementMethods: [SettlementMethod.SWAP], maxPriceSlippagePips }] })`.
   `inputAsset`/`outputAsset` bertipe `AssetId` (tagged-union per-chain → pakai varian TON dengan address jetton/`native`).
   Hook mengembalikan `ObservableQueryResult`; ambil event `$case === "quoteUpdated"` → `quote` (punya `quoteId`, `outputUnits`).
2. **Build tx** — `useTonBuildSwap({ quoteId, transferSrcAddress, traderDstAddress })` → `TonTransaction { messages: TonMessage[] }`.
3. **Kirim** — map `messages` ke `tonConnectUI.sendTransaction({ messages })`.
4. **Lacak** — `useSwapTrack(...)` sampai selesai.
5. **Saldo on-chain** — baca LP jetton balance user di stable pool via `@ton/ton` + reserves pool (`@ston-fi/api`) → konversi share ke USD (`readPosition` di `src/lib/ston.ts`).

> Karena Omniston berbasis React-hooks + observable, alur live sebaiknya hidup di komponen
> (mis. `DepositSheet`) memakai `useRfq`/`useTonBuildSwap`, bukan di fungsi `lib/` biasa.
> Saat ini `lib/omniston.ts` & `lib/ston.ts` menahan branch live di balik `MOCK` dengan TODO bertanda.

## Keputusan QA yang sudah ditegakkan di kode
- **Impermanent Loss:** default **stable pool + single-sided** (`config.ts` `DEFAULT_RISK="konservatif"`).
- **Kejujuran saldo:** UI menampilkan bunga **bisa negatif** (turun), tidak dipoles (`components.tsx` `BalanceCard`).
- **Recovery:** jika konversi sukses tapi add-liquidity gagal, dana berhenti di USDT (aman) + pesan jelas (`savings.ts`).
- **Slippage/quote basi:** wajib konfirmasi ulang sebelum tanda tangan (`omniston.ts`, `savings.ts`).
- **Sumber kebenaran:** angka resmi dari on-chain (`ston.ts readPosition`), Mira memory hanya cache UX.
- **Ekonomi nominal kecil:** minimum setor (`config.ts` `minDepositUsd`).
- **Bukan bank:** disclaimer risiko eksplisit di UI, tanpa kata "dijamin/insured".

## Deploy
Telegram Mini App butuh URL **HTTPS publik**. Dua jalur:

**A. GitHub Pages (otomatis, sudah disetel)** — `.github/workflows/deploy.yml` build & deploy
tiap push ke `main`. Setelah push pertama: buka repo → **Settings → Pages → Source: GitHub
Actions**. Hasil: `https://<user>.github.io/<repo>/` (base path di-handle otomatis via `VITE_BASE`).
Demo publik berjalan mode **MOCK**.

**B. Vercel / Cloudflare Pages (URL root, lebih bersih)** — connect repo, framework **Vite**,
build `npm run build`, output `dist`. Tak perlu set base (default `/`).

Setelah live, untuk menjadikannya Mini App sungguhan:
1. BotFather → `/newapp` (atau `/setmenubutton`) → tempel URL deploy.
2. Update `public/tonconnect-manifest.json` `url`+`iconUrl` ke URL deploy (atau set `VITE_MANIFEST_URL`).
3. Untuk fitur live (bukan MOCK): set `VITE_MOCK=false`, `VITE_NETWORK`, + RPC/API key.

## Disclaimer
Bukan nasihat keuangan. Bukan produk berasuransi. Pokok berisiko; yield berfluktuasi.
